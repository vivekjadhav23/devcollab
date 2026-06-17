import express from 'express';
import { listSnapshots, restoreSnapshot } from '../controllers/snapshot.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get version history for a session
router.get('/sessions/:sessionId/snapshots', authenticate, listSnapshots);

// Revert workspace code state to a specific snapshot
router.post('/snapshots/:snapshotId/restore', authenticate, restoreSnapshot);

export default router;
