import { useEffect, useState } from 'react';
import {
  getSocket,
  joinParkingRoom,
  leaveParkingRoom,
  joinManagerRoom,
  joinAdminRoom,
  joinUserRoom,
  subscribeToSlotUpdated,
  subscribeToParkingUpdated,
  subscribeToReservationUpdated,
  subscribeToSessionUpdated,
  subscribeToDeviceUpdated,
  subscribeToDeviceOffline,
  subscribeToNotificationNew,
  subscribeToPredictionUpdated,
} from '../services/socket';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return {
    isConnected,
    socket: getSocket(),
    joinParkingRoom,
    leaveParkingRoom,
    joinManagerRoom,
    joinAdminRoom,
    joinUserRoom,
    subscribeToSlotUpdated,
    subscribeToParkingUpdated,
    subscribeToReservationUpdated,
    subscribeToSessionUpdated,
    subscribeToDeviceUpdated,
    subscribeToDeviceOffline,
    subscribeToNotificationNew,
    subscribeToPredictionUpdated,
  };
};
