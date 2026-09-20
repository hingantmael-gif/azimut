import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Alert } from '../../src/utils/appAlert';
import { Text } from '../../src/ui/Text';
import { useRouter } from 'expo-router';
import {
  AuthDivider,
  AuthScreen,
  AuthSubtitle,
  AuthTitle,
  OrangeButton,
  StravaInput,
  TextLink,
} from '../../src/ui/strava/AuthScreen';
import { BrandMark } from '../../src/ui/strava/BrandMark';
import { SocialAuthButtons } from '../../src/ui/strava/SocialAuthButtons';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { clearSession } from '../../src/storage/sessionPersistence';
import { apiGoogleAuth, apiLogin } from '../../src/services/api';
import { isTrialCredentials, loginTrialAccount, normalizeEmailInput } from '../../src/utils/demoAuth';
import { verifyLocalCredentials } from '../../src/storage/localCredentials';
import {
  clearOnboardingCompleted,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from '../../src/storage/onboardingPersistence';
import { useGoogleAuth } from '../../src/services/googleAuth';
import { colors } from '../../src/theme/tokens';
import {
  isOwnerPremiumEmail,
  OWNER_GOOGLE_ONLY_MESSAGE,
} from '../../src/engines/ownerAccess';
import { isGiftedPremiumEmail } from '../../src/storage/ownerPremiumGifts';
import { useI18n } from '../../src/i18n/I18nContext';
import { apiRemoteOnboardingDone } from '../../src/services/cloudApi';

export default function LoginScreen() {
  const { state, dispatch } = useApp();
  const { colors: themeColors } = useThemeColors();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const finishGoogle = async (
    payload: {
      token: string;
      email: string;
      firstName: string;
      lastName: string;
      username?: string;
    },
    isNewAccount: boolean,
  ) => {
    const done =
      !isNewAccount &&
      ((await hasCompletedOnboarding(payload.email, payload.username)) ||
        (await apiRemoteOnboardingDone(payload.token)));
    if (!done) {
      await clearOnboardingCompleted(payload.email, payload.username);
    } else {
      await markOnboardingCompleted(payload.email, payload.username);
    }
    dispatch({
      type: 'AUTH_WITH_PROVIDER',
      payload: {
        ...payload,
        provider: 'google',
        onboardingCompleted: done,
        giftedPremium: await isGiftedPremiumEmail(payload.email),
      },
    });
  };

  const google = useGoogleAuth(
    async (profile) => {
      setBusy(true);
      setError('');
      try {
        await clearSession();
        const res = await apiGoogleAuth(profile.accessToken);
        if (res.token && res.user) {
          await finishGoogle(
            {
              token: res.token,
              email: res.user.email,
              firstName: res.user.firstName || profile.firstName,
              lastName: res.user.lastName || profile.lastName,
              username: res.user.username,
            },
            Boolean(res.isNew),
          );
        } else {
          const known = await hasCompletedOnboarding(profile.email);
          await finishGoogle(
            {
              token: `google_${profile.accessToken.slice(0, 16)}`,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
            },
            !known,
          );
        }
      } catch {
        const known = await hasCompletedOnboarding(profile.email);
        await finishGoogle(
          {
            token: `google_${Date.now()}`,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
          },
          !known,
        );
      } finally {
        setBusy(false);
      }
    },
    (msg) => {
      setBusy(false);
      setError(msg);
      Alert.alert('Google', msg);
    },
  );

  useEffect(() => {
    if (!state.authToken || !state.profile.emailVerified) return;
    if (!state.profile.onboardingCompleted) {
      router.replace('/(auth)/onboarding');
      return;
    }
    router.replace('/(tabs)');
  }, [
    state.authToken,
    state.profile.emailVerified,
    state.profile.onboardingCompleted,
    router,
  ]);

  const submit = async () => {
    setError('');
    setBusy(true);
    const idRaw = email.trim();
    const id = idRaw.includes('@') ? normalizeEmailInput(idRaw) : idRaw.toLowerCase();
    if (id.includes('@')) setEmail(id);
    try {
      if (isOwnerPremiumEmail(id) || isOwnerPremiumEmail(idRaw)) {
        setError(OWNER_GOOGLE_ONLY_MESSAGE);
        return;
      }
      if (isTrialCredentials(idRaw, password) || isTrialCredentials(id, password)) {
        await loginTrialAccount(clearSession, dispatch);
        return;
      }

      const res = await apiLogin(id, password);
      if (res.token && res.user) {
        if (isOwnerPremiumEmail(res.user.email)) {
          setError(OWNER_GOOGLE_ONLY_MESSAGE);
          return;
        }
        await clearSession();
        const done =
          (await hasCompletedOnboarding(res.user.email, res.user.username, id)) ||
          (await apiRemoteOnboardingDone(res.token));
        if (done) {
          await markOnboardingCompleted(res.user.email, res.user.username, id);
        }
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: res.token,
            email: res.user.email,
            firstName: res.user.firstName,
            lastName: res.user.lastName,
            username: res.user.username,
            provider: 'email',
            onboardingCompleted: done,
            giftedPremium: await isGiftedPremiumEmail(res.user.email),
          },
        });
        return;
      }

      const local = await verifyLocalCredentials(id, password);
      if (local) {
        if (isOwnerPremiumEmail(local.email)) {
          setError(OWNER_GOOGLE_ONLY_MESSAGE);
          return;
        }
        await clearSession();
        const done = await hasCompletedOnboarding(local.email, local.username);
        if (done) {
          await markOnboardingCompleted(local.email, local.username);
        }
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: `local_${local.email}`,
            email: local.email,
            firstName: local.firstName,
            lastName: local.lastName,
            username: local.username,
            provider: 'local',
            onboardingCompleted: done,
            giftedPremium: await isGiftedPremiumEmail(local.email),
          },
        });
        return;
      }

      setError(
        res.error && !/injoignable/i.test(res.error)
          ? res.error
          : 'E-mail ou mot de passe incorrect. Pas encore de compte ? Inscris-toi.',
      );
    } catch {
      if (isTrialCredentials(idRaw, password) || isTrialCredentials(id, password)) {
        await loginTrialAccount(clearSession, dispatch);
        return;
      }
      const local = await verifyLocalCredentials(id, password);
      if (local) {
        if (isOwnerPremiumEmail(local.email)) {
          setError(OWNER_GOOGLE_ONLY_MESSAGE);
          return;
        }
        await clearSession();
        const done = await hasCompletedOnboarding(local.email, local.username);
        if (done) {
          await markOnboardingCompleted(local.email, local.username);
        }
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: `local_${local.email}`,
            email: local.email,
            firstName: local.firstName,
            lastName: local.lastName,
            username: local.username,
            provider: 'local',
            onboardingCompleted: done,
            giftedPremium: await isGiftedPremiumEmail(local.email),
          },
        });
        return;
      }
      setError('E-mail ou mot de passe incorrect. Pas encore de compte ? Inscris-toi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen>
      <BrandMark size="md" ink surfaceColor="#050B16" />
      <AuthTitle>{t('auth.signInTitle')}</AuthTitle>
      <AuthSubtitle>{t('auth.signInSubtitle')}</AuthSubtitle>

      <SocialAuthButtons
        loading={busy}
        label={t('auth.google')}
        loadingLabel={t('auth.googleBusy')}
        onGoogle={() => {
          setError('');
          setBusy(true);
          void google.signIn().finally(() => setBusy(false));
        }}
      />

      <AuthDivider />

      <StravaInput
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="toi@orange.fr"
      />
      <StravaInput
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <OrangeButton
        label={busy ? t('auth.signInBusy') : t('auth.signIn')}
        disabled={busy}
        onPress={() => void submit()}
      />
      <TextLink
        label={t('auth.needAccount')}
        accent
        onPress={() => router.push('/(auth)/register')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: '#FB7185', marginTop: 8, fontSize: 14, fontWeight: '600' },
});
