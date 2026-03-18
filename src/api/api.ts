import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://56.228.4.127:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('dabba_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    console.error('API Error:', err.response?.status, err.response?.data);
    if (err.response?.status === 401 && err.response?.data?.message?.includes('token')) {
      await AsyncStorage.multiRemove(['dabba_token', 'dabba_partner']);
    }
    return Promise.reject(err);
  }
);

// Auth
export const registerPartner = (data: {
  name: string;
  phone: string;
  email: string;
  password: string;
  vehicleType: string;
}) => api.post('/api/partner/register', data);

export const loginPartner = (data: { email: string; password: string }) =>
  api.post('/api/partner/login', data);

// Partner
export const toggleOnline = () => api.put('/api/partner/toggle-online');

export const updateLocation = (lat: number, lng: number) =>
  api.put('/api/partner/location-update', {
    location: { type: 'Point', coordinates: [lng, lat] },
  });

export const getCurrentOrder = () => api.get('/api/partner/current-order');

export const getEarnings = () => api.get('/api/partner/earnings');

export const getPartnerProfile = () => api.get('/api/partner/profile');

export const getOrderHistory = () => api.get('/api/partner/order-history');

// Order
export const acceptOrder = (orderId: string) =>
  api.put('/api/order/accept', { orderId });

export const updateOrderStatus = (orderId: string, status: string) =>
  api.put('/api/order/status-update', { orderId, status });

export const confirmDeliveryOTP = (orderId: string, otp: string) =>
  api.post('/api/order/confirm-delivery', { orderId, otp });

// Wallet
export const requestWithdrawal = (amount: number) =>
  api.post('/api/partner/withdraw', { amount });

export default api;
