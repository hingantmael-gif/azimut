import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useApp } from '../store/AppContext';
import type { ThemeMode } from '../types/domain';
import { shouldEnforceFreeLimits } from '../premium/entitlement';
import { darkPalette, lightPalette, type ColorPalette } from './palettes';
import { applyThemeTokens, normalizeCustomTheme, resolveCustomPalette, type CustomTheme } from './customTheme';

type ThemeContextValue = {
  colors: ColorPalette;
  isDark: boolean;
  mode: ThemeMode;
  /** Personnalisation Premium active (null = application standard). */
  custom: CustomTheme | null;
};

const ThemeCtx = createContext<ThemeContextValue>({
  colors: lightPalette,
  isDark: false,
  mode: 'light',
  custom: null,
});

function resolveDark(mode: ThemeMode, systemScheme: string | null | undefined): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemScheme === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const systemScheme = useColorScheme();
  const mode = state.profile.theme ?? 'light';
  const p = state.profile;
  const stored = p.customTheme;
  // La personnalisation est un privilège Premium : sans abonnement, l'application standard s'affiche.
  const allowed = !shouldEnforceFreeLimits({ plan: p.plan, subscription: p.subscription, premiumSource: p.premiumSource });

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = resolveDark(mode, systemScheme);
    const base = isDark ? darkPalette : lightPalette;
    const ct = stored ? normalizeCustomTheme(stored) : null;
    const custom = ct && ct.active && allowed ? ct : null;
    const colors = custom ? resolveCustomPalette(base, custom, isDark) : base;

    // Les écrans construisent leurs styles à partir de `colors` / `radii` : on met ces jetons à jour
    // AVANT le rendu des enfants, ils se recalculent alors avec la personnalisation.
    applyThemeTokens(custom ? custom.cardRadius : 'soft', custom ? { accent: colors.accent, accentDark: colors.accentDark } : null);

    return { colors, isDark, mode, custom };
  }, [mode, systemScheme, stored, allowed]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeColors() {
  return useContext(ThemeCtx);
}

/** Personnalisation Premium en cours (null = standard). */
export function useCustomTheme(): CustomTheme | null {
  return useContext(ThemeCtx).custom;
}
