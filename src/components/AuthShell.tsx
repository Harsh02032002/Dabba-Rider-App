import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, spacing, type } from '../theme';

/** Shared layout for rider Login and Register */
export const AuthShell: React.FC<{ title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, subtitle, children, footer }) => {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="cover" accessibilityLabel="Dabba Nation" />
            </View>
            <Text style={styles.brandTitle}>
              Dabba <Text style={{ color: colors.primary }}>Nation</Text>
            </Text>
            <Text style={type.overline}>Rider partner</Text>
          </View>
          <View style={styles.card}>
            <Text style={type.title} accessibilityRole="header">{title}</Text>
            <Text style={[type.small, { color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xl }]}>{subtitle}</Text>
            {children}
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: spacing.screen },
  inner: { width: '100%', maxWidth: 440 },
  brand: { alignItems: 'center', marginBottom: spacing.xxl, gap: 4 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: spacing.md, ...elevation.card },
  logo: { width: 88, height: 88 },
  brandTitle: { ...type.title, fontSize: 22 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.xl, ...elevation.card },
  footer: { alignItems: 'center', marginTop: spacing.xl },
});
