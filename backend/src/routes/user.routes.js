import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get specific user profile info by ID (excluding tokens)
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('username avatarUrl email createdAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error(`Get user profile error: ${error.message}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
