import { Text, StyleSheet } from 'react-native';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { AboutBrandMark } from '../../src/ui/brand/AppBrandBlocks';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';
import { AppScrollView } from '../../src/ui/scrolling';

export default function TermsScreen() {
  const { colors } = useThemeColors();
  const c = { color: colors.textSecondary };
  const h = { color: colors.text, fontWeight: '800' as const, fontSize: 16, marginTop: 20, marginBottom: 8 };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        <AboutBrandMark compact />
        <Text style={[styles.body, c, { marginTop: spacing.md }]}>
          Conditions générales d’utilisation d’Azimut. Dernière mise à jour : septembre 2026.
        </Text>
        <Text style={h}>Objet</Text>
        <Text style={[styles.body, c]}>
          Azimut fournit un coaching multi-sport (plans, calendrier, récupération, export montre,
          profil). L’usage vaut acceptation de ces conditions.
        </Text>
        <Text style={h}>Compte & usage</Text>
        <Text style={[styles.body, c]}>
          Informations exactes à l’inscription ; responsabilité de vos identifiants ; usage
          personnel ; pas d’accès aux comptes tiers.
        </Text>
        <Text style={h}>Santé</Text>
        <Text style={[styles.body, c]}>
          Azimut n’est pas un dispositif médical. Adaptez l’effort ; consultez un professionnel en
          cas de doute. Vous restez responsable de votre sécurité outdoor.
        </Text>
        <Text style={h}>Données</Text>
        <Text style={[styles.body, c]}>
          Voir la politique de confidentialité. Export et suppression depuis Compte et sécurité.
          Version HTML : /terms.html
        </Text>
      </AppScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
});
