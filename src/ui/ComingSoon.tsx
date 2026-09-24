import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { radii } from '../theme/tokens';

type OverlayProps = {
  /** Libellé sous le casque (défaut : En construction) */
  caption?: string;
  /** Style du calque (ex. borderRadius pour coller à la carte) */
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Calque « en travaux » — casque de chantier + légende.
 * À poser AU-DESSUS d’une zone visible mais non cliquable.
 * `pointerEvents="none"` : pour une zone interactive (ex. waitlist),
 * utiliser le `footer` de `ComingSoonLock`.
 */
export function ComingSoonOverlay({
  caption = 'En construction',
  style,
  children,
}: OverlayProps) {
  return (
    <View style={[styles.helmetLayer, style]} pointerEvents="none">
      <Text style={styles.helmet} accessibilityElementsHidden>
        👷
      </Text>
      <Text style={styles.helmetCaption}>{caption}</Text>
      {children}
    </View>
  );
}

type LockProps = {
  /** Contenu visible derrière le casque (image, carte, etc.) */
  children: ReactNode;
  label?: string;
  caption?: string;
  style?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
  /**
   * Zone interactive au-dessus du calque (ex. checkbox waitlist).
   * Reçoit les touches ; le reste de la carte reste verrouillé.
   */
  footer?: ReactNode;
};

/**
 * Conteneur verrouillé : visible, non interactif, casque de chantier.
 * Utiliser pour toute feature WIP afin que l’utilisateur navigue ailleurs sans blocage.
 */
export function ComingSoonLock({
  children,
  label = 'Fonctionnalité',
  caption = 'En construction',
  style,
  overlayStyle,
  footer,
}: LockProps) {
  return (
    <View
      accessible={!footer}
      accessibilityRole="text"
      accessibilityLabel={`${label}, en construction, bientôt disponible`}
      style={[styles.lockWrap, style]}
      pointerEvents="box-none"
    >
      <View pointerEvents="none" style={styles.dimmed}>
        {children}
      </View>
      <View
        style={[styles.helmetLayer, footer ? styles.helmetLayerWithFooter : null, overlayStyle]}
        pointerEvents="box-none"
      >
        <View style={styles.helmetBlock} pointerEvents="none">
          <Text
            style={[styles.helmet, footer ? styles.helmetCompact : null]}
            accessibilityElementsHidden
          >
            👷
          </Text>
          <Text style={styles.helmetCaption}>{caption}</Text>
        </View>
        {footer ? (
          <View style={styles.footerSlot} pointerEvents="auto">
            {footer}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.88,
  },
  helmetLayer: {
    ...({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 }),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    borderRadius: radii.lg,
  },
  helmetLayerWithFooter: {
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  helmetBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  footerSlot: {
    width: '100%',
    alignItems: 'stretch',
  },
  helmet: {
    fontSize: 56,
    lineHeight: 64,
    textAlign: 'center',
  },
  helmetCompact: {
    fontSize: 40,
    lineHeight: 46,
  },
  helmetCaption: {
    marginTop: 4,
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
