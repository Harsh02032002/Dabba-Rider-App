import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { registerPartner } from '../api/api';
import { AuthShell } from '../components/AuthShell';
import { Button, Input, Notice } from '../components/ui';
import { colors, radius, spacing, type } from '../theme';

const vehicleOptions: { value: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'bike', label: 'Bike', icon: 'bicycle' },
  { value: 'scooter', label: 'Scooter', icon: 'speedometer-outline' },
  { value: 'car', label: 'Car', icon: 'car-outline' },
];

type Field = 'name' | 'phone' | 'email' | 'password';

const RegisterScreen = ({ navigation }: any) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', vehicleType: 'bike' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const { login } = useAuth();

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if ((fieldErrors as any)[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const next: Partial<Record<Field, string>> = {};
    if (!form.name.trim()) next.name = 'Enter your full name';
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, '').slice(-10))) next.phone = 'Enter a 10-digit mobile number';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (form.password.length < 6) next.password = 'Use at least 6 characters';
    setFieldErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await registerPartner({ ...form, name: form.name.trim(), email: form.email.trim() });
      await login(data.token, data.partner);
    } catch (err: any) {
      setError(err.response?.data?.message || (err.response ? 'Registration failed. Please try again.' : 'Could not reach the server. Check your internet connection.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Join the fleet"
      subtitle="Create your delivery partner account"
      footer={
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Text style={styles.link} onPress={() => navigation.navigate('Login')} accessibilityRole="link">Sign in</Text>
        </Text>
      }
    >
      {error ? <Notice tone="danger" message={error} style={{ marginBottom: spacing.lg }} /> : null}
      <Input label="Full name" icon="person-outline" placeholder="As on your driving licence" value={form.name} onChangeText={(v) => update('name', v)} autoCapitalize="words" error={fieldErrors.name} />
      <Input label="Phone number" icon="call-outline" placeholder="10-digit mobile number" value={form.phone} onChangeText={(v) => update('phone', v.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} error={fieldErrors.phone} />
      <Input label="Email" icon="mail-outline" placeholder="name@example.com" value={form.email} onChangeText={(v) => update('email', v)} keyboardType="email-address" autoCapitalize="none" error={fieldErrors.email} />
      <Input label="Password" icon="lock-closed-outline" placeholder="At least 6 characters" value={form.password} onChangeText={(v) => update('password', v)} secureTextEntry error={fieldErrors.password} />

      <Text style={styles.label}>Vehicle</Text>
      <View style={styles.vehicleRow} accessibilityRole="radiogroup">
        {vehicleOptions.map((v) => {
          const selected = form.vehicleType === v.value;
          return (
            <TouchableOpacity
              key={v.value}
              style={[styles.vehicle, selected && styles.vehicleSelected]}
              onPress={() => update('vehicleType', v.value)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Ionicons name={v.icon} size={22} color={selected ? colors.primary : colors.textSecondary} />
              <Text style={[type.label, { color: selected ? colors.primary : colors.textSecondary }]}>{v.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button title="Create account" size="lg" onPress={handleSubmit} loading={loading} fullWidth />
    </AuthShell>
  );
};

const styles = StyleSheet.create({
  label: { ...type.label, marginBottom: 6 },
  vehicleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  vehicle: { flex: 1, height: 72, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.surface },
  vehicleSelected: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  footerText: { ...type.small, color: colors.textSecondary },
  link: { ...type.label, color: colors.primary },
});

export default RegisterScreen;
