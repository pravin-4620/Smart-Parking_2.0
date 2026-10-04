import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export let isMongoConnected = false;

export const connectDatabase = async (): Promise<boolean> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    logger.info('MongoDB connected successfully');
    return true;
  } catch (error) {
    isMongoConnected = false;
    logger.warn('MongoDB connection warning: unable to connect. Continuing server initialization.');
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  isMongoConnected = false;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isMongoConnected = true;
  logger.info('MongoDB reconnected');
});
