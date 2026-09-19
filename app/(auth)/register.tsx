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
import { useGoogleAuth } from '../../src/services/googleAuth';
import {
  clearOnboardingCompleted,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from '../../src/storage/onboardingPersistence';
import { colors, radii, spacing } from '../../src/theme/tokens';
import {
  isOwnerPremiumEmail,
  OWNER_GOOGLE_ONLY_MESSAGE,
} from '../../src/engines/ownerAccess';
import { isGiftedPremiumEmail } from '../../src/storage/ownerPremiumGifts';
import { CountryPicker } from '../../src/ui/CountryPicker';
import { useI18n, clearPendingSignupLocale } from '../../src/i18n/I18nContext';
import { localeFromCountry } from '../../src/i18n/locales';

type Step = 'country' | 'options' | 'email' | 'password' | 'profile';

export default function RegisterScreen() {
  const { state, dispatch } = useApp();
  const { colors: themeColors } = useThemeColors();
  const { t, setCountryAndLocale, pendingCountry, locale } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>('country');
  const [countryId, setCountryId] = useState<string | null>(pendingCountry);
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

  useEffect(() => {
    if (pendingCountry && !countryId) setCountryId(pendingCountry);
  }, [pendingCountry, countryId]);

  const signupLocale = countryId ? localeFromCountry(countryId) : locale;

  const withCountryPayload = <T extends Record<string, unknown>>(payload: T) => ({
    ...payload,
    ...(countryId
      ? {
          country: countryId,
          language: signupLocale,
          countryLocked: true,
        }
      : { language: locale }),
  });

  const finishGoogleAccount = async (
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
      payload: withCountryPayload({
        ...payload,
        provider: 'google' as const,
        onboardingCompleted: done,
        giftedPremium: await isGiftedPremiumEmail(payload.email),
      }),
    });
    await clearPendingSignupLocale();
  };

  const google = useGoogleAuth(
    async (profile) => {
      setBusy(true);
      setError('');
      try {
        await clearSession();
        const res = await apiGoogleAuth(profile.accessToken);
        if (res.token && res.user) {
          await finishGoogleAccount(
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
          await finishGoogleAccount(
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
        await finishGoogleAccount(
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
    if (isOwnerPremiumEmail(normalized)) {
      setError(OWNER_GOOGLE_ONLY_MESSAGE);
      return;
    }
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
    if (isOwnerPremiumEmail(emailNorm)) {
      setError(OWNER_GOOGLE_ONLY_MESSAGE);
      return;
    }
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
      payload: withCountryPayload({
        token: `local_${id}`,
        email: emailNorm,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: handle,
        provider: 'local' as const,
        onboardingCompleted: false,
        giftedPremium: await isGiftedPremiumEmail(emailNorm),
      }),
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
    if (isOwnerPremiumEmail(emailNorm)) {
      setError(OWNER_GOOGLE_ONLY_MESSAGE);
      return;
    }
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
          payload: withCountryPayload({
            token: res.token,
            email: res.user.email,
            firstName: res.user.firstName || firstName.trim(),
            lastName: res.user.lastName || lastName.trim(),
            username: res.user.username || handle,
            provider: 'email' as const,
            onboardingCompleted: false,
            giftedPremium: await isGiftedPremiumEmail(res.user.email),
          }),
        });
        await clearPendingSignupLocale();
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
        if (
          err.includes('identifiant') ||
          err.includes('username') ||
          err.includes('invalide')
        ) {
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

  if (step === 'country') {
    return (
      <AuthScreen>
        <BrandMark size="md" surfaceColor={themeColors.bg} />
        <AuthTitle>{t('auth.countryTitle')}</AuthTitle>
        <AuthSubtitle>{t('auth.countrySubtitle')}</AuthSubtitle>
        <CountryPicker
          selectedId={countryId}
          onSelect={(c) => {
            setCountryId(c.id);
            setCountryAndLocale(c.id);
            setError('');
          }}
        />
        <Text style={{ color: themeColors.textMuted, fontSize: 12, marginTop: 4 }}>
          {t('auth.countryLockedHint')}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label={t('auth.countryConfirm')}
          disabled={!countryId}
          onPress={() => {
            if (!countryId) {
              setError(t('auth.countryTitle'));
              return;
            }
            setStep('options');
          }}
        />
        <TextLink
          label={t('auth.alreadyHaveAccount')}
          accent
          onPress={() => router.push('/(auth)/login')}
        />
      </AuthScreen>
    );
  }

  if (step === 'options') {
    return (
      <AuthScreen>
        <BrandMark size="md" surfaceColor={themeColors.bg} />
        <AuthTitle>{t('welcome.signup')}</AuthTitle>
        <AuthSubtitle>{t('auth.orEmail').replace(/^ou |^or |^o |^oder |^oppure /i, '')}</AuthSubtitle>

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
          label={t('auth.google')}
          loadingLabel={t('auth.googleBusy')}
          onGoogle={() => {
            if (!terms) {
              setError(t('auth.terms'));
              return;
            }
            setError('');
            setBusy(true);
            void google.signIn().finally(() => setBusy(false));
          }}
        />

        <AuthDivider />

        <OrangeButton
          label={t('auth.email')}
          onPress={() => {
            if (!terms) {
              setError(t('auth.terms'));
              return;
            }
            setStep('email');
          }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextLink
          label={t('auth.alreadyHaveAccount')}
          accent
          onPress={() => router.push('/(auth)/login')}
        />
        <TextLink label={t('common.back')} onPress={() => setStep('country')} />
      </AuthScreen>
    );
  }

  if (step === 'email') {
    return (
      <AuthScreen>
        <AuthTitle>{t('auth.email')}</AuthTitle>
        <StravaInput
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@email.com"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label={busy ? t('common.loading') : t('common.continue')}
          disabled={!email.trim() || busy}
          onPress={() => void onEmailContinue()}
        />
        <TextLink label={t('common.back')} onPress={() => setStep('options')} />
      </AuthScreen>
    );
  }

  if (step === 'password') {
    return (
      <AuthScreen>
        <AuthTitle>{t('auth.password')}</AuthTitle>
        <StravaInput
          label={t('auth.password')}
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
          label={t('auth.passwordConfirm')}
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <OrangeButton
          label={t('common.continue')}
          disabled={!password.trim() || !passwordConfirm.trim() || busy}
          onPress={onPassword}
        />
        <TextLink label={t('common.back')} onPress={() => setStep('email')} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthTitle>{t('auth.createAccount')}</AuthTitle>
      <StravaInput
        label={t('auth.firstName')}
        value={firstName}
        onChangeText={setFirstName}
        autoFocus
        placeholder={t('auth.firstName')}
      />
      <StravaInput
        label={t('auth.lastName')}
        value={lastName}
        onChangeText={setLastName}
        placeholder={t('auth.lastName')}
      />
      <StravaInput
        label={t('auth.username')}
        value={username}
        onChangeText={(text) => setUsername(limitUsernameInput(text))}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="nathan42"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <OrangeButton
        label={busy ? t('common.loading') : t('auth.createAccount')}
        disabled={!firstName.trim() || !lastName.trim() || !username.trim() || busy}
        onPress={() => void onJoin()}
      />
      <TextLink label={t('common.back')} onPress={() => setStep('password')} />
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
