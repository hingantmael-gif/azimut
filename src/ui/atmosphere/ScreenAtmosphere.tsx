import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useThemeColors } from '../../theme/ThemeContext';
import { useAmbientSportKey, useAmbientTint } from '../../theme/AmbientSport';
import { atmosphereBase, mixHex, type SportTint } from '../../theme/sportTints';
import { seedFromString } from '../../engines/topoLines';
import { DriftBlob } from '../program/WizardBackdrop';
import { AuroraPattern, patternForSport } from './AuroraPatterns';

/**
 * Fond « aurore » Mova, commun à tout l'app : dégradé + halos qui dérivent + courbes de niveau.
 * Sa couleur suit le sport (course = jade, vélo = ambre, natation = bleu, muscu = violet…).
 * Clair : pastel coloré · Sombre : nuit profonde. Ne capte aucun toucher.
 */

/** Vrai quand l'écran est déjà enveloppé par `AtmosphereLayer` (évite un second fond). */
const InsideLayer = createContext(false);

function AuroraLayer({ tint, sport, isDark, paused }: { tint: SportTint; sport: string; isDark: boolean; paused: boolean }) {
  const base0 = atmosphereBase(tint, isDark);
  // Écran caché (pile de pages, onglet en arrière-plan) : simple dégradé, AUCUNE couche animée.
  // Empiler des dizaines de couches animées saturait la mémoire graphique des téléphones (scintillement).
  if (paused) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[...base0]} locations={[0, 0.55, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
    );
  }
  const { width, height } = useWindowDimensions();
  const w = Math.max(320, width);
  const h = Math.max(560, height);
  const [c1, c2] = tint;
  const base = atmosphereBase(tint, isDark);
  // En clair les halos sont plus présents (ils sont la couleur de l'écran), en sombre plus lumineux.
  const o = isDark ? { a: 0.4, b: 0.36, c: 0.22 } : { a: 0.5, b: 0.44, c: 0.32 };
  const ink = (c: string) => (isDark ? c : mixHex(c, '#0B1220', 0.4));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[...base]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <DriftBlob paused={paused} size={w * 1.5} color={c1} opacity={o.a} dx={46} dy={34} ms={7600} style={{ top: -h * 0.12, left: -w * 0.55 }} />
      <DriftBlob paused={paused} size={w * 1.4} color={c2} opacity={o.b} dx={40} dy={44} ms={9200} delay={900} style={{ top: h * 0.32, right: -w * 0.6 }} />
      <DriftBlob paused={paused} size={w * 1.1} color={c1} opacity={o.c} dx={34} dy={30} ms={11000} delay={1800} style={{ bottom: -h * 0.08, left: -w * 0.2 }} />
      {/* Motif propre à la discipline : courbes (course), traînées (vélo), vagues (natation)… */}
      <AuroraPattern
        kind={patternForSport(sport)}
        color={ink(c1)}
        color2={ink(c2)}
        seed={seedFromString(`mova-ambient-${sport}`)}
        opacity={isDark ? 0.8 : 0.7}
        paused={paused}
      />
      {/* Voile en haut : titres et barres de progression restent parfaitement lisibles. */}
      <LinearGradient
        colors={isDark ? ['rgba(5,11,22,0.62)', 'rgba(5,11,22,0)'] : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
        style={[styles.topVeil, { height: h * 0.26 }]}
      />
    </View>
  );
}

type Layer = { id: number; tint: SportTint; sport: string };

/** Fond animé + fondu enchaîné quand le sport (donc la couleur) change. */
function Aurora() {
  const { isDark } = useThemeColors();
  const tint = useAmbientTint();
  const sport = useAmbientSportKey();
  const focused = useIsFocused();
  const [layers, setLayers] = useState<Layer[]>([{ id: 0, tint, sport }]);
  const fade = useRef(new Animated.Value(1)).current;
  const nextId = useRef(1);

  useEffect(() => {
    const top = layers[layers.length - 1]!;
    if (top.sport === sport) return;
    fade.setValue(0);
    setLayers((l) => [...l.slice(-1), { id: nextId.current++, tint, sport }]);
    Animated.timing(fade, { toValue: 1, duration: 650, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setLayers((l) => l.slice(-1));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {layers.map((l, i) => {
        const isTop = i === layers.length - 1 && layers.length > 1;
        return (
          <Animated.View key={l.id} style={[StyleSheet.absoluteFill, isTop ? { opacity: fade } : null]}>
            <AuroraLayer tint={l.tint} sport={l.sport} isDark={isDark} paused={!focused} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/** À poser en premier enfant d'un écran ; sans effet si l'écran est déjà dans un `AtmosphereLayer`. */
export function ScreenAtmosphere(_props: { intensity?: number }) {
  const inside = useContext(InsideLayer);
  if (inside) return null;
  return <Aurora />;
}

/** Enveloppe d'écran (navigateurs `screenLayout`) : fond aurore opaque + contenu par-dessus. */
export function AtmosphereLayer({ children }: { children: ReactNode }) {
  const { isDark } = useThemeColors();
  const tint = useAmbientTint();
  return (
    <View style={[styles.layer, { backgroundColor: atmosphereBase(tint, isDark)[0] }]}>
      <Aurora />
      <InsideLayer.Provider value>{children}</InsideLayer.Provider>
    </View>
  );
}

/** Couleur de la barre d'en-tête : prolonge le haut du dégradé sans coupure visible. */
export function useHeaderColor(): string {
  const { isDark } = useThemeColors();
  const tint = useAmbientTint();
  return atmosphereBase(tint, isDark)[0];
}

const styles = StyleSheet.create({
  layer: { flex: 1 },
  topVeil: { position: 'absolute', top: 0, left: 0, right: 0 },
});
