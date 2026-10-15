/**
 * Dabba Nation design tokens (Rider app).
 * Same values as user-app/src/theme — keep both apps in sync.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  primary: '#FF6B00',
  primaryPressed: '#E65F00',
  primaryDisabled: '#FFB380',
  primarySoft: '#FFF4EC',
  primaryBorder: '#FFD8BD',
  brandGreen: '#4CAF50',

  canvas: '#FAF8F3',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F3EE',
  overlay: 'rgba(17, 17, 17, 0.5)',
  ink: '#1C1C1E', // dark surfaces (offline state)

  text: '#1A1A1A',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  textInverse: '#FFFFFF',

  border: '#E8E5DE',
  divider: '#F0EEE8',

  success: '#22C55E',
  successStrong: '#15803D',
  successSoft: '#ECFDF3',
  warning: '#F59E0B',
  warningStrong: '#B45309',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  rating: '#F5A623',
} as const;

/** Kitchen status of an order as seen by the rider */
export const kitchenStatus: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E', label: 'Pending' },
  confirmed: { bg: '#DBEAFE', fg: '#1E40AF', label: 'Confirmed' },
  preparing: { bg: '#E9D5FF', fg: '#7C3AED', label: 'Preparing' },
  ready: { bg: '#CCFBF1', fg: '#0F766E', label: 'Food ready' },
  out_for_delivery: { bg: '#FED7AA', fg: '#EA580C', label: 'Out for delivery' },
  delivered: { bg: '#D1FAE5', fg: '#065F46', label: 'Delivered' },
  cancelled: { bg: '#FEE2E2', fg: '#DC2626', label: 'Cancelled' },
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, screen: 16 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const sizes = { buttonHeight: 48, buttonHeightLg: 52, buttonHeightSm: 36, inputHeight: 48, iconButton: 40, headerHeight: 56 } as const;

const font = (size: number, lineHeight: number, weight: TextStyle['fontWeight']): TextStyle => ({
  fontSize: size,
  lineHeight,
  fontWeight: weight,
  color: colors.text,
});

export const type = {
  display: font(26, 32, '700'),
  title: font(20, 26, '700'),
  heading: font(17, 22, '600'),
  subheading: font(15, 20, '600'),
  body: font(15, 21, '400'),
  label: font(13, 18, '600'),
  small: font(13, 18, '400'),
  caption: { ...font(12, 16, '400'), color: colors.textSecondary } as TextStyle,
  overline: { ...font(11, 14, '600'), letterSpacing: 0.6, textTransform: 'uppercase', color: colors.textSecondary } as TextStyle,
  money: { ...font(15, 20, '700'), fontVariant: ['tabular-nums'] } as TextStyle,
};

const shadow = (elevation: number, opacity: number, radiusPx: number, offsetY: number): ViewStyle =>
  Platform.select({
    android: { elevation },
    default: { shadowColor: '#1A1A1A', shadowOpacity: opacity, shadowRadius: radiusPx, shadowOffset: { width: 0, height: offsetY } },
  }) as ViewStyle;

export const elevation = {
  card: shadow(1, 0.05, 6, 2),
  raised: shadow(4, 0.08, 12, 4),
  sticky: shadow(8, 0.1, 16, -4),
};

export const formatMoney = (amount: number | string | undefined | null) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n % 1 === 0 ? n.toLocaleString('en-IN') : n.toFixed(2)}`;
};
