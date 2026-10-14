import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal, Linking, Platform, StatusBar, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentOrder, updateOrderStatus, confirmDeliveryOTP } from '../api/api';
import { emitOrderStatusUpdate, emitLocationUpdate, getSocket } from '../hooks/socket';
import { Order, DeliveryStatus } from '../types';
import { theme } from '../theme/colors';
import RiderMap from '../components/RiderMap'; // ✅ FREE — uses OpenStreetMap, no API key needed

const { width, height } = Dimensions.get('window');

/** Rider leg steps — mirrors backend Order.deliveryStatus */
const statusFlow: { status: DeliveryStatus; label: string; next: DeliveryStatus | null; icon: string }[] = [
  { status: 'assigned', label: 'Reached Restaurant', next: 'arrived_at_restaurant', icon: 'storefront-outline' },
  { status: 'arrived_at_restaurant', label: 'Picked Up — Start Delivery', next: 'picked_up', icon: 'bag-check-outline' },
  { status: 'picked_up', label: 'Deliver to Customer', next: 'delivered', icon: 'bicycle-outline' },
  { status: 'delivered', label: 'Delivered', next: null, icon: 'checkmark-circle' },
];

/** Older orders have no deliveryStatus — derive it from the kitchen status */
const getDeliveryStep = (order: Order | null): DeliveryStatus => {
  if (!order) return 'assigned';
  if (order.status === 'delivered') return 'delivered';
  if (order.deliveryStatus) return order.deliveryStatus;
  return order.status === 'out_for_delivery' ? 'picked_up' : 'assigned';
};

const KITCHEN_HINTS: Record<string, string> = {
  confirmed: 'Restaurant confirmed the order — food is being prepared',
  preparing: 'Food is being prepared',
  ready: 'Food is ready for pickup',
};

const ActiveOrderScreen = ({ navigation, route }: any) => {
  const passedOrder = route?.params?.order as Order | undefined;
  const isReadOnly = route?.params?.readonly === true;

  const [order, setOrder] = useState<Order | null>(passedOrder || null);
  const [loading, setLoading] = useState(!passedOrder);
  const [updating, setUpdating] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number; heading?: number | null } | null>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // Always load the latest persisted state for the active delivery (passed params can be stale)
  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await getCurrentOrder();
      if (data?.order && (!passedOrder || String(data.order._id) === String(passedOrder._id))) {
        setOrder(data.order);
      } else if (!passedOrder) {
        navigation.goBack();
      }
    } catch {
      if (!passedOrder) navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation, passedOrder]);

  useEffect(() => {
    if (!isReadOnly) fetchOrder();
  }, [fetchOrder, isReadOnly]);

  // Kitchen updates (preparing / ready) and cancellation for this order
  useEffect(() => {
    const socket = getSocket();
    if (!socket || isReadOnly || !order?._id) return;
    const orderId = String(order._id);
    const onUpdate = (data: any) => {
      if (String(data?.orderId) !== orderId) return;
      setOrder((prev) => (prev ? {
        ...prev,
        status: data.status || prev.status,
        deliveryStatus: data.deliveryStatus !== undefined ? data.deliveryStatus : prev.deliveryStatus,
      } : prev));
    };
    const onCancelled = (data: any) => {
      if (String(data?.orderId) !== orderId) return;
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
      Alert.alert('Order Cancelled', 'This order was cancelled. You are free to accept other orders.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    };
    socket.on('order_status_update', onUpdate);
    socket.on('order_ready', onUpdate);
    socket.on('orderCancelled', onCancelled);
    return () => {
      socket.off('order_status_update', onUpdate);
      socket.off('order_ready', onUpdate);
      socket.off('orderCancelled', onCancelled);
    };
  }, [isReadOnly, order?._id, navigation]);

  // Live location tracking for rider (watchPositionAsync + fallback interval)
  useEffect(() => {
    if (isReadOnly || order?.status === 'delivered') return;
    let isMounted = true;

    const pushCoords = (coords: Location.LocationObjectCoords) => {
      if (!isMounted) return;
      const { latitude, longitude, heading, speed } = coords;
      setRiderLocation({ lat: latitude, lng: longitude, heading: heading ?? null });
      if (order?._id) {
        emitLocationUpdate(latitude, longitude, order._id, heading ?? null, speed ?? null);
      } else {
        emitLocationUpdate(latitude, longitude, undefined, heading ?? null, speed ?? null);
      }
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !isMounted) return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        pushCoords(loc.coords);
      } catch {}

      try {
        locationSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 4,
          },
          (loc) => pushCoords(loc.coords),
        );
      } catch {}

      locationInterval.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          pushCoords(loc.coords);
        } catch {}
      }, 5000);
    })();

    return () => {
      isMounted = false;
      if (locationInterval.current) clearInterval(locationInterval.current);
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, [isReadOnly, order?._id, order?.status]);

  const handleStatusUpdate = async (nextStatus: DeliveryStatus) => {
    if (!order || updating) return;
    if (nextStatus === 'delivered') { setShowOTPModal(true); return; }
    setUpdating(true);
    try {
      const { data } = await updateOrderStatus(order._id, nextStatus);
      emitOrderStatusUpdate(order._id, nextStatus);
      if (data?.order) {
        setOrder((prev) => (prev ? { ...prev, status: data.order.status, deliveryStatus: data.order.deliveryStatus } : prev));
      }
      Alert.alert(
        'Status Updated',
        nextStatus === 'picked_up' ? 'Order picked up. The customer has been notified.' : 'Restaurant notified that you have arrived.',
      );
    } catch (err: any) {
      const message = err.response?.data?.message || (err.response ? 'Failed to update status.' : 'Network error. Please try again.');
      Alert.alert('Error', message);
      if (err.response?.status === 409) fetchOrder(); // resync after a conflict
    } finally {
      setUpdating(false);
    }
  };

  const handleOTPConfirm = async () => {
    if (!order || updating) return;
    if (otp.length !== 4) { setOtpError('Please enter the 4-digit OTP'); return; }
    setUpdating(true);
    setOtpError('');
    try {
      const { data } = await confirmDeliveryOTP(order._id, otp);
      emitOrderStatusUpdate(order._id, 'delivered');
      if (locationInterval.current) {
        clearInterval(locationInterval.current);
        locationInterval.current = null;
      }
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
      setShowOTPModal(false);
      setOrder((prev) => (prev ? { ...prev, status: 'delivered', deliveryStatus: 'delivered' } : prev));
      const earned = data?.payout || order.payout || order.riderPayout || order.deliveryFee || 30;
      Alert.alert(
        'Order Delivered',
        data?.alreadyDelivered
          ? 'This order was already marked delivered.'
          : `Order delivered successfully!\n₹${earned} has been added to your earnings & wallet!`,
        [{ text: 'Great!', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      setOtpError(err.response?.data?.message || (err.response ? 'Invalid OTP. Try again.' : 'Network error. Please try again.'));
    } finally {
      setUpdating(false);
    }
  };

  const openNavigation = (lat: number, lng: number, label: string) => {
    const url = Platform.OS === 'ios'
      ? `maps:${lat},${lng}?q=${encodeURIComponent(label)}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`;
    const fallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.canOpenURL(url)
      .then((can) => Linking.openURL(can ? url : fallback))
      .catch(() => Linking.openURL(fallback));
  };

  const callCustomer = (phone?: string) => {
    if (!phone) { Alert.alert('Not available', 'Customer phone not available'); return; }
    Linking.openURL(`tel:${phone}`);
  };

  // Parse coordinates from order
  const pickupCoords = order?.pickupLocation?.coordinates;
  const dropCoords = order?.dropLocation?.coordinates || order?.deliveryAddress?.location?.coordinates;

  // [lng, lat] in GeoJSON → we need [lat, lng]
  let pickupLat = pickupCoords ? pickupCoords[1] : 30.7325;
  let pickupLng = pickupCoords ? pickupCoords[0] : 76.7410;
  let dropLat = dropCoords ? dropCoords[1] : (pickupLat + 0.005);
  let dropLng = dropCoords ? dropCoords[0] : (pickupLng + 0.005);

  const deliveryStrCheck = `${typeof order?.deliveryAddress === 'string' ? order.deliveryAddress : ((order?.deliveryAddress as any)?.fullAddress || (order?.deliveryAddress as any)?.street || '')}`.toLowerCase();
  if (deliveryStrCheck.includes('sector 40') || deliveryStrCheck.includes('sec 40') || deliveryStrCheck.includes('40-d') || deliveryStrCheck.includes('40d')) {
    dropLat = 30.7385;
    dropLng = 76.7375;
  } else if (deliveryStrCheck.includes('sector 41') || deliveryStrCheck.includes('sec 41') || deliveryStrCheck.includes('buterla')) {
    dropLat = 30.7325;
    dropLng = 76.7410;
  } else if (deliveryStrCheck.includes('sector 37') || deliveryStrCheck.includes('sec 37')) {
    dropLat = 30.7420;
    dropLng = 76.7550;
  }

  const pickupStrCheck = `${order?.restaurantName || ''} ${order?.pickupAddress || ''}`.toLowerCase();
  if (pickupStrCheck.includes('sector 41') || pickupStrCheck.includes('buterla') || pickupStrCheck.includes('geeta')) {
    pickupLat = 30.7325;
    pickupLng = 76.7410;
  }

  const deliveryStep = getDeliveryStep(order);
  const currentStep = statusFlow.find((s) => s.status === deliveryStep);
  const stepIndex = statusFlow.findIndex((s) => s.status === deliveryStep);
  const kitchenHint = deliveryStep === 'assigned' || deliveryStep === 'arrived_at_restaurant'
    ? KITCHEN_HINTS[order?.status || '']
    : undefined;

  const customerPhone = (order as any)?.userId?.phone || (order as any)?.customerPhone;
  const customerName = order?.customerName || 'Customer';

  const deliveryAddrStr = typeof order?.deliveryAddress === 'string'
    ? order.deliveryAddress
    : (order?.deliveryAddress as any)?.fullAddress || `${(order?.deliveryAddress as any)?.street || ''}, ${(order?.deliveryAddress as any)?.city || ''}`.replace(/^, |, $/, '') || 'Customer Address';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!order) return null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />

      {/* ── Free Leaflet Map (OpenStreetMap, no API key) ── */}
      <View style={styles.mapContainer}>
        <RiderMap
          pickupLat={pickupLat}
          pickupLng={pickupLng}
          pickupLabel={order.restaurantName || 'Pickup'}
          dropLat={dropLat}
          dropLng={dropLng}
          dropLabel={customerName}
          riderLat={riderLocation?.lat}
          riderLng={riderLocation?.lng}
          riderHeading={riderLocation?.heading}
          deliveryStage={
            deliveryStep === 'delivered'
              ? 'delivered'
              : deliveryStep === 'picked_up'
              ? 'to_customer'
              : 'to_restaurant'
          }
        />

        {/* Back button overlay */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>

        {/* Title overlay */}
        <View style={styles.mapTitle}>
          <Text style={styles.mapTitleText}>Order Details</Text>
        </View>
      </View>

      {/* ── Bottom Sheet ── */}
      <ScrollView style={styles.bottomSheet} showsVerticalScrollIndicator={false}>

        {/* Pickup Location */}
        <View style={styles.locationRow}>
          <View style={styles.orangeDot} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Pickup Location</Text>
            <Text style={styles.locationName} numberOfLines={1}>{order.restaurantName || 'Restaurant'}</Text>
            <Text style={styles.locationAddr} numberOfLines={2}>{order.pickupAddress || 'Restaurant Address'}</Text>
          </View>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => openNavigation(pickupLat, pickupLng, order.restaurantName || 'Pickup')}
          >
            <Ionicons name="navigate" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.routeLine} />

        {/* Drop Location */}
        <View style={styles.locationRow}>
          <View style={styles.greenDot} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Drop Location</Text>
            <Text style={styles.locationAddr} numberOfLines={2}>{deliveryAddrStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.navIconBtn}
            onPress={() => openNavigation(dropLat, dropLng, 'Customer Location')}
          >
            <Ionicons name="navigate" size={18} color="#22C55E" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Customer Info */}
        <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitial}>{customerName[0]?.toUpperCase() || 'C'}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerLabel}>Customer: {customerName}</Text>
            {customerPhone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="call-outline" size={13} color="#6B7280" />
                <Text style={styles.customerPhone}>{customerPhone}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => callCustomer(customerPhone)}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Payment & Earning Info */}
        <View style={styles.paymentRow}>
          <View style={styles.paymentIconBox}>
            <Ionicons name="wallet-outline" size={20} color={theme.primary} />
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.paymentMode}>
              {order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)'
                : order.paymentMethod === 'razorpay' ? 'Paid Online (Razorpay)'
                : order.paymentMethod ? String(order.paymentMethod).toUpperCase()
                : 'Cash on Delivery (COD)'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <Ionicons name="bicycle-outline" size={14} color="#16A34A" />
              <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
                Delivery Fee (Your Earning): ₹{order.payout || order.riderPayout || order.deliveryFee || 30}
              </Text>
            </View>
          </View>
          <Text style={styles.paymentAmt}>₹{order.totalAmount || order.total || 0}</Text>
        </View>

        <View style={styles.divider} />

        {!isReadOnly && kitchenHint ? (
          <View style={[styles.kitchenBanner, order.status === 'ready' && styles.kitchenBannerReady, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <Ionicons
              name={order.status === 'ready' ? 'checkmark-circle' : 'restaurant-outline'}
              size={18}
              color={order.status === 'ready' ? '#166534' : '#92400E'}
            />
            <Text style={[styles.kitchenBannerText, order.status === 'ready' && styles.kitchenBannerTextReady, { flex: 1 }]}>
              {kitchenHint}
            </Text>
          </View>
        ) : null}

        {/* Status Steps */}
        {!isReadOnly && (
          <View style={styles.statusSteps}>
            {statusFlow.map((step, idx) => (
              <React.Fragment key={step.status}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepDot,
                    idx < stepIndex ? styles.stepDone :
                    idx === stepIndex ? styles.stepActive : styles.stepPending,
                  ]}>
                    {idx < stepIndex
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <View style={[styles.stepInner, { backgroundColor: idx === stepIndex ? theme.primary : '#D1D5DB' }]} />
                    }
                  </View>
                  <Text style={[styles.stepLabel, idx === stepIndex ? styles.stepLabelActive : styles.stepLabelPending]} numberOfLines={2}>
                    {step.label}
                  </Text>
                </View>
                {idx < statusFlow.length - 1 && <View style={styles.stepConnector} />}
              </React.Fragment>
            ))}
          </View>
        )}

        {/* Action Button */}
        {!isReadOnly && currentStep && currentStep.next && (
          <TouchableOpacity
            style={[styles.actionBtn, updating && { opacity: 0.7 }]}
            onPress={() => handleStatusUpdate(currentStep.next!)}
            disabled={updating}
            activeOpacity={0.85}
          >
            {updating
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name={currentStep.icon as any} size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>{currentStep.label}</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {!isReadOnly && order.status === 'delivered' && (
          <View style={styles.deliveredBanner}>
            <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
            <Text style={styles.deliveredText}>Order Delivered Successfully!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={showOTPModal} transparent animationType="slide">
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Enter Delivery OTP</Text>
            <Text style={styles.otpDesc}>Ask the customer for the 4-digit OTP to confirm delivery</Text>
            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={4}
              placeholder="_ _ _ _"
              placeholderTextColor="#D1D5DB"
              textAlign="center"
            />
            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}
            <View style={styles.otpActions}>
              <TouchableOpacity
                style={styles.otpCancel}
                onPress={() => { setShowOTPModal(false); setOtp(''); setOtpError(''); }}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpConfirm, updating && { opacity: 0.7 }]}
                onPress={handleOTPConfirm}
                disabled={updating}
              >
                {updating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.otpConfirmText}>Confirm Delivery</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },

  // Map
  mapContainer: { height: height * 0.44, position: 'relative', backgroundColor: '#E8F4FD' },
  backBtn: {
    position: 'absolute', top: 48, left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6,
  },
  mapTitle: {
    position: 'absolute', top: 48, alignSelf: 'center',
    backgroundColor: '#fff', paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20, elevation: 3, zIndex: 10,
    left: width / 2 - 65,
  },
  mapTitleText: { fontSize: 15, fontWeight: '700', color: '#111827' },

  // Bottom Sheet
  bottomSheet: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20 },

  // Location rows
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 4 },
  orangeDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.primary, marginTop: 4 },
  greenDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', marginTop: 4 },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  locationName: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 2 },
  locationAddr: { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18 },
  navIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  routeLine: { width: 2, height: 18, backgroundColor: '#E5E7EB', marginLeft: 6, marginVertical: 3 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },

  // Customer
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
  customerInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },
  customerInfo: { flex: 1 },
  customerLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  customerPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },

  // Payment
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF4ED', justifyContent: 'center', alignItems: 'center' },
  paymentMode: { flex: 1, fontSize: 14, fontWeight: '700', color: '#374151' },
  paymentAmt: { fontSize: 20, fontWeight: '900', color: '#111827' },

  // Status steps
  statusSteps: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 20 },
  stepItem: { alignItems: 'center', width: 90 },
  stepConnector: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginTop: 14 },
  stepDot: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepDone: { backgroundColor: '#22C55E' },
  stepActive: { backgroundColor: '#FFF4ED', borderWidth: 2.5, borderColor: theme.primary },
  stepPending: { backgroundColor: '#F3F4F6' },
  stepInner: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  stepLabelActive: { color: theme.primary },
  stepLabelPending: { color: '#9CA3AF' },

  // Action button
  actionBtn: {
    backgroundColor: '#111827', borderRadius: 16, height: 58,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12,
  },
  actionBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  kitchenBanner: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  kitchenBannerReady: { backgroundColor: '#DCFCE7' },
  kitchenBannerText: { fontSize: 13, fontWeight: '700', color: '#9A3412' },
  kitchenBannerTextReady: { color: '#15803D' },
  deliveredBanner: {
    backgroundColor: '#DCFCE7', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  deliveredText: { fontSize: 15, fontWeight: '700', color: '#15803D' },

  // OTP Modal
  otpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  otpCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 },
  otpTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 8 },
  otpDesc: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
  otpInput: {
    height: 72, borderWidth: 2.5, borderColor: theme.primary, borderRadius: 16,
    fontSize: 34, fontWeight: '900', color: '#111827', letterSpacing: 14, marginBottom: 12,
  },
  otpError: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12 },
  otpActions: { flexDirection: 'row', gap: 12 },
  otpCancel: { flex: 1, height: 54, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  otpCancelText: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  otpConfirm: { flex: 2, height: 54, borderRadius: 14, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
  otpConfirmText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

export default ActiveOrderScreen;
