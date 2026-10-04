import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeSockets } from './sockets/index.js';
import { initializeMqttClient } from './iot/mqttClient.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  const app = createApp();
  const server = http.createServer(app);

  initializeSockets(server);
  initializeMqttClient();

  await connectDatabase();
  await connectRedis();

  const PORT = parseInt(env.PORT, 10) || 5000;

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    logger.info(`Health check available at http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((err) => {
  logger.error(`Fatal error during server startup: ${err.message}`, err);
  process.exit(1);
});
