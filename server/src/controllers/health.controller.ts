import { Request, Response } from 'express';
import { HealthCheckResponse } from '@smart-parking/shared';
import { isMongoConnected } from '../config/database.js';
import { isRedisConnected } from '../config/redis.js';

export const getHealthStatus = (_req: Request, res: Response) => {
  const healthData: HealthCheckResponse & { status: string } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        connected: isMongoConnected,
        status: isMongoConnected ? 'connected' : 'disconnected',
      },
      redis: {
        connected: isRedisConnected,
        status: isRedisConnected ? 'connected' : 'disconnected',
      },
    },
  };

  res.status(200).json(healthData);
};
