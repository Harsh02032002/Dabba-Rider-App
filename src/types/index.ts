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
  kycStatus?: 'pending' | 'submitted' | 'verified' | 'rejected';
  kycRejectReason?: string;
  kycDocuments?: {
    aadhaar?: { number?: string; url?: string; status?: string };
    pan?: { number?: string; url?: string; status?: string };
    drivingLicense?: { number?: string; url?: string; status?: string };
    vehicleRC?: { number?: string; url?: string; status?: string };
  };
  currentLocation: GeoPoint;
  vehicleType: 'bike' | 'scooter' | 'car';
  earnings: number;
  rating: number;
  walletBalance: number;
  createdAt: string;
}

/** Kitchen / overall order status (backend Order.status) */
export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

/** Rider leg (backend Order.deliveryStatus) */
export type DeliveryStatus = 'assigned' | 'arrived_at_restaurant' | 'picked_up' | 'delivered';

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
  dropAddress?: string;
  deliveryAddress?: {
    location?: GeoPoint;
    fullAddress?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  status: OrderStatus;
  deliveryStatus?: DeliveryStatus | null;
  orderNumber?: string;
  paymentMethod?: string;
  totalAmount: number;
  total?: number;
  deliveryFee?: number;
  riderPayout?: number;
  payout?: number;
  isAssignedToMe?: boolean;
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
