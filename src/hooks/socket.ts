import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://56.228.4.127:5000';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
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
export const emitLocationUpdate = (lat: number, lng: number) =>
  socket?.emit('locationUpdate', { lat, lng });
export const emitAcceptOrder = (orderId: string) =>
  socket?.emit('acceptOrder', { orderId });
export const emitRejectOrder = (orderId: string) =>
  socket?.emit('rejectOrder', { orderId });
export const emitOrderStatusUpdate = (orderId: string, status: string) =>
  socket?.emit('orderStatusUpdate', { orderId, status });
