import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl,
  ActivityIndicator, Switch, StatusBar, Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { toggleOnline, getCurrentOrder, getOrderHistory, getEarnings } from '../api/api';
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
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (partner?.isOnline !== undefined) setIsOnline(partner.isOnline);
  }, [partner]);

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, historyRes, earningsRes] = await Promise.allSettled([
        getCurrentOrder(),
        getOrderHistory(),
        getEarnings(),
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
    } catch (e) {
      console.log('Fetch error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (data: any) => {
      if (!data) return;
      const orderData = data.order || data;
      setIncomingOrder({
        order: {
          _id: orderData._id || orderData.orderId,
          orderNumber: orderData.orderNumber,
          restaurantName: orderData.restaurantName || orderData.sellerName,
          customerName: orderData.customerName,
          pickupAddress: orderData.pickupAddress,
          dropAddress: orderData.dropAddress || orderData.deliveryAddress?.street,
          totalAmount: orderData.totalAmount || orderData.total,
          deliveryFee: orderData.deliveryFee || orderData.riderPayout,
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
    const handleOrderCancelled = () => setIncomingOrder(null);
    const handleOrderDelivered = () => {
      setActiveOrder(null);
      fetchData();
    };

    socket.on('delivery_request', handleNewOrder);
    socket.on('newDeliveryRequest', handleNewOrder);
    socket.on('orderAssigned', handleOrderAssigned);
    socket.on('orderCancelled', handleOrderCancelled);
    socket.on('orderDelivered', handleOrderDelivered);

    return () => {
      socket.off('delivery_request', handleNewOrder);
      socket.off('newDeliveryRequest', handleNewOrder);
      socket.off('orderAssigned', handleOrderAssigned);
      socket.off('orderCancelled', handleOrderCancelled);
      socket.off('orderDelivered', handleOrderDelivered);
    };
  }, [fetchData, navigation]);

  const startLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    locationInterval.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        emitLocationUpdate(loc.coords.latitude, loc.coords.longitude);
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
    setToggling(true);
    try {
      let coords: any = {};
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
            emitLocationUpdate(loc.coords.latitude, loc.coords.longitude);
          }
        }
      } catch {}
      await toggleOnline(coords);
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await updatePartner({ isOnline: newStatus });
      if (newStatus) { emitPartnerOnline(); startLocationTracking(); }
      else { emitPartnerOffline(); stopLocationTracking(); }
    } catch {
      Alert.alert('Error', 'Failed to toggle status. Check internet connection.');
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

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
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
});

export default DashboardScreen;
