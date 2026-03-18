import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { loginPartner } from '../api/api';
import { theme } from '../theme/colors';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await loginPartner({ email, password });
      await login(data.token, data.partner);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
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
        {/* Logo */}
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

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subheading}>Sign in to start delivering</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={theme.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
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
            <Text style={styles.submitText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 40 },
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
  subheading: { fontSize: 14, color: theme.mutedForeground, marginBottom: 24 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { color: theme.destructive, fontSize: 14, fontWeight: '500' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.secondary, borderRadius: 12,
    borderWidth: 1, borderColor: theme.border,
    height: 48, paddingHorizontal: 12, marginBottom: 12,
  },
  inputIcon: { fontSize: 18, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: theme.foreground },
  submitBtn: {
    height: 48, borderRadius: 12, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitText: { color: theme.primaryForeground, fontSize: 16, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: theme.mutedForeground },
  footerLink: { fontSize: 14, color: theme.primary, fontWeight: '600' },
});

export default LoginScreen;
