import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
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
import {
  isEmailTaken,
  isUsernameTaken,
  profileToRegistryUser,
  upsertRegistryUser,
} from '../../src/storage/userRegistry';
import { saveLocalCredential } from '../../src/storage/localCredentials';
import {
  limitUsernameInput,
  validateUsernameFormat,
} from '../../src/utils/username';
import { apiGoogleAuth, apiSignup } from '../../src/services/api';
import {
  normalizeEmailInput,
  validateRegistrationEmail,
} from '../../src/utils/demoAuth';
import {
  getPasswordRules,
  passwordsMatch,
  validatePassword,
} from '../../src/utils/passwordPolicy';
import { AUTH_LABELS } from '../../src/constants/authLabels';
import { useGoogleAuth } from '../../src/services/googleAuth';
import { clearOnboardingCompleted } from '../../src/storage/onboardingPersistence';
import { colors, radii, spacing } from '../../src/theme/tokens';

type Step = 'options' | 'email' | 'password' | 'profile';

export default function RegisterScreen() {
  const { state, dispatch } = useApp();
  const { colors: themeColors } = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState<Step>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const google = useGoogleAuth(
    async (profile) => {
      setBusy(true);
      setError('');
      try {
        await clearSession();
        await clearOnboardingCompleted(profile.email);
        const res = await apiGoogleAuth(profile.accessToken);
        if (res.error || !res.token || !res.user) {
          dispatch({
            type: 'AUTH_WITH_PROVIDER',
            payload: {
              token: `google_${profile.accessToken.slice(0, 16)}`,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              onboardingCompleted: false,
            },
          });
        } else {
          await clearOnboardingCompleted(res.user.email, res.user.username, profile.email);
          dispatch({
            type: 'AUTH_WITH_PROVIDER',
            payload: {
              token: res.token,
              email: res.user.email,
              firstName: res.user.firstName || profile.firstName,
              lastName: res.user.lastName || profile.lastName,
              username: res.user.username,
              onboardingCompleted: false,
            },
          });
        }
      } catch {
        await clearOnboardingCompleted(profile.email);
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: `google_${Date.now()}`,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            onboardingCompleted: false,
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
    if (state.authToken && state.profile.onboardingCompleted) {
      router.replace('/(tabs)');
    } else if (state.authToken && state.profile.emailVerified && !state.profile.onboardingCompleted) {
      router.replace('/(auth)/onboarding');
    }
  }, [state.authToken, state.profile.emailVerified, state.profile.onboardingCompleted, router]);

  const onEmailContinue = async () => {
    setError('');
    const emailCheck = validateRegistrationEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      return;
    }
    const normalized = emailCheck.email;
    setEmail(normalized);
    setBusy(true);
    try {
      const emailTaken = await isEmailTaken(normalized);
      if (emailTaken) {
        setError('Cet e-mail est déjà utilisé sur cet appareil.');
        return;
      }
      setStep('password');
    } finally {
      setBusy(false);
    }
  };

  const onPassword = () => {
    const check = validatePassword(password);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    if (!passwordsMatch(password, passwordConfirm)) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError('');
    setStep('profile');
  };

  const finishLocalAccount = async (handle: string) => {
    const emailNorm = normalizeEmailInput(email);
    await clearSession();
    await clearOnboardingCompleted(emailNorm, handle);
    await saveLocalCredential({
      email: emailNorm,
      username: handle,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password,
    });
    const id = `athlete-${Date.now()}`;
    await upsertRegistryUser(
      profileToRegistryUser({
        id,
        email: emailNorm,
        username: handle,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      }),
    );
    dispatch({
      type: 'AUTH_WITH_PROVIDER',
      payload: {
        token: `local_${id}`,
        email: emailNorm,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: handle,
        onboardingCompleted: false,
      },
    });
  };

  const onJoin = async () => {
    if (!terms) {
      setError('Acceptez les conditions pour continuer.');
      return;
    }
    const handle = limitUsernameInput(username);
    const format = validateUsernameFormat(handle);
    if (!format.ok) {
      setError(format.error);
      return;
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.ok) {
      setError(pwdCheck.error);
      return;
    }
    const taken = await isUsernameTaken(handle);
    if (taken) {
      setError('Cet identifiant est déjà utilisé.');
      return;
    }
    setBusy(true);
    setError('');
    const emailNorm = normalizeEmailInput(email);
    try {
      const res = await apiSignup({
        email: emailNorm,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: handle,
        password,
      });
      if (res.token && res.user) {
        await clearSession();
        await clearOnboardingCompleted(emailNorm, handle);
        await saveLocalCredential({
          email: res.user.email,
          username: res.user.username || handle,
          firstName: res.user.firstName || firstName.trim(),
          lastName: res.user.lastName || lastName.trim(),
          password,
        });
        await upsertRegistryUser(
          profileToRegistryUser({
            id: res.user.id || `athlete-${Date.now()}`,
            email: res.user.email,
            username: res.user.username || handle,
            firstName: res.user.firstName || firstName.trim(),
            lastName: res.user.lastName || lastName.trim(),
          }),
        );
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: res.token,
            email: res.user.email,
            firstName: res.user.firstName || firstName.trim(),
            lastName: res.user.lastName || lastName.trim(),
            username: res.user.username || handle,
            onboardingCompleted: false,
          },
        });
        return;
      }
      if (
        res.error &&
        !/injoignable|network|fetch|failed|erreur 5/i.test(res.error)
      ) {
        const err = res.error.toLowerCase();
        if (
          err.includes('already') ||
          err.includes('existe') ||
          err.includes('taken') ||
          err.includes('utilisé')
        ) {
          setError(res.error);
          return;
        }
        if (err.includes('mot de passe') || err.includes('password')) {
          setError(res.error);
          return;
        }
      }
      // API absente ou erreur réseau → compte local (fonctionne hors ligne / PWA)
      await finishLocalAccount(handle);
    } catch {
      await finishLocalAccount(handle);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'options') {
    return (
      <AuthScreen>
        <BrandMark size="md" surfaceColor={themeColors.bg} />
        <AuthTitle>Inscription</AuthTitle>
        <AuthSubtitle>Google ou e-mail.</AuthSubtitle>

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
            if (!terms) {
              setError('Accepte les conditions pour continuer.');
              return;
            }
            setError('');
            setBusy(true);
            void google.signIn().finally(() => setBusy(false));
          }}
        />

        <AuthDivider />

        <OrangeButton
          label="S'inscrire avec l'e-mail"
          onPress={() => {
            if (!terms) {
              setError('Accepte les conditions pour continuer.');
              return;
            }
            setStep('email');
          }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextLink
          label={AUTH_LABELS.alreadyHaveAccount}
          accent
          onPress={() => router.push('/(auth)/login')}
        />
      </AuthScreen>
    );
  }

  if (step === 'email') {
    return (
      <AuthScreen>
        <AuthTitle>Ton e-mail</AuthTitle>
        <AuthSubtitle>Ex. toi@orange.fr</AuthSubtitle>
        <StravaInput
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="toi@orange.fr"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label={busy ? 'Vérification…' : 'Continuer'}
          disabled={!email.trim() || busy}
          onPress={() => void onEmailContinue()}
        />
        <TextLink label="Retour" onPress={() => setStep('options')} />
      </AuthScreen>
    );
  }

  if (step === 'password') {
    return (
      <AuthScreen>
        <AuthTitle>Mot de passe</AuthTitle>
        <AuthSubtitle>Majuscule, minuscule, chiffre, spécial.</AuthSubtitle>
        <StravaInput
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          placeholder="••••••••"
        />
        <View style={styles.rulesBox}>
          {passwordRules.map((rule) => (
            <Text
              key={rule.id}
              style={[styles.ruleLine, rule.ok ? styles.ruleOk : styles.rulePending]}
            >
              {rule.ok ? '✓' : '○'} {rule.label}
            </Text>
          ))}
        </View>
        <StravaInput
          label="Confirmation"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label="Continuer"
          disabled={!password.trim() || !passwordConfirm.trim() || busy}
          onPress={onPassword}
        />
        <TextLink label="Retour" onPress={() => setStep('email')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthTitle>Ton profil</AuthTitle>
      <AuthSubtitle>Prénom, nom, identifiant.</AuthSubtitle>
      <StravaInput
        label="Prénom"
        value={firstName}
        onChangeText={setFirstName}
        autoFocus
        placeholder="Prénom"
      />
      <StravaInput label="Nom" value={lastName} onChangeText={setLastName} placeholder="Nom" />
      <StravaInput
        label="Identifiant"
        value={username}
        onChangeText={(t) => setUsername(limitUsernameInput(t))}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="nathan42"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <OrangeButton
        label={busy ? 'Création…' : 'Créer mon compte'}
        disabled={!firstName.trim() || !lastName.trim() || !username.trim() || busy}
        onPress={() => void onJoin()}
      />
      <TextLink label="Retour" onPress={() => setStep('password')} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginTop: 8, fontSize: 14 },
  rulesBox: {
    backgroundColor: colors.accentLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  ruleLine: { fontSize: 13, fontWeight: '600' },
  ruleOk: { color: colors.success },
  rulePending: { color: colors.textMuted },
});
