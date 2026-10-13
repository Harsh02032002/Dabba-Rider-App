import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { registerPartner } from '../api/api';
import { theme } from '../theme/colors';

const vehicleOptions = [
  { value: 'bike', label: 'Bike', icon: 'bicycle-outline' },
  { value: 'scooter', label: 'Scooter', icon: 'scooter-outline' },
  { value: 'car', label: 'Car', icon: 'car-outline' },
];

const RegisterScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', vehicleType: 'bike',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const update = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError('Please fill all the fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await registerPartner(form);
      await login(data.token, data.partner);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Dabba <Text style={{ color: theme.primary }}>Nation</Text></Text>
          <Text style={styles.brandSub}>Delivery Partner Fleet</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subheading}>Join our fleet and start earning today</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={theme.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {[
            { key: 'name', label: 'Full Name', placeholder: 'Enter your name', icon: 'person-outline', type: 'default' as const },
            { key: 'phone', label: 'Phone Number', placeholder: 'Enter your phone', icon: 'call-outline', type: 'phone-pad' as const },
            { key: 'email', label: 'Email Address', placeholder: 'Enter your email', icon: 'mail-outline', type: 'email-address' as const },
            { key: 'password', label: 'Password', placeholder: 'Create a password', icon: 'lock-closed-outline', type: 'default' as const, secure: true },
          ].map((field) => (
            <View key={field.key} style={styles.inputContainer}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name={field.icon as any} size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#94a3b8"
                  value={(form as any)[field.key]}
                  onChangeText={(v) => update(field.key, v)}
                  keyboardType={field.type}
                  secureTextEntry={field.secure}
                  autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                />
              </View>
            </View>
          ))}

          {/* Vehicle Type */}
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.vehicleRow}>
            {vehicleOptions.map((v) => {
              const selected = form.vehicleType === v.value;
              return (
                <TouchableOpacity
                  key={v.value}
                  style={[styles.vehicleBtn, selected && styles.vehicleBtnActive]}
                  onPress={() => update('vehicleType', v.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={v.icon as any} size={22} color={selected ? theme.primary : '#64748b'} />
                  <Text style={[styles.vehicleBtnText, selected && { color: theme.primary, fontWeight: '700' }]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.8 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Get Started</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { flexGrow: 1, paddingHorizontal: 25, paddingVertical: 40 },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 8,
    borderRadius: 50,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e293b',
  },
  brandSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  heading: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  subheading: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: { color: theme.destructive, fontSize: 13, fontWeight: '600', flex: 1 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 52,
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  vehicleRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  vehicleBtn: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vehicleBtnActive: { borderColor: theme.primary, backgroundColor: '#fff5f0' },
  vehicleBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  submitBtn: {
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  footerLink: { fontSize: 14, color: theme.primary, fontWeight: '700' },
});

export default RegisterScreen;
