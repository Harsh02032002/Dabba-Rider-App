import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { toggleOnline, getCurrentOrder, getOrderHistory } from '../api/api';
import {
  getSocket, emitPartnerOnline, emitPartnerOffline, emitLocationUpdate,
} from '../hooks/socket';
import { Order, IncomingOrderRequest } from '../types';
import IncomingOrderModal from '../components/IncomingOrderModal';
import DeliveryMap from '../components/DeliveryMap';
import SimpleMap from '../components/SimpleMap';
import WebMap from '../components/WebMap';
import { theme } from '../theme/colors';

const DashboardScreen = ({ navigation }: any) => {
  const { partner, updatePartner } = useAuth();
  const [isOnline, setIsOnline] = useState(partner?.isOnline || false);
  const [toggling, setToggling] = useState(false);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrderRequest | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersToday, setOrdersToday] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [orderRes, historyRes] = await Promise.all([getCurrentOrder(), getOrderHistory()]);
      console.log('Active Order Response:', orderRes.data);
      console.log('History Response:', historyRes.data);
      
      if (orderRes.data?.order) {
        const order = orderRes.data.order;
        console.log('Order Amount:', order.totalAmount || order.amount);
        console.log('Order Delivery Fee:', order.deliveryFee);
        console.log('Pickup Location:', order.pickupLocation);
        console.log('Drop Location:', order.deliveryAddress);
        console.log('Final Pickup Coords:', order.pickupLocation?.coordinates || order.deliveryAddress?.location?.coordinates || [0, 0]);
        console.log('Final Drop Coords:', order.dropLocation?.coordinates || order.deliveryAddress?.location?.coordinates || [0, 0]);
        console.log('Order Full Data:', order);
        setActiveOrder(order);
      }
      if (historyRes.data?.orders) {
        setRecentOrders(historyRes.data.orders.slice(0, 5));
        const today = new Date().toDateString();
        const todayCount = historyRes.data.orders.filter(
          (o: Order) => new Date(o.createdAt).toDateString() === today && o.status === 'delivered'
        ).length;
        setOrdersToday(todayCount);
      }
    } catch (e) {
      console.log('Fetch error:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewOrder = (data: IncomingOrderRequest) => {
      setIncomingOrder(data);
    };
    const handleOrderAssigned = (data: { order: Order }) => {
      setIncomingOrder(null);
      setActiveOrder(data.order);
    };
    const handleOrderCancelled = () => setIncomingOrder(null);

    socket.on('delivery_request', handleNewOrder);
    socket.on('orderAssigned', handleOrderAssigned);
    socket.on('orderCancelled', handleOrderCancelled);

    return () => {
      socket.off('delivery_request', handleNewOrder);
      socket.off('orderAssigned', handleOrderAssigned);
      socket.off('orderCancelled', handleOrderCancelled);
    };
  }, []);

  // Location tracking
  const startLocationTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required');
      return;
    }
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

  useEffect(() => {
    if (isOnline) startLocationTracking();
    return () => stopLocationTracking();
  }, [isOnline, startLocationTracking, stopLocationTracking]);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      await toggleOnline();
      const newStatus = !isOnline;
      setIsOnline(newStatus);
      await updatePartner({ isOnline: newStatus });
      if (newStatus) {
        emitPartnerOnline();
        startLocationTracking();
      } else {
        emitPartnerOffline();
        stopLocationTracking();
      }
    } catch {
      Alert.alert('Error', 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const stats = [
    { label: "Today's Earnings", value: `₹${partner?.earnings || 0}`, emoji: '💰' },
    { label: 'Rating', value: partner?.rating?.toFixed(1) || '4.5', emoji: '⭐' },
    { label: 'Deliveries', value: String(ordersToday), emoji: '📦' },
  ];

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${amount}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good morning</Text>
              <Text style={styles.name}>{partner?.name || 'Partner'}</Text>
            </View>
            <View style={styles.vehicleBadge}>
              <Text style={styles.vehicleIcon}>📍</Text>
              <Text style={styles.vehicleText}>{partner?.vehicleType || 'bike'}</Text>
            </View>
          </View>

          {/* Online Toggle */}
          <TouchableOpacity
            style={[styles.toggleBtn, isOnline ? styles.toggleOnline : styles.toggleOffline]}
            onPress={handleToggleOnline}
            disabled={toggling}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Text style={styles.powerIcon}>⚡</Text>
              {isOnline && <View style={styles.pulseDot} />}
            </View>
            <Text style={[styles.toggleText, isOnline ? { color: theme.success } : { color: theme.foreground }]}>
              {toggling ? 'Switching...' : isOnline ? "You're Online" : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ Delivery Route</Text>
          {activeOrder ? (
            <DeliveryMap
              pickupCoords={activeOrder.pickupLocation?.coordinates || activeOrder.deliveryAddress?.location?.coordinates || [0, 0]}
              dropCoords={activeOrder.dropLocation?.coordinates || activeOrder.deliveryAddress?.location?.coordinates || [0, 0]}
              distance={activeOrder.distance?.toString()}
            />
          ) : (
            <View style={styles.mapContainer}>
              <Text style={styles.mapPlaceholder}>📍 Accept Orders</Text>
              <Text style={styles.mapText}>Start accepting orders to see delivery routes</Text>
            </View>
          )}
        </View>

        {/* Active Order Banner */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeOrderBanner}
            onPress={() => navigation.navigate('ActiveOrder')}
            activeOpacity={0.8}
          >
            <View style={styles.activeOrderLeft}>
              <Text style={styles.activeOrderEmoji}>📦</Text>
              <View>
                <Text style={styles.activeOrderTitle}>Active Order</Text>
                <Text style={styles.activeOrderSub}>
                  {activeOrder.status.toUpperCase()} • ₹{activeOrder.deliveryFee || activeOrder.totalAmount || 0}
                </Text>
              </View>
            </View>
            <Text style={styles.activeOrderArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statEmoji}>{stat.emoji}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Status Info */}
        <View style={styles.section}>
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.online : theme.offline }]} />
              <Text style={styles.statusText}>
                {isOnline ? 'Accepting Orders' : 'Offline'}
              </Text>
            </View>
            <Text style={styles.statusDesc}>
              {isOnline
                ? "You'll receive nearby delivery requests. Stay online to earn more!"
                : 'Go online to start receiving delivery requests.'}
            </Text>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <View key={order._id} style={styles.orderCard}>
                <View style={styles.orderLeft}>
                  <View style={[styles.orderIcon, {
                    backgroundColor: order.status === 'delivered'
                      ? 'rgba(34,197,94,0.1)' : 'rgba(242,115,22,0.1)',
                  }]}>
                    <Text>{order.status === 'delivered' ? '✅' : '📦'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderName} numberOfLines={1}>
                      {order.restaurantName || 'Order'} → {order.customerName || 'Customer'}
                    </Text>
                    <Text style={styles.orderMeta}>
                      🕐 {getTimeAgo(order.createdAt)} • {order.distance || 0} km
                    </Text>
                  </View>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderFee}>₹{order.deliveryFee || 0}</Text>
                  <Text style={[styles.orderStatus, {
                    color: order.status === 'delivered' ? theme.success
                      : order.status === 'cancelled' ? theme.destructive : theme.mutedForeground,
                  }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>No recent deliveries</Text>
              <Text style={styles.emptySub}>Go online to start receiving orders</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Incoming Order Modal */}
      {incomingOrder && (
        <IncomingOrderModal
          orderRequest={incomingOrder}
          onClose={() => setIncomingOrder(null)}
          onAccepted={(order) => {
            setIncomingOrder(null);
            setActiveOrder(order);
            navigation.navigate('ActiveOrder');
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '700', color: '#fff' },
  vehicleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleIcon: { fontSize: 14 },
  vehicleText: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  toggleBtn: {
    width: '100%', height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  toggleOnline: { backgroundColor: '#fff' },
  toggleOffline: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  toggleInner: { position: 'relative' },
  powerIcon: { fontSize: 24 },
  pulseDot: {
    position: 'absolute', top: -2, right: -4, width: 10, height: 10,
    borderRadius: 5, backgroundColor: theme.success,
  },
  toggleText: { fontSize: 18, fontWeight: '600' },
  activeOrderBanner: {
    marginHorizontal: 16, marginTop: -20, borderRadius: 16,
    backgroundColor: theme.primary, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: theme.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 4,
  },
  activeOrderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeOrderEmoji: { fontSize: 24 },
  activeOrderTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  activeOrderSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  activeOrderArrow: { fontSize: 20, color: '#fff' },
  mapContainer: {
    height: 200, backgroundColor: theme.card, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  mapPlaceholder: { fontSize: 32, marginBottom: 8 },
  mapText: { fontSize: 12, color: theme.mutedForeground },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.foreground, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { fontSize: 12, color: theme.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: theme.card, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8,
    elevation: 2,
  },
  statEmoji: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.foreground },
  statLabel: { fontSize: 10, color: theme.mutedForeground, marginTop: 4, textAlign: 'center' },
  statusCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: theme.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '600', color: theme.foreground },
  statusDesc: { fontSize: 12, color: theme.mutedForeground, lineHeight: 18 },
  orderCard: {
    backgroundColor: theme.card, borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: theme.border, marginBottom: 8,
  },
  orderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  orderIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  orderName: { fontSize: 13, fontWeight: '600', color: theme.foreground },
  orderMeta: { fontSize: 10, color: theme.mutedForeground, marginTop: 2 },
  orderRight: { alignItems: 'flex-end' },
  orderFee: { fontSize: 14, fontWeight: '700', color: theme.success },
  orderStatus: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize', marginTop: 2 },
  emptyCard: {
    backgroundColor: theme.card, borderRadius: 12, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border,
  },
  emptyEmoji: { fontSize: 32, marginBottom: 8, opacity: 0.3 },
  emptyText: { fontSize: 14, color: theme.mutedForeground },
  emptySub: { fontSize: 12, color: theme.mutedForeground, marginTop: 4 },
});

export default DashboardScreen;
