import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAvailableOrders, acceptOrder } from '../api/api';
import { theme } from '../theme/colors';

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getAvailableOrders();
      if (res.data?.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err: any) {
      console.log('Error fetching available orders:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 7000); // live refresh every 7s
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleAccept = async (order: any) => {
    setAcceptingId(order._id);
    try {
      const res = await acceptOrder(order._id);
      if (res.data?.success) {
        Alert.alert(
          '🎉 Order Accepted!',
          `Order #${order.orderNumber} is now assigned to you. Live tracking has started for customer.`,
          [
            {
              text: 'Start Delivery',
              onPress: () => {
                navigation.navigate('ActiveOrder', { order: res.data.order || order });
              },
            },
          ]
        );
        fetchOrders();
      } else {
        Alert.alert('Unable to Accept', res.data?.message || 'Order could not be accepted.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to accept order.');
    } finally {
      setAcceptingId(null);
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const isAccepting = acceptingId === item._id;
    const isLive = item.isAssignedToMe || item.status === 'out_for_delivery';

    return (
      <View style={[styles.card, isLive && styles.cardActive]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderNumRow}>
            <View style={styles.orderIconBadge}>
              <Ionicons name="cube" size={18} color={theme.primary} />
            </View>
            <View>
              <Text style={styles.orderNumber}>#{item.orderNumber || item._id.slice(-6)}</Text>
              <Text style={styles.orderItemsCount}>
                {item.items?.length || 1} items • ₹{item.total || item.subtotal}
              </Text>
            </View>
          </View>

          <View style={styles.payoutBadge}>
            <Text style={styles.payoutLabel}>Earnings</Text>
            <Text style={styles.payoutValue}>₹{item.payout || 30}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Pickup Location */}
        <View style={styles.locRow}>
          <View style={styles.pickupDot} />
          <View style={styles.locTextCol}>
            <Text style={styles.locLabel}>PICKUP FROM</Text>
            <Text style={styles.locTitle}>{item.restaurantName || 'Restaurant'}</Text>
            <Text style={styles.locAddress} numberOfLines={1}>
              {item.pickupAddress}
            </Text>
          </View>
        </View>

        {/* Route Line */}
        <View style={styles.routeTrack}>
          <View style={styles.dashedLine} />
          <View style={styles.distanceBadge}>
            <Ionicons name="bicycle" size={12} color="#6B7280" />
            <Text style={styles.distanceText}>{item.distance || '2'} km</Text>
          </View>
        </View>

        {/* Drop Location */}
        <View style={styles.locRow}>
          <View style={styles.dropDot} />
          <View style={styles.locTextCol}>
            <Text style={styles.locLabel}>DELIVER TO</Text>
            <Text style={styles.locTitle}>{item.customerName || 'Customer'}</Text>
            <Text style={styles.locAddress} numberOfLines={2}>
              {item.deliveryAddressStr}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {isLive ? (
            <TouchableOpacity
              style={styles.activeBtn}
              onPress={() => navigation.navigate('ActiveOrder', { order: item })}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.btnText}>Continue Delivery</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.acceptBtn, isAccepting && { opacity: 0.7 }]}
              onPress={() => handleAccept(item)}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.btnText}>Accept Order (Earn ₹{item.payout || 30})</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={theme.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Orders</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} order{orders.length === 1 ? '' : 's'} available in your zone
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Searching nearby orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOrders();
              }}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bicycle-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Orders Available</Text>
              <Text style={styles.emptySubtitle}>
                New orders in Chandigarh will appear here automatically. Keep the app open!
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => {
                  setLoading(true);
                  fetchOrders();
                }}
              >
                <Ionicons name="refresh" size={16} color={theme.primary} />
                <Text style={styles.refreshBtnText}>Check Again</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: theme.primary,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardActive: {
    borderColor: theme.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  orderItemsCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  payoutBadge: {
    alignItems: 'flex-end',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  payoutLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
    textTransform: 'uppercase',
  },
  payoutValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.primary,
    marginTop: 5,
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginTop: 5,
  },
  locTextCol: {
    flex: 1,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  locTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 1,
  },
  locAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  routeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    marginVertical: 4,
    gap: 12,
  },
  dashedLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E5E7EB',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionRow: {
    marginTop: 16,
  },
  acceptBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  activeBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  refreshBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
  },
  refreshBtnText: {
    color: theme.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
