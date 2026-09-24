import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text } from '../../src/ui/Text';
import { AppScrollView } from '../../src/ui/scrolling';
import { PressableScale } from '../../src/ui/motion/softMotion';
import { SettingsScreen } from '../../src/ui/settings/SettingsList';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { radii, spacing } from '../../src/theme/tokens';
import { isOwnerPremiumEmail } from '../../src/engines/ownerAccess';
import { appConfirm } from '../../src/utils/appAlert';
import {
  CONTACT_CATEGORIES,
  apiAdminDeleteMessage,
  apiAdminMarkRead,
  apiAdminMessages,
  type ContactMessage,
} from '../../src/services/contactApi';

const CATEGORY_LABEL = Object.fromEntries(CONTACT_CATEGORIES.map((c) => [c.id, c.label])) as Record<string, string>;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Boîte de réception des messages reçus via « Écrire à Mova » — réservée au compte propriétaire. */
export default function MessagesInboxScreen() {
  const { state } = useApp();
  const { colors } = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const token = state.authToken;
  const isOwner = isOwnerPremiumEmail(state.profile.email);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const r = await apiAdminMessages(token);
    setMessages(r.messages);
    setFailed(!r.ok);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (isOwner) void load();
    else router.replace('/settings');
  }, [isOwner, load, router]);

  const open = async (m: ContactMessage) => {
    setOpenId((cur) => (cur === m.id ? null : m.id));
    if (!m.read && token) {
      setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
      void apiAdminMarkRead(token, m.id, true);
    }
  };

  const remove = async (m: ContactMessage) => {
    if (!token) return;
    const ok = await appConfirm('Supprimer ce message ?', `${m.firstName} ${m.lastName} — cette action est définitive.`, 'Supprimer');
    if (!ok) return;
    setMessages((all) => all.filter((x) => x.id !== m.id));
    void apiAdminDeleteMessage(token, m.id);
  };

  if (!isOwner) return null;
  const unread = messages.filter((m) => !m.read).length;

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.sub}>
          {loading ? 'Chargement…' : failed ? 'Impossible de charger les messages.' : `${messages.length} message${messages.length > 1 ? 's' : ''} · ${unread} non lu${unread > 1 ? 's' : ''}`}
        </Text>
        {failed ? (
          <PressableScale variant="subtle" onPress={() => void load()} contentStyle={styles.retry}>
            <Text style={styles.retryText}>Réessayer</Text>
          </PressableScale>
        ) : null}
        {!loading && !failed && messages.length === 0 ? <Text style={styles.empty}>Aucun message pour le moment.</Text> : null}

        {messages.map((m) => {
          const expanded = openId === m.id;
          return (
            <View key={m.id} style={[styles.card, !m.read && styles.cardUnread]}>
              <PressableScale variant="subtle" onPress={() => void open(m)} accessibilityLabel={`Message de ${m.firstName} ${m.lastName}`}>
                <View style={styles.head}>
                  {!m.read ? <View style={styles.dot} /> : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {m.firstName} {m.lastName}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {CATEGORY_LABEL[m.category] ?? 'Question'} · {formatWhen(m.createdAt)} · {m.fromAccount ? 'compte Mova' : 'visiteur'}
                    </Text>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </View>
                {!expanded ? (
                  <Text style={styles.preview} numberOfLines={2}>
                    {m.message}
                  </Text>
                ) : null}
              </PressableScale>
              {expanded ? (
                <View style={{ gap: spacing.sm }}>
                  <Text selectable style={styles.body}>
                    {m.message}
                  </Text>
                  <Text selectable style={styles.meta}>
                    {m.email}
                  </Text>
                  <View style={styles.actions}>
                    <PressableScale
                      variant="subtle"
                      onPress={() =>
                        void Linking.openURL(`mailto:${m.email}?subject=${encodeURIComponent('Re : ta demande à Mova')}`)
                      }
                      contentStyle={styles.actionPrimary}
                    >
                      <Text style={styles.actionPrimaryText}>Répondre</Text>
                    </PressableScale>
                    <PressableScale variant="subtle" onPress={() => void remove(m)} contentStyle={styles.actionGhost}>
                      <Text style={styles.actionGhostText}>Supprimer</Text>
                    </PressableScale>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </AppScrollView>
    </SettingsScreen>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>['colors']) {
  return StyleSheet.create({
    scroll: { padding: spacing.md, paddingBottom: 64, gap: spacing.sm },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    sub: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
    retry: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.bgCard, width: 'auto' },
    retryText: { color: colors.accent, fontWeight: '700' },
    card: { padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, gap: spacing.sm },
    cardUnread: { borderColor: colors.accent },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    name: { fontSize: 16, fontWeight: '800', color: colors.text },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    preview: { fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
    body: { fontSize: 15, color: colors.text, lineHeight: 22 },
    actions: { flexDirection: 'row', gap: spacing.sm },
    actionPrimary: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.accent, width: 'auto' },
    actionPrimaryText: { color: colors.onAccent, fontWeight: '800' },
    actionGhost: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, width: 'auto' },
    actionGhostText: { color: colors.danger, fontWeight: '700' },
  });
}
