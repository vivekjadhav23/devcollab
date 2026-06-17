import Session from '../models/session.model.js';
import { getRedis } from '../config/redis.js';
import logger from '../utils/logger.js';

// Create a new collaboration session
export const createSession = async (req, res) => {
  const { title, language } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Session title is required' });
  }

  try {
    const session = new Session({
      title,
      language: language || 'javascript',
      owner: req.user._id,
      participants: [req.user._id]
    });

    await session.save();

    // Seed initial code state in Redis (Expires in 7 days of inactivity)
    const redis = getRedis();
    const initialCode = `// Welcome to DevCollab! Session: ${title}\n// Language: ${language || 'javascript'}\n\n`;
    await redis.set(`session:${session._id}:code`, initialCode, 'EX', 7 * 24 * 60 * 60);

    logger.info(`Session created: ${session.inviteCode} by user ${req.user.username}`);
    res.status(201).json(session);
  } catch (error) {
    logger.error(`Create session error: ${error.message}`);
    res.status(500).json({ message: 'Failed to create session' });
  }
};

// Join an existing session using its 6-character invite code
export const joinSession = async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: 'Invite code is required' });
  }

  try {
    const session = await Session.findOne({ 
      inviteCode: inviteCode.toUpperCase(), 
      isActive: true 
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found or inactive' });
    }

    // Add user as participant if not already present
    if (!session.participants.includes(req.user._id)) {
      session.participants.push(req.user._id);
      await session.save();
    }

    logger.info(`User ${req.user.username} joined session: ${session.inviteCode}`);
    res.json(session);
  } catch (error) {
    logger.error(`Join session error: ${error.message}`);
    res.status(500).json({ message: 'Failed to join session' });
  }
};

// List recent active sessions where the user is an owner or participant
export const listSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      participants: req.user._id,
      isActive: true
    })
      .populate('owner', 'username avatarUrl')
      .populate('participants', 'username avatarUrl')
      .sort({ updatedAt: -1 });

    res.json(sessions);
  } catch (error) {
    logger.error(`List sessions error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

// Deactivate/Delete a session (Only session owner can do this)
export const deleteSession = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the session owner can delete this session' });
    }

    // Soft delete session
    session.isActive = false;
    await session.save();

    // Clean up Redis code state
    const redis = getRedis();
    await redis.del(`session:${sessionId}:code`);

    logger.info(`Session ${sessionId} soft-deleted by owner ${req.user.username}`);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    logger.error(`Delete session error: ${error.message}`);
    res.status(500).json({ message: 'Failed to delete session' });
  }
};

// Retrieve details for a single active workspace session
export const getSessionDetails = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await Session.findOne({ _id: sessionId, isActive: true })
      .populate('owner', 'username avatarUrl')
      .populate('participants', 'username avatarUrl');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    logger.error(`Get session details error: ${error.message}`);
    res.status(500).json({ message: 'Failed to retrieve session details' });
  }
};
