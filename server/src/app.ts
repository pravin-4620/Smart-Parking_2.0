import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/logger.middleware.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { env } from './config/env.js';

export const createApp = (): Express => {
  const app = express();

  // Helmet Security Headers
  app.use(helmet());

  // CORS Configuration
  app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }));

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(requestLogger);
  app.use('/api', apiRateLimiter);

  app.use('/api', routes);

  app.use(errorHandler);

  return app;
};
