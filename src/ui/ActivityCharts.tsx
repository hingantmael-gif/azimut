import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { Text } from './Text';
import { useThemeColors } from '../theme/ThemeContext';
import { radii, spacing } from '../theme/tokens';
import { formatPace } from '../engines/core';
import {
  computeSplits,
  elevationProfile,
  hrZoneShares,
  type KmSplit,
} from '../engines/activityAnalysis';
import type { StravaActivity } from '../types/domain';

const ZONE_COLORS = ['#93C5FD', '#4ADE80', '#FACC15', '#FB923C', '#EF4444'];
const ZONE_NAMES = ['Z1 récup', 'Z2 endurance', 'Z3 tempo', 'Z4 seuil', 'Z5 max'];

/**
 * Récapitulatif de fin de séance (façon Garmin Connect) : allure au km, profil d'altitude,
 * zones de FC et tableau des kilomètres. Un bloc n'apparaît que si sa donnée existe.
 */
export function ActivityCharts({ activity, sport }: { activity: StravaActivity; sport?: string }) {
  const { colors } = useThemeColors();
  const [w, setW] = useState(320);
  const splits = useMemo(() => computeSplits(activity), [activity]);
  const elev = useMemo(() => elevationProfile(activity), [activity]);
  const zones = useMemo(() => hrZoneShares(activity), [activity]);
  const isBike = sport === 'bike';
  const speedOrPace = (secPerKm: number) => (isBike ? `${(3600 / secPerKm).toFixed(1)} km/h` : `${formatPace(Math.round(secPerKm))}/km`);

  if (splits.length < 2 && elev.length === 0 && zones.length === 0) return null;

  const chartW = Math.max(200, w - 2 * spacing.md);
  const H = 120;
  const paces = splits.map((s) => s.paceSecPerKm);
  const fastest = Math.min(...paces);
  const slowest = Math.max(...paces);
  const span = Math.max(20, slowest - fastest);
  // Barre plus longue = plus rapide (comme Garmin).
  const barLen = (s: KmSplit) => 0.35 + 0.65 * ((slowest - s.paceSecPerKm) / span);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ gap: spacing.md, marginTop: spacing.md }}>
      {splits.length >= 2 ? (
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.h, { color: colors.text }]}>Allure par km</Text>
          <View style={{ marginTop: 8, gap: 5 }}>
            {splits.map((s) => (
              <View key={s.km} style={styles.splitRow}>
                <Text style={[styles.km, { color: colors.textMuted }]}>{s.fraction < 0.99 ? `${(s.km - 1 + s.fraction).toFixed(1)}` : s.km}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={{
                      width: `${Math.round(barLen(s) * 100)}%`,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: s.paceSecPerKm === fastest ? colors.success : colors.accent,
                    }}
                  />
                </View>
                <Text style={[styles.val, { color: colors.text }]}>{speedOrPace(s.paceSecPerKm)}</Text>
                {splits.some((x) => x.avgHr != null) ? (
                  <Text style={[styles.hr, { color: colors.textMuted }]}>{s.avgHr != null ? s.avgHr : ''}</Text>
                ) : null}
              </View>
            ))}
          </View>
          <Text style={[styles.foot, { color: colors.textMuted }]}>
            {splits.some((x) => x.avgHr != null) ? 'km · allure · FC moy.' : 'km · allure'}
          </Text>
        </View>
      ) : null}

      {elev.length > 1 ? (
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.h, { color: colors.text }]}>Profil d’altitude</Text>
          <ElevationSvg width={chartW} height={H} points={elev} color={colors.sleep} muted={colors.textMuted} />
        </View>
      ) : null}

      {zones.length ? (
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.h, { color: colors.text }]}>Zones de fréquence cardiaque</Text>
          <View style={{ marginTop: 8, gap: 6 }}>
            {zones.map((z, i) => (
              <View key={z.zone} style={styles.splitRow}>
                <Text style={[styles.zoneName, { color: colors.textMuted }]}>{ZONE_NAMES[i]}</Text>
                <View style={styles.barTrack}>
                  <View style={{ width: `${Math.max(2, z.pct)}%`, height: 14, borderRadius: 7, backgroundColor: ZONE_COLORS[i] }} />
                </View>
                <Text style={[styles.val, { color: colors.text, width: 40 }]}>{z.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ElevationSvg({
  width,
  height,
  points,
  color,
  muted,
}: {
  width: number;
  height: number;
  points: { distKm: number; altM: number }[];
  color: string;
  muted: string;
}) {
  const padL = 34;
  const padB = 16;
  const minA = Math.min(...points.map((p) => p.altM));
  const maxA = Math.max(...points.map((p) => p.altM));
  const rangeA = Math.max(10, maxA - minA);
  const totalKm = points[points.length - 1]!.distKm || 1;
  const x = (km: number) => padL + (km / totalKm) * (width - padL - 4);
  const y = (a: number) => 6 + (1 - (a - minA) / rangeA) * (height - padB - 10);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.distKm).toFixed(1)} ${y(p.altM).toFixed(1)}`).join(' ');
  const area = `${line} L${x(totalKm).toFixed(1)} ${height - padB} L${x(0).toFixed(1)} ${height - padB} Z`;
  return (
    <Svg width={width} height={height} style={{ marginTop: 6 }}>
      <Path d={area} fill={color} fillOpacity={0.22} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" />
      <Line x1={padL} y1={height - padB} x2={width - 4} y2={height - padB} stroke={muted} strokeOpacity={0.4} strokeWidth={1} />
      <SvgText x={2} y={12} fontSize={10} fill={muted}>{`${Math.round(maxA)} m`}</SvgText>
      <SvgText x={2} y={height - padB} fontSize={10} fill={muted}>{`${Math.round(minA)} m`}</SvgText>
      <SvgText x={width - 4} y={height - 3} fontSize={10} fill={muted} textAnchor="end">{`${totalKm.toFixed(1)} km`}</SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  h: { fontWeight: '800', fontSize: 15 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  km: { width: 26, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  zoneName: { width: 92, fontSize: 12, fontWeight: '600' },
  barTrack: { flex: 1, height: 14 },
  val: { width: 82, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  hr: { width: 30, fontSize: 12, textAlign: 'right' },
  foot: { marginTop: 8, fontSize: 11 },
});
