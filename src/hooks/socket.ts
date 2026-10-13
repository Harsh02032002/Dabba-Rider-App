import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getSocketConfig = () => {
  if (Platform.OS === 'web') {
    return {
      url: 'http://localhost:5000',
      path: '/socket.io',
    };
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return {
      url: `http://${ip}:5000`,
      path: '/socket.io',
    };
  }
  // Production fallback with /api/socket.io path
  return {
    url: 'https://dabbanation.in',
    path: '/api/socket.io',
  };
};

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  const config = getSocketConfig();
  console.log(`[Socket] Connecting to ${config.url} (path: ${config.path})`);

  socket = io(config.url, {
    path: config.path,
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected successfully:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitPartnerOnline = () => socket?.emit('partnerOnline');
export const emitPartnerOffline = () => socket?.emit('partnerOffline');
export const emitLocationUpdate = (lat: number, lng: number, orderId?: string) =>
  socket?.emit('locationUpdate', { lat, lng, orderId });
export const emitAcceptOrder = (orderId: string) =>
  socket?.emit('acceptOrder', { orderId });
export const emitRejectOrder = (orderId: string) =>
  socket?.emit('rejectOrder', { orderId });
export const emitOrderStatusUpdate = (orderId: string, status: string) =>
  socket?.emit('orderStatusUpdate', { orderId, status });
