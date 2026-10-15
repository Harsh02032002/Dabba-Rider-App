import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IncomingOrderRequest, Order } from '../types';
import { acceptOrder as acceptOrderAPI } from '../api/api';
import { emitAcceptOrder, emitRejectOrder } from '../hooks/socket';
import { colors, formatMoney, radius, spacing, type } from '../theme';
import { Button } from './ui';

interface Props {
  orderRequest: IncomingOrderRequest;
  onClose: () => void;
  onAccepted: (order: Order) => void;
}


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
    if (accepting) return;
    setAccepting(true);
    try {
      const res = await acceptOrderAPI(order._id);
      emitAcceptOrder(order._id);
      onAccepted(res.data?.order || order);
    } catch (err: any) {
      setAccepting(false);
      const status = err?.response?.status;
      const message = err?.response?.data?.message || 'Could not accept this order. Please try again.';
      if (status === 409 || status === 403 || status === 404) {
        // Taken by another rider, out of range, or capacity reached — this request is no longer actionable
        Alert.alert('Order unavailable', message);
        onClose();
      } else {
        Alert.alert('Error', message);
      }
    }
  }, [accepting, order, onAccepted, onClose]);

  const handleReject = useCallback(() => {
    emitRejectOrder(order._id);
    onClose();
  }, [order._id, onClose]);

  const progress = Math.max(0, Math.min(100, (timeLeft / timeout) * 100));
  const payout = (order as any).deliveryFee ?? (order as any).riderPayout;
  const distance = order.distance != null && order.distance !== ('' as any) ? `${order.distance} km` : '—';
  const urgent = timeLeft <= 10;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleReject}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${progress}%` }, urgent && { backgroundColor: colors.danger }]} />
          </View>

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.bell}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.title}>New delivery request</Text>
                <Text style={type.caption}>{(order as any).orderNumber ? `Order #${(order as any).orderNumber}` : 'Nearby order'}</Text>
              </View>
              <View style={[styles.countdown, urgent && { backgroundColor: colors.dangerSoft }]}>
                <Text style={[styles.countdownText, urgent && { color: colors.danger }]}>{Math.max(timeLeft, 0)}s</Text>
              </View>
            </View>

            <View style={styles.earnings}>
              <View style={{ flex: 1 }}>
                <Text style={type.overline}>You earn</Text>
                <Text style={styles.earningsValue}>{payout != null ? formatMoney(payout) : '—'}</Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={{ flex: 1 }}>
                <Text style={type.overline}>Distance</Text>
                <Text style={styles.earningsValue}>{distance}</Text>
              </View>
            </View>

            <View style={styles.route}>
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={type.overline}>Pickup</Text>
                  <Text style={type.subheading} numberOfLines={1}>{order.restaurantName || 'Restaurant'}</Text>
                  <Text style={type.caption} numberOfLines={2}>{order.pickupAddress || 'Address shared after you accept'}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeRow}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={type.overline}>Drop area</Text>
                  <Text style={type.subheading} numberOfLines={2}>{order.dropAddress || 'Shared after you accept'}</Text>
                </View>
              </View>
            </View>

            {order.totalAmount ? (
              <Text style={[type.caption, { marginTop: spacing.md }]}>Order value {formatMoney(order.totalAmount)}</Text>
            ) : null}

            <View style={styles.actions}>
              <Button title="Decline" variant="secondary" onPress={handleReject} disabled={accepting} style={{ flex: 1 }} />
              <Button title="Accept order" icon="checkmark" onPress={handleAccept} loading={accepting} size="lg" style={{ flex: 2 }} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' },
  timerTrack: { height: 4, backgroundColor: colors.surfaceMuted },
  timerFill: { height: '100%', backgroundColor: colors.primary },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl + spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bell: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  countdown: { minWidth: 48, height: 32, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  countdownText: { ...type.subheading, color: colors.primary, fontVariant: ['tabular-nums'] },
  earnings: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  earningsValue: { ...type.money, fontSize: 22, lineHeight: 28, marginTop: 2 },
  earningsDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: spacing.lg },
  route: { marginTop: spacing.xl },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLine: { width: 2, height: 16, backgroundColor: colors.border, marginLeft: 4, marginVertical: 4 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});

export default IncomingOrderModal;
