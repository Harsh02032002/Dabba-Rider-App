import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl,
  ActivityIndicator, Switch, StatusBar, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  toggleOnline,
  getCurrentOrder,
  getOrderHistory,
  getEarnings,
  getAvailableOrders,
  getKycStatus,
} from '../api/api';
import {
  getSocket, emitPartnerOnline, emitPartnerOffline, emitLocationUpdate,
} from '../hooks/socket';
import { Order, IncomingOrderRequest } from '../types';
import IncomingOrderModal from '../components/IncomingOrderModal';
import RiderMap from '../components/RiderMap';
import { theme } from '../theme/colors';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }: any) => {
  const { partner, updatePartner } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrderRequest | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [kycInfo, setKycInfo] = useState<{ kycStatus: string; isApproved: boolean; rejectReason?: string | null }>({
    kycStatus: partner?.kycStatus || 'pending',
    isApproved: !!partner?.isApproved,
    rejectReason: partner?.kycRejectReason || null,
  });
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeOrderRef = useRef<Order | null>(null);
  activeOrderRef.current = activeOrder;

  useEffect(() => {
    if (partner?.isOnline !== undefined) setIsOnline(partner.isOnline);
    if (partner?.kycStatus) {
      setKycInfo((prev) => ({
        ...prev,
        kycStatus: partner.kycStatus || prev.kycStatus,
        isApproved: !!partner.isApproved,
      }));
    }
  }, [partner]);

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, historyRes, earningsRes, availableRes, kycRes] = await Promise.allSettled([
        getCurrentOrder(),
        getOrderHistory(),
        getEarnings(),
        getAvailableOrders(),
        getKycStatus(),
      ]);

      if (orderRes.status === 'fulfilled' && orderRes.value.data?.order) {
        setActiveOrder(orderRes.value.data.order);
      } else {
        setActiveOrder(null);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data?.orders) {
        const orders: Order[] = historyRes.value.data.orders;
        setRecentOrders(orders.slice(0, 10));
        const today = new Date().toDateString();
        const todayDelivered = orders.filter(
          (o) => new Date(o.createdAt).toDateString() === today && o.status === 'delivered'
        );
        setCompletedToday(todayDelivered.length);
        setTotalCompleted(orders.filter((o) => o.status === 'delivered').length);
      }

      if (earningsRes.status === 'fulfilled') {
        const data = earningsRes.value.data;
        const summary = data?.summary;
        if (summary?.today != null) {
          setTodayEarnings(summary.today);
        } else if (data?.todayEarnings != null) {
          setTodayEarnings(data.todayEarnings);
        }
      }

      if (availableRes.status === 'fulfilled' && availableRes.value.data?.orders) {
        setAvailableOrders(availableRes.value.data.orders.slice(0, 3));
      }

      if (kycRes.status === 'fulfilled' && kycRes.value.data?.success) {
        const kData = kycRes.value.data;
        setKycInfo({
          kycStatus: kData.kycStatus || 'pending',
          isApproved: !!kData.isApproved,
          rejectReason: kData.kycRejectReason || null,
        });
        updatePartner({
          kycStatus: kData.kycStatus,
          isApproved: !!kData.isApproved,
        });
      }
    } catch (e) {
      console.log('Fetch error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [updatePartner]);

  useEffect(() => { fetchData(); }, [fetchData]);
  // Re-sync when coming back from ActiveOrder / Orders (accept, pickup, delivery)
  useEffect(() => navigation.addListener('focus', fetchData), [navigation, fetchData]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (data: any) => {
      if (!data) return;
      const orderData = data.order || data;
      // Already delivering at capacity — the request stays visible in the Orders tab
      if (activeOrderRef.current) return;
      setIncomingOrder({
        order: {
          _id: orderData._id || orderData.orderId,
          orderNumber: orderData.orderNumber,
          restaurantName: orderData.restaurantName || orderData.sellerName,
          customerName: orderData.customerName,
          pickupAddress: orderData.pickupAddress,
          dropAddress: orderData.dropAddress || orderData.deliveryAddress?.street,
          totalAmount: orderData.totalAmount || orderData.total,
          deliveryFee: orderData.riderPayout || orderData.deliveryFee,
          distance: orderData.distance,
          status: 'pending',
          createdAt: orderData.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        timeout: data.timeout || 30,
      });
    };

    const handleOrderAssigned = (data: any) => {
      setIncomingOrder(null);
      if (data?.order) {
        setActiveOrder(data.order);
        navigation.navigate('ActiveOrder', { order: data.order });
      }
    };
    // Another rider accepted (or the order was withdrawn) — close the request if it is showing
    const handleRequestTaken = (data: any) => {
      const id = String(data?.orderId || '');
      setIncomingOrder((prev) => (prev && String(prev.order._id) === id ? null : prev));
    };
    const handleOrderCancelled = (data: any) => {
      handleRequestTaken(data);
      setActiveOrder((prev) => {
        if (prev && String(prev._id) === String(data?.orderId)) {
          Alert.alert('Order Cancelled', `Order #${data?.orderNumber || ''} was cancelled. You are free to accept other orders.`);
          return null;
        }
        return prev;
      });
      fetchData();
    };
    const handleOrderReady = (data: any) => {
      Alert.alert('Order Ready for Pickup', data?.message || `Order #${data?.orderNumber || ''} is ready.`);
      fetchData();
    };
    const handleOrderDelivered = () => {
      setActiveOrder(null);
      fetchData();
    };

    socket.on('delivery_request', handleNewOrder);
    socket.on('newDeliveryRequest', handleNewOrder);
    socket.on('delivery_request_taken', handleRequestTaken);
    socket.on('orderAssigned', handleOrderAssigned);
    socket.on('orderCancelled', handleOrderCancelled);
    socket.on('order_ready', handleOrderReady);
    socket.on('orderDelivered', handleOrderDelivered);

    return () => {
      socket.off('delivery_request', handleNewOrder);
      socket.off('newDeliveryRequest', handleNewOrder);
      socket.off('delivery_request_taken', handleRequestTaken);
      socket.off('orderAssigned', handleOrderAssigned);
      socket.off('orderCancelled', handleOrderCancelled);
      socket.off('order_ready', handleOrderReady);
      socket.off('orderDelivered', handleOrderDelivered);
    };
  }, [fetchData, navigation]);

  const startLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    locationInterval.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        emitLocationUpdate(
          loc.coords.latitude,
          loc.coords.longitude,
           undefined,
          loc.coords.heading ?? null,
          loc.coords.speed ?? null,
        );
      } catch {}
    }, 5000);
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (locationInterval.current) {
      clearInterval(locationInterval.current);
      locationInterval.current = null;
    }
  }, []);

  const handleToggleOnline = async () => {
    if (!kycInfo.isApproved || kycInfo.kycStatus !== 'verified') {
      Alert.alert(
        'KYC Verification Required',
        kycInfo.kycStatus === 'submitted'
          ? 'Aapke KYC documents review me hain. Admin approval ke baad aap online ja sakte hain.'
          : 'Online jaane ke liye pehle KYC verification complete karein (PAN & Aadhaar zaroori hain).',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Verify Now', onPress: () => navigation.navigate('KycVerification') },
        ]
      );
      return;
    }

    setToggling(true);
    try {
      let coords: any = {};
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            emitLocationUpdate(
              loc.coords.latitude,
              loc.coords.longitude,
              undefined,
              loc.coords.heading ?? null,
              loc.coords.speed ?? null,
            );
          }
        }
      } catch {}
      await toggleOnline(coords);
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await updatePartner({ isOnline: newStatus });
      if (newStatus) { emitPartnerOnline(); startLocationTracking(); }
      else { emitPartnerOffline(); stopLocationTracking(); }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to toggle status. Check internet connection.';
      Alert.alert('Notice', msg, [
        { text: 'OK' },
        ...(!kycInfo.isApproved ? [{ text: 'Upload KYC', onPress: () => navigation.navigate('KycVerification') }] : [])
      ]);
    } finally {
      setToggling(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await fetchData(); };

  const getOrderTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const getOrderDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Orange Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rider Dashboard</Text>
          <Text style={styles.headerSubtitle}>{partner?.name || 'Delivery Partner'}</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {(partner?.name || 'R')[0].toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Online Status Card */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={styles.statusLeft}>
            <View style={styles.statusDotWrapper}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4ADE80' : '#9CA3AF' }]} />
            </View>
            <View>
              <Text style={styles.statusTitle}>{isOnline ? 'Online' : 'Offline'}</Text>
              <Text style={styles.statusDesc}>
                {isOnline ? 'You are online — ready to receive orders' : 'You are offline — toggle to start receiving'}
              </Text>
            </View>
          </View>
          {toggling ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              thumbColor="#fff"
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.8)' }}
              ios_backgroundColor="rgba(255,255,255,0.3)"
            />
          )}
        </View>

        {/* KYC Status Banner */}
        {(!kycInfo.isApproved || kycInfo.kycStatus !== 'verified') && (
          <TouchableOpacity
            style={[
              styles.dashboardKycBanner,
              kycInfo.kycStatus === 'submitted'
                ? styles.dashboardKycSubmitted
                : kycInfo.kycStatus === 'rejected'
                ? styles.dashboardKycRejected
                : styles.dashboardKycPending,
            ]}
            onPress={() => navigation.navigate('KycVerification')}
            activeOpacity={0.85}
          >
            <View style={styles.dashboardKycIcon}>
              <Ionicons
                name={
                  kycInfo.kycStatus === 'submitted'
                    ? 'time'
                    : kycInfo.kycStatus === 'rejected'
                    ? 'alert-circle'
                    : 'shield-outline'
                }
                size={24}
                color={
                  kycInfo.kycStatus === 'submitted'
                    ? '#B45309'
                    : kycInfo.kycStatus === 'rejected'
                    ? '#B91C1C'
                    : '#1D4ED8'
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.dashboardKycTitle,
                  {
                    color:
                      kycInfo.kycStatus === 'submitted'
                        ? '#92400E'
                        : kycInfo.kycStatus === 'rejected'
                        ? '#991B1B'
                        : '#1E40AF',
                  },
                ]}
              >
                {kycInfo.kycStatus === 'submitted'
                  ? 'Verification Under Review'
                  : kycInfo.kycStatus === 'rejected'
                  ? 'KYC Verification Rejected'
                  : 'KYC Document Verification Required'}
              </Text>
              <Text style={styles.dashboardKycDesc}>
                {kycInfo.kycStatus === 'submitted'
                  ? 'Admin review chal raha hai. Approval ke baad orders unlock honge.'
                  : kycInfo.kycStatus === 'rejected'
                  ? 'Documents reject ho gaye hain. Tap karke dobara upload karein.'
                  : 'PAN aur Aadhaar card upload karke account active karein.'}
              </Text>
            </View>
            <View style={styles.kycActionBtn}>
              <Text style={styles.kycActionBtnText}>
                {kycInfo.kycStatus === 'submitted' ? 'View' : 'Upload'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="wallet-outline" size={22} color={theme.primary} />
            </View>
            <Text style={styles.statValue}>₹{todayEarnings}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={styles.statSub}>+₹{Math.round(todayEarnings * 0.15)} vs yesterday</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="cube-outline" size={22} color={theme.primary} />
            </View>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed Deliveries</Text>
            <Text style={styles.statSub}>{completedToday} deliveries today</Text>
          </View>
        </View>

        {/* Available Orders Section (2-3 orders on dashboard) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cube" size={20} color={theme.primary} />
              <Text style={styles.sectionTitle}>Available Orders</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {!kycInfo.isApproved ? (
            <View style={styles.kycOrderLockCard}>
              <Ionicons name="lock-closed" size={32} color="#9CA3AF" />
              <Text style={styles.kycLockTitle}>Orders Locked</Text>
              <Text style={styles.kycLockSubtitle}>
                {kycInfo.kycStatus === 'submitted'
                  ? 'Aapke KYC documents review me hain. Admin approval ke baad orders unlock honge.'
                  : 'Orders dekhne aur accept karne ke liye KYC document verification complete karein.'}
              </Text>
              {kycInfo.kycStatus !== 'submitted' && (
                <TouchableOpacity
                  style={styles.kycLockBtn}
                  onPress={() => navigation.navigate('KycVerification')}
                >
                  <Text style={styles.kycLockBtnText}>Upload Documents</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : availableOrders.length > 0 ? (
            availableOrders.map((ord, idx) => (
              <TouchableOpacity
                key={ord._id || idx}
                style={styles.availableOrderCard}
                onPress={() => navigation.navigate('Orders')}
                activeOpacity={0.8}
              >
                <View style={styles.availableOrderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.availableRestaurantName} numberOfLines={1}>
                      {ord.sellerId?.businessName || ord.restaurantName || 'Restaurant Partner'}
                    </Text>
                    <Text style={styles.availableOrderSub} numberOfLines={1}>
                      Order #{ord.orderNumber || ord._id?.slice(-4)} • {ord.items?.length || 1} item(s)
                    </Text>
                  </View>
                  <View style={styles.payoutBadge}>
                    <Text style={styles.payoutBadgeText}>₹{ord.riderPayout || ord.payout || 35}</Text>
                    <Text style={styles.payoutSubText}>Earnings</Text>
                  </View>
                </View>

                <View style={styles.availableOrderLocations}>
                  <View style={styles.locationLine}>
                    <Ionicons name="restaurant-outline" size={14} color="#EA580C" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {ord.pickupAddress || 'Pickup Restaurant'}
                    </Text>
                  </View>
                  <View style={styles.locationLine}>
                    <Ionicons name="location-outline" size={14} color="#2563EB" />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {typeof ord.deliveryAddress === 'string'
                        ? ord.deliveryAddress
                        : ord.deliveryAddress?.fullAddress || ord.deliveryAddress?.street || 'Customer Location'}
                    </Text>
                  </View>
                </View>

                <View style={styles.availableOrderFooter}>
                  <Text style={styles.distanceText}>📍 ~{ord.deliveryDistanceKm || 2.5} km delivery</Text>
                  <View style={styles.viewOrderPill}>
                    <Text style={styles.viewOrderPillText}>Accept / View</Text>
                    <Ionicons name="arrow-forward" size={12} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noOrderCard}>
              <Ionicons name="bicycle-outline" size={36} color="#D1D5DB" />
              <Text style={styles.noOrderTitle}>No Orders Nearby</Text>
              <Text style={styles.noOrderDesc}>
                {isOnline ? 'Checking for new orders in your zone...' : 'Go online to receive nearby delivery requests'}
              </Text>
            </View>
          )}
        </View>

        {/* Active Order */}
        {activeOrder ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Order</Text>
            <TouchableOpacity
              style={styles.activeOrderCard}
              onPress={() => navigation.navigate('ActiveOrder', { order: activeOrder })}
              activeOpacity={0.85}
            >
              <View style={styles.activeOrderHeader}>
                <View style={styles.restaurantIcon}>
                  <Ionicons name="restaurant-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.activeOrderInfo}>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {activeOrder.restaurantName || 'Restaurant'}
                  </Text>
                  <Text style={styles.restaurantAddr} numberOfLines={1}>
                    {activeOrder.pickupAddress || 'Pickup Location'}
                  </Text>
                </View>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.deliverRow}>
                <Ionicons name="location-outline" size={18} color="#3B82F6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliverLabel}>Deliver to: {activeOrder.customerName || 'Customer'}</Text>
                  <Text style={styles.deliverAddr} numberOfLines={2}>
                    {typeof activeOrder.deliveryAddress === 'string'
                      ? activeOrder.deliveryAddress
                      : activeOrder.deliveryAddress?.fullAddress || [activeOrder.deliveryAddress?.street, activeOrder.deliveryAddress?.city, activeOrder.deliveryAddress?.pincode].filter(Boolean).join(', ') || 'Delivery Address'}
                  </Text>
                </View>
              </View>

              <View style={styles.deliverRow}>
                <Ionicons name="time-outline" size={18} color="#6B7280" />
                <Text style={styles.deliverAddr}>Est. 8-10 mins • {activeOrder.distance || '2'} km</Text>
              </View>

              {/* Mini Map Preview */}
              {activeOrder.pickupLocation?.coordinates && (() => {
                const pLat = activeOrder.pickupLocation.coordinates[1];
                const pLng = activeOrder.pickupLocation.coordinates[0];
                let dLat = activeOrder.dropLocation?.coordinates?.[1] || activeOrder.deliveryAddress?.location?.coordinates?.[1] || (pLat + 0.005);
                let dLng = activeOrder.dropLocation?.coordinates?.[0] || activeOrder.deliveryAddress?.location?.coordinates?.[0] || (pLng + 0.005);

                const dText = `${typeof activeOrder.deliveryAddress === 'string' ? activeOrder.deliveryAddress : (activeOrder.deliveryAddress?.fullAddress || activeOrder.deliveryAddress?.street || '')}`.toLowerCase();
                if (dText.includes('sector 40') || dText.includes('sec 40') || dText.includes('40-d') || dText.includes('40d')) {
                  dLat = 30.7385;
                  dLng = 76.7375;
                } else if (dText.includes('sector 41') || dText.includes('sec 41') || dText.includes('buterla')) {
                  dLat = 30.7325;
                  dLng = 76.7410;
                }

                return (
                  <View style={styles.miniMap}>
                    <RiderMap
                      pickupLat={pLat}
                      pickupLng={pLng}
                      pickupLabel={activeOrder.restaurantName || 'Pickup'}
                      dropLat={dLat}
                      dropLng={dLng}
                      dropLabel={activeOrder.customerName || 'Drop'}
                      height={160}
                    />
                  </View>
                );
              })()}

              <TouchableOpacity
                style={styles.trackBtn}
                onPress={() => navigation.navigate('ActiveOrder', { order: activeOrder })}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.trackBtnText}>Track & Navigate</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Order</Text>
            <View style={styles.noOrderCard}>
              <Ionicons name="bicycle-outline" size={42} color="#D1D5DB" />
              <Text style={styles.noOrderTitle}>No Active Orders</Text>
              <Text style={styles.noOrderDesc}>
                {isOnline ? 'Waiting for orders nearby...' : 'Go online to receive orders'}
              </Text>
            </View>
          </View>
        )}

        {/* Recent Deliveries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length > 0 ? (
            recentOrders.map((order, idx) => (
              <TouchableOpacity
                key={order._id || idx}
                style={styles.orderRow}
                onPress={() => navigation.navigate('ActiveOrder', { order, readonly: true })}
                activeOpacity={0.7}
              >
                <View style={styles.orderCheckIcon}>
                  <Ionicons name="checkmark-circle" size={28} color="#22C55E" />
                </View>
                <View style={styles.orderRowInfo}>
                  <Text style={styles.orderNum}>
                    Order #{order.orderNumber || order._id?.slice(-4) || String(idx + 1).padStart(4, '0')}
                  </Text>
                  <Text style={styles.orderMeta}>
                    {getOrderDate(order.createdAt)} • {getOrderTime(order.createdAt)} • ₹{order.deliveryFee || 0}
                    {order.paymentMethod ? ` • ${String(order.paymentMethod).toUpperCase()}` : ' • COD'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyOrders}>
              <Ionicons name="document-text-outline" size={40} color="#E5E7EB" />
              <Text style={styles.emptyOrdersText}>No delivery history yet</Text>
            </View>
          )}

          {recentOrders.length > 0 && (
            <View style={styles.totalBar}>
              <Text style={styles.totalLeft}>Total Orders: {totalCompleted}</Text>
              <Text style={styles.totalRight}>
                Avg. Earnings: ₹{totalCompleted > 0 ? Math.round(todayEarnings / Math.max(completedToday, 1)) : 0}/order
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Incoming Order Modal */}
      {incomingOrder && (
        <IncomingOrderModal
          orderRequest={incomingOrder}
          onClose={() => setIncomingOrder(null)}
          onAccepted={(order) => {
            setIncomingOrder(null);
            setActiveOrder(order);
            navigation.navigate('ActiveOrder', { order });
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#6B7280', fontWeight: '600' },

  // Header
  header: {
    backgroundColor: theme.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  profileBtn: {},
  profileAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  profileInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },

  // Online Status Card
  statusCard: {
    margin: 16,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusCardOnline: { backgroundColor: theme.primary },
  statusCardOffline: { backgroundColor: '#374151' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusDotWrapper: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statusDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, maxWidth: 200 },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6,
  },
  statIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FFF4ED', justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  statSub: { fontSize: 11, color: '#22C55E', marginTop: 4, fontWeight: '700' },

  // Section
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  viewAll: { fontSize: 14, color: theme.primary, fontWeight: '700' },

  // Active Order Card
  activeOrderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  activeOrderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  restaurantIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#FFF4ED', justifyContent: 'center', alignItems: 'center',
  },
  activeOrderInfo: { flex: 1 },
  restaurantName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  restaurantAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  activeText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  deliverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  deliverLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  deliverAddr: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  trackBtn: {
    backgroundColor: theme.primary, borderRadius: 12, height: 46,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12,
  },
  trackBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  miniMap: {
    marginTop: 12, marginBottom: 4,
    borderRadius: 14, overflow: 'hidden',
    height: 160, backgroundColor: '#E8F4FD',
  },

  // No Order
  noOrderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 36,
    alignItems: 'center', justifyContent: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  noOrderTitle: { fontSize: 16, fontWeight: '800', color: '#374151', marginTop: 12 },
  noOrderDesc: { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },

  // Order rows
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  orderCheckIcon: {},
  orderRowInfo: { flex: 1 },
  orderNum: { fontSize: 14, fontWeight: '800', color: '#111827' },
  orderMeta: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  emptyOrders: { backgroundColor: '#fff', borderRadius: 14, padding: 36, alignItems: 'center' },
  emptyOrdersText: { fontSize: 14, color: '#9CA3AF', marginTop: 10, fontWeight: '600' },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 4,
  },
  totalLeft: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  totalRight: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  // Dashboard KYC Banner
  dashboardKycBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dashboardKycSubmitted: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  dashboardKycRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dashboardKycPending: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  dashboardKycIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardKycTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dashboardKycDesc: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
    lineHeight: 16,
  },
  kycActionBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  kycActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // KYC Order Lock Card
  kycOrderLockCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kycLockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginTop: 8,
  },
  kycLockSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  kycLockBtn: {
    marginTop: 14,
    backgroundColor: theme.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  kycLockBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Available Order Cards
  availableOrderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  availableOrderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  availableRestaurantName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  availableOrderSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  payoutBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  payoutBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  payoutSubText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  availableOrderLocations: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
  },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  availableOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  viewOrderPill: {
    backgroundColor: theme.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewOrderPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default DashboardScreen;
