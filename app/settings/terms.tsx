import { Text, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';

/** CGU unifiées (usage + données / confidentialité). Acceptation obligatoire à l’entrée. */
export default function TermsScreen() {
  const { colors } = useThemeColors();
  const c = { color: colors.textSecondary };
  const h = {
    color: colors.text,
    fontWeight: '800' as const,
    fontSize: 16,
    marginTop: 20,
    marginBottom: 8,
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <AboutBrandMark compact />
        <Text style={[styles.body, c, { marginTop: spacing.md }]}>
          Conditions d’utilisation Azimut — septembre 2026. En cochant « J’accepte », tu
          confirmes avoir lu et accepté l’ensemble.
        </Text>

        <Text style={h}>1. Service</Text>
        <Text style={[styles.body, c]}>
          Azimut est une app de coaching multi-sport (plans, calendrier, récupération, montre,
          profil). Usage personnel uniquement.
        </Text>

        <Text style={h}>2. Compte</Text>
        <Text style={[styles.body, c]}>
          Infos exactes à l’inscription. Tu es responsable de tes identifiants. Connexion Google
          soumise aussi aux règles Google.
        </Text>

        <Text style={h}>3. Santé</Text>
        <Text style={[styles.body, c]}>
          Azimut n’est pas un dispositif médical. Adapte l’effort. En cas de doute, consulte un
          professionnel. Tu restes responsable de ta sécurité outdoor.
        </Text>

        <Text style={h}>4. Données (confidentialité)</Text>
        <Text style={[styles.body, c]}>
          Données traitées : compte (e-mail, nom, identifiant, mot de passe hashé), profil sportif,
          séances / activités, scores de sommeil saisis, données Google si tu te connectes avec
          Google. Finalités : fournir le service, personnaliser les plans, sécuriser le compte.
          Stockage local appareil et/ou serveur auth. Pas de vente de données. Droits RGPD :
          accès, rectification, suppression via Compte et sécurité. Contact : Aide / Compte.
        </Text>

        <Text style={h}>5. Contenu & IP</Text>
        <Text style={[styles.body, c]}>
          Marque et interface Azimut protégées. Tes activités et ton profil restent les tiens.
        </Text>

        <Text style={h}>6. Disponibilité & résiliation</Text>
        <Text style={[styles.body, c]}>
          Service fourni sans garantie d’absence d’interruption. Tu peux supprimer ton compte à
          tout moment. Compte suspendable en cas d’abus.
        </Text>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
});
