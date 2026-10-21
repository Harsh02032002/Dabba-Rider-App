import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/colors';
import { AppHeader } from '../components/AppHeader';
import { deleteAccount } from '../api/api';

const PRIVACY_URL = 'https://dabbanation.in/privacy-policy';

const ProfileScreen = ({ navigation }: any) => {
  const { partner, logout } = useAuth();
  const [showSupport, setShowSupport] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [language, setLanguage] = useState('English');

  const handleLogout = async () => {
    await logout();
  };

  // Play Store requirement: riders can delete their account from the app
  const handleDeleteAccount = () => {
    const run = async () => {
      try {
        await deleteAccount();
        await logout();
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Could not delete your account. Please try again.';
        if (Platform.OS === 'web') window.alert(message); else Alert.alert('Account not deleted', message);
      }
    };
    const text = 'This permanently deletes your profile, documents and bank details, and any unpaid wallet balance. Past deliveries are kept without your name, as required by law. This cannot be undone.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete your account?

${text}`)) run();
      return;
    }
    Alert.alert('Delete your account?', text, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete account', style: 'destructive', onPress: run },
    ]);
  };

  const menuItems = [
    {
      icon: 'document-text-outline',
      label: 'Documents & Verification',
      color: '#6366f1',
      badge: partner?.isApproved ? 'Verified' : partner?.kycStatus === 'submitted' ? 'Review' : 'Pending',
      badgeColor: partner?.isApproved ? '#16A34A' : partner?.kycStatus === 'submitted' ? '#D97706' : '#EF4444',
      action: () => navigation.navigate('KycVerification'),
    },
    { icon: 'help-circle-outline', label: 'Help & Support', color: '#f59e0b', action: () => setShowSupport(true) },
    { icon: 'language-outline', label: `Language: ${language}`, color: '#10b981', action: () => setShowLang(true) },
    { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: '#0ea5e9', action: () => Linking.openURL(PRIVACY_URL) },
    { icon: 'trash-outline', label: 'Delete Account', color: '#ef4444', action: handleDeleteAccount },
    { icon: 'shield-checkmark-outline', label: 'Terms & Conditions', color: '#64748b' },
    { icon: 'settings-outline', label: 'App Settings', color: '#4b5563' },
  ];

  const supportOptions = [
    { icon: 'chatbubble-ellipses-outline', label: 'Chat with Support', desc: 'Get help from our team', color: '#3b82f6' },
    { icon: 'help-buoy-outline', label: 'FAQ & Help Center', desc: 'Common questions answered', color: '#8b5cf6' },
    { icon: 'alert-circle-outline', label: 'Report Issue', desc: 'Accident, delay, or problem', color: '#ef4444' },
    { icon: 'call-outline', label: 'Call Support', desc: 'Talk to us: 1800-XXX-XXXX', color: '#10b981' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="My Profile" showBack />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.profileName}>{partner?.name || 'Partner'}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{partner?.rating?.toFixed(1) || '4.5'} Rating</Text>
          </View>
        </View>

        {/* Info Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            {[
              { icon: 'call-outline', label: 'PHONE', value: partner?.phone || 'Not set', color: '#3b82f6' },
              { icon: 'mail-outline', label: 'EMAIL', value: partner?.email || 'Not set', color: '#ec4899' },
              { icon: 'bicycle-outline', label: 'VEHICLE', value: partner?.vehicleType || 'Bike', color: '#f59e0b' },
            ].map((item, i) => (
              <View key={item.label} style={[styles.infoRow, i < 2 && styles.infoRowBorder]}>
                <View style={[styles.infoIconWrapper, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences & Support</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconWrapper, { backgroundColor: item.color + '10' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.badge && (
                    <View style={{ backgroundColor: item.badgeColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: item.badgeColor }}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout} 
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout Account</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Version 1.0.0 (Build 124)</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Support Modal */}
      <Modal visible={showSupport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setShowSupport(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            {supportOptions.map((opt) => (
              <TouchableOpacity key={opt.label} style={styles.supportItem} activeOpacity={0.7}>
                <View style={[styles.supportIconWrapper, { backgroundColor: opt.color + '10' }]}>
                  <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportLabel}>{opt.label}</Text>
                  <Text style={styles.supportDesc}>{opt.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLang} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLang(false)}>
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
            </View>
            
            {['English', 'Hindi'].map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => { setLanguage(lang); setShowLang(false); }}
              >
                <View style={styles.langLeft}>
                  <Text style={styles.langEmoji}>{lang === 'Hindi' ? '🇮🇳' : '🇬🇧'}</Text>
                  <Text style={[styles.langText, language === lang && { color: theme.primary, fontWeight: '700' }]}>
                    {lang}
                  </Text>
                </View>
                {language === lang && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  profileHeaderCard: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff5f0',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1e293b',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  supportIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  supportDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  langBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langBtnActive: {
    borderColor: theme.primary,
    backgroundColor: '#fff5f0',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  langEmoji: {
    fontSize: 24,
  },
  langText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
});

export default ProfileScreen;
