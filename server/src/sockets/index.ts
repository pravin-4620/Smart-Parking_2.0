import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';

let io: SocketIOServer | null = null;

export const initializeSockets = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};

export const emitSlotUpdated = (data: any) => {
  if (io) io.emit('slot:updated', data);
};

export const emitParkingUpdated = (data: any) => {
  if (io) io.emit('parking:updated', data);
};

export const emitReservationUpdated = (data: any) => {
  if (io) io.emit('reservation:updated', data);
};

export const emitSessionUpdated = (data: any) => {
  if (io) io.emit('session:updated', data);
};

export const emitDeviceUpdated = (data: any) => {
  if (io) io.emit('device:updated', data);
};

export const emitDeviceOffline = (data: any) => {
  if (io) io.emit('device:offline', data);
};

export const emitNotificationNew = (data: any) => {
  if (io) io.emit('notification:new', data);
};

export const emitPredictionUpdated = (data: any) => {
  if (io) io.emit('prediction:updated', data);
};
