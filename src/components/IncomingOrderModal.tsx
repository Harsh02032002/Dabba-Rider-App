import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions,
} from 'react-native';
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
    <Modal visible transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Timer bar */}
          <View style={styles.timerBg}>
            <View style={[styles.timerFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>New Order!</Text>
                <Text style={styles.timerText}>Respond in {timeLeft}s</Text>
              </View>
              <View style={styles.clockIcon}>
                <Text style={{ fontSize: 24 }}>⏰</Text>
              </View>
            </View>

            {/* Route */}
            <View style={styles.routeCard}>
              <View style={styles.routeInner}>
                <View style={styles.routeDots}>
                  <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                  <View style={styles.dotLine} />
                  <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                </View>
                <View style={styles.routeTexts}>
                  <View>
                    <Text style={styles.routeLabel}>PICKUP</Text>
                    <Text style={styles.routeValue}>
                      {order.pickupAddress || order.restaurantName || 'Restaurant'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.routeLabel}>DROP</Text>
                    <Text style={styles.routeValue}>
                      {order.dropAddress || order.customerName || 'Customer Location'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Info chips */}
            <View style={styles.chipsRow}>
              <View style={[styles.chip, { backgroundColor: 'rgba(242,115,22,0.1)' }]}>
                <Text style={{ fontSize: 20 }}>₹</Text>
                <Text style={styles.chipValue}>₹{order.totalAmount}</Text>
                <Text style={styles.chipLabel}>Earning</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: 'rgba(26,175,112,0.1)' }]}>
                <Text style={{ fontSize: 20 }}>📍</Text>
                <Text style={styles.chipValue}>{order.distance || '2.5'} km</Text>
                <Text style={styles.chipLabel}>Distance</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} activeOpacity={0.8}>
                <Text style={styles.rejectText}>✕ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
                onPress={handleAccept}
                disabled={accepting}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptText}>
                  {accepting ? '...' : '✓ Accept Order'}
                </Text>
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', padding: 16,
  },
  card: {
    backgroundColor: theme.card, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  timerBg: { height: 4, backgroundColor: theme.secondary },
  timerFill: { height: '100%', backgroundColor: theme.primary },
  content: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: theme.foreground },
  timerText: { fontSize: 12, color: theme.mutedForeground, marginTop: 2 },
  clockIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  routeCard: {
    backgroundColor: theme.secondary, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  routeInner: { flexDirection: 'row', gap: 12 },
  routeDots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 2, flex: 1, backgroundColor: theme.border, marginVertical: 4 },
  routeTexts: { flex: 1, gap: 12 },
  routeLabel: { fontSize: 10, color: theme.mutedForeground, fontWeight: '500', letterSpacing: 1 },
  routeValue: { fontSize: 14, fontWeight: '600', color: theme.foreground, marginTop: 2 },
  chipsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  chip: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  chipValue: { fontSize: 16, fontWeight: '700', color: theme.foreground, marginTop: 4 },
  chipLabel: { fontSize: 10, color: theme.mutedForeground, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  rejectBtn: {
    flex: 1, height: 56, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  rejectText: { fontSize: 15, fontWeight: '600', color: theme.destructive },
  acceptBtn: {
    flex: 2, height: 56, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default IncomingOrderModal;
