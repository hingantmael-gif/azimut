import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '../../src/ui/Text';
import { AppTextInput } from '../../src/ui/AppTextInput';
import { AppScrollView } from '../../src/ui/scrolling';
import { PrimaryButton } from '../../src/ui/primitives';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { isOwnerPremiumEmail } from '../../src/engines/ownerAccess';
import { refreshRemoteConfig, saveRemoteConfig, useRemoteConfig } from '../../src/services/remoteConfig';

/** Réservé au compte propriétaire : ces seuils s'appliquent tout de suite à tous les utilisateurs. */
export default function CommunityRulesScreen() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const cfg = useRemoteConfig();
  const isOwner = isOwnerPremiumEmail(state.profile.email);

  const [groupMin, setGroupMin] = useState(String(cfg.groupMinFollowers));
  const [verifiedMin, setVerifiedMin] = useState(String(cfg.verifiedMinFollowers));
  const [price, setPrice] = useState(String(cfg.verifiedPriceEur));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isOwner) router.replace('/settings');
    else void refreshRemoteConfig();
  }, [isOwner, router]);
  useEffect(() => {
    setGroupMin(String(cfg.groupMinFollowers));
    setVerifiedMin(String(cfg.verifiedMinFollowers));
    setPrice(String(cfg.verifiedPriceEur));
  }, [cfg.groupMinFollowers, cfg.verifiedMinFollowers, cfg.verifiedPriceEur]);

  if (!isOwner) return null;

  const num = (v: string) => Math.max(0, Math.round(Number(v.replace(/\s/g, '').replace(',', '.')) || 0));

  const save = async () => {
    if (!state.authToken) return;
    setBusy(true);
    setMsg(null);
    const r = await saveRemoteConfig(state.authToken, {
      groupMinFollowers: num(groupMin),
      verifiedMinFollowers: num(verifiedMin),
      verifiedPriceEur: num(price),
    });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: 'Enregistré — appliqué à tous les utilisateurs.' } : { ok: false, text: r.error ?? 'Échec.' });
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Règles de la communauté</Text>
        <Text style={styles.sub}>
          Chaque changement s’applique à tous les utilisateurs presque immédiatement : ceux qui n’atteignent plus le
          seuil perdent l’accès dès leur prochain rafraîchissement.
        </Text>

        <Rule
          label="Abonnés requis pour créer un groupe"
          hint="Par défaut 1 000."
          value={groupMin}
          onChange={setGroupMin}
          styles={styles}
          placeholderColor={colors.textMuted}
        />
        <Rule
          label="Abonnés pour la certification automatique"
          hint="Au-delà, la pastille « athlète certifié » est offerte. Par défaut 10 000."
          value={verifiedMin}
          onChange={setVerifiedMin}
          styles={styles}
          placeholderColor={colors.textMuted}
        />
        <Rule
          label="Prix mensuel de la certification (€)"
          hint="Pour les athlètes sous le seuil. Par défaut 1 €."
          value={price}
          onChange={setPrice}
          styles={styles}
          placeholderColor={colors.textMuted}
        />

        {msg ? <Text style={[styles.msg, { color: msg.ok ? colors.success : colors.danger }]}>{msg.text}</Text> : null}
        <PrimaryButton label={busy ? 'Enregistrement…' : 'Enregistrer'} disabled={busy} onPress={save} />
      </AppScrollView>
    </SettingsScreen>
  );
}

function Rule({
  label,
  hint,
  value,
  onChange,
  styles,
  placeholderColor,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  styles: ReturnType<typeof makeStyles>;
  placeholderColor: string;
}) {
  return (
    <View style={styles.rule}>
      <Text style={styles.label}>{label}</Text>
      <AppTextInput value={value} onChangeText={onChange} keyboardType="number-pad" style={styles.input} placeholderTextColor={placeholderColor} />
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 64, gap: spacing.sm },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.xs },
    rule: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, gap: 6 },
    label: { fontSize: 14, fontWeight: '800', color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted },
    input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18, fontWeight: '700', color: colors.text },
    msg: { fontSize: 14, fontWeight: '600' },
  });
}
