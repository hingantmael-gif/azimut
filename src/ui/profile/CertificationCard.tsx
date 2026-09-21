import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { PrimaryButton } from '../primitives';
import { VerifiedBadge } from '../brand/VerifiedBadge';
import { useApp } from '../../store/AppContext';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { isRemoteAuthToken } from '../../services/integrationsApi';
import { fetchCommunityStatus, requestCertification, useRemoteConfig } from '../../services/remoteConfig';

type Status = { followers: number; verified: boolean; certification: 'pending' | 'refused' | null };

/**
 * Certification « athlète » : la pastille s'obtient dès que le seuil d'abonnés fixé par le propriétaire est atteint,
 * ou en la demandant. Aucun prix n'est affiché ici.
 */
export function CertificationCard() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const cfg = useRemoteConfig();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remote = isRemoteAuthToken(state.authToken);

  const load = useCallback(async () => {
    if (!remote) return;
    const r = await fetchCommunityStatus(state.authToken!);
    if (r) setStatus({ followers: r.followers, verified: r.verified, certification: r.certification ?? null });
  }, [remote, state.authToken]);

  useEffect(() => {
    void load();
    if (!remote) return;
    // Le propriétaire peut valider à tout moment : on relit régulièrement tant que la demande est en attente.
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, [load, remote, cfg.verifiedMinFollowers]);

  const followers = status?.followers ?? state.profile.followerUsernames?.length ?? 0;
  const goal = Math.max(1, cfg.verifiedMinFollowers);
  const verified = status?.verified ?? false;
  const pending = status?.certification === 'pending';
  const pct = Math.min(100, (followers / goal) * 100);
  const missing = Math.max(0, goal - followers);

  const obtain = async () => {
    if (!remote || busy) return;
    setBusy(true);
    setError(null);
    const r = await requestCertification(state.authToken!);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? 'Demande impossible pour le moment.');
      return;
    }
    setStatus((s) => ({ followers: s?.followers ?? followers, verified: r.verified, certification: r.pending ? 'pending' : null }));
  };

  if (verified) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.row}>
          <VerifiedBadge size={34} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Athlète certifié</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Ta pastille s’affiche sur ton profil, dans le fil et dans les recherches.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.row}>
        <VerifiedBadge size={34} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Certification athlète</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>Offerte automatiquement à {goal.toLocaleString('fr-FR')} abonnés.</Text>
        </View>
      </View>

      <View>
        <View style={[styles.bar, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { width: `${Math.max(followers > 0 ? 2 : 0, pct)}%`, backgroundColor: colors.accent }]} />
        </View>
        <View style={styles.barLabels}>
          <Text style={[styles.count, { color: colors.text }]}>
            {followers.toLocaleString('fr-FR')} <Text style={{ color: colors.textMuted, fontWeight: '600' }}>/ {goal.toLocaleString('fr-FR')} abonnés</Text>
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>encore {missing.toLocaleString('fr-FR')}</Text>
        </View>
      </View>

      {pending ? (
        <View style={[styles.offer, { borderColor: colors.accent }]}>
          <Text style={[styles.offerTitle, { color: colors.text }]}>Demande envoyée ✓</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>Ta pastille s’activera dès la validation de ta demande.</Text>
        </View>
      ) : remote ? (
        <PrimaryButton label={busy ? 'Un instant…' : 'Obtenir la pastille maintenant'} disabled={busy} onPress={() => void obtain()} />
      ) : (
        <Text style={[styles.sub, { color: colors.textMuted }]}>Connecte-toi à ton compte pour demander la pastille.</Text>
      )}
      {error ? <Text style={[styles.sub, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18 },
  bar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  count: { fontSize: 14, fontWeight: '800' },
  offer: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, gap: 2 },
  offerTitle: { fontSize: 15, fontWeight: '800' },
});
