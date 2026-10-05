import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Socket.IO Connected to Server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ Socket.IO Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚡ Socket.IO Connection Error:', err.message);
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

// Room Joiners
export const joinParkingRoom = (parkingLocationId: string) => {
  const s = getSocket();
  s.emit('join:parking', parkingLocationId);
};

export const leaveParkingRoom = (parkingLocationId: string) => {
  const s = getSocket();
  s.emit('leave:parking', parkingLocationId);
};

export const joinManagerRoom = () => {
  const s = getSocket();
  s.emit('join:manager');
};

export const joinAdminRoom = () => {
  const s = getSocket();
  s.emit('join:admin');
};

export const joinUserRoom = (userId: string) => {
  const s = getSocket();
  s.emit('join:user', userId);
};

// Event Listeners with Cleanup Functions
export const subscribeToSlotUpdated = (
  callback: (data: { parkingLocationId: string; slotId: string; slotNumber: string; status: string }) => void
) => {
  const s = getSocket();
  s.on('slot:updated', callback);
  s.on('slot:status', callback); // compatibility alias
  return () => {
    s.off('slot:updated', callback);
    s.off('slot:status', callback);
  };
};

export const subscribeToParkingUpdated = (
  callback: (data: {
    parkingLocationId: string;
    totalSlots: number;
    availableSlots: number;
    occupiedSlots: number;
    reservedSlots: number;
    occupancyRate: number;
  }) => void
) => {
  const s = getSocket();
  s.on('parking:updated', callback);
  s.on('parking:update', callback); // compatibility alias
  return () => {
    s.off('parking:updated', callback);
    s.off('parking:update', callback);
  };
};

export const subscribeToReservationUpdated = (
  callback: (data: { reservationId: string; status: string; parkingLocationId?: string; slotNumber?: string }) => void
) => {
  const s = getSocket();
  s.on('reservation:updated', callback);
  return () => s.off('reservation:updated', callback);
};

export const subscribeToSessionUpdated = (
  callback: (data: { sessionId: string; status: string; checkInTime?: string; checkOutTime?: string }) => void
) => {
  const s = getSocket();
  s.on('session:updated', callback);
  return () => s.off('session:updated', callback);
};

export const subscribeToDeviceUpdated = (
  callback: (data: { deviceId: string; status: string; lastHeartbeat?: string }) => void
) => {
  const s = getSocket();
  s.on('device:updated', callback);
  s.on('device:status', callback); // compatibility alias
  return () => {
    s.off('device:updated', callback);
    s.off('device:status', callback);
  };
};

export const subscribeToDeviceOffline = (
  callback: (data: { deviceId: string; status: string }) => void
) => {
  const s = getSocket();
  s.on('device:offline', callback);
  return () => s.off('device:offline', callback);
};

export const subscribeToNotificationNew = (
  callback: (data: { notificationId: string; title: string; message: string; type?: string }) => void
) => {
  const s = getSocket();
  s.on('notification:new', callback);
  return () => s.off('notification:new', callback);
};

export const subscribeToPredictionUpdated = (
  callback: (data: { parkingLocationId: string; predictedOccupancyRate: number; confidenceScore?: number }) => void
) => {
  const s = getSocket();
  s.on('prediction:updated', callback);
  return () => s.off('prediction:updated', callback);
};
