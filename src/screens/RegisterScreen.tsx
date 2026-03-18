import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { registerPartner } from '../api/api';
import { theme } from '../theme/colors';

const vehicleOptions = [
  { value: 'bike', label: 'Bike', emoji: '🏍️' },
  { value: 'scooter', label: 'Scooter', emoji: '🛵' },
  { value: 'car', label: 'Car', emoji: '🚗' },
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
    if (!form.name || !form.phone || !form.email || !form.password) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await registerPartner(form);
      await login(data.token, data.partner);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🛵</Text>
          </View>
          <View>
            <Text style={styles.logoTitle}>
              Dabba<Text style={styles.logoGradient}> Nation</Text>
            </Text>
            <Text style={styles.logoSub}>Delivery Partner</Text>
          </View>
        </View>

        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.subheading}>Join the delivery fleet</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {[
          { key: 'name', placeholder: 'Full name', icon: '👤', type: 'default' as const },
          { key: 'phone', placeholder: 'Phone number', icon: '📱', type: 'phone-pad' as const },
          { key: 'email', placeholder: 'Email address', icon: '✉️', type: 'email-address' as const },
          { key: 'password', placeholder: 'Password', icon: '🔒', type: 'default' as const, secure: true },
        ].map((field) => (
          <View key={field.key} style={styles.inputWrap}>
            <Text style={styles.inputIcon}>{field.icon}</Text>
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor={theme.mutedForeground}
              value={(form as any)[field.key]}
              onChangeText={(v) => update(field.key, v)}
              keyboardType={field.type}
              secureTextEntry={field.secure}
              autoCapitalize={field.key === 'email' ? 'none' : 'words'}
            />
          </View>
        ))}

        {/* Vehicle Type */}
        <Text style={styles.vehicleLabel}>Vehicle Type</Text>
        <View style={styles.vehicleRow}>
          {vehicleOptions.map((v) => {
            const selected = form.vehicleType === v.value;
            return (
              <TouchableOpacity
                key={v.value}
                style={[styles.vehicleBtn, selected && styles.vehicleBtnActive]}
                onPress={() => update('vehicleType', v.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                <Text style={[styles.vehicleBtnText, selected && { color: theme.primary }]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : (
            <Text style={styles.submitText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
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
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 32 },
  logoIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 24 },
  logoTitle: { fontSize: 24, fontWeight: '700', color: theme.foreground },
  logoGradient: { color: theme.primary },
  logoSub: { fontSize: 12, color: theme.mutedForeground, fontWeight: '500' },
  heading: { fontSize: 22, fontWeight: '600', color: theme.foreground, marginBottom: 4 },
  subheading: { fontSize: 14, color: theme.mutedForeground, marginBottom: 20 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 12,
  },
  errorText: { color: theme.destructive, fontSize: 14, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.secondary, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    height: 48, paddingHorizontal: 12, marginBottom: 10,
  },
  inputIcon: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: theme.foreground },
  vehicleLabel: { fontSize: 14, fontWeight: '500', color: theme.foreground, marginBottom: 8, marginTop: 4 },
  vehicleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  vehicleBtn: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: theme.border,
    backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
  },
  vehicleBtnActive: { borderColor: theme.primary, backgroundColor: 'rgba(242,115,22,0.1)' },
  vehicleEmoji: { fontSize: 16 },
  vehicleBtnText: { fontSize: 14, fontWeight: '500', color: theme.mutedForeground },
  submitBtn: {
    height: 48, borderRadius: 12, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  submitText: { color: theme.primaryForeground, fontSize: 16, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: theme.mutedForeground },
  footerLink: { fontSize: 14, color: theme.primary, fontWeight: '600' },
});

export default RegisterScreen;
