import { Linking, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '../../theme/ThemeContext';
import { normalizeUsername } from '../../utils/username';

type Segment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string; username: string }
  | { type: 'link'; value: string; href: string };

/** @identifiant (lettres/chiffres, longueur libre) */
const MENTION_RE = /@([a-z0-9]+)\b/gi;
/** http(s)://… ou www.… */
const URL_RE =
  /\b((?:https?:\/\/|www\.)[^\s<>"'`]+[^\s<>"'`.,;:!?\])}])/gi;

function toHref(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^www\./i.test(t)) return `https://${t}`;
  return t;
}

function isSafeHttpUrl(href: string): boolean {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Découpe la bio en texte, @mentions et liens. */
export function parseBioSegments(bio: string): Segment[] {
  if (!bio) return [];

  type Hit = { start: number; end: number; seg: Segment };
  const hits: Hit[] = [];

  for (const m of bio.matchAll(MENTION_RE)) {
    const username = normalizeUsername(m[1] ?? '');
    if (!username || m.index == null) continue;
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      seg: { type: 'mention', value: m[0], username },
    });
  }

  for (const m of bio.matchAll(URL_RE)) {
    if (m.index == null) continue;
    const raw = m[1] ?? m[0];
    const href = toHref(raw);
    if (!isSafeHttpUrl(href)) continue;
    hits.push({
      start: m.index,
      end: m.index + raw.length,
      seg: { type: 'link', value: raw, href },
    });
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged: Hit[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start < cursor) continue; // chevauchement
    merged.push(h);
    cursor = h.end;
  }

  const out: Segment[] = [];
  let i = 0;
  for (const h of merged) {
    if (h.start > i) {
      out.push({ type: 'text', value: bio.slice(i, h.start) });
    }
    out.push(h.seg);
    i = h.end;
  }
  if (i < bio.length) {
    out.push({ type: 'text', value: bio.slice(i) });
  }
  return out;
}

type Props = {
  bio: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
};

/** Bio avec @mentions (profil) et liens externes cliquables. */
export function BioRichText({ bio, style, linkStyle }: Props) {
  const { colors } = useThemeColors();
  const router = useRouter();
  const segments = parseBioSegments(bio);
  if (!segments.length) return null;

  const accent = StyleSheet.flatten([
    styles.link,
    { color: colors.accent },
    linkStyle,
  ]);

  return (
    <Text style={style}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return <Text key={`t${idx}`}>{seg.value}</Text>;
        }
        if (seg.type === 'mention') {
          return (
            <Text
              key={`m${idx}`}
              style={accent}
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: seg.username },
                })
              }
              accessibilityRole="link"
              accessibilityLabel={`Profil ${seg.value}`}
            >
              {seg.value}
            </Text>
          );
        }
        return (
          <Text
            key={`l${idx}`}
            style={accent}
            onPress={() => {
              void Linking.openURL(seg.href);
            }}
            accessibilityRole="link"
            accessibilityLabel={`Lien ${seg.value}`}
          >
            {seg.value}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  link: { fontWeight: '700', textDecorationLine: 'underline' },
});
