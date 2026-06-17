import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devcollab';
    const conn = await mongoose.connect(mongoURI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
