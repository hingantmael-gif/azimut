import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import { PhoneModal } from '../PhoneModal';
import { AppFlatList } from '../scrolling';
import { useHorizontalDragScroll } from '../scrolling/useHorizontalDragScroll';

export type MeasureKind = 'weight' | 'height';

type Props = {
  visible: boolean;
  kind: MeasureKind;
  /** Canonique : kg ou cm */
  value?: number;
  units: 'metric' | 'imperial';
  onClose: () => void;
  onSave: (canonical: number) => void;
};

const ITEM_W = 56;
const WEIGHT = { minKg: 35, maxKg: 200, stepKg: 0.5, minLb: 80, maxLb: 440, stepLb: 1 };
const HEIGHT = { minCm: 130, maxCm: 220, stepCm: 1 };

function roundTo(step: number, n: number): number {
  return Math.round(n / step) * step;
}

function buildScale(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    out.push(Number(roundTo(step, v).toFixed(step < 1 ? 1 : 0)));
  }
  return out;
}

function kgToLb(kg: number): number {
  return roundTo(1, kg * 2.20462);
}
function lbToKg(lb: number): number {
  return roundTo(0.5, lb / 2.20462);
}
function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54;
  let ft = Math.floor(totalIn / 12);
  let inch = Math.round(totalIn - ft * 12);
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return { ft, inch };
}

/**
 * Poids / taille : grand chiffre + −/+ + règle glissable (souris / doigt).
 */
export function MeasurePickerSheet({
  visible,
  kind,
  value,
  units,
  onClose,
  onSave,
}: Props) {
  const { colors } = useThemeColors();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const isWeight = kind === 'weight';
  const imperial = units === 'imperial';
  const layoutW = Math.min(width, 420);
  const sidePad = layoutW / 2 - ITEM_W / 2;

  const scale = useMemo(() => {
    if (isWeight) {
      return imperial
        ? buildScale(WEIGHT.minLb, WEIGHT.maxLb, WEIGHT.stepLb)
        : buildScale(WEIGHT.minKg, WEIGHT.maxKg, WEIGHT.stepKg);
    }
    return buildScale(HEIGHT.minCm, HEIGHT.maxCm, HEIGHT.stepCm);
  }, [isWeight, imperial]);

  const initialDisplay = useMemo(() => {
    if (isWeight) {
      const kg = value && value > 0 ? value : 70;
      return imperial ? kgToLb(kg) : roundTo(WEIGHT.stepKg, kg);
    }
    const cm = value && value > 0 ? value : 170;
    return roundTo(HEIGHT.stepCm, cm);
  }, [isWeight, imperial, value]);

  const [display, setDisplay] = useState(initialDisplay);
  const maxOffset = Math.max(0, (scale.length - 1) * ITEM_W);
  const offsetRef = useRef(0);

  const scrollToOffsetX = (x: number, animated = false) => {
    try {
      listRef.current?.scrollToOffset({ offset: x, animated });
    } catch {
      /* ignore */
    }
  };

  const drag = useHorizontalDragScroll({
    getOffset: () => offsetRef.current,
    getMaxOffset: () => maxOffset,
    scrollTo: (x, animated) => {
      offsetRef.current = x;
      scrollToOffsetX(x, animated);
      const idx = Math.round(x / ITEM_W);
      const clamped = Math.max(0, Math.min(scale.length - 1, idx));
      setDisplay(scale[clamped]!);
    },
  });

  useEffect(() => {
    if (!visible) return;
    setDisplay(initialDisplay);
    const idx = Math.max(
      0,
      scale.findIndex((v) => Math.abs(v - initialDisplay) < 0.05),
    );
    const offset = idx * ITEM_W;
    offsetRef.current = offset;
    const t = setTimeout(() => {
      scrollToOffsetX(offset, false);
    }, 50);
    return () => clearTimeout(t);
  }, [visible, initialDisplay, scale]);

  const title = isWeight ? 'Poids' : 'Taille';
  const unitLabel = isWeight ? (imperial ? 'lb' : 'kg') : imperial ? 'ft / in' : 'cm';

  const formatBig = () => {
    if (isWeight) {
      return display.toLocaleString('fr-FR', {
        maximumFractionDigits: imperial ? 0 : 1,
        minimumFractionDigits: !imperial && display % 1 !== 0 ? 1 : 0,
      });
    }
    if (imperial) {
      const { ft, inch } = cmToFtIn(display);
      return `${ft}′ ${inch}″`;
    }
    return String(Math.round(display));
  };

  const step = isWeight ? (imperial ? WEIGHT.stepLb : WEIGHT.stepKg) : HEIGHT.stepCm;

  const scrollToValue = (next: number, animated: boolean) => {
    const idx = scale.findIndex((v) => Math.abs(v - next) < 0.05);
    if (idx >= 0) {
      const offset = idx * ITEM_W;
      offsetRef.current = offset;
      scrollToOffsetX(offset, animated);
    }
  };

  const nudge = (dir: -1 | 1) => {
    const min = scale[0]!;
    const max = scale[scale.length - 1]!;
    const next = Math.min(max, Math.max(min, roundTo(step, display + dir * step)));
    setDisplay(next);
    scrollToValue(next, true);
  };

  const syncFromOffset = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.x;
    drag.onScroll(e);
    const idx = Math.round(e.nativeEvent.contentOffset.x / ITEM_W);
    const clamped = Math.max(0, Math.min(scale.length - 1, idx));
    setDisplay(scale[clamped]!);
  };

  const handleSave = () => {
    if (isWeight) {
      onSave(imperial ? lbToKg(display) : display);
    } else {
      onSave(display);
    }
    onClose();
  };

  const majorEvery = 5;

  return (
    <PhoneModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Glisse la règle (souris ou doigt) ou utilise − / +
          </Text>

          <Text style={[styles.big, { color: colors.text }]}>{formatBig()}</Text>
          <Text style={[styles.unit, { color: colors.accent }]}>{unitLabel}</Text>

          <View style={styles.stepRow}>
            <Pressable
              onPress={() => nudge(-1)}
              style={[styles.stepBtn, { backgroundColor: colors.bgSecondary }, webNoOutline]}
              accessibilityLabel="Diminuer"
            >
              <Text style={[styles.stepGlyph, { color: colors.text }]}>−</Text>
            </Pressable>
            <Pressable
              onPress={() => nudge(1)}
              style={[styles.stepBtn, { backgroundColor: colors.bgSecondary }, webNoOutline]}
              accessibilityLabel="Augmenter"
            >
              <Text style={[styles.stepGlyph, { color: colors.text }]}>+</Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.rulerWrap,
              Platform.OS === 'web' ? ({ cursor: 'grab' } as object) : null,
            ]}
            {...drag.panHandlers}
            // @ts-expect-error onWheel web-only
            onWheel={drag.onWheel}
          >
            <View
              style={[styles.rulerNeedle, { backgroundColor: colors.accent }]}
              pointerEvents="none"
            />
            <AppFlatList
              ref={listRef}
              horizontal
              data={scale}
              keyExtractor={(v) => String(v)}
              showsHorizontalScrollIndicator={false}
              snapToInterval={ITEM_W}
              decelerationRate="fast"
              disableIntervalMomentum
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: ITEM_W,
                offset: ITEM_W * index,
                index,
              })}
              contentContainerStyle={{ paddingHorizontal: sidePad }}
              onScroll={syncFromOffset}
              onMomentumScrollEnd={syncFromOffset}
              onScrollEndDrag={syncFromOffset}
              renderItem={({ item }) => {
                const active = Math.abs(item - display) < 0.05;
                const major = Math.abs(item % majorEvery) < 0.05;
                return (
                  <View style={styles.tickCol} pointerEvents="none">
                    <View
                      style={[
                        styles.tick,
                        {
                          height: major ? 28 : 14,
                          backgroundColor: active ? colors.accent : colors.borderStrong,
                        },
                      ]}
                    />
                    {major ? (
                      <Text
                        style={[
                          styles.tickLabel,
                          { color: active ? colors.accent : colors.textMuted },
                        ]}
                      >
                        {isWeight && !imperial
                          ? item.toFixed(item % 1 ? 1 : 0)
                          : Math.round(item)}
                      </Text>
                    ) : null}
                  </View>
                );
              }}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.accent }, webNoOutline]}
            onPress={handleSave}
          >
            <Text style={styles.saveText}>Enregistrer</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </PhoneModal>
  );
}

const webNoOutline =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null;

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCC',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  hint: {
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  big: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontSize: 28, fontWeight: '600', lineHeight: 32 },
  rulerWrap: {
    height: 72,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  rulerNeedle: {
    position: 'absolute',
    alignSelf: 'center',
    width: 2,
    height: 40,
    borderRadius: 1,
    zIndex: 2,
    top: 4,
  },
  tickCol: {
    width: ITEM_W,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  tick: {
    width: 2,
    borderRadius: 1,
  },
  tickLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  cancelBtn: { marginTop: spacing.md, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
