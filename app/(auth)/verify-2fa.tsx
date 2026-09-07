import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { useRouter } from 'expo-router';
import { Body, Muted, PrimaryButton, Screen, Title } from '../../src/ui/primitives';
import { AuthFlowMark } from '../../src/ui/brand/AppBrandBlocks';
import { useApp } from '../../src/store/AppContext';
import { colors, radii, spacing } from '../../src/theme/tokens';

/** CDC §12.A — 2FA e-mail code 6 chiffres */
export default function Verify2faScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(600);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (state.profile.emailVerified && state.authToken) {
      router.replace('/(auth)/onboarding');
    }
  }, [state.profile.emailVerified, state.authToken]);

  return (
    <Screen>
      <AuthFlowMark />
      <Title>Vérification 2FA</Title>
      <Muted style={{ marginTop: 8 }}>
        Un code temporaire à 6 chiffres a été généré pour {state.profile.email || 'votre e-mail'}.
        Validité : {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}.
      </Muted>

      {/* Demo: affiche le code local — en prod envoyé par e-mail uniquement */}
      {state.pending2faCode ? (
        <View style={styles.demo}>
          <Muted>Code démo (simulation e-mail) :</Muted>
          <Text style={styles.demoCode}>{state.pending2faCode}</Text>
        </View>
      ) : null}

      <AppTextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={styles.codeInput}
        placeholder="••••••"
        placeholderTextColor={colors.textMuted}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label="Valider mon e-mail"
        disabled={code.length !== 6 || seconds === 0}
        onPress={() => {
          const before = state.profile.emailVerified;
          dispatch({ type: 'VERIFY_2FA', code });
          // verification async via next render; optimistic check
          if (code !== state.pending2faCode) {
            setError('Code invalide. Réessayez ou renvoyez le code.');
          } else if (!before) {
            setError('');
          }
        }}
      />

      <PrimaryButton
        label="Renvoyer le code"
        onPress={() => {
          dispatch({ type: 'RESEND_2FA' });
          setSeconds(600);
          setCode('');
          setError('');
        }}
      />
      <Body style={{ marginTop: 12 }}>
        La validation du code confirme l&apos;e-mail et active définitivement le compte.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  demo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoCode: {
    color: colors.xp,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    marginTop: 4,
  },
  codeInput: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radii.md,
    paddingVertical: 16,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 10,
  },
  error: { color: colors.danger, marginTop: 8 },
});
