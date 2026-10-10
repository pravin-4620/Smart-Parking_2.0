import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { initializeSockets } from "./sockets/index.js";
import { initializeMqttClient } from "./iot/mqttClient.js";
import { logger } from "./utils/logger.js";
import { startDeviceHealthMonitor } from "./iot/deviceHealth.service.js";
import { ReservationService } from "./services/reservation.service.js";

const startServer = async () => {
  const app = createApp();
  const server = http.createServer(app);

  initializeSockets(server);

  await connectDatabase();
  await connectRedis();
  initializeMqttClient();
  startDeviceHealthMonitor();
  const expireReservations = () => ReservationService.expirePendingReservations().catch((error) => logger.warn(`Reservation expiry check failed: ${error.message}`));
  void expireReservations();
  setInterval(expireReservations, 30000).unref();

  const PORT = parseInt(env.PORT, 10) || 5000;

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    logger.info(
      `Health check available at http://localhost:${PORT}/api/health`,
    );
  });
};

startServer().catch((err) => {
  logger.error(`Fatal error during server startup: ${err.message}`, err);
  process.exit(1);
});
