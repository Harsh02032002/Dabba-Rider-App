import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IncomingOrderRequest, Order } from '../types';
import { acceptOrder as acceptOrderAPI } from '../api/api';
import { emitAcceptOrder, emitRejectOrder } from '../hooks/socket';
import { theme } from '../theme/colors';

interface Props {
  orderRequest: IncomingOrderRequest;
  onClose: () => void;
  onAccepted: (order: Order) => void;
}

const { width } = Dimensions.get('window');

const IncomingOrderModal: React.FC<Props> = ({ orderRequest, onClose, onAccepted }) => {
  const { order, timeout } = orderRequest;
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleReject();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    try {
      emitAcceptOrder(order._id);
      await acceptOrderAPI(order._id);
      onAccepted(order);
    } catch {
      setAccepting(false);
    }
  }, [order, onAccepted]);

  const handleReject = useCallback(() => {
    emitRejectOrder(order._id);
    onClose();
  }, [order._id, onClose]);

  const progress = (timeLeft / timeout) * 100;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Timer bar */}
          <View style={styles.timerContainer}>
            <View style={[styles.timerFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.content}>
            {/* Header with Logo */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.brandName}>Dabba <Text style={{ color: theme.primary }}>Nation</Text></Text>
                  <Text style={styles.title}>New Delivery Alert!</Text>
                </View>
              </View>
              <View style={styles.timerCircle}>
                <Text style={styles.timeLeftText}>{timeLeft}s</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Route */}
            <View style={styles.routeSection}>
              <View style={styles.routeRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#fff5f0' }]}>
                  <Ionicons name="restaurant-outline" size={18} color={theme.primary} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>PICKUP</Text>
                  <Text style={styles.routeTitle}>{order.restaurantName || 'Restaurant'}</Text>
                  <Text style={styles.routeSub} numberOfLines={1}>{order.pickupAddress || 'Restaurant Address'}</Text>
                </View>
              </View>

              <View style={styles.routeLine} />

              <View style={styles.routeRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#f0f9ff' }]}>
                  <Ionicons name="location-outline" size={18} color="#0284c7" />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel}>DELIVER TO</Text>
                  <Text style={styles.routeTitle}>{order.customerName || 'Customer'}</Text>
                  <Text style={styles.routeSub} numberOfLines={1}>{order.dropAddress || 'Customer Address'}</Text>
                </View>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="wallet-outline" size={20} color="#16a34a" />
                <View style={styles.statInfo}>
                  <Text style={styles.statVal}>₹{order.totalAmount}</Text>
                  <Text style={styles.statLab}>Earnings</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="navigate-outline" size={20} color="#0284c7" />
                <View style={styles.statInfo}>
                  <Text style={styles.statVal}>{order.distance || '2.5'} km</Text>
                  <Text style={styles.statLab}>Distance</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptButton, accepting && { opacity: 0.8 }]}
                onPress={handleAccept}
                disabled={accepting}
                activeOpacity={0.9}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  timerContainer: {
    height: 4,
    backgroundColor: '#f1f5f9',
  },
  timerFill: {
    height: '100%',
    backgroundColor: theme.primary,
  },
  content: {
    padding: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  brandName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.primary,
  },
  timerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeLeftText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.primary,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 20,
  },
  routeSection: {
    marginBottom: 25,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 2,
  },
  routeSub: {
    fontSize: 13,
    color: '#64748b',
  },
  routeLine: {
    width: 1.5,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginLeft: 17,
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statInfo: {
    flex: 1,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLab: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  acceptButton: {
    flex: 2,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  acceptBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
});

export default IncomingOrderModal;
