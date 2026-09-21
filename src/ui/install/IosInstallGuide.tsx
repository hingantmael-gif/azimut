import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { LoopView } from '../atmosphere/LoopView';
import { PrimaryButton, SecondaryButton } from '../primitives';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import type { IosInfo } from '../../services/pwaInstall';

/** Icône « Partager » d'iOS : un carré ouvert avec une flèche vers le haut. */
function ShareGlyph({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v12M8 7l4-4 4 4" />
      <Path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </Svg>
  );
}

/** Maquette de la barre de Safari : l'icône Partager est entourée pour qu'on la repère du premier coup. */
function SafariBarMock({ device, accent, ink, muted }: { device: IosInfo['device']; accent: string; ink: string; muted: string }) {
  const top = device === 'ipad';
  return (
    <View style={[mock.wrap, { borderColor: muted }]}>
      <Text style={[mock.caption, { color: muted }]}>{top ? 'En haut à droite de Safari' : 'En bas de l’écran de Safari'}</Text>
      <View style={[mock.bar, { backgroundColor: 'rgba(120,130,150,0.18)' }]}>
        {top ? (
          <>
            <View style={[mock.url, { backgroundColor: 'rgba(120,130,150,0.25)' }]} />
            <View style={mock.shareSlot}>
              <LoopView from={{ scale: 0.9, opacity: 0.35 }} to={{ scale: 1.25, opacity: 1 }} ms={900} style={[mock.ring, { borderColor: accent }]} />
              <ShareGlyph color={ink} />
            </View>
          </>
        ) : (
          <>
            <Ionicons name="chevron-back" size={20} color={muted} />
            <Ionicons name="chevron-forward" size={20} color={muted} />
            <View style={mock.shareSlot}>
              <LoopView from={{ scale: 0.9, opacity: 0.35 }} to={{ scale: 1.25, opacity: 1 }} ms={900} style={[mock.ring, { borderColor: accent }]} />
              <ShareGlyph color={ink} />
            </View>
            <Ionicons name="book-outline" size={20} color={muted} />
            <Ionicons name="copy-outline" size={20} color={muted} />
          </>
        )}
      </View>
    </View>
  );
}

const mock = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  caption: { fontSize: 12, fontWeight: '700' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18 },
  url: { flex: 1, height: 22, borderRadius: 11, marginRight: 14 },
  shareSlot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
});

/**
 * Guide d'installation pour iPhone / iPad. Sur iOS il n'y a pas de bouton « Installer » : il faut passer par
 * Safari → Partager → « Sur l'écran d'accueil ». Le guide montre l'endroit exact, détecte le mauvais navigateur
 * (messagerie, réseau social, Firefox…) et aide à ouvrir le lien dans Safari.
 */
export function IosInstallGuide({ info, link, onCopy, copied, onShare }: { info: IosInfo; link: string; onCopy: () => void; copied: boolean; onShare: () => void }) {
  const { colors } = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showAlt, setShowAlt] = useState(false);
  const wrongBrowser = info.browser === 'inapp' || info.browser === 'firefox' || info.browser === 'other';
  const chrome = info.browser === 'chrome' || info.browser === 'edge';
  const iphone = info.device === 'iphone';

  return (
    <View style={{ gap: spacing.md }}>
      {wrongBrowser ? (
        <View style={[styles.warn, { borderColor: colors.danger }]}>
          <View style={styles.row}>
            <Ionicons name="compass-outline" size={22} color={colors.danger} />
            <Text style={[styles.warnTitle, { color: colors.text }]}>D’abord, ouvre ce lien dans Safari</Text>
          </View>
          <Text style={styles.body}>
            {info.browser === 'inapp'
              ? 'Tu es dans le navigateur d’une application (messagerie, réseau social) : il ne peut pas installer Mova.'
              : 'Ce navigateur ne peut pas installer Mova sur iPhone. Seuls Safari (et Chrome récent) le peuvent.'}
          </Text>
          <Step n={1} styles={styles}>Touche <Text style={styles.b}>Copier le lien</Text> ci-dessous.</Step>
          <Step n={2} styles={styles}>Ouvre <Text style={styles.b}>Safari</Text> (l’icône boussole bleue), colle le lien dans la barre d’adresse et valide.</Step>
          <Step n={3} styles={styles}>Reviens sur cette page dans Safari : le guide s’affiche.</Step>
          <PrimaryButton label={copied ? 'Lien copié ✓' : 'Copier le lien'} onPress={onCopy} />
          <Text style={styles.link} selectable>{link}</Text>
        </View>
      ) : null}

      <View style={[styles.card, wrongBrowser && { opacity: 0.55 }]}>
        <Text style={styles.cardTitle}>{iphone ? 'Installer sur iPhone' : 'Installer sur iPad'} — 3 gestes</Text>
        <SafariBarMock device={info.device} accent={colors.accent} ink={colors.text} muted={colors.textMuted} />

        <Step n={1} styles={styles}>
          <Text style={styles.b}>{chrome ? 'Ouvre le menu de Chrome' : 'Touche le bouton Partager'}</Text>
          {chrome ? ' (les trois points, ou l’icône Partager dans la barre d’adresse), puis ' : ' '}
          {chrome ? <Text style={styles.b}>Partager</Text> : null}
          {chrome ? '.' : iphone ? ' — le carré avec une flèche vers le haut, tout en bas de l’écran.' : ' — le carré avec une flèche, en haut à droite.'}
        </Step>
        <Step n={2} styles={styles}>
          Fais défiler la liste vers le bas et choisis <Text style={styles.b}>« Sur l’écran d’accueil »</Text>
          <Text style={styles.hint}>{'\n'}Tu ne le vois pas ? Touche « Plus » ou « Modifier les actions » en bas de la liste.</Text>
        </Step>
        <Step n={3} styles={styles}>
          Touche <Text style={styles.b}>Ajouter</Text> en haut à droite. Mova apparaît avec tes autres applications.
          {info.major >= 17 ? <Text style={styles.hint}>{'\n'}Si on te propose « Ouvrir comme app web », laisse-le activé.</Text> : null}
        </Step>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Après l’installation</Text>
        <Text style={styles.body}>
          Ouvre Mova depuis <Text style={styles.b}>l’icône sur l’écran d’accueil</Text> (pas depuis Safari). L’app installée est un espace à part : reconnecte-toi une
          fois avec ton compte, tes séances et ton programme se synchronisent automatiquement.
        </Text>
        <Text style={styles.body}>Pour recevoir les notifications, installe d’abord Mova puis autorise-les depuis l’app (iOS 16.4 ou plus récent).</Text>
      </View>

      <SecondaryButton label={showAlt ? 'Masquer' : 'Ça ne marche pas ?'} onPress={() => setShowAlt((v) => !v)} />
      {showAlt ? (
        <View style={styles.card}>
          <Text style={styles.body}>• « Sur l’écran d’accueil » absent : tu n’es pas dans Safari (ou en navigation privée). Rouvre le lien dans un onglet normal de Safari.</Text>
          <Text style={styles.body}>• L’icône ouvre un simple site : supprime-la, relance l’ajout depuis Safari et laisse « Ouvrir comme app web » activé.</Text>
          <Text style={styles.body}>• La connexion Google renvoie vers Safari : dans l’app installée, utilise ton e-mail et ton mot de passe.</Text>
          <Text style={styles.body}>• iOS 15 ou plus ancien : mets iOS à jour, l’installation est plus fiable depuis iOS 16.4.</Text>
          <SecondaryButton label="Partager ce lien à un ami" onPress={onShare} />
        </View>
      ) : null}
    </View>
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
    card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, gap: spacing.sm },
    warn: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 2, backgroundColor: colors.bgCard, gap: spacing.sm },
    warnTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    body: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    hint: { fontSize: 12, color: colors.textMuted },
    b: { fontWeight: '800', color: colors.text },
    link: { fontSize: 12, color: colors.textMuted },
    step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    stepN: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    stepNText: { color: colors.onAccent, fontWeight: '800', fontSize: 13 },
    stepText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
  });
}

