import { Platform } from 'react-native';

// ─── Colors ────────────────────────────────────────────────────
// Ported 1:1 from the web design system (the `T` object).
export const colors = {
  blue: '#002DE8',
  blueHi: '#5C7BFF',
  blueDeep: '#0024BD',
  gold: '#FFB938',
  goldDeep: '#E89A12',
  red: '#D43530',
  green: '#0E7A3A',
  s900: '#05051E',
  s800: '#10112A',
  s700: '#1C1E37',
  s600: '#272B45',
  cream: '#FEE6D5',
  creamDeep: '#F4D5BC',
  white: '#FFFFFF',
  ink: '#0A0B1F',
  ink2: '#3A3B52',
  mist: '#8E8FA6',
  paper: '#FFFFFF',
  paper2: '#C7C8DB',
  // Common translucent helpers (RN has no alpha shorthands in tokens)
  hairline: 'rgba(255,255,255,0.06)',
  hairlineSoft: 'rgba(255,255,255,0.04)',
  overlay: 'rgba(255,255,255,0.08)',
} as const;

export type ColorToken = keyof typeof colors;

// ─── Spacing (4px grid) ────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── Radius ────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  xxl: 20,
  pill: 9999,
} as const;

// ─── Typography ────────────────────────────────────────────────
// Plus Jakarta Sans ships one font family per weight in React Native,
// so map a numeric/string weight to the correct loaded family.
export const fontFamilies: Record<string, string> = {
  '300': 'PlusJakartaSans_300Light',
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  '700': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
  // Jakarta has no 900 — fall back to the heaviest weight.
  '900': 'PlusJakartaSans_800ExtraBold',
};

export function fontByWeight(weight?: string | number): string {
  const key = String(weight ?? '400');
  return fontFamilies[key] ?? fontFamilies['400'];
}

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  display: 32,
} as const;

// ─── Shadows ───────────────────────────────────────────────────
// RN shadows differ from CSS box-shadow: iOS uses shadow*, Android uses elevation.
export function shadow(color: string, elevation = 8, opacity = 0.35) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: elevation * 0.6 },
      shadowOpacity: opacity,
      shadowRadius: elevation,
    },
    android: { elevation },
    default: {},
  }) as object;
}

export const shadows = {
  card: shadow('#000000', 6, 0.25),
  bubble: (accent: string) => shadow(accent, 12, 0.45),
  soft: shadow('#000000', 4, 0.18),
} as const;

export const theme = { colors, spacing, radius, fontSize, fontFamilies, fontByWeight, shadow, shadows };
export default theme;
