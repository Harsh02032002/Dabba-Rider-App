import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/colors';

const ProfileScreen = ({ navigation }: any) => {
  const { partner, logout } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [language, setLanguage] = useState('English');

  const handleLogout = async () => {
    await logout();
  };

  const menuItems = [
    { emoji: '🛡️', label: 'Documents & Verification' },
    { emoji: '❓', label: 'Help & Support', action: () => setShowSupport(true) },
    { emoji: '🌐', label: `Language: ${language}`, action: () => setShowLang(true) },
    { emoji: '📄', label: 'Terms & Conditions' },
    { emoji: '⚙️', label: 'App Settings' },
  ];

  const supportOptions = [
    { emoji: '💬', label: 'Chat with Support', desc: 'Get help from our team' },
    { emoji: '❓', label: 'FAQ & Help Center', desc: 'Common questions answered' },
    { emoji: '⚠️', label: 'Report Issue', desc: 'Accident, delay, or problem' },
    { emoji: '📞', label: 'Call Support', desc: 'Talk to us: 1800-XXX-XXXX' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{partner?.name || 'Partner'}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStar}>⭐</Text>
                <Text style={styles.ratingText}>{partner?.rating?.toFixed(1) || '4.5'} Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          {[
            { emoji: '📱', label: 'PHONE', value: partner?.phone || 'Not set' },
            { emoji: '✉️', label: 'EMAIL', value: partner?.email || 'Not set' },
            { emoji: '🏍️', label: 'VEHICLE', value: partner?.vehicleType || 'Bike' },
          ].map((item, i) => (
            <View key={item.label} style={[styles.infoRow, i < 2 && styles.infoRowBorder]}>
              <View style={styles.infoIcon}>
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutEmoji}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Support Modal */}
      <Modal visible={showSupport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Help & Support</Text>
            {supportOptions.map((opt) => (
              <TouchableOpacity key={opt.label} style={styles.supportItem} activeOpacity={0.7}>
                <View style={styles.supportIcon}>
                  <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportLabel}>{opt.label}</Text>
                  <Text style={styles.supportDesc}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSupport(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLang} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            {['English', 'Hindi'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => { setLanguage(lang); setShowLang(false); }}
              >
                <Text style={[styles.langText, language === lang && { color: theme.primary }]}>
                  {lang === 'Hindi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLang(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 32 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ratingStar: { fontSize: 14 },
  ratingText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  infoCard: {
    marginHorizontal: 16, marginTop: -20, backgroundColor: theme.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  infoIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(242,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 10, color: theme.mutedForeground, fontWeight: '500', letterSpacing: 1 },
  infoValue: { fontSize: 14, fontWeight: '600', color: theme.foreground, marginTop: 2, textTransform: 'capitalize' },
  menuCard: {
    marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16,
    borderWidth: 1, borderColor: theme.border, marginBottom: 12, overflow: 'hidden',
  },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 14, fontWeight: '500', color: theme.foreground },
  menuArrow: { fontSize: 20, color: theme.mutedForeground },
  logoutBtn: {
    marginHorizontal: 16, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  logoutEmoji: { fontSize: 18 },
  logoutText: { fontSize: 15, fontWeight: '600', color: theme.destructive },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 16 },
  modalContent: { backgroundColor: theme.card, borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.foreground, marginBottom: 16 },
  supportItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 12, backgroundColor: theme.secondary, marginBottom: 8,
  },
  supportIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(242,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  supportLabel: { fontSize: 14, fontWeight: '600', color: theme.foreground },
  supportDesc: { fontSize: 12, color: theme.mutedForeground },
  closeBtn: {
    height: 48, borderRadius: 12, backgroundColor: theme.secondary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: theme.foreground },
  langBtn: {
    padding: 16, borderRadius: 12, marginBottom: 8,
    backgroundColor: theme.secondary, borderWidth: 2, borderColor: 'transparent',
  },
  langBtnActive: { borderColor: theme.primary, backgroundColor: 'rgba(242,115,22,0.1)' },
  langText: { fontSize: 15, fontWeight: '500', color: theme.foreground },
});

export default ProfileScreen;
