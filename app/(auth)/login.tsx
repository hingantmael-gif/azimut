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
import { markOnboardingCompleted } from '../../src/storage/onboardingPersistence';
import { AUTH_LABELS } from '../../src/constants/authLabels';
import { useGoogleAuth } from '../../src/services/googleAuth';
import { colors } from '../../src/theme/tokens';

export default function LoginScreen() {
  const { state, dispatch } = useApp();
  const { colors: themeColors } = useThemeColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const google = useGoogleAuth(
    async (profile) => {
      setBusy(true);
      setError('');
      try {
        await clearSession();
        const res = await apiGoogleAuth(profile.accessToken);
        if (res.token && res.user) {
          await markOnboardingCompleted(
            res.user.email,
            res.user.username,
            profile.email,
          );
          dispatch({
            type: 'AUTH_WITH_PROVIDER',
            payload: {
              token: res.token,
              email: res.user.email,
              firstName: res.user.firstName || profile.firstName,
              lastName: res.user.lastName || profile.lastName,
              username: res.user.username,
              onboardingCompleted: true,
            },
          });
        } else {
          await markOnboardingCompleted(profile.email);
          dispatch({
            type: 'AUTH_WITH_PROVIDER',
            payload: {
              token: `google_${profile.accessToken.slice(0, 16)}`,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              onboardingCompleted: true,
            },
          });
        }
      } catch {
        await markOnboardingCompleted(profile.email);
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: `google_${Date.now()}`,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            onboardingCompleted: true,
          },
        });
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
    if (state.authToken && state.profile.emailVerified) {
      router.replace('/(tabs)');
    }
  }, [state.authToken, state.profile.emailVerified, router]);

  const submit = async () => {
    setError('');
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
        await markOnboardingCompleted(
          res.user.email,
          res.user.username,
          id,
        );
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: res.token,
            email: res.user.email,
            firstName: res.user.firstName,
            lastName: res.user.lastName,
            username: res.user.username,
            onboardingCompleted: true,
          },
        });
        return;
      }

      const local = await verifyLocalCredentials(id, password);
      if (local) {
        await clearSession();
        await markOnboardingCompleted(local.email, local.username);
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: `local_${local.email}`,
            email: local.email,
            firstName: local.firstName,
            lastName: local.lastName,
            username: local.username,
            onboardingCompleted: true,
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
        await markOnboardingCompleted(local.email, local.username);
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: `local_${local.email}`,
            email: local.email,
            firstName: local.firstName,
            lastName: local.lastName,
            username: local.username,
            onboardingCompleted: true,
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
      <AuthSubtitle>Bienvenue sur Azimut.</AuthSubtitle>

      <SocialAuthButtons
        loading={busy}
        onGoogle={() => {
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

      <TextLink label="Mot de passe oublié ?" accent onPress={() => undefined} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <OrangeButton
        label={busy ? AUTH_LABELS.signInBusy : AUTH_LABELS.signIn}
        disabled={!email.trim() || !password.trim() || busy}
        onPress={() => void submit()}
      />

      <TextLink
        label="Pas encore de compte ? Inscription"
        accent
        onPress={() => router.push('/(auth)/register')}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginTop: 8, fontSize: 14 },
});
