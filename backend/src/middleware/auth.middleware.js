import { verifyAccessToken } from '../utils/jwt.utils.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired access token' });
    }

    const user = await User.findById(decoded.userId).select('-refreshTokens');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      logger.warn('Socket connection rejected: No token provided');
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      logger.warn('Socket connection rejected: Invalid token');
      return next(new Error('Authentication error: Invalid token'));
    }

    const user = await User.findById(decoded.userId).select('-refreshTokens');
    if (!user) {
      logger.warn('Socket connection rejected: User not found');
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    logger.error(`Socket auth error: ${error.message}`);
    next(new Error('Authentication error: Internal error'));
  }
};
