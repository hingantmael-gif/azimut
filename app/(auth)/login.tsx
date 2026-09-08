import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AuthDivider,
  AuthScreen,
  AuthSubtitle,
  AuthTitle,
  OrangeButton,
  StravaInput,
  TermsCheckbox,
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
import { AUTH_LABELS } from '../../src/constants/authLabels';
import { useGoogleAuth } from '../../src/services/googleAuth';
import { colors } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { state, dispatch } = useApp();
  const { colors: themeColors } = useThemeColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
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
      (await hasCompletedOnboarding(payload.email, payload.username));
    if (!done) {
      await clearOnboardingCompleted(payload.email, payload.username);
    } else {
      await markOnboardingCompleted(payload.email, payload.username);
    }
    dispatch({
      type: 'AUTH_WITH_PROVIDER',
      payload: {
        ...payload,
        onboardingCompleted: done,
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

  const requireTerms = () => {
    if (!terms) {
      setError('Accepte les conditions pour continuer.');
      return false;
    }
    return true;
  };

  const submit = async () => {
    setError('');
    if (!requireTerms()) return;
    setBusy(true);
    const idRaw = email.trim();
    const id = idRaw.includes('@') ? normalizeEmailInput(idRaw) : idRaw.toLowerCase();
    if (id.includes('@')) setEmail(id);
    try {
      if (isTrialCredentials(idRaw, password) || isTrialCredentials(id, password)) {
        await loginTrialAccount(clearSession, dispatch);
        return;
      }

      const res = await apiLogin(id, password);
      if (res.token && res.user) {
        await clearSession();
        const done = await hasCompletedOnboarding(
          res.user.email,
          res.user.username,
          id,
        );
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
            onboardingCompleted: done,
          },
        });
        return;
      }

      const local = await verifyLocalCredentials(id, password);
      if (local) {
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
            onboardingCompleted: done,
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
            onboardingCompleted: done,
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
      <BrandMark size="md" surfaceColor={themeColors.bg} />
      <AuthTitle>{AUTH_LABELS.signIn}</AuthTitle>
      <AuthSubtitle>Content de te revoir.</AuthSubtitle>

      <TermsCheckbox
        checked={terms}
        onToggle={() => {
          setTerms((v) => !v);
          setError('');
        }}
        onOpenTerms={() => router.push('/settings/terms')}
      />

      <SocialAuthButtons
        loading={busy}
        onGoogle={() => {
          if (!requireTerms()) return;
          setError('');
          setBusy(true);
          void google.signIn().finally(() => setBusy(false));
        }}
      />

      <AuthDivider />

      <StravaInput
        label="E-mail"
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
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <OrangeButton
        label={busy ? 'Connexion…' : AUTH_LABELS.signIn}
        disabled={busy}
        onPress={() => void submit()}
      />
      <TextLink
        label={AUTH_LABELS.needAccount}
        accent
        onPress={() => router.push('/(auth)/register')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginTop: 8, fontSize: 14 },
});
