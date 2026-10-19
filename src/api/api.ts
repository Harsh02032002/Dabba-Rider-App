import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Local backend port (override with EXPO_PUBLIC_API_PORT, e.g. to point at a demo backend)
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '5000';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return `http://localhost:${API_PORT}`;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:${API_PORT}`;
  }
  return 'https://dabbanation.in';
};

const BASE_URL = getBaseUrl();

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

export const sendPartnerLoginOtp = (data: { identifier: string; password?: string }) =>
  api.post('/api/partner/send-login-otp', {
    identifier: data.identifier,
    email: data.identifier,
    phone: data.identifier,
    password: data.password,
    role: 'delivery',
  });

export const verifyPartnerLoginOtp = (data: { identifier: string; otp: string }) =>
  api.post('/api/partner/verify-login-otp', {
    identifier: data.identifier,
    email: data.identifier,
    phone: data.identifier,
    otp: data.otp,
    role: 'delivery',
  });

// Partner
export const toggleOnline = (coords?: { lat: number; lng: number }) => api.put('/api/partner/toggle-online', coords || {});

export const updateLocation = (lat: number, lng: number) =>
  api.put('/api/partner/location-update', {
    lat,
    lng,
    location: { type: 'Point', coordinates: [lng, lat] },
  });

export const getCurrentOrder = () => api.get('/api/partner/current-order');

export const getAvailableOrders = () => api.get('/api/partner/available-orders');

export const getEarnings = () => api.get('/api/partner/earnings');

export const getPartnerProfile = () => api.get('/api/partner/profile');

export const getOrderHistory = () => api.get('/api/partner/order-history');

export const registerPushToken = (pushToken: string) =>
  api.post('/api/partner/push-token', { pushToken, fcmToken: pushToken });

// Order
export const acceptOrder = (orderId: string) =>
  api.post(`/api/partner/orders/${orderId}/accept`, { orderId });

export const updateOrderStatus = (orderId: string, status: string) =>
  api.put('/api/order/status-update', { orderId, status });

export const confirmDeliveryOTP = (orderId: string, otp: string) =>
  api.post('/api/order/confirm-delivery', { orderId, otp });

// Wallet
export const requestWithdrawal = (amount: number) =>
  api.post('/api/partner/withdraw', { amount });

// KYC Verification
export const getKycStatus = () => api.get('/api/partner/kyc');

export const uploadKycDocument = (formData: FormData) =>
  api.post('/api/partner/kyc/document', formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: (data) => data,
  });

export const submitKycDocuments = (data: {
  aadhaarNumber: string;
  aadhaarUrl: string;
  panNumber: string;
  panUrl: string;
  drivingLicenseNumber?: string;
  drivingLicenseUrl?: string;
  vehicleRCNumber?: string;
  vehicleRCUrl?: string;
}) => api.post('/api/partner/kyc/submit', data);

export default api;
