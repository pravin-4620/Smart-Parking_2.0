import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/user.model.js';
import { UserRole } from '@smart-parking/shared';
import { env } from '../config/env.js';

let io: SocketIOServer | null = null;

export const initializeSockets = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing socket token');
      const payload = verifyToken(token);
      const user = await User.findById(payload.userId).select('role isActive');
      if (!user?.isActive) throw new Error('Inactive socket user');
      socket.data.user = { userId: user._id.toString(), role: user.role };
      next();
    } catch {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id}`);

    socket.join(`user:${socket.data.user.userId}`);
    if (socket.data.user.role === UserRole.ADMIN) socket.join('role:admin');
    socket.on('join:parking', (parkingLocationId: string) => {
      if (/^[a-f\d]{24}$/i.test(parkingLocationId)) socket.join(`parking:${parkingLocationId}`);
    });
    socket.on('leave:parking', (parkingLocationId: string) => socket.leave(`parking:${parkingLocationId}`));

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
  if (io) io.to(`parking:${data.parkingLocationId}`).to('role:admin').emit('slot:updated', data);
};

export const emitParkingUpdated = (data: any) => {
  if (io) io.to(`parking:${data.parkingLocationId}`).to('role:admin').emit('parking:updated', data);
};

export const emitReservationUpdated = (data: any) => {
  if (io) {
    const target = io.to(`parking:${data.parkingLocationId}`).to('role:admin');
    if (data.userId) target.to(`user:${data.userId}`).emit('reservation:updated', data);
    else target.emit('reservation:updated', data);
  }
};

export const emitSessionUpdated = (data: any) => {
  if (io) {
    const target = io.to(`parking:${data.parkingLocationId}`).to('role:admin');
    if (data.userId) target.to(`user:${data.userId}`).emit('session:updated', data);
    else target.emit('session:updated', data);
  }
};

export const emitDeviceUpdated = (data: any) => {
  if (io) io.to(`parking:${data.parkingLocationId}`).to('role:admin').emit('device:updated', data);
};

export const emitDeviceOffline = (data: any) => {
  if (io) io.to(`parking:${data.parkingLocationId}`).to('role:admin').emit('device:offline', data);
};

export const emitNotificationNew = (data: any) => {
  if (io && data.userId) io.to(`user:${data.userId}`).emit('notification:new', data);
};

export const emitPredictionUpdated = (data: any) => {
  if (io) io.emit('prediction:updated', data);
};
