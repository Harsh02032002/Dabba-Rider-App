export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface DeliveryPartner {
  _id: string;
  name: string;
  phone: string;
  email: string;
  isApproved: boolean;
  isOnline: boolean;
  currentLocation: GeoPoint;
  vehicleType: 'bike' | 'scooter' | 'car';
  earnings: number;
  rating: number;
  walletBalance: number;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'searching' | 'accepted' | 'picked' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  userId: string;
  restaurantId: string;
  restaurantName?: string;
  customerName?: string;
  deliveryPartnerId?: string;
  pickupLocation?: GeoPoint;
  pickupAddress?: string;
  dropLocation?: GeoPoint;
  deliveryAddress?: {
    location?: GeoPoint;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  status: OrderStatus;
  totalAmount: number;
  deliveryFee?: number;
  distance?: number;
  deliveryOTP?: string;
  createdAt: string;
  updatedAt: string;
  restaurantAddress?: {
    location?: GeoPoint;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export interface Earning {
  _id: string;
  partnerId: string;
  orderId: string;
  amount: number;
  commission: number;
  netAmount: number;
  status: 'pending' | 'credited' | 'paid';
  createdAt: string;
}

export interface EarningsSummary {
  today: number;
  week: number;
  total: number;
  ordersToday: number;
  ordersTotal: number;
  walletBalance: number;
}

export interface AuthResponse {
  token: string;
  partner: DeliveryPartner;
}

export interface IncomingOrderRequest {
  order: Order;
  timeout: number;
}
