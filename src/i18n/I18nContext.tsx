import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useApp } from '../store/AppContext';
import {
  localeFromCountry,
  normalizeLocale,
  type AppLocale,
} from './locales';
import { translate, type MessageKey } from './messages';

const PENDING_LOCALE_KEY = 'azimut.pendingLocale';
const PENDING_COUNTRY_KEY = 'azimut.pendingCountry';

type I18nContextValue = {
  locale: AppLocale;
  t: (key: MessageKey) => string;
  setLocale: (locale: AppLocale) => void;
  setCountryAndLocale: (countryId: string) => void;
  pendingCountry: string | null;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export async function loadPendingSignupLocale(): Promise<{
  locale: AppLocale | null;
  country: string | null;
}> {
  try {
    const [locale, country] = await Promise.all([
      AsyncStorage.getItem(PENDING_LOCALE_KEY),
      AsyncStorage.getItem(PENDING_COUNTRY_KEY),
    ]);
    return {
      locale: locale ? normalizeLocale(locale) : null,
      country: country?.trim() || null,
    };
  } catch {
    return { locale: null, country: null };
  }
}

export async function savePendingSignupLocale(
  countryId: string,
  locale: AppLocale,
): Promise<void> {
  await AsyncStorage.multiSet([
    [PENDING_COUNTRY_KEY, countryId],
    [PENDING_LOCALE_KEY, locale],
  ]);
}

export async function clearPendingSignupLocale(): Promise<void> {
  await AsyncStorage.multiRemove([PENDING_LOCALE_KEY, PENDING_COUNTRY_KEY]);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp();
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);
  const [pendingCountry, setPendingCountry] = useState<string | null>(null);

  useEffect(() => {
    void loadPendingSignupLocale().then(({ locale, country }) => {
      if (locale) setPendingLocale(locale);
      if (country) setPendingCountry(country);
    });
  }, []);

  const locale = useMemo(() => {
    if (state.authToken && state.profile.language) {
      return normalizeLocale(state.profile.language);
    }
    if (pendingLocale) return pendingLocale;
    return normalizeLocale(state.profile.language) || 'fr';
  }, [state.authToken, state.profile.language, pendingLocale]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      setPendingLocale(next);
      void AsyncStorage.setItem(PENDING_LOCALE_KEY, next);
      if (state.authToken) {
        dispatch({ type: 'UPDATE_PROFILE', patch: { language: next } });
      }
    },
    [dispatch, state.authToken],
  );

  const setCountryAndLocale = useCallback(
    (countryId: string) => {
      const nextLocale = localeFromCountry(countryId);
      setPendingCountry(countryId);
      setPendingLocale(nextLocale);
      void savePendingSignupLocale(countryId, nextLocale);
      if (state.authToken) {
        dispatch({
          type: 'UPDATE_PROFILE',
          patch: {
            language: nextLocale,
            ...(state.profile.countryLocked
              ? {}
              : { country: countryId, countryLocked: true }),
          },
        });
      }
    },
    [dispatch, state.authToken, state.profile.countryLocked],
  );

  const t = useCallback((key: MessageKey) => translate(locale, key), [locale]);

  const value = useMemo(
    () => ({ locale, t, setLocale, setCountryAndLocale, pendingCountry }),
    [locale, t, setLocale, setCountryAndLocale, pendingCountry],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}
