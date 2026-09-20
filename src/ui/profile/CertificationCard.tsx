import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import { ComingSoonLock } from '../ComingSoon';
import { VerifiedBadge } from '../brand/VerifiedBadge';
import { useApp } from '../../store/AppContext';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { isRemoteAuthToken } from '../../services/integrationsApi';
import { fetchCommunityStatus, useRemoteConfig } from '../../services/remoteConfig';

/**
 * Certification « athlète » : offerte au-delà du seuil d'abonnés (réglé par le propriétaire),
 * sinon proposée en abonnement mensuel. Le paiement n'est pas encore branché : l'offre est visible mais verrouillée.
 */
export function CertificationCard() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const cfg = useRemoteConfig();
  const [status, setStatus] = useState<{ followers: number; verified: boolean } | null>(null);

  useEffect(() => {
    if (!isRemoteAuthToken(state.authToken)) return;
    let off = false;
    void fetchCommunityStatus(state.authToken!).then((r) => {
      if (!off && r) setStatus({ followers: r.followers, verified: r.verified });
    });
    return () => {
      off = true;
    };
  }, [state.authToken, cfg.verifiedMinFollowers]);

  const followers = status?.followers ?? state.profile.followerUsernames?.length ?? 0;
  const verified = status?.verified ?? false;
  const pct = Math.min(100, Math.round((followers / Math.max(1, cfg.verifiedMinFollowers)) * 100));

  if (verified) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.row}>
          <VerifiedBadge size={34} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Athlète certifié</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Ta pastille s’affiche sur ton profil et dans le fil.</Text>
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
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            Offerte dès {cfg.verifiedMinFollowers.toLocaleString('fr-FR')} abonnés · {followers.toLocaleString('fr-FR')} pour l’instant.
          </Text>
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.accent }]} />
      </View>
      <ComingSoonLock label="Certification payante" caption="Bientôt disponible" style={{ borderRadius: radii.md, marginTop: spacing.xs }}>
        <View style={[styles.offer, { borderColor: colors.border }]}>
          <Text style={[styles.offerTitle, { color: colors.text }]}>Obtenir la pastille maintenant</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{cfg.verifiedPriceEur} € par mois · résiliable à tout moment</Text>
        </View>
      </ComingSoonLock>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  offer: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1, gap: 2, minHeight: 84, justifyContent: 'center' },
  offerTitle: { fontSize: 15, fontWeight: '800' },
});
