import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal, Linking,
} from 'react-native';
import { getCurrentOrder, updateOrderStatus, confirmDeliveryOTP } from '../api/api';
import { emitOrderStatusUpdate } from '../hooks/socket';
import { Order, OrderStatus } from '../types';
import { theme } from '../theme/colors';
import DeliveryMap from '../components/DeliveryMap';

const statusFlow: { status: OrderStatus; label: string; next: OrderStatus | null }[] = [
  { status: 'accepted', label: 'Reached Pickup', next: 'picked' },
  { status: 'picked', label: 'Picked Up - Start Delivery', next: 'delivered' },
  { status: 'delivered', label: 'Delivered ✓', next: null },
];

const ActiveOrderScreen = ({ navigation }: any) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await getCurrentOrder();
      if (data?.order) {
        setOrder(data.order);
        
        // Set rider location (delivery man's current location)
        if (data.order.riderLocation) {
          setRiderLocation({
            lat: data.order.riderLocation.coordinates?.[1] || 28.6139,
            lng: data.order.riderLocation.coordinates?.[0] || 77.2090
          });
        }
      } else {
        navigation.goBack();
      }
    } catch {
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleStatusUpdate = async (nextStatus: OrderStatus) => {
    if (!order) return;
    if (nextStatus === 'delivered') {
      setShowOTPModal(true);
      return;
    }
    setUpdating(true);
    try {
      await updateOrderStatus(order._id, nextStatus);
      emitOrderStatusUpdate(order._id, nextStatus);
      setOrder({ ...order, status: nextStatus });
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleOTPConfirm = async () => {
    if (!order || otp.length !== 4) {
      setOtpError('Enter 4-digit OTP');
      return;
    }
    setUpdating(true);
    setOtpError('');
    try {
      await confirmDeliveryOTP(order._id, otp);
      emitOrderStatusUpdate(order._id, 'delivered');
      setShowOTPModal(false);
      navigation.goBack();
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setUpdating(false);
    }
  };

  const getDeliveryCharge = (distance?: number) => {
    if (!distance) return 20;
    if (distance <= 2) return 20;
    if (distance <= 5) return 30;
    return 40;
  };

  const currentStep = statusFlow.find((s) => s.status === order?.status);
  const stepIndex = statusFlow.findIndex((s) => s.status === order?.status);

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
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Active Order</Text>
            <Text style={styles.headerSub}>#{order._id.slice(-8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Map View - Delivery Route */}
        {order && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapTitle}>🗺️ Delivery Route</Text>
            <DeliveryMap 
              pickupCoords={order.pickupLocation?.coordinates || order.deliveryAddress?.location?.coordinates || [0, 0]}
              dropCoords={order.dropLocation?.coordinates || order.deliveryAddress?.location?.coordinates || [0, 0]}
              distance={order.distance?.toString()}
            />
            <View style={styles.mapInfo}>
              <View style={styles.mapInfoItem}>
                <Text style={styles.mapInfoEmoji}>🛵</Text>
                <Text style={styles.mapInfoText}>Delivery Partner</Text>
              </View>
              <View style={styles.mapInfoItem}>
                <Text style={styles.mapInfoEmoji}>🏠</Text>
                <Text style={styles.mapInfoText}>Customer Location</Text>
              </View>
            </View>
          </View>
        )}

        {/* Locations */}
        <View style={styles.locationsCard}>
          <View style={styles.locationsInner}>
            <View style={styles.locationDots}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <View style={styles.dotLine} />
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
            </View>
            <View style={styles.locationTexts}>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>PICKUP</Text>
                <Text style={styles.locationValue}>
                  {order.pickupAddress || order.restaurantName || 'Restaurant'}
                </Text>
              </View>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>DROP-OFF</Text>
                <Text style={styles.locationValue}>
                  {order.dropAddress || order.customerName || 'Customer'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Text style={styles.infoEmoji}>📦</Text>
              <Text style={styles.infoTitle}>Order Details</Text>
            </View>
            <Text style={styles.infoAmount}>₹{order.totalAmount}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Fee</Text>
            <Text style={[styles.infoValue, { color: theme.success }]}>
              ₹{order.deliveryFee || getDeliveryCharge(order.distance)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{order.distance || 0} km</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Your Earning</Text>
            <Text style={[styles.infoValue, { color: theme.primary, fontWeight: '700' }]}>
              ₹{Math.round((order.deliveryFee || getDeliveryCharge(order.distance)) * 0.8)}
            </Text>
          </View>
        </View>

        {/* Progress Steps */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>DELIVERY PROGRESS</Text>
          {statusFlow.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <View key={step.status} style={styles.progressStep}>
                <View style={[
                  styles.progressDot,
                  done && { backgroundColor: theme.success },
                  active && { backgroundColor: theme.primary },
                  !done && !active && { backgroundColor: theme.secondary, borderWidth: 1, borderColor: theme.border },
                ]}>
                  {done ? (
                    <Text style={styles.progressCheck}>✓</Text>
                  ) : (
                    <Text style={[styles.progressNum, active && { color: '#fff' }]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[
                  styles.progressLabel,
                  done && { color: theme.success },
                  active && { color: theme.foreground, fontWeight: '600' },
                ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL('tel:+911234567890')}
          >
            <Text style={styles.actionEmoji}>📞</Text>
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              const lat = order.dropLocation?.coordinates?.[1];
              const lng = order.dropLocation?.coordinates?.[0];
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
            }}
          >
            <Text style={styles.actionEmoji}>📍</Text>
            <Text style={styles.actionText}>Navigate</Text>
          </TouchableOpacity>
        </View>

        {/* Status Update Button */}
        {currentStep?.next && (
          <TouchableOpacity
            style={[styles.statusBtn, updating && { opacity: 0.6 }]}
            onPress={() => handleStatusUpdate(currentStep.next!)}
            disabled={updating}
            activeOpacity={0.8}
          >
            {updating && !showOTPModal ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.statusBtnText}>
                {currentStep.next === 'delivered' ? '🔑 Verify OTP & Deliver' : `✅ ${currentStep.label}`}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={showOTPModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>🔑</Text>
            </View>
            <Text style={styles.modalTitle}>Delivery Verification</Text>
            <Text style={styles.modalSub}>Enter the 4-digit OTP shared by customer</Text>

            <TextInput
              style={styles.otpInput}
              maxLength={4}
              placeholder="● ● ● ●"
              placeholderTextColor={theme.mutedForeground}
              value={otp}
              onChangeText={(v) => {
                setOtp(v.replace(/\D/g, '').slice(0, 4));
                setOtpError('');
              }}
              keyboardType="number-pad"
              textAlign="center"
            />

            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowOTPModal(false); setOtp(''); setOtpError(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (updating || otp.length !== 4) && { opacity: 0.6 }]}
                onPress={handleOTPConfirm}
                disabled={updating || otp.length !== 4}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Delivery</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: theme.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: theme.foreground },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.foreground },
  headerSub: { fontSize: 12, color: theme.mutedForeground },
  mapPlaceholder: {
    marginHorizontal: 16, height: 180, borderRadius: 16,
    backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  mapContainer: {
    marginHorizontal: 16, marginBottom: 16,
  },
  mapTitle: {
    fontSize: 16, fontWeight: '600', color: theme.foreground,
    marginBottom: 12, textAlign: 'center',
  },
  mapInfo: {
    flexDirection: 'row', justifyContent: 'space-around',
    padding: 12, backgroundColor: theme.card,
    borderRadius: 12, borderWidth: 1, borderColor: theme.border,
  },
  mapInfoItem: {
    alignItems: 'center',
  },
  mapInfoEmoji: {
    fontSize: 16, marginBottom: 4,
  },
  mapInfoText: {
    fontSize: 12, color: theme.mutedForeground, fontWeight: '500',
  },
  mapEmoji: { fontSize: 40 },
  mapText: { fontSize: 16, fontWeight: '600', color: theme.foreground, marginTop: 8 },
  mapSub: { fontSize: 12, color: theme.mutedForeground },
  locationsCard: {
    marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  locationsInner: { flexDirection: 'row', gap: 12 },
  locationDots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotLine: { width: 2, flex: 1, backgroundColor: theme.border, marginVertical: 4 },
  locationTexts: { flex: 1, gap: 16 },
  locationItem: {},
  locationLabel: { fontSize: 10, color: theme.mutedForeground, fontWeight: '500', letterSpacing: 1 },
  locationValue: { fontSize: 14, fontWeight: '600', color: theme.foreground, marginTop: 2 },
  infoCard: {
    marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoEmoji: { fontSize: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: theme.foreground },
  infoAmount: { fontSize: 18, fontWeight: '700', color: theme.primary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 12, color: theme.mutedForeground },
  infoValue: { fontSize: 12, fontWeight: '600', color: theme.foreground },
  progressCard: {
    marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border,
  },
  progressTitle: { fontSize: 10, color: theme.mutedForeground, fontWeight: '500', letterSpacing: 1, marginBottom: 12 },
  progressStep: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  progressDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  progressCheck: { fontSize: 12, color: '#fff', fontWeight: '700' },
  progressNum: { fontSize: 12, fontWeight: '700', color: theme.mutedForeground },
  progressLabel: { fontSize: 14, color: theme.mutedForeground },
  actionsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  actionBtn: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: theme.secondary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  actionEmoji: { fontSize: 16 },
  actionText: { fontSize: 14, fontWeight: '500', color: theme.foreground },
  statusBtn: {
    marginHorizontal: 16, height: 56, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  statusBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', padding: 16,
  },
  modalContent: {
    backgroundColor: theme.card, borderRadius: 24, padding: 24,
  },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12,
  },
  modalIcon: { fontSize: 28 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.foreground, textAlign: 'center' },
  modalSub: { fontSize: 14, color: theme.mutedForeground, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  otpInput: {
    height: 56, borderRadius: 12, backgroundColor: theme.secondary, borderWidth: 1, borderColor: theme.border,
    fontSize: 24, fontWeight: '700', letterSpacing: 16, color: theme.foreground,
  },
  otpError: { color: theme.destructive, fontSize: 14, textAlign: 'center', marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1, height: 48, borderRadius: 12, backgroundColor: theme.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: theme.foreground },
  modalConfirm: {
    flex: 2, height: 48, borderRadius: 12, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ActiveOrderScreen;
