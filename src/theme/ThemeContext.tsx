import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useApp } from '../store/AppContext';
import type { ThemeMode } from '../types/domain';
import { darkPalette, lightPalette, type ColorPalette } from './palettes';

type ThemeContextValue = {
  colors: ColorPalette;
  isDark: boolean;
  mode: ThemeMode;
};

const ThemeCtx = createContext<ThemeContextValue>({
  colors: lightPalette,
  isDark: false,
  mode: 'light',
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

  const value = useMemo(() => {
    const isDark = resolveDark(mode, systemScheme);
    return {
      colors: isDark ? darkPalette : lightPalette,
      isDark,
      mode,
    };
  }, [mode, systemScheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeColors() {
  return useContext(ThemeCtx);
}
