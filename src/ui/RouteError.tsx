import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

/**
 * Nettoie le cache hors-ligne puis recharge : règle le cas d'une page « vide » due à un
 * fichier d'une ancienne version encore en cache.
 */
export async function hardReload(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
    const keys = await caches?.keys();
    await Promise.all((keys ?? []).map((k) => caches.delete(k)));
  } catch {
    /* on recharge quand même */
  }
  window.location.reload();
}

/** Erreur de chargement d'une page : message clair + « Réessayer » (jamais un écran blanc). */
export function RouteError({ retry }: { error?: Error; retry?: () => Promise<unknown> | void }) {
  const dark = useColorScheme() === 'dark';
  const ink = dark ? '#FFFFFF' : '#0B1220';
  return (
    <View style={[styles.root, { backgroundColor: dark ? '#06121E' : '#EFFBF6' }]}>
      <Text style={[styles.title, { color: ink }]}>Cette page n’a pas pu se charger</Text>
      <Text style={[styles.body, { color: dark ? 'rgba(255,255,255,0.75)' : '#334155' }]}>
        Vérifie ta connexion puis réessaie. Si le problème persiste, recharge l’application.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry?.()}
        style={[styles.btn, { backgroundColor: '#12B87A' }]}
      >
        <Text style={styles.btnText}>Réessayer</Text>
      </Pressable>
      {Platform.OS === 'web' ? (
        <Pressable accessibilityRole="button" onPress={() => void hardReload()} style={styles.link}>
          <Text style={[styles.linkText, { color: ink }]}>Recharger l’application</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  btn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 },
  btnText: { color: '#04140D', fontWeight: '800', fontSize: 16 },
  link: { padding: 10 },
  linkText: { fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
});
