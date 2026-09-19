import { useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from '../Text';
import { BRAND } from '../../constants/brand';
import { radii, spacing } from '../../theme/tokens';
import { PressableScale } from '../motion/softMotion';
import { ComingSoonLock } from '../ComingSoon';
import {
  LiveGlyph,
  LiveRoundButton,
  StartPulseRing,
} from './LiveTrackerChrome';

/** Fond tracker Mova — ink profond (≠ noir Strava / ≠ feuille blanche). */
export const LIVE_INK = BRAND.ink;
export const LIVE_INK_SOFT = BRAND.inkSoft;
export const LIVE_PAUSE_BAND = BRAND.signal;
export const LIVE_JADE = BRAND.accent;
export const LIVE_MINT = BRAND.signalMint;

type Split = { km: number; paceLabel: string };

/** Capsule flottante pré-départ / compacte sur carte. */
export function LiveMetricsCapsule({
  time,
  pace,
  distance,
  gpsLabel,
  gpsOk,
  onExpand,
  style,
}: {
  time: string;
  pace: string;
  distance: string;
  gpsLabel?: string;
  gpsOk?: boolean;
  onExpand?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[capsule.wrap, style]}>
      {gpsLabel ? (
        <View style={capsule.gpsRow}>
          <View
            style={[
              capsule.gpsDot,
              { backgroundColor: gpsOk ? LIVE_MINT : '#F87171' },
            ]}
          />
          <Text
            style={[
              capsule.gpsText,
              { color: gpsOk ? 'rgba(255,255,255,0.72)' : '#FCA5A5' },
            ]}
            numberOfLines={1}
          >
            {gpsLabel}
          </Text>
          {onExpand ? (
            <PressableScale
              variant="subtle"
              onPress={onExpand}
              accessibilityLabel="Agrandir les métriques"
              contentStyle={capsule.expandHit}
            >
              <Text style={capsule.expandGlyph}>⤢</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
      <View style={capsule.row}>
        <CapsuleCell value={time} label="Chrono" />
        <CapsuleCell value={pace} label="Allure" accent />
        <CapsuleCell value={distance} label="Distance" />
      </View>
    </View>
  );
}

function CapsuleCell({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={capsule.cell}>
      <Text
        style={[capsule.value, accent && { color: LIVE_MINT }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={capsule.label}>{label}</Text>
    </View>
  );
}

/**
 * Tableau de bord focus — distance en héros (≠ timer Strava en haut).
 * running = fond ink · paused = bandeau signal lime.
 */
export function LiveFocusBoard({
  phase,
  clock,
  distanceKm,
  paceAvg,
  paceNow,
  splits,
  progressToNextKm,
  cue,
  autoPause,
  onCollapse,
}: {
  phase: 'running' | 'paused' | 'saving';
  clock: string;
  distanceKm: string;
  paceAvg: string;
  paceNow: string;
  splits: Split[];
  /** 0–1 progression vers le prochain km */
  progressToNextKm: number;
  cue?: string | null;
  autoPause?: boolean;
  onCollapse?: () => void;
}) {
  const paused = phase === 'paused' || phase === 'saving';

  return (
    <View style={focus.root}>
      {paused ? (
        <View style={focus.pauseBand}>
          {onCollapse ? (
            <PressableScale
              variant="subtle"
              onPress={onCollapse}
              accessibilityLabel="Réduire"
              contentStyle={focus.bandIcon}
            >
              <Text style={focus.bandIconText}>⤡</Text>
            </PressableScale>
          ) : (
            <View style={focus.bandIcon} />
          )}
          <Text style={focus.pauseTitle}>
            {autoPause ? 'Pause auto' : 'En pause'}
          </Text>
          <View style={focus.bandIcon} />
        </View>
      ) : onCollapse ? (
        <View style={focus.runningTop}>
          <PressableScale
            variant="subtle"
            onPress={onCollapse}
            accessibilityLabel="Voir la carte"
            contentStyle={focus.bandIconLight}
          >
            <Text style={focus.bandIconLightText}>⤡</Text>
          </PressableScale>
          <Text style={focus.runningKicker}>Cap en cours</Text>
          <View style={focus.bandIcon} />
        </View>
      ) : null}

      <Text style={focus.clock}>{clock}</Text>
      <Text style={focus.clockSub}>Chrono</Text>

      <Text style={focus.paceHero}>{paceAvg}</Text>
      <Text style={focus.paceSub}>Allure moyenne / km</Text>

      <Text style={focus.distHero}>{distanceKm}</Text>
      <Text style={focus.distSub}>Distance (km)</Text>

      <LiveKmRail
        splits={splits}
        progressToNextKm={progressToNextKm}
        paceNow={paceNow}
      />

      {cue ? <Text style={focus.cue}>{cue}</Text> : null}
    </View>
  );
}

/** Rail de segments km — ticks jade, pas la barre orange Strava. */
export function LiveKmRail({
  splits,
  progressToNextKm,
  paceNow,
}: {
  splits: Split[];
  progressToNextKm: number;
  paceNow: string;
}) {
  const slots = useMemo(() => {
    const done = splits.slice(-2);
    const nextKm = (done[done.length - 1]?.km ?? 0) + 1;
    return [
      ...done.map((s) => ({
        key: `d-${s.km}`,
        fill: 1,
        label: `${s.km}`,
        sub: s.paceLabel,
        active: false,
      })),
      {
        key: 'current',
        fill: Math.max(0.06, Math.min(1, progressToNextKm)),
        label: `${nextKm}`,
        sub: paceNow === '—' ? '…' : paceNow,
        active: true,
      },
      {
        key: 'next',
        fill: 0,
        label: `${nextKm + 1}`,
        sub: '',
        active: false,
      },
    ].slice(-3);
  }, [splits, progressToNextKm, paceNow]);

  return (
    <View style={rail.wrap}>
      <View style={rail.row}>
        {slots.map((s) => (
          <View key={s.key} style={rail.slot}>
            <View style={rail.track}>
              <View
                style={[
                  rail.fill,
                  {
                    width: `${Math.round(s.fill * 100)}%`,
                    backgroundColor: s.active ? LIVE_MINT : LIVE_JADE,
                    opacity: s.fill > 0 ? 1 : 0,
                  },
                ]}
              />
            </View>
            {s.active ? <View style={rail.tick} /> : null}
            <Text style={[rail.km, s.active && { color: LIVE_MINT }]}>
              {s.label}
            </Text>
            {s.sub ? <Text style={rail.sub}>{s.sub}</Text> : null}
          </View>
        ))}
      </View>
      <Text style={rail.caption}>Segments km</Text>
    </View>
  );
}

/**
 * Contrôles Mova : Start rond (pulse) · Pause pastille pleine · Pause → Reprendre + Terminer.
 */
export function LiveAzimutControls({
  phase,
  color,
  startLabel = 'Go',
  onStart,
  onPause,
  onResume,
  onFinish,
  saving,
  sideLeft,
  sideRight,
}: {
  phase: 'ready' | 'running' | 'paused' | 'saving';
  color?: string;
  startLabel?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  saving?: boolean;
  sideLeft?: ReactNode;
  sideRight?: ReactNode;
}) {
  const accent = color ?? LIVE_JADE;
  const mode = phase === 'saving' ? 'paused' : phase;

  if (mode === 'ready') {
    return (
      <View style={dock.row}>
        <View style={dock.side}>{sideLeft}</View>
        <LiveRoundButton
          variant="start"
          label={startLabel}
          color={accent}
          onPress={onStart}
          size={92}
        />
        <View style={dock.side}>{sideRight}</View>
      </View>
    );
  }

  if (mode === 'running') {
    return (
      <View style={dock.pillStack}>
        <PressableScale
          variant="pop"
          onPress={onPause}
          accessibilityLabel="Mettre en pause"
          contentStyle={[dock.pausePill, { backgroundColor: accent }]}
        >
          <LiveGlyph kind="pause" color="#fff" />
          <Text style={dock.pausePillText}>Mettre en pause</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={dock.pausedStack}>
      <PressableScale
        variant="pop"
        disabled={saving}
        onPress={onResume}
        accessibilityLabel="Reprendre"
        contentStyle={[
          dock.resumePill,
          { backgroundColor: accent, opacity: saving ? 0.55 : 1 },
        ]}
      >
        <LiveGlyph kind="play" color="#fff" />
        <Text style={dock.pausePillText}>Reprendre</Text>
      </PressableScale>
      <PressableScale
        variant="pop"
        disabled={saving}
        onPress={onFinish}
        accessibilityLabel="Terminer"
        contentStyle={[
          dock.finishFullPill,
          { opacity: saving ? 0.55 : 1 },
        ]}
      >
        <LiveGlyph kind="stop" color="#fff" />
        <Text style={dock.finishFullText}>
          {saving ? 'Enregistrement…' : 'Terminer'}
        </Text>
      </PressableScale>
    </View>
  );
}

/** Pastille sport pré-départ (course / vélo) — legacy chips. */
export function LiveSportChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      variant="subtle"
      onPress={onPress}
      contentStyle={[
        chip.base,
        active && {
          borderColor: color,
          backgroundColor: `${color}22`,
        },
      ]}
    >
      <View style={[chip.dot, { backgroundColor: color }]} />
      <Text style={[chip.label, active && { color: '#fff' }]}>{label}</Text>
      {active ? <Text style={[chip.check, { color }]}>✓</Text> : null}
    </PressableScale>
  );
}

export type FreeRecordSport = 'run' | 'bike' | 'swim';

const FREE_SPORT_OPTIONS: Array<{
  id: FreeRecordSport;
  ring: string;
  caption: string;
  color: string;
}> = [
  { id: 'run', ring: 'Course', caption: 'Course libre', color: '#0E8F6F' },
  { id: 'bike', ring: 'Vélo', caption: 'Vélo libre', color: '#3B82F6' },
  { id: 'swim', ring: 'Nage', caption: 'Natation libre', color: '#06B6D4' },
];

export function freeSportMeta(sport: FreeRecordSport) {
  return FREE_SPORT_OPTIONS.find((o) => o.id === sport) ?? FREE_SPORT_OPTIONS[0]!;
}

/**
 * Bouton gauche du dock : affiche le sport courant.
 * Un tap ouvre le sélecteur (c’est ICI qu’on change de discipline).
 */
export function LiveSportPickButton({
  sport,
  onChange,
}: {
  sport: FreeRecordSport;
  onChange: (next: FreeRecordSport) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = freeSportMeta(sport);

  return (
    <>
      <PressableScale
        variant="pop"
        onPress={() => setOpen(true)}
        accessibilityLabel={`Sport : ${meta.caption}. Changer`}
        contentStyle={sportPick.trigger}
      >
        <View
          style={[
            sportPick.ring,
            {
              borderColor: meta.color,
              backgroundColor: `${meta.color}33`,
            },
          ]}
        >
          <Text style={sportPick.ringText}>{meta.ring}</Text>
        </View>
        <Text style={sportPick.caption} numberOfLines={2}>
          {meta.caption}
        </Text>
        <Text style={sportPick.hint}>Changer ▾</Text>
      </PressableScale>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={sportPick.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={sportPick.sheet}>
            <Text style={sportPick.sheetTitle}>Choisir le sport</Text>
            <Text style={sportPick.sheetSub}>Course · Vélo · Natation</Text>
            {FREE_SPORT_OPTIONS.map((opt) => {
              const selected = opt.id === sport;
              return (
                <PressableScale
                  key={opt.id}
                  variant="subtle"
                  onPress={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  contentStyle={[
                    sportPick.row,
                    selected && {
                      borderColor: opt.color,
                      backgroundColor: `${opt.color}22`,
                    },
                  ]}
                >
                  <View
                    style={[
                      sportPick.rowDot,
                      { backgroundColor: opt.color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={sportPick.rowTitle}>{opt.ring}</Text>
                    <Text style={sportPick.rowCaption}>{opt.caption}</Text>
                  </View>
                  {selected ? (
                    <Text style={[sportPick.rowCheck, { color: opt.color }]}>
                      ✓
                    </Text>
                  ) : null}
                </PressableScale>
              );
            })}
            <PressableScale
              variant="subtle"
              onPress={() => setOpen(false)}
              contentStyle={sportPick.cancel}
            >
              <Text style={sportPick.cancelText}>Annuler</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** Slot itinéraire WIP — réduit, visible, casque, non cliquable. */
export function LiveRouteSlot() {
  return (
    <ComingSoonLock
      label="Itinéraire"
      caption="Bientôt"
      style={routeSlot.lock}
      overlayStyle={routeSlot.overlay}
    >
      <View style={routeSlot.inner}>
        <Text style={routeSlot.glyph}>∿</Text>
        <Text style={routeSlot.caption}>Bientôt</Text>
      </View>
    </ComingSoonLock>
  );
}

/** Dock bas pré-départ — pas de poignée « resize » trompeuse. */
export function LivePreStartDock({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[preDock.sheet, style]}>{children}</View>;
}

/** Feuille de confirmation Mova (remplace window.confirm / Alert système). */
export function LiveConfirmSheet({
  visible,
  title,
  body,
  confirmLabel = 'OK',
  cancelLabel = 'Annuler',
  destructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={confirm.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={confirm.card}>
          <Text style={confirm.title}>{title}</Text>
          <Text style={confirm.body}>{body}</Text>
          <PressableScale
            variant="pop"
            onPress={onConfirm}
            contentStyle={[
              confirm.primary,
              destructive && { backgroundColor: '#BE123C' },
            ]}
          >
            <Text style={confirm.primaryText}>{confirmLabel}</Text>
          </PressableScale>
          <PressableScale
            variant="subtle"
            onPress={onCancel}
            contentStyle={confirm.secondary}
          >
            <Text style={confirm.secondaryText}>{cancelLabel}</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

export { StartPulseRing };

const capsule = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(7,17,31,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(61,255,154,0.18)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }),
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { flex: 1, fontSize: 12, fontWeight: '700' },
  expandHit: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandGlyph: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, alignItems: 'center' },
  value: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
});

const focus = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 4,
  },
  pauseBand: {
    alignSelf: 'stretch',
    marginHorizontal: -spacing.lg,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: LIVE_PAUSE_BAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pauseTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: BRAND.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bandIcon: { width: 40, height: 36 },
  bandIconText: { fontSize: 18, fontWeight: '800', color: BRAND.ink, textAlign: 'center' },
  runningTop: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  runningKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: LIVE_MINT,
  },
  bandIconLight: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandIconLightText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  clock: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 46,
  },
  clockSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 18,
  },
  paceHero: {
    fontSize: 28,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    fontVariant: ['tabular-nums'],
  },
  paceSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
  },
  distHero: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
    lineHeight: 76,
  },
  distSub: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 22,
  },
  cue: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: LIVE_MINT,
  },
});

const rail = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  slot: { flex: 1, alignItems: 'center' },
  track: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },
  tick: {
    marginTop: 4,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: LIVE_JADE,
  },
  km: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
  },
  sub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
  },
});

const dock = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    minHeight: 118,
    marginTop: 4,
  },
  side: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 88,
  },
  pillStack: { marginTop: 4, paddingBottom: 4 },
  pausePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: radii.pill,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: `0 10px 28px ${LIVE_JADE}66` } as object)
      : {
          shadowColor: LIVE_JADE,
          shadowOpacity: 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }),
  },
  pausePillText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  pausedStack: {
    gap: 12,
    marginTop: 4,
    width: '100%',
  },
  resumePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: radii.pill,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: `0 10px 28px ${LIVE_JADE}55` } as object)
      : {
          shadowColor: LIVE_JADE,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }),
  },
  finishFullPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  finishFullText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  pausedRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  halfPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: radii.pill,
  },
  finishPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  halfPillTextLight: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  halfPillTextDark: {
    color: BRAND.ink,
    fontSize: 16,
    fontWeight: '900',
  },
});

const chip = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  check: { fontSize: 13, fontWeight: '900' },
});

const routeSlot = StyleSheet.create({
  lock: { width: 56, alignItems: 'center' },
  overlay: { borderRadius: 12 },
  inner: { alignItems: 'center', gap: 2, opacity: 0.75 },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 36,
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  caption: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

const sportPick = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    gap: 4,
    width: 88,
  },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  caption: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  hint: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: BRAND.signalMint,
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BRAND.ink,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(61,255,154,0.2)',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  rowCaption: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
  },
  rowCheck: { fontSize: 18, fontWeight: '900' },
  cancel: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
});

const preDock = StyleSheet.create({
  sheet: {
    backgroundColor: 'rgba(7,17,31,0.97)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(61,255,154,0.12)',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 -16px 40px rgba(0,0,0,0.4)',
        } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -8 },
          elevation: 18,
        }),
  },
});

const confirm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: BRAND.inkSoft,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(61,255,154,0.22)',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 8,
  },
  primary: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: LIVE_JADE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondary: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '700',
  },
});
