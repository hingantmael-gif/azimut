import { useMemo, useState } from 'react';
import { Image, Platform, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../src/ui/Text';
import { AppScrollView } from '../src/ui/scrolling';
import { PrimaryButton, SecondaryButton, Screen } from '../src/ui/primitives';
import { useThemeColors } from '../src/theme/ThemeContext';
import { radii, spacing } from '../src/theme/tokens';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { detectIos, detectPlatform, isStandaloneDisplay, usePwaInstall } from '../src/services/pwaInstall';
import { IosInstallGuide } from '../src/ui/install/IosInstallGuide';
import { LoopView } from '../src/ui/atmosphere/LoopView';

/**
 * « Installer Mova » — DANS l'application (flèche retour en haut) : plus de page externe qui fait sortir de l'app.
 * Même contenu pour tout le monde : bouton d'installation, guide selon l'appareil, QR code pour un autre appareil.
 */
export default function InstallScreen() {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { canPrompt, installed, prompt } = usePwaInstall();
  const { kind, inAppBrowser } = detectPlatform();
  const ios = detectIos();
  const router = useRouter();
  // L'app installée ouvre parfois cette page (iOS mémorise l'adresse où on a ajouté l'icône) : direction l'accueil.
  useEffect(() => {
    if (isStandaloneDisplay()) router.replace('/');
  }, [router]);
  const [status, setStatus] = useState('');
  const [guide, setGuide] = useState(kind === 'ios');
  const [copied, setCopied] = useState(false);

  const link = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/install` : '';

  const install = async () => {
    if (inAppBrowser) {
      setStatus('Ce navigateur intégré ne peut pas installer d’application : ouvre le lien dans Chrome ou Safari.');
      setGuide(true);
      return;
    }
    const choice = await prompt();
    if (choice === 'accepted') setStatus('Installation en cours…');
    else if (choice === 'dismissed') setStatus('Installation annulée — tu peux réessayer.');
    else setGuide(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* copie impossible : le lien reste visible dans le QR */
    }
  };

  const share = () => {
    void Share.share({ message: `Installe Mova, ton coach multi-sport : ${link}`, url: link }).catch(() => undefined);
  };

  if (kind === 'native') {
    return (
      <Screen>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={colors.accent} />
          <Text style={styles.h1}>Mova est déjà installée</Text>
          <Text style={styles.sub}>Tu utilises l’application sur ton téléphone : rien à installer.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Image source={{ uri: '/icon-192.png' }} style={styles.logo} accessibilityLabel="Mova" />
          <Text style={styles.h1}>Installe Mova</Text>
          <Text style={styles.sub}>Sur ton écran d’accueil, en plein écran, comme une vraie application. Sans store, en 10 secondes.</Text>
        </View>

        {ios && !installed ? (
          <IosInstallGuide info={ios} link={link} onCopy={() => void copy()} copied={copied} onShare={share} />
        ) : installed ? (
          <View style={[styles.card, { borderColor: colors.accent }]}>
            <Ionicons name="checkmark-circle" size={28} color={colors.accent} />
            <Text style={styles.cardTitle}>Mova est installée sur cet appareil ✓</Text>
            <Text style={styles.sub}>Tu peux l’ouvrir depuis ton écran d’accueil.</Text>
          </View>
        ) : (
          <>
            <PrimaryButton label={canPrompt ? 'Installer l’application' : 'Comment l’installer ?'} onPress={() => void install()} />
            {status ? <Text style={styles.status}>{status}</Text> : null}
          </>
        )}

        {!ios && !installed && guide ? (
          <View style={styles.card}>
            {kind === 'ios' ? (
              <>
                <Text style={styles.cardTitle}>Sur iPhone / iPad (Safari)</Text>
                <Step n={1} styles={styles}>Touche <Text style={styles.b}>Partager</Text> (le carré avec la flèche, en bas de l’écran).</Step>
                <Step n={2} styles={styles}>Fais défiler puis choisis <Text style={styles.b}>« Sur l’écran d’accueil »</Text>.</Step>
                <Step n={3} styles={styles}>Touche <Text style={styles.b}>Ajouter</Text> : Mova apparaît avec tes autres applications.</Step>
              </>
            ) : kind === 'android' ? (
              <>
                <Text style={styles.cardTitle}>Sur Android (Chrome)</Text>
                <Step n={1} styles={styles}>Ouvre le menu du navigateur <Text style={styles.b}>⋮</Text> (en haut à droite).</Step>
                <Step n={2} styles={styles}>Choisis <Text style={styles.b}>« Installer l’application »</Text> ou <Text style={styles.b}>« Ajouter à l’écran d’accueil »</Text>.</Step>
                <Step n={3} styles={styles}>Confirme : Mova apparaît sur ton écran d’accueil.</Step>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Sur ordinateur (Chrome / Edge)</Text>
                <Step n={1} styles={styles}>Clique sur l’icône <Text style={styles.b}>Installer</Text> à droite de la barre d’adresse, ou dans le menu <Text style={styles.b}>⋮</Text>.</Step>
                <Step n={2} styles={styles}>Confirme : Mova s’ouvre dans sa propre fenêtre.</Step>
                <Step n={3} styles={styles}>Sur téléphone, scanne le QR code ci-dessous.</Step>
              </>
            )}
            {inAppBrowser ? (
              <Text style={styles.warn}>Tu es dans un navigateur intégré (réseau social, messagerie) : touche ⋮ ou Partager puis « Ouvrir dans Chrome / Safari ».</Text>
            ) : null}
          </View>
        ) : null}

        {/* QR code : pour installer sur un autre appareil */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sur un autre appareil</Text>
          <Text style={styles.sub}>Scanne ce QR code avec ton téléphone : la page d’installation s’ouvre.</Text>
          <View style={styles.qrBox}>
            <Image source={{ uri: '/qr-install.png' }} style={styles.qr} accessibilityLabel="QR code pour installer Mova" />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label={copied ? 'Lien copié ✓' : 'Copier le lien'} onPress={() => void copy()} />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Partager" onPress={share} />
            </View>
          </View>
        </View>
      </AppScrollView>
      {ios && !installed && ios.device === 'iphone' && (ios.browser === 'safari' || ios.browser === 'chrome') ? (
        <View pointerEvents="none" style={styles.arrowWrap}>
          <LoopView from={{ y: 0 }} to={{ y: 10 }} ms={700} style={styles.arrow}>
            <Ionicons name="arrow-down" size={26} color="#04140F" />
          </LoopView>
          <Text style={styles.arrowText}>Partager</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Step({ n, children, styles }: { n: number; children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepN}>
        <Text style={styles.stepNText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 64, gap: spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
    hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
    logo: { width: 88, height: 88, borderRadius: 22 },
    h1: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
    sub: { fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center' },
    status: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, gap: spacing.sm, alignItems: 'stretch' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    stepN: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    stepNText: { color: colors.onAccent, fontWeight: '800', fontSize: 13 },
    stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
    b: { fontWeight: '800' },
    warn: { fontSize: 12, color: colors.danger, lineHeight: 17 },
    qrBox: { alignSelf: 'center', padding: 10, borderRadius: radii.md, backgroundColor: '#FFFFFF' },
    qr: { width: 190, height: 190 },
    row: { flexDirection: 'row', gap: spacing.sm },
    arrowWrap: { position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center' },
    arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    arrowText: { marginTop: 2, fontSize: 12, fontWeight: '800', color: colors.text },
  });
}
