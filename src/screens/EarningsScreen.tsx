import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Modal, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEarnings, getOrderHistory, requestWithdrawal } from '../api/api';
import { Earning, EarningsSummary, Order } from '../types';
import { theme } from '../theme/colors';

const { width } = Dimensions.get('window');

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const EarningsScreen = ({ navigation }: any) => {
  const [summary, setSummary] = useState<EarningsSummary>({
    today: 0, week: 0, total: 0, ordersToday: 0, ordersTotal: 0, walletBalance: 0,
  });
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [tab, setTab] = useState<'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [earningsRes, historyRes] = await Promise.allSettled([
          getEarnings(),
          getOrderHistory(),
        ]);

        if (earningsRes.status === 'fulfilled') {
          const data = earningsRes.value.data;
          if (data) {
            setSummary({
              today: data.summary?.today ?? data.todayEarnings ?? 0,
              week: data.summary?.week ?? data.weekEarnings ?? 0,
              total: data.summary?.total ?? data.earnings ?? 0,
              ordersToday: data.summary?.ordersToday ?? data.todayDeliveries ?? data.summary?.deliveries ?? 0,
              ordersTotal: data.summary?.ordersTotal ?? data.totalDeliveries ?? data.summary?.deliveries ?? 0,
              walletBalance: data.summary?.walletBalance ?? data.wallet ?? 0,
            });
          }
          if (data?.weeklyData) setWeeklyData(data.weeklyData);
        }

        if (historyRes.status === 'fulfilled') {
          const orders: Order[] = historyRes.value.data?.orders || [];
          const delivered = orders.filter((o) => o.status === 'delivered');
          setCompletedOrders(delivered);

          // Build weekly earnings chart data from order history
          const now = new Date();
          const weekArr = [0, 0, 0, 0, 0, 0, 0];
          delivered.forEach((o) => {
            const d = new Date((o as any).actualDelivery || o.createdAt);
            const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 7) {
              const dayIdx = (d.getDay() + 6) % 7; // convert to Mon=0
              weekArr[dayIdx] += Number(o.deliveryFee || (o as any).riderPayout || 30);
            }
          });
          setWeeklyData(weekArr);
        }
      } catch (e) {
        console.log('Earnings fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0 || amount > (summary.walletBalance || 0)) return;
    setWithdrawing(true);
    try {
      await requestWithdrawal(amount);
      setSummary((prev) => ({ ...prev, walletBalance: (prev.walletBalance || 0) - amount }));
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    } catch {} finally {
      setWithdrawing(false);
    }
  };

  const maxWeekly = Math.max(...weeklyData, 1);

  const getDisplayOrders = () => {
    const now = new Date();
    if (tab === 'week') {
      return completedOrders.filter((o) => {
        const diff = (now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      });
    }
    if (tab === 'month') {
      return completedOrders.filter((o) => {
        const diff = (now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      });
    }
    return completedOrders;
  };

  const displayOrders = getDisplayOrders();
  const displayEarnings = tab === 'week' ? summary.week : tab === 'month' ? summary.total : summary.total;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `Today • ${timeStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday • ${timeStr}`;
    return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • ${timeStr}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings & History</Text>
        <View style={styles.headerRight}>
          <Text style={styles.tabPeriod}>This Week ▾</Text>
          <TouchableOpacity style={styles.calendarBtn}>
            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Weekly Earnings Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Weekly Earnings</Text>
          <Text style={styles.heroAmount}>₹{summary.week || 0}</Text>
          <View style={styles.heroGrowth}>
            <Ionicons name="trending-up" size={14} color="#22C55E" />
            <Text style={styles.heroGrowthText}>
              +₹{Math.round((summary.week || 0) * 0.125)} vs last week
            </Text>
          </View>
        </View>

        {/* Earnings Trend Mini Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Earnings Trend</Text>
          <View style={styles.chartBars}>
            {weeklyData.map((val, idx) => (
              <View key={WEEK_DAYS[idx]} style={styles.barWrapper}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max((val / maxWeekly) * 100, 4)}%`,
                        backgroundColor: idx === new Date().getDay() === 0 ? 6 : (new Date().getDay() + 6) % 7 === idx
                          ? theme.primary : '#FFD4B2',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{WEEK_DAYS[idx]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['week', 'month', 'all'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Completed Orders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Orders</Text>

          {displayOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={42} color="#D1D5DB" />
              <Text style={styles.emptyText}>No orders in this period</Text>
            </View>
          ) : (
            displayOrders.map((order, idx) => (
              <TouchableOpacity
                key={order._id || idx}
                style={styles.orderCard}
                onPress={() => navigation.navigate('ActiveOrder', { order, readonly: true })}
                activeOpacity={0.7}
              >
                <View style={styles.orderCheck}>
                  <Ionicons name="checkmark-circle" size={26} color="#22C55E" />
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderNum}>
                    Order #{order.orderNumber || order._id?.slice(-4) || String(idx + 1).padStart(4, '0')}
                  </Text>
                  <Text style={styles.orderMeta}>{formatTime(order.createdAt)}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderEarning}>₹{order.deliveryFee || 0}</Text>
                  <Text style={styles.orderPayment}>
                    {order.paymentMethod === 'cod' ? 'COD' :
                     order.paymentMethod === 'razorpay' ? 'Online' :
                     'COD'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Summary Footer */}
        <View style={styles.summaryFooter}>
          <Text style={styles.summaryText}>Total Orders: {summary.ordersTotal || completedOrders.length}</Text>
          <Text style={styles.summaryText}>
            Avg. Earnings: ₹{completedOrders.length > 0
              ? Math.round((summary.total || 0) / completedOrders.length)
              : 0}/order
          </Text>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmt}>₹{summary.walletBalance || 0}</Text>
          </View>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-down-circle-outline" size={18} color="#fff" />
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Withdraw Funds</Text>
            <Text style={styles.otpDesc}>Available balance: ₹{summary.walletBalance || 0}</Text>
            <TextInput
              style={styles.otpInput}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#D1D5DB"
            />
            <View style={styles.otpActions}>
              <TouchableOpacity
                style={styles.otpCancel}
                onPress={() => { setShowWithdrawModal(false); setWithdrawAmount(''); }}
              >
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.otpConfirm, withdrawing && { opacity: 0.7 }]}
                onPress={handleWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.otpConfirmText}>Withdraw</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },

  header: {
    backgroundColor: '#fff', paddingTop: 54, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tabPeriod: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  calendarBtn: { padding: 4 },

  // Hero card
  heroCard: {
    margin: 16, backgroundColor: theme.primary, borderRadius: 20, padding: 24,
    elevation: 4, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12,
  },
  heroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  heroAmount: { fontSize: 38, fontWeight: '900', color: '#fff', marginTop: 4 },
  heroGrowth: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  heroGrowthText: { fontSize: 13, color: '#A7F3D0', fontWeight: '700' },

  // Chart
  chartCard: {
    marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 18,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, marginBottom: 16,
  },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 16 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
  barWrapper: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 6, fontWeight: '600' },

  // Tabs
  tabsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, height: 38, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  tabBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  tabBtnTextActive: { color: '#fff' },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 36, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10, fontWeight: '600' },

  // Order row
  orderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4,
  },
  orderCheck: {},
  orderInfo: { flex: 1 },
  orderNum: { fontSize: 14, fontWeight: '800', color: '#111827' },
  orderMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  orderRight: { alignItems: 'flex-end' },
  orderEarning: { fontSize: 16, fontWeight: '900', color: '#111827' },
  orderPayment: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '600' },

  // Summary footer
  summaryFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', marginHorizontal: 16, borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  summaryText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  // Wallet Card
  walletCard: {
    marginHorizontal: 16, backgroundColor: '#111827', borderRadius: 18,
    padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  walletLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  walletAmt: { fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 4 },
  withdrawBtn: {
    backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  withdrawText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // OTP/Withdraw Modal
  otpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  otpCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 },
  otpTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 8 },
  otpDesc: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  otpInput: {
    height: 56, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14,
    fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 16,
  },
  otpActions: { flexDirection: 'row', gap: 12 },
  otpCancel: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  otpCancelText: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  otpConfirm: { flex: 2, height: 52, borderRadius: 14, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
  otpConfirmText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

export default EarningsScreen;
