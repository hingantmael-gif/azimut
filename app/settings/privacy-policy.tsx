import { Text, View, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';

/** Politique détaillée — aussi publiée en HTML public pour la validation Google. */
export default function PrivacyPolicyScreen() {
  const { colors } = useThemeColors();
  const c = { color: colors.textSecondary };
  const h = { color: colors.text, fontWeight: '800' as const, fontSize: 16, marginTop: 20, marginBottom: 8 };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <AboutBrandMark compact />
        <Text style={[styles.body, c, { marginTop: spacing.md }]}>
          Politique de confidentialité Azimut (RGPD). Dernière mise à jour : septembre 2026.
        </Text>

        <Text style={h}>1. Responsable</Text>
        <Text style={[styles.body, c]}>
          L’éditeur d’Azimut est responsable du traitement. Contact : réglages Compte / Aide, ou
          l’e-mail développeur de la fiche OAuth.
        </Text>

        <Text style={h}>2. Données collectées</Text>
        <Text style={[styles.body, c]}>
          Compte (e-mail, nom, identifiant, mot de passe hashé, photo) ; données Google si vous
          utilisez « Continuer avec Google » ; profil sportif ; séances et activités ; sommeil /
          récupération saisis ou calculés ; préférences techniques (session, montre).
        </Text>

        <Text style={h}>3. Finalités</Text>
        <Text style={[styles.body, c]}>
          Fournir le coaching multi-sport, les programmes, le suivi de charge et de récupération,
          l’export montre, la sécurité du compte et l’amélioration du service. Pas de vente de
          données à des fins publicitaires.
        </Text>

        <Text style={h}>4. Partage</Text>
        <Text style={[styles.body, c]}>
          Google (si connexion Google) ; prestataires techniques si configurés ; partenaires sport
          uniquement si vous liez un compte ou exportez une séance.
        </Text>

        <Text style={h}>5. Conservation & droits</Text>
        <Text style={[styles.body, c]}>
          Conservation pendant la vie du compte. Droits d’accès, rectification, effacement,
          portabilité : export et suppression depuis Compte et sécurité. Réclamation possible
          auprès de la CNIL.
        </Text>

        <Text style={[styles.body, c, { marginTop: 16 }]}>
          Version HTML publique : /privacy.html
        </Text>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
});
