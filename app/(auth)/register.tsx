import { useEffect, useState } from 'react';
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
import { isEmailTaken, isUsernameTaken } from '../../src/storage/userRegistry';
import {
  limitUsernameInput,
  validateUsernameFormat,
} from '../../src/utils/username';
import {
  apiCompleteProfile,
  apiGoogleAuth,
  apiRequestOtp,
  apiResendOtp,
  apiVerifyOtp,
} from '../../src/services/api';
import { validateRegistrationEmail } from '../../src/utils/demoAuth';
import { AUTH_LABELS } from '../../src/constants/authLabels';
import { useGoogleAuth } from '../../src/services/googleAuth';
import { clearOnboardingCompleted } from '../../src/storage/onboardingPersistence';
import { colors, radii, spacing } from '../../src/theme/tokens';

type Step = 'options' | 'email' | 'verify' | 'password' | 'profile';

export default function RegisterScreen() {
  const { state, dispatch } = useApp();
  const { colors: themeColors } = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState<Step>('options');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [terms, setTerms] = useState(false);
  const [seconds, setSeconds] = useState(600);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [devHint, setDevHint] = useState<string | null>(null);
  const [mailSent, setMailSent] = useState(false);

  const google = useGoogleAuth(
    async (profile) => {
      setBusy(true);
      setError('');
      try {
        await clearSession();
        const res = await apiGoogleAuth(profile.accessToken);
        if (res.error || !res.token || !res.user) {
          // Fallback local si API down : compte Google réel quand même
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
    if (step !== 'verify') return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  useEffect(() => {
    if (state.authToken && state.profile.onboardingCompleted) {
      router.replace('/(tabs)');
    } else if (state.authToken && state.profile.emailVerified && !state.profile.onboardingCompleted) {
      router.replace('/(auth)/onboarding');
    }
  }, [state.authToken, state.profile.emailVerified, state.profile.onboardingCompleted]);

  const onEmailContinue = async () => {
    setError('');
    const emailCheck = validateRegistrationEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      return;
    }
    setBusy(true);
    try {
      const emailTaken = await isEmailTaken(email.trim());
      if (emailTaken) {
        setError('Cet e-mail est déjà utilisé.');
        return;
      }
      const res = await apiRequestOtp(email.trim());
      if (res.error) {
        const err = res.error.toLowerCase();
        if (
          err.includes('already') ||
          err.includes('existe') ||
          err.includes('taken') ||
          err.includes('utilisé')
        ) {
          setError('Cet e-mail est déjà utilisé.');
        } else {
          setError(res.error);
        }
        return;
      }
      setMailSent(Boolean(res.mailSent));
      setDevHint(res.demoCode ? String(res.demoCode) : null);
      dispatch({
        type: 'REGISTER',
        payload: { email: email.trim(), firstName: '', lastName: '', password: '' },
      });
      setSeconds(600);
      setCode('');
      setStep('verify');
      if (!res.mailSent && !res.demoCode) {
        Alert.alert(
          'E-mail',
          'Le serveur n’a pas pu envoyer le code. Réessaie dans un moment.',
        );
      }
    } catch {
      setError('Inscription temporairement indisponible. Réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiVerifyOtp(email.trim(), code);
      if (res.error || !res.ok) {
        setError(res.error || 'Code incorrect');
        return;
      }
      dispatch({ type: 'MARK_EMAIL_VERIFIED' });
      setStep('password');
    } catch {
      setError('Vérification impossible (API injoignable).');
    } finally {
      setBusy(false);
    }
  };

  const onPassword = () => {
    if (password.length < 8) {
      setError('8 caractères minimum.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError('');
    setStep('profile');
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
    const taken = await isUsernameTaken(handle);
    if (taken) {
      setError('Cet identifiant est déjà utilisé.');
      return;
    }
    setBusy(true);
    try {
      await clearOnboardingCompleted(email.trim(), handle);
      const res = await apiCompleteProfile({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: handle,
        password,
      });
      if (res.error) {
        const err = res.error.toLowerCase();
        if (
          err.includes('already') ||
          err.includes('existe') ||
          err.includes('taken') ||
          err.includes('utilisé')
        ) {
          setError('Cet identifiant est déjà utilisé.');
          return;
        }
      }
      if (res.token && res.user) {
        setError('');
        dispatch({
          type: 'AUTH_WITH_PROVIDER',
          payload: {
            token: res.token,
            email: res.user.email,
            firstName: res.user.firstName,
            lastName: res.user.lastName,
            username: res.user.username,
            onboardingCompleted: false,
          },
        });
      } else {
        // Fallback local uniquement si l’API n’a pas refusé pour unicité
        if (res.error && !/injoignable|network|fetch|failed/i.test(res.error)) {
          setError(res.error);
          return;
        }
        setError('');
        dispatch({
          type: 'UPDATE_PROFILE',
          patch: { firstName, lastName, username: handle },
        });
        dispatch({ type: 'FINALIZE_ACCOUNT', password });
        if (res.error) {
          Alert.alert('Compte local', 'Profil enregistré sur l’appareil (API : ' + res.error + ').');
        }
      }
    } catch {
      setError('');
      dispatch({
        type: 'UPDATE_PROFILE',
        patch: { firstName, lastName, username: handle },
      });
      dispatch({ type: 'FINALIZE_ACCOUNT', password });
    } finally {
      setBusy(false);
    }
  };

  if (step === 'options') {
    return (
      <AuthScreen>
        <BrandMark size="md" surfaceColor={themeColors.bg} />
        <AuthTitle>Inscription</AuthTitle>
        <AuthSubtitle>Compte Google ou e-mail avec code à 6 chiffres.</AuthSubtitle>

        <SocialAuthButtons
          loading={busy}
          onGoogle={() => {
            setError('');
            setBusy(true);
            void google.signIn().finally(() => setBusy(false));
          }}
        />

        <AuthDivider />

        <OrangeButton label="S'inscrire avec l'e-mail" onPress={() => setStep('email')} />

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
        <AuthTitle>Quelle est votre adresse e-mail ?</AuthTitle>
        <AuthSubtitle>Nous vous enverrons un code de vérification à 6 chiffres.</AuthSubtitle>
        <StravaInput
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoFocus
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="votre@email.com"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label={busy ? 'Envoi…' : 'Continuer'}
          disabled={!email.trim() || busy}
          onPress={() => void onEmailContinue()}
        />
        <TextLink label="Retour" onPress={() => setStep('options')} />
      </AuthScreen>
    );
  }

  if (step === 'verify') {
    return (
      <AuthScreen>
        <AuthTitle>Vérifiez votre e-mail</AuthTitle>
        <AuthSubtitle>
          {mailSent
            ? `Code envoyé à ${email}.`
            : `Saisissez le code pour ${email}.`}{' '}
          Expire dans {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}.
        </AuthSubtitle>
        {devHint ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeHint}>Mode dev (e-mail non configuré) :</Text>
            <Text style={styles.codeValue}>{devHint}</Text>
          </View>
        ) : null}
        <StravaInput
          label="Code à 6 chiffres"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label={busy ? 'Vérification…' : 'Continuer'}
          disabled={code.length !== 6 || seconds === 0 || busy}
          onPress={() => void onVerify()}
        />
        <TextLink
          label="Renvoyer le code"
          onPress={() => {
            void (async () => {
              const res = await apiResendOtp(email.trim());
              setMailSent(Boolean(res.mailSent));
              setDevHint(res.demoCode ? String(res.demoCode) : null);
              setSeconds(600);
              setCode('');
            })();
          }}
        />
        <TextLink label="Retour" onPress={() => setStep('email')} />
      </AuthScreen>
    );
  }

  if (step === 'password') {
    return (
      <AuthScreen>
        <AuthTitle>Mot de passe</AuthTitle>
        <AuthSubtitle>8 caractères minimum.</AuthSubtitle>
        <StravaInput
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          placeholder="••••••••"
        />
        <StravaInput
          label="Confirmez votre mot de passe"
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
        <TextLink label="Retour" onPress={() => setStep('verify')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthTitle>Comment vous appelez-vous ?</AuthTitle>
      <AuthSubtitle>Ces informations apparaîtront sur votre profil.</AuthSubtitle>
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
      <Text style={styles.usernameHint}>
        Unique · lettres minuscules et chiffres uniquement · longueur libre
      </Text>
      <TermsCheckbox checked={terms} onToggle={() => setTerms((v) => !v)} />
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
  codeBox: {
    backgroundColor: colors.accentLight,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  codeHint: { color: colors.textSecondary, fontSize: 13 },
  codeValue: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    marginTop: 4,
  },
  usernameHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -4,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
});
