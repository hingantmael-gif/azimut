import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../Text';
import { useApp } from '../../store/AppContext';
import { BrandMark } from '../strava/BrandMark';

const KEY = 'mova-installed-account-ack';

function isStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Premier lancement de l'application INSTALLÉE : si une session existe déjà dans ce navigateur
 * (Android partage le stockage entre Chrome et l'app installée), on demande explicitement avec
 * quel compte continuer plutôt que d'ouvrir un compte sans rien dire.
 */
export function InstalledAccountGate() {
  const { state, dispatch, sessionReady } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionReady || !state.authToken) return;
    if (!isStandalone()) return;
    try {
      if (window.localStorage.getItem(KEY) === '1') return;
    } catch {
      return;
    }
    setVisible(true);
  }, [sessionReady, state.authToken]);

  if (!visible) return null;

  const ack = () => {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const name = [state.profile.firstName, state.profile.lastName].filter(Boolean).join(' ').trim();
  const username = state.profile.username ? `@${state.profile.username}` : state.profile.email;

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <LinearGradient colors={['#050B16', '#0A1A2B', '#06121E']} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <BrandMark size="md" ink surfaceColor="#050B16" />
        <Text style={styles.title}>Quel compte utiliser ?</Text>
        <Text style={styles.body}>
          Ce téléphone est déjà connecté à un compte Mova. Vérifie que c'est bien le tien avant de continuer.
        </Text>
        <View style={styles.account}>
          <Text style={styles.accountName}>{name || username || 'Compte Mova'}</Text>
          {name && username ? <Text style={styles.accountSub}>{username}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" onPress={ack} style={[styles.btn, styles.primary]}>
          <Text style={styles.primaryText}>Continuer avec ce compte</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            ack();
            dispatch({ type: 'LOGOUT' });
          }}
          style={[styles.btn, styles.secondary]}
        >
          <Text style={styles.secondaryText}>Ce n'est pas moi — me connecter ou m'inscrire</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 9999, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, gap: 14 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: 12 },
  body: { color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 22 },
  account: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(6,14,28,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  accountName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  accountSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primary: { backgroundColor: '#3DFF9A' },
  primaryText: { color: '#04140D', fontSize: 16, fontWeight: '800' },
  secondary: { backgroundColor: '#0A1628', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  secondaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
