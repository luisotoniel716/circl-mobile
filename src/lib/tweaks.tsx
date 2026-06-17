import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth';

// Available accent options. Adding more is as simple as appending to this
// record — TS will catch every render path that uses the new key.
export const ACCENT_PALETTE = {
  blue:    { color: '#002DE8', ink: '#FFFFFF', label: 'Azul'    },
  gold:    { color: '#FFB938', ink: '#0A0B1F', label: 'Dorado'  },
  red:     { color: '#E11D48', ink: '#FFFFFF', label: 'Rojo'    },
  green:   { color: '#10B981', ink: '#0A0B1F', label: 'Verde'   },
  purple:  { color: '#7C3AED', ink: '#FFFFFF', label: 'Morado'  },
  orange:  { color: '#F97316', ink: '#0A0B1F', label: 'Naranja' },
  pink:    { color: '#EC4899', ink: '#FFFFFF', label: 'Rosa'    },
  cyan:    { color: '#06B6D4', ink: '#0A0B1F', label: 'Cian'    },
} as const;

export type Accent = keyof typeof ACCENT_PALETTE;

type PickStyle = 'cards' | 'swipe' | 'versus';
type LbStyle = 'podium' | 'list' | 'graph';

interface TweakState {
  accent: Accent;
  setAccent: (a: Accent) => void;
  pickStyle: PickStyle;
  setPickStyle: (p: PickStyle) => void;
  lbStyle: LbStyle;
  setLbStyle: (l: LbStyle) => void;
}

const TweakCtx = createContext<TweakState | null>(null);

// Storage key is keyed by user id so each account on the same device gets
// its own accent preference. A logged-out shell falls back to a shared
// "guest" key — that one only matters for the auth screens which don't use
// the accent prominently.
function storageKeyFor(userId: string | null | undefined): string {
  return userId ? `circl.accent.${userId}` : 'circl.accent.guest';
}

export function TweakProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [accent, setAccentRaw] = useState<Accent>('blue');
  const [pickStyle, setPickStyle] = useState<PickStyle>('cards');
  const [lbStyle, setLbStyle] = useState<LbStyle>('podium');

  // Re-load the persisted accent any time the signed-in user changes so
  // switching accounts swaps the preference. While the load is in flight
  // we optimistically reset to the default to avoid showing the previous
  // user's color for a split second.
  //
  // Migration: an earlier build stored the accent under a global key
  // (`circl.accent`). On first run after upgrade we migrate that value into
  // the current user's key and clear the global one so it doesn't leak to
  // future accounts on the same device.
  useEffect(() => {
    let cancelled = false;
    setAccentRaw('blue');

    (async () => {
      const myKey = storageKeyFor(userId);
      let value = await AsyncStorage.getItem(myKey).catch(() => null);
      if (!value && userId) {
        const legacy = await AsyncStorage.getItem('circl.accent').catch(() => null);
        if (legacy && legacy in ACCENT_PALETTE) {
          await AsyncStorage.setItem(myKey, legacy).catch(() => {});
          await AsyncStorage.removeItem('circl.accent').catch(() => {});
          value = legacy;
        }
      }
      if (cancelled) return;
      if (value && value in ACCENT_PALETTE) setAccentRaw(value as Accent);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  function setAccent(a: Accent) {
    setAccentRaw(a);
    AsyncStorage.setItem(storageKeyFor(userId), a).catch(() => {
      // ignore — selection still works in-memory for the session
    });
  }

  return (
    <TweakCtx.Provider value={{ accent, setAccent, pickStyle, setPickStyle, lbStyle, setLbStyle }}>
      {children}
    </TweakCtx.Provider>
  );
}

export function useTweaks(): TweakState {
  const ctx = useContext(TweakCtx);
  if (!ctx) throw new Error('useTweaks must be used within a TweakProvider');
  return ctx;
}

export function useAccent() {
  const { accent } = useTweaks();
  const entry = ACCENT_PALETTE[accent] ?? ACCENT_PALETTE.blue;
  return {
    accent,
    accentColor: entry.color,
    accentInk:   entry.ink,
  };
}
