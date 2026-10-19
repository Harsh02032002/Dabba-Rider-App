/**
 * Dabba Nation UI kit (Rider app) — mirrors user-app/src/components/common with the same tokens.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  TextInput,
  TextInputProps,
  ViewStyle,
  StyleProp,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, kitchenStatus, radius, sizes, spacing, type } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneColors = (tone: Tone) => {
  switch (tone) {
    case 'primary': return { bg: colors.primarySoft, fg: colors.primary };
    case 'success': return { bg: colors.successSoft, fg: colors.successStrong };
    case 'warning': return { bg: colors.warningSoft, fg: colors.warningStrong };
    case 'danger': return { bg: colors.dangerSoft, fg: colors.danger };
    case 'info': return { bg: colors.infoSoft, fg: colors.info };
    default: return { bg: colors.surfaceMuted, fg: colors.textSecondary };
  }
};

// ─── Buttons ──────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'success';

export const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ title, onPress, variant = 'primary', size = 'md', icon, iconRight, disabled, loading, fullWidth, style }) => {
  const palette = {
    primary: { bg: colors.primary, fg: colors.textInverse, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
    tertiary: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    destructive: { bg: colors.danger, fg: colors.textInverse, border: colors.danger },
    success: { bg: colors.success, fg: colors.textInverse, border: colors.success },
  }[variant];
  const inactive = !!disabled || !!loading;
  const height = size === 'lg' ? sizes.buttonHeightLg : size === 'sm' ? sizes.buttonHeightSm : sizes.buttonHeight;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: palette.bg, borderColor: palette.border },
        size === 'sm' && { paddingHorizontal: spacing.md, borderRadius: radius.sm },
        fullWidth && { alignSelf: 'stretch' },
        pressed && !inactive && { opacity: 0.88 },
        disabled && (variant === 'primary' ? { backgroundColor: colors.primaryDisabled, borderColor: colors.primaryDisabled } : { opacity: 0.45 }),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, size === 'sm' && { fontSize: 13 }, { color: palette.fg }]} numberOfLines={1}>{title}</Text>
          {iconRight ? <Ionicons name={iconRight} size={18} color={palette.fg} /> : null}
        </>
      )}
    </Pressable>
  );
};

export const IconButton: React.FC<{
  icon: IconName;
  onPress?: () => void;
  color?: string;
  size?: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  filled?: boolean;
}> = ({ icon, onPress, color = colors.text, size = 22, accessibilityLabel, style, filled }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    style={[styles.iconButton, filled && styles.iconButtonFilled, style]}
    activeOpacity={0.7}
  >
    <Ionicons name={icon} size={size} color={color} />
  </TouchableOpacity>
);

// ─── Inputs ───────────────────────────────────────────────────────────

export const Input = React.forwardRef<TextInput, TextInputProps & { label?: string; icon?: IconName; error?: string; containerStyle?: StyleProp<ViewStyle> }>(
  function Input({ label, icon, error, containerStyle, secureTextEntry, onFocus, onBlur, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(!!secureTextEntry);
    return (
      <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <View style={[styles.inputWrap, focused && { borderColor: colors.primary }, !!error && { borderColor: colors.danger }]}>
          {icon ? <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textTertiary} /> : null}
          <TextInput
            ref={ref}
            style={styles.input}
            placeholderTextColor={colors.textTertiary}
            secureTextEntry={hidden}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            {...rest}
          />
          {secureTextEntry ? (
            <TouchableOpacity onPress={() => setHidden((h) => !h)} accessibilityLabel={hidden ? 'Show password' : 'Hide password'} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        {error ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

// ─── Surfaces ─────────────────────────────────────────────────────────

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean; onPress?: () => void; outlined?: boolean }> = ({
  children,
  style,
  padded = true,
  onPress,
  outlined,
}) => {
  const s = [styles.card, padded && { padding: spacing.lg }, outlined ? styles.cardOutlined : elevation.card, style];
  return onPress ? (
    <TouchableOpacity style={s} onPress={onPress} activeOpacity={0.85} accessibilityRole="button">{children}</TouchableOpacity>
  ) : (
    <View style={s}>{children}</View>
  );
};

export const Divider: React.FC<{ style?: StyleProp<ViewStyle>; inset?: number }> = ({ style, inset }) => (
  <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, inset ? { marginLeft: inset } : null, style]} />
);

export const Badge: React.FC<{ text: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle> }> = ({ text, tone = 'neutral', icon, style }) => {
  const c = toneColors(tone);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={c.fg} /> : null}
      <Text style={[styles.badgeText, { color: c.fg }]} numberOfLines={1}>{text}</Text>
    </View>
  );
};

export const KitchenBadge: React.FC<{ status?: string; style?: StyleProp<ViewStyle> }> = ({ status, style }) => {
  const c = status ? kitchenStatus[status] : undefined;
  if (!c) return null;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
};

/** Top app bar used across rider screens */
export const ScreenHeader: React.FC<{ title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }> = ({ title, subtitle, onBack, right }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        {onBack ? <IconButton icon="arrow-back" accessibilityLabel="Go back" onPress={onBack} style={{ marginLeft: -spacing.sm }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={type.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={type.caption} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
};

export const SectionTitle: React.FC<{ title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({ title, action, onAction, style }) => (
  <View style={[styles.sectionTitle, style]}>
    <Text style={[type.heading, { flex: 1 }]} accessibilityRole="header">{title}</Text>
    {action && onAction ? (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[type.label, { color: colors.primary }]}>{action}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

export const ListRow: React.FC<{
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ icon, iconColor, title, subtitle, value, onPress, destructive, showChevron = !!onPress, style }) => {
  const body = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, destructive && { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name={icon} size={18} color={destructive ? colors.danger : iconColor || colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[type.subheading, destructive && { color: colors.danger }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={type.caption} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[type.small, { color: colors.textSecondary }]} numberOfLines={1}>{value}</Text> : null}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </>
  );
  return onPress ? (
    <TouchableOpacity style={[styles.listRow, style]} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">{body}</TouchableOpacity>
  ) : (
    <View style={[styles.listRow, style]}>{body}</View>
  );
};

// ─── States ───────────────────────────────────────────────────────────

export const EmptyState: React.FC<{ icon: IconName; title: string; subtitle?: string; actionText?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  style,
}) => (
  <View style={[styles.empty, style]}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={30} color={colors.primary} />
    </View>
    <Text style={[type.heading, { textAlign: 'center' }]}>{title}</Text>
    {subtitle ? <Text style={[type.small, { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xs }]}>{subtitle}</Text> : null}
    {actionText && onAction ? <Button title={actionText} variant="secondary" onPress={onAction} style={{ marginTop: spacing.lg, minWidth: 160 }} /> : null}
  </View>
);

export const Notice: React.FC<{ tone?: Tone; icon?: IconName; title?: string; message: string; actionLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({
  tone = 'info',
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}) => {
  const c = toneColors(tone);
  const fallback: IconName = tone === 'danger' ? 'alert-circle' : tone === 'warning' ? 'warning' : tone === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <View style={[styles.notice, { backgroundColor: c.bg }, style]}>
      <Ionicons name={icon || fallback} size={18} color={c.fg} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[type.label, { color: c.fg }]}>{title}</Text> : null}
        <Text style={[type.small, { color: title ? colors.text : c.fg }]}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[type.label, { color: c.fg }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const Skeleton: React.FC<{ width?: ViewStyle['width']; height?: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({ width = '100%', height = 14, radius: r = radius.sm, style }) => {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surfaceMuted, opacity }, style]} />;
};

export const SkeletonCards: React.FC<{ count?: number; height?: number }> = ({ count = 3, height = 120 }) => (
  <View style={{ gap: spacing.md }}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} height={height} radius={radius.lg} />
    ))}
  </View>
);

export const StatTile: React.FC<{ label: string; value: string; icon?: IconName; style?: StyleProp<ViewStyle> }> = ({ label, value, icon, style }) => (
  <View style={[styles.stat, style]}>
    {icon ? (
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
    ) : null}
    <Text style={[type.money, { fontSize: 20, lineHeight: 26 }]} numberOfLines={1}>{value}</Text>
    <Text style={type.caption} numberOfLines={1}>{label}</Text>
  </View>
);

/** Bottom sheet modal with handle, title and optional footer */
export const Sheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  dismissable?: boolean;
}> = ({ visible, onClose, title, subtitle, children, footer, dismissable = true }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : () => {}} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={dismissable ? onClose : undefined} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={type.title}>{title}</Text>
                {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
              </View>
              {dismissable ? <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} filled size={18} /> : null}
            </View>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  button: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  iconButton: { width: sizes.iconButton, height: sizes.iconButton, borderRadius: sizes.iconButton / 2, alignItems: 'center', justifyContent: 'center' },
  iconButtonFilled: { backgroundColor: colors.surfaceMuted, width: 36, height: 36, borderRadius: 18 },

  inputLabel: { ...type.label, marginBottom: 6 },
  inputWrap: { minHeight: sizes.inputHeight, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg },
  cardOutlined: { borderWidth: 1, borderColor: colors.border },

  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '600' },

  header: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  headerRow: { minHeight: sizes.headerHeight, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.screen, paddingVertical: spacing.sm },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },

  listRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl + spacing.lg, paddingHorizontal: spacing.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: spacing.md, borderRadius: radius.md },

  stat: { flex: 1, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 2, ...elevation.card },
  statIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: { marginTop: 'auto', maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: spacing.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
});
