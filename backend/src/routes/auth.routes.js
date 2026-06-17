import express from 'express';
import { 
  githubRedirect, 
  githubCallback, 
  googleRedirect,
  googleCallback,
  refresh, 
  logout, 
  getMe, 
  mockLogin 
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Redirect to GitHub login page
router.get('/github', authLimiter, githubRedirect);

// GitHub OAuth callback
router.get('/github/callback', githubCallback);

// Redirect to Google login page
router.get('/google', authLimiter, googleRedirect);

// Google OAuth callback
router.get('/google/callback', googleCallback);

// Token refresh endpoint (Silent refresh)
router.post('/refresh', refresh);

// Logout user
router.post('/logout', logout);

// Get currently logged-in user profile details
router.get('/me', authenticate, getMe);

// Mock login (Development only bypass)
router.get('/mock', mockLogin);

export default router;
