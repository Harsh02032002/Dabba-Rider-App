import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Modal,
} from 'react-native';
import { getEarnings, requestWithdrawal } from '../api/api';
import { Earning, EarningsSummary } from '../types';
import { theme } from '../theme/colors';

const EarningsScreen = () => {
  const [summary, setSummary] = useState<EarningsSummary>({
    today: 0, week: 0, total: 0, ordersToday: 0, ordersTotal: 0, walletBalance: 0,
  });
  const [history, setHistory] = useState<Earning[]>([]);
  const [tab, setTab] = useState<'today' | 'week' | 'all'>('today');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    getEarnings()
      .then(({ data }) => {
        if (data.summary) setSummary(data.summary);
        if (data.history) setHistory(data.history);
      })
      .catch(() => {});
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

  const cards = [
    { label: 'Today', value: summary.today, key: 'today' as const },
    { label: 'This Week', value: summary.week, key: 'week' as const },
    { label: 'Total', value: summary.total, key: 'all' as const },
  ];

  const deliveryCharges = [
    { range: '0–2 km', charge: '₹20' },
    { range: '2–5 km', charge: '₹30' },
    { range: '5+ km', charge: '₹40' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Earnings</Text>
          <Text style={styles.pageSub}>Track your income</Text>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIcon}>
              <Text style={styles.walletEmoji}>💰</Text>
            </View>
            <View>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletAmount}>₹{summary.walletBalance || 0}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={styles.withdrawBtnText}>⬇ Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          {cards.map((c) => {
            const active = tab === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.summaryCard, active && styles.summaryCardActive]}
                onPress={() => setTab(c.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.summaryValue, active && { color: '#fff' }]}>₹{c.value}</Text>
                <Text style={[styles.summaryLabel, active && { color: 'rgba(255,255,255,0.8)' }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Big Display */}
        <View style={styles.bigCard}>
          <View style={styles.bigIcon}>
            <Text style={{ fontSize: 28 }}>₹</Text>
          </View>
          <Text style={styles.bigAmount}>
            ₹{tab === 'today' ? summary.today : tab === 'week' ? summary.week : summary.total}
          </Text>
          <Text style={styles.bigLabel}>
            {tab === 'today' ? 'Earned Today' : tab === 'week' ? 'This Week' : 'Total Earned'}
          </Text>
          <View style={styles.bigTrend}>
            <Text style={styles.bigTrendText}>📈 +12% from yesterday</Text>
          </View>
        </View>

        {/* Delivery Charge Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Charge Rates</Text>
          <View style={styles.ratesCard}>
            <View style={styles.ratesRow}>
              {deliveryCharges.map((dc) => (
                <View key={dc.range} style={styles.rateItem}>
                  <Text style={styles.rateRange}>{dc.range}</Text>
                  <Text style={styles.rateCharge}>{dc.charge}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Text style={styles.sectionIcon}>📅</Text>
          </View>
          {history.length > 0 ? (
            history.map((item) => (
              <View key={item._id} style={styles.txCard}>
                <View style={styles.txLeft}>
                  <View style={styles.txIcon}>
                    <Text>↗️</Text>
                  </View>
                  <View>
                    <Text style={styles.txTitle}>Order #{item.orderId.slice(-6)}</Text>
                    <Text style={styles.txSub}>Commission: ₹{item.commission}</Text>
                  </View>
                </View>
                <Text style={styles.txAmount}>+₹{item.netAmount}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>₹</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySub}>Complete orders to earn</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>
            <Text style={styles.modalSub}>Available balance: ₹{summary.walletBalance || 0}</Text>
            <View style={styles.modalInputWrap}>
              <Text style={styles.modalInputIcon}>₹</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor={theme.mutedForeground}
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { setShowWithdrawModal(false); setWithdrawAmount(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (withdrawing || !withdrawAmount) && { opacity: 0.6 }]}
                onPress={handleWithdraw}
                disabled={withdrawing || !withdrawAmount}
              >
                {withdrawing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Withdraw to Bank</Text>
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
  headerSection: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: theme.foreground },
  pageSub: { fontSize: 14, color: theme.mutedForeground, marginTop: 4 },
  walletCard: {
    marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  walletLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  walletEmoji: { fontSize: 24 },
  walletLabel: { fontSize: 12, color: theme.mutedForeground },
  walletAmount: { fontSize: 24, fontWeight: '700', color: theme.foreground },
  withdrawBtn: {
    height: 40, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: 'rgba(242,115,22,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  withdrawBtnText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  cardsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
  },
  summaryCardActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  summaryValue: { fontSize: 18, fontWeight: '700', color: theme.foreground },
  summaryLabel: { fontSize: 10, color: theme.mutedForeground, marginTop: 4 },
  bigCard: {
    marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  bigIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  bigAmount: { fontSize: 32, fontWeight: '700', color: theme.foreground },
  bigLabel: { fontSize: 14, color: theme.mutedForeground, marginTop: 4 },
  bigTrend: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bigTrendText: { fontSize: 12, color: theme.success, fontWeight: '500' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.foreground, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 16 },
  ratesCard: {
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: theme.border,
  },
  ratesRow: { flexDirection: 'row', gap: 8 },
  rateItem: {
    flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: theme.secondary,
  },
  rateRange: { fontSize: 12, color: theme.mutedForeground },
  rateCharge: { fontSize: 16, fontWeight: '700', color: theme.primary, marginTop: 4 },
  txCard: {
    backgroundColor: theme.card, borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: theme.border, marginBottom: 8,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(242,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  txTitle: { fontSize: 14, fontWeight: '600', color: theme.foreground },
  txSub: { fontSize: 12, color: theme.mutedForeground },
  txAmount: { fontSize: 14, fontWeight: '700', color: theme.success },
  emptyCard: {
    backgroundColor: theme.card, borderRadius: 12, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  emptyEmoji: { fontSize: 40, color: theme.mutedForeground, opacity: 0.3, marginBottom: 8 },
  emptyText: { fontSize: 14, color: theme.mutedForeground },
  emptySub: { fontSize: 12, color: theme.mutedForeground, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 16 },
  modalContent: { backgroundColor: theme.card, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.foreground, marginBottom: 4 },
  modalSub: { fontSize: 14, color: theme.mutedForeground, marginBottom: 16 },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.secondary,
    borderRadius: 12, borderWidth: 1, borderColor: theme.border, height: 48, paddingHorizontal: 12, marginBottom: 16,
  },
  modalInputIcon: { fontSize: 18, color: theme.mutedForeground, marginRight: 8 },
  modalInput: { flex: 1, fontSize: 15, color: theme.foreground },
  modalActions: { flexDirection: 'row', gap: 12 },
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

export default EarningsScreen;
