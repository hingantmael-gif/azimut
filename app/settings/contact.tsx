import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../../src/ui/Text';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { AppScrollView } from '../../src/ui/scrolling';
import { Chip, PrimaryButton } from '../../src/ui/primitives';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { safeGoBack } from '../../src/ui/navigation/AlwaysBackButton';
import {
  CONTACT_CATEGORIES,
  apiContactChallenge,
  apiSendContact,
  type ContactCategory,
} from '../../src/services/contactApi';

/**
 * Contact Mova — un message envoyé depuis l'app, sans quitter l'app et sans adresse e-mail affichée.
 * Petite procédure anti-spam : nom + prénom, e-mail (si pas de compte), question de vérification.
 */
export default function ContactScreen() {
  const { colors } = useThemeColors();
  const router = useRouter();
  const { state } = useApp();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Seul un jeton du serveur Mova identifie un vrai compte ; les comptes locaux passent pour des visiteurs.
  const serverToken = state.authToken?.startsWith('az_') ? state.authToken : null;
  const signedIn = Boolean(serverToken);

  const [firstName, setFirstName] = useState(state.profile.firstName ?? '');
  const [lastName, setLastName] = useState(state.profile.lastName ?? '');
  const [email, setEmail] = useState(state.profile.email ?? '');
  const [category, setCategory] = useState<ContactCategory>('question');
  const [message, setMessage] = useState('');
  const [answer, setAnswer] = useState('');
  const [trap, setTrap] = useState('');
  const [challenge, setChallenge] = useState<{ question: string; token: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const openedAt = useRef(Date.now());

  const loadChallenge = useCallback(async () => {
    setAnswer('');
    setChallenge(await apiContactChallenge());
  }, []);

  useEffect(() => {
    if (!signedIn) void loadChallenge();
  }, [signedIn, loadChallenge]);

  const emailOk = signedIn || /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(email.trim());
  const ready =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    emailOk &&
    message.trim().length >= 15 &&
    (signedIn || (challenge != null && answer.trim() !== ''));

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    const r = await apiSendContact(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: signedIn ? undefined : email.trim(),
        category,
        message: message.trim(),
        challengeToken: challenge?.token,
        challengeAnswer: answer.trim(),
        elapsedMs: Date.now() - openedAt.current,
        website: trap,
      },
      serverToken,
    );
    setBusy(false);
    if (r.ok) {
      setSent(true);
      return;
    }
    setError(r.error);
    if (r.refresh || !signedIn) void loadChallenge();
  };

  if (sent) {
    return (
      <SettingsScreen>
        <AppScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.doneBox}>
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={30} color="#0B1B2B" />
            </View>
            <Text style={styles.doneTitle}>Message envoyé</Text>
            <Text style={styles.doneText}>
              Merci {firstName.trim()}. L’équipe Mova te répond{signedIn ? '' : ' à l’adresse indiquée'} dès que possible.
            </Text>
          </View>
          <PrimaryButton label="Retour" onPress={() => safeGoBack(router, '/settings/help')} />
        </AppScrollView>
      </SettingsScreen>
    );
  }

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Écrire à Mova</Text>
        <Text style={styles.sub}>Ton message arrive directement à l’équipe, sans quitter l’application.</Text>

        <View style={styles.chips}>
          {CONTACT_CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </View>

        <View style={styles.row}>
          <Field label="Prénom" style={styles.half}>
            <AppTextInput value={firstName} onChangeText={setFirstName} autoCapitalize="words" maxLength={60} style={styles.input} placeholderTextColor={colors.textMuted} placeholder="Prénom" />
          </Field>
          <Field label="Nom" style={styles.half}>
            <AppTextInput value={lastName} onChangeText={setLastName} autoCapitalize="words" maxLength={60} style={styles.input} placeholderTextColor={colors.textMuted} placeholder="Nom" />
          </Field>
        </View>

        {!signedIn ? (
          <Field label="Ton e-mail (pour te répondre)">
            <AppTextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              placeholder="prenom@exemple.com"
            />
          </Field>
        ) : null}

        <Field label="Ton message">
          <AppTextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={[styles.input, { minHeight: 130 }]}
            placeholderTextColor={colors.textMuted}
            placeholder="Explique ta demande en quelques phrases."
          />
          <Text style={styles.count}>{message.trim().length < 15 ? `${Math.max(0, 15 - message.trim().length)} caractères minimum` : `${message.length}/2000`}</Text>
        </Field>

        {/* Champ piège : invisible pour une personne, rempli par les robots. */}
        <View style={styles.trap} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <AppTextInput value={trap} onChangeText={setTrap} tabIndex={-1} autoComplete="off" placeholder="Site web" />
        </View>

        {!signedIn ? (
          <Field label={`Vérification : ${challenge?.question ?? '…'}`}>
            <AppTextInput
              value={answer}
              onChangeText={setAnswer}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.input}
              placeholderTextColor={colors.textMuted}
              placeholder="Ta réponse"
            />
          </Field>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label={busy ? 'Envoi…' : 'Envoyer'} disabled={!ready || busy} onPress={submit} />
      </AppScrollView>
    </SettingsScreen>
  );

}

/** Défini hors de l'écran : sinon chaque frappe recréerait le champ et ferait perdre le focus. */
function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 64, gap: spacing.sm },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xs },
    row: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    field: { marginTop: spacing.xs },
    label: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
    input: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    count: { fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
    trap: { position: 'absolute', left: -9999, top: -9999, width: 1, height: 1, opacity: 0 },
    error: { color: colors.danger, fontSize: 14, fontWeight: '600', marginTop: spacing.xs },
    doneBox: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
    doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#5EF2B4', alignItems: 'center', justifyContent: 'center' },
    doneTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    doneText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  });
}
