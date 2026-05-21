import { createContext, useContext, useState, ReactNode } from 'react';

type Accent = 'blue' | 'gold';
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

export function TweakProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<Accent>('blue');
  const [pickStyle, setPickStyle] = useState<PickStyle>('cards');
  const [lbStyle, setLbStyle] = useState<LbStyle>('podium');
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
  return {
    accentColor: accent === 'gold' ? '#FFB938' : '#002DE8',
    accentInk: accent === 'gold' ? '#0A0B1F' : '#FFFFFF',
  };
}
