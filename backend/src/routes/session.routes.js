import express from 'express';
import { 
  createSession, 
  joinSession, 
  listSessions, 
  deleteSession,
  getSessionDetails 
} from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Create new session
router.post('/', authenticate, createSession);

// Join session by invite code
router.post('/join', authenticate, joinSession);

// List all user's active sessions
router.get('/', authenticate, listSessions);

// Get specific session details
router.get('/:sessionId', authenticate, getSessionDetails);

// Delete session (soft delete)
router.delete('/:sessionId', authenticate, deleteSession);

export default router;
