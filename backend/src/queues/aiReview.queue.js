import Queue from 'bull';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPubSubClients } from '../config/redis.js';
import logger from '../utils/logger.js';

let aiReviewQueue = null;
let ioInstance = null;
let isRedisMock = false;

// Helper: Convert Gemini output to clean JSON
const cleanResponseJSON = (text) => {
  let cleaned = text.trim();
  // Strip markdown formatting if the model returned it
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(cleaned);
};

// Helper: Get mock review if API key is not present
const getMockReview = (language) => {
  return {
    bugs: [
      `[Mock Code Review] No critical syntax bugs found in this ${language} snippet.`
    ],
    suggestions: [
      `[Mock Code Review] Consider splitting complex nested structures into smaller utility functions.`,
      `[Mock Code Review] Document function interfaces with docstrings or standard typing annotations.`,
      `[Mock Code Review] Check edge inputs (null, empty, or overflow values).`
    ],
    complexity: 'O(N) Time, O(1) Space (Mock Analysis)'
  };
};

// Process AI Review Job calling Gemini API
const processAIReviewJob = async (job) => {
  const { sessionId, code, language } = job.data;
  logger.info(`Processing AI review job for session: ${sessionId} (Language: ${language})`);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    let reviewResult;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      logger.warn(`GEMINI_API_KEY is not set or placeholder. Falling back to mock review.`);
      // Delay slightly to simulate background worker delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      reviewResult = getMockReview(language);
    } else {
      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `
You are a senior code reviewer. Review the following code for bugs, style issues, time/space complexity, and security vulnerabilities.
Return ONLY a valid JSON object. Do not include markdown formatting like \`\`\`json or \`\`\`.
The JSON object must have the following structure:
{
  "bugs": ["bug 1...", "bug 2..."],
  "suggestions": ["style suggestion 1...", "refactoring suggestion 2..."],
  "complexity": "O(N) time, O(1) space"
}

Code Language: ${language}
Code:
${code}
      `;

      let result;
      try {
        logger.info('Attempting code review using gemini-1.5-flash (v1)...');
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }, { apiVersion: 'v1' });
        result = await model.generateContent(prompt);
      } catch (firstError) {
        logger.warn(`Failed to connect with gemini-1.5-flash: ${firstError.message}. Retrying with gemini-pro (v1)...`);
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' }, { apiVersion: 'v1' });
          result = await model.generateContent(prompt);
        } catch (secondError) {
          logger.warn(`Failed to connect with gemini-pro: ${secondError.message}. Retrying with gemini-1.5-pro (v1)...`);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }, { apiVersion: 'v1' });
          result = await model.generateContent(prompt);
        }
      }

      const text = result.response.text();
      reviewResult = cleanResponseJSON(text);
    }

    // Broadcast review result to the Socket.io room
    if (ioInstance) {
      ioInstance.to(sessionId).emit('ai-review', reviewResult);
      logger.info(`AI code review broadcasted successfully for session ${sessionId}`);
    } else {
      logger.error(`ioInstance is not set. Failed to broadcast AI review.`);
    }

  } catch (error) {
    logger.error(`Error in worker processing AI review job: ${error.message}`);
    // Emit fallback error response
    if (ioInstance) {
      const is404 = error.message.includes('404') || error.message.includes('not found');
      const errorMsg = is404
        ? 'Gemini Model Error. Please verify your API key was created in Google AI Studio (https://aistudio.google.com) and is NOT a restricted Google Cloud console key.'
        : `Gemini review failed: ${error.message}`;

      ioInstance.to(sessionId).emit('ai-review', {
        bugs: ['Error: Failed to process Gemini AI code review.'],
        suggestions: [errorMsg],
        complexity: 'Error'
      });
    }
  }
};

export const initAIReviewQueue = (io) => {
  ioInstance = io;
  
  const { isMock } = getPubSubClients();
  isRedisMock = isMock;

  if (isRedisMock) {
    logger.warn('Skipped Bull queue initialization (Redis mock fallback active). AI Review will run in-process.');
    return;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    // Initialize Bull Queue backed by Redis connection
    aiReviewQueue = new Queue('ai-review-queue', redisUrl);

    // Register job processor
    aiReviewQueue.process(processAIReviewJob);

    aiReviewQueue.on('error', (err) => {
      logger.error(`Bull Queue Error: ${err.message}`);
    });

    logger.info('Bull.js AI Review Queue & Worker initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize Bull Queue: ${error.message}. Falling back to in-process execution.`);
    isRedisMock = true;
  }
};

export const addAIReviewJob = (data) => {
  const { sessionId, code, language } = data;

  if (isRedisMock) {
    // Graceful in-process async fallback if Redis is missing (avoids crashing)
    setImmediate(() => {
      processAIReviewJob({ data });
    });
    logger.info(`AI Code review processed in-process (fallback) for session ${sessionId}`);
    return;
  }

  if (aiReviewQueue) {
    aiReviewQueue.add({ sessionId, code, language }, {
      removeOnComplete: true,
      attempts: 2
    });
    logger.info(`AI Code review job queued in Bull queue for session ${sessionId}`);
  }
};

export const getAIReviewQueueSize = async () => {
  if (!aiReviewQueue || isRedisMock) return 0;
  try {
    const counts = await aiReviewQueue.getJobCounts();
    return (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0);
  } catch (error) {
    logger.error(`Error fetching AI review queue size: ${error.message}`);
    return 0;
  }
};
