import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { radii } from '../../theme/tokens';
import {
  COVER_CROP_CENTER,
  SPORT_HERO_IMAGES,
} from '../../constants/sportVisuals';
import { useApp } from '../../store/AppContext';
import { ComingSoonLock } from '../ComingSoon';
import { SportCover } from './SportCover';

const WAITLIST_STORAGE_KEY = '@azimut/waitlist_calisthenics';

type Props = {
  title?: string;
  subtitle?: string;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Carte sport Callisthénie — visible, verrouillée (casque de chantier),
 * avec inscription waitlist interactive.
 */
export function SportComingSoonCard({
  title = 'Callisthénie',
  subtitle = 'Poids du corps — pompes, tractions, squats, gainage',
  minHeight = 168,
  style,
  contentStyle,
}: Props) {
  const { state, dispatch } = useApp();
  const [joined, setJoined] = useState(
    () => Boolean(state.profile.waitlistCalisthenics),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (state.profile.waitlistCalisthenics) {
        if (!cancelled) setJoined(true);
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(WAITLIST_STORAGE_KEY);
        if (!cancelled && raw === '1') {
          setJoined(true);
          dispatch({
            type: 'UPDATE_PROFILE',
            patch: { waitlistCalisthenics: true },
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.profile.waitlistCalisthenics, dispatch]);

  const toggleWaitlist = useCallback(() => {
    const next = !joined;
    setJoined(next);
    dispatch({
      type: 'UPDATE_PROFILE',
      patch: { waitlistCalisthenics: next },
    });
    void AsyncStorage.setItem(WAITLIST_STORAGE_KEY, next ? '1' : '0').catch(
      () => undefined,
    );
  }, [joined, dispatch]);

  return (
    <ComingSoonLock
      label={title}
      caption="En construction"
      style={style}
      footer={
        <View style={styles.footerCol}>
          <Pressable
            onPress={toggleWaitlist}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: joined }}
            accessibilityLabel="Bientôt disponible. Sois notifié"
            style={[styles.waitlistRow, joined && styles.waitlistRowOn]}
            hitSlop={6}
          >
            <View style={[styles.checkbox, joined && styles.checkboxOn]}>
              {joined ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.waitlistLabel}>
              Bientôt disponible · Sois notifié
            </Text>
          </Pressable>
          <View style={styles.skillPreview} pointerEvents="none">
            <Text style={styles.skillPreviewTitle}>Arbre de skills (aperçu)</Text>
            <Text style={styles.skillPreviewSub}>
              Planche → hollow · Pompes → dips · Row → tractions — 👷 verrouillé
            </Text>
          </View>
        </View>
      }
    >
      <SportCover
        source={SPORT_HERO_IMAGES.other}
        minHeight={minHeight}
        borderRadius={radii.lg}
        objectPosition={COVER_CROP_CENTER}
        scrim="rgba(7, 17, 31, 0.55)"
        contentStyle={[styles.content, contentStyle]}
      >
        <View style={styles.sportHeroText}>
          <Text style={styles.sportHeroLabel}>{title}</Text>
          <Text style={styles.sportHeroDesc}>{subtitle}</Text>
        </View>
        <Text style={styles.soonChip}>Bientôt</Text>
      </SportCover>
    </ComingSoonLock>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sportHeroText: {
    flex: 1,
    gap: 4,
  },
  sportHeroLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sportHeroDesc: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '600',
  },
  soonChip: {
    color: '#0F172A',
    backgroundColor: 'rgba(251, 191, 36, 0.95)',
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  footerCol: { gap: 8 },
  skillPreview: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  skillPreviewTitle: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skillPreviewSub: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  waitlistRowOn: {
    backgroundColor: 'rgba(236, 253, 245, 0.98)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxOn: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  waitlistLabel: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
