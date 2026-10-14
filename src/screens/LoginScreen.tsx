import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { sendPartnerLoginOtp, verifyPartnerLoginOtp } from '../api/api';
import { theme } from '../theme/colors';

const LoginScreen = ({ navigation }: any) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpInfo, setOtpInfo] = useState<{ maskedEmail?: string; maskedPhone?: string; message?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const { login } = useAuth();

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setError('Please enter your Email or Phone Number');
      return;
    }
    if (loginMode === 'password' && !password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const { data } = await sendPartnerLoginOtp({
        identifier: identifier.trim(),
        password: loginMode === 'password' ? password : undefined,
      });
      setOtpInfo({
        maskedEmail: data?.maskedEmail,
        maskedPhone: data?.maskedPhone,
        message: data?.message,
      });
      setOtpStep(true);
      setInfoMessage(data?.message || '6-digit OTP sent to your Email & Phone number.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.trim().length < 6) {
      setError('Please enter the 6-digit OTP sent to your Email/Phone');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await verifyPartnerLoginOtp({
        identifier: identifier.trim(),
        otp: otp.trim(),
      });
      await login(data.token, data.partner);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await sendPartnerLoginOtp({
        identifier: identifier.trim(),
        password: loginMode === 'password' ? password : undefined,
      });
      setInfoMessage(data?.message || 'New 6-digit OTP sent to your Email & Phone.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const isPhoneInput = /^\d+$/.test(identifier.replace(/\+/g, '')) && identifier.length > 0;

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
          <Text style={styles.brandSub}>Rider Partner App</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.heading}>{otpStep ? 'Verify Rider OTP' : 'Welcome Back!'}</Text>
          <Text style={styles.subheading}>
            {otpStep
              ? `Enter the 6-digit OTP sent to ${[otpInfo.maskedEmail, otpInfo.maskedPhone].filter(Boolean).join(' & ') || 'your Email & Phone'}`
              : 'Sign in with your Email or Phone Number to start earning'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={theme.destructive} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {infoMessage && !error ? (
            <View style={styles.infoBox}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          ) : null}

          {!otpStep ? (
            <>
              <View style={styles.modeToggleContainer}>
                <TouchableOpacity
                  style={[styles.modeTab, loginMode === 'password' && styles.modeTabActive]}
                  onPress={() => setLoginMode('password')}
                >
                  <Text style={[styles.modeTabText, loginMode === 'password' && styles.modeTabTextActive]}>
                    Password + OTP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, loginMode === 'otp' && styles.modeTabActive]}
                  onPress={() => setLoginMode('otp')}
                >
                  <Text style={[styles.modeTabText, loginMode === 'otp' && styles.modeTabTextActive]}>
                    Direct OTP Login
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email or Phone Number</Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name={isPhoneInput ? 'call-outline' : 'mail-outline'}
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Email or 10-digit Phone"
                    placeholderTextColor="#94a3b8"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {loginMode === 'password' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => setLoginMode('otp')}
              >
                <Text style={styles.forgotText}>Login without password (OTP)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.8 }]}
                onPress={handleRequestOtp}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Continue & Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>6-Digit OTP (Sent via SMS & Email)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="key-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#94a3b8"
                    value={otp}
                    onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && { opacity: 0.8 }]}
                onPress={handleVerifyOtp}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Verify OTP & Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActionRow}>
                <TouchableOpacity
                  onPress={() => {
                    setOtpStep(false);
                    setOtp('');
                    setError('');
                    setInfoMessage('');
                  }}
                >
                  <Text style={styles.changeAccountText}>Change Email / Phone</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                  <Text style={styles.resendOtpText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Dabba Nation? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { flexGrow: 1, paddingHorizontal: 25, paddingVertical: 50 },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 10,
    borderRadius: 55,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
  },
  brandSub: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
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
  heading: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: theme.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorText: { color: theme.destructive, fontSize: 13, fontWeight: '600', flex: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  infoText: { color: '#15803d', fontSize: 13, fontWeight: '600', flex: 1 },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 56,
    paddingHorizontal: 15,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '500' },
  otpInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgotText: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '700',
  },
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
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  changeAccountText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  resendOtpText: {
    fontSize: 13,
    color: theme.primary,
    fontWeight: '800',
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  footerLink: { fontSize: 15, color: theme.primary, fontWeight: '700' },
});

export default LoginScreen;
