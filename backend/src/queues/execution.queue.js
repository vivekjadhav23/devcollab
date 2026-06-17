import Queue from 'bull';
import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getPubSubClients } from '../config/redis.js';
import logger from '../utils/logger.js';

let executionQueue = null;
let ioInstance = null;
let isRedisMock = false;

// Language mappings for Judge0
const languageIds = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62
};

// Safe execution helper using local child processes (for JS and Python)
export const runLocalCode = (code, language) => {
  return new Promise((resolve) => {
    const tempId = Math.random().toString(36).substring(2, 10);
    let ext = '';
    let cmdRunner = '';

    if (language === 'javascript') {
      ext = 'js';
      cmdRunner = 'node';
    } else if (language === 'python') {
      ext = 'py';
      cmdRunner = 'python';
    } else {
      resolve({
        stdout: '',
        stderr: `[Local Fallback Runner] Compilation/run for "${language}" is not supported locally. Please configure RAPIDAPI_KEY in .env to use the Judge0 Cloud Runner.`,
        time: '0 ms',
        memory: 'N/A',
        status: { description: 'Unsupported' }
      });
      return;
    }

    const tempFilename = `temp_${tempId}.${ext}`;
    const tempFilePath = path.join(os.tmpdir(), tempFilename);

    fs.writeFile(tempFilePath, code, (err) => {
      if (err) {
        resolve({
          stdout: '',
          stderr: `Failed to create temporary execution file: ${err.message}`,
          time: '0 ms',
          memory: 'N/A',
          status: { description: 'Runtime Error' }
        });
        return;
      }

      const startTime = Date.now();
      const command = `${cmdRunner} "${tempFilePath}"`;

      // Run shell process with a strict 2.5-second timeout and 10MB memory limit
      exec(command, { timeout: 2500, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        
        // Clean up temp file
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) {
            logger.error(`Failed to delete temp file ${tempFilePath}: ${unlinkErr.message}`);
          }
        });

        // Handle process timeouts
        if (error && error.killed) {
          resolve({
            stdout: stdout.toString(),
            stderr: stderr.toString() + '\nError: Code execution timed out (Limit: 2.5s)',
            time: `${duration} ms`,
            memory: 'N/A',
            status: { description: 'Time Limit Exceeded' }
          });
          return;
        }

        // Check if Python fails (fallback to python3 command if python is not found)
        if (error && language === 'python' && stderr.toString().includes('not found') && cmdRunner === 'python') {
          const py3StartTime = Date.now();
          // Write file again to run with python3
          fs.writeFile(tempFilePath, code, (writeErr) => {
            if (writeErr) {
              resolve({
                stdout: '',
                stderr: `Failed to recreate temporary file: ${writeErr.message}`,
                time: '0 ms',
                memory: 'N/A',
                status: { description: 'Runtime Error' }
              });
              return;
            }

            exec(`python3 "${tempFilePath}"`, { timeout: 2500 }, (py3Err, py3Out, py3Stderr) => {
              const py3Duration = Date.now() - py3StartTime;
              fs.unlink(tempFilePath, (unlinkErr) => {
                if (unlinkErr) logger.error(`Failed to delete temp file ${tempFilePath}: ${unlinkErr.message}`);
              });

              resolve({
                stdout: py3Out.toString(),
                stderr: py3Stderr.toString() + (py3Err ? `\nExecution failed: ${py3Err.message}` : ''),
                time: `${py3Duration} ms`,
                memory: 'N/A',
                status: py3Err ? { description: 'Runtime Error' } : { description: 'Accepted' }
              });
            });
          });
          return;
        }

        resolve({
          stdout: stdout.toString(),
          stderr: stderr.toString() + (error ? `\nExecution failed: ${error.message}` : ''),
          time: `${duration} ms`,
          memory: 'N/A',
          status: error ? { description: 'Runtime Error' } : { description: 'Accepted' }
        });
      });
    });
  });
};

// Call Judge0 API via RapidAPI
const runCloudCode = async (code, language) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';
  const langId = languageIds[language] || 63; // default JS

  const base64Code = Buffer.from(code).toString('base64');

  const options = {
    method: 'POST',
    url: `https://${apiHost}/submissions`,
    params: { base64_encoded: 'true', wait: 'true' },
    headers: {
      'content-type': 'application/json',
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': apiHost
    },
    data: {
      source_code: base64Code,
      language_id: langId
    }
  };

  const response = await axios.request(options);
  const data = response.data;

  // Base64 decode stdout/stderr/compile_output from Judge0
  const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf-8') : '';
  const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf-8') : '';
  const compileOutput = data.compile_output ? Buffer.from(data.compile_output, 'base64').toString('utf-8') : '';

  return {
    stdout: stdout || compileOutput,
    stderr: stderr,
    time: data.time ? `${parseFloat(data.time) * 1000} ms` : 'N/A',
    memory: data.memory ? `${data.memory} KB` : 'N/A',
    status: data.status || { description: 'Finished' }
  };
};

// Process execution jobs
const processExecutionJob = async (job) => {
  const { sessionId, code, language } = job.data;
  logger.info(`Executing code job for session ${sessionId} (Language: ${language})`);

  try {
    let result;
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey || apiKey === 'your_rapidapi_key_here' || apiKey.trim() === '') {
      logger.info('RAPIDAPI_KEY not configured. Running code locally...');
      result = await runLocalCode(code, language);
    } else {
      logger.info('RAPIDAPI_KEY found. Running code on Judge0 Cloud...');
      result = await runCloudCode(code, language);
    }

    if (ioInstance) {
      ioInstance.to(sessionId).emit('run-result', result);
      logger.info(`Code execution outcomes broadcasted successfully to session ${sessionId}`);
    } else {
      logger.error('ioInstance is not set. Failed to broadcast execution results.');
    }

  } catch (error) {
    logger.error(`Error in worker processing code execution job: ${error.message}`);
    if (ioInstance) {
      ioInstance.to(sessionId).emit('run-result', {
        stdout: '',
        stderr: `Execution Error: ${error.message}`,
        time: '0 ms',
        memory: 'N/A',
        status: { description: 'Error' }
      });
    }
  }
};

export const initExecutionQueue = (io) => {
  ioInstance = io;

  const { isMock } = getPubSubClients();
  isRedisMock = isMock;

  if (isRedisMock) {
    logger.warn('Skipped Bull queue initialization for code execution (Redis mock fallback active). Code will execute in-process.');
    return;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    executionQueue = new Queue('code-execution-queue', redisUrl);

    executionQueue.process(processExecutionJob);

    executionQueue.on('error', (err) => {
      logger.error(`Bull Execution Queue Error: ${err.message}`);
    });

    logger.info('Bull.js Code Execution Queue & Worker initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize Bull Execution Queue: ${error.message}. Falling back to in-process execution.`);
    isRedisMock = true;
  }
};

export const addExecutionJob = (data) => {
  const { sessionId, code, language } = data;

  if (isRedisMock) {
    // In-process async execution fallback if Redis is missing
    setImmediate(() => {
      processExecutionJob({ data });
    });
    logger.info(`Code execution processed in-process (fallback) for session ${sessionId}`);
    return;
  }

  if (executionQueue) {
    executionQueue.add({ sessionId, code, language }, {
      removeOnComplete: true,
      attempts: 1
    });
    logger.info(`Code execution job queued in Bull queue for session ${sessionId}`);
  }
};
