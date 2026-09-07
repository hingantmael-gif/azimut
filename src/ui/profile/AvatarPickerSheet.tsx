import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { radii, spacing } from '../../theme/tokens';
import {
  pickAvatarFromCamera,
  pickAvatarFromLibrary,
} from '../../utils/pickAvatar';
import { persistAvatarUri } from '../../utils/persistAvatar';
import { AvatarCropModal } from './AvatarCropModal';

type Props = {
  visible: boolean;
  hasAvatar: boolean;
  onClose: () => void;
  onPicked: (uri: string) => void;
  onCleared?: () => void;
};

/** Choix galerie / caméra puis cadrage circulaire */
export function AvatarPickerSheet({
  visible,
  hasAvatar,
  onClose,
  onPicked,
  onCleared,
}: Props) {
  const { colors } = useThemeColors();
  const styles = makeStyles(colors);
  const [cropUri, setCropUri] = useState<string | null>(null);

  const run = async (fn: () => Promise<string | null>) => {
    onClose();
    // Laisser le modal se fermer avant d’ouvrir le picker (surtout web)
    await new Promise((r) => setTimeout(r, 120));
    const uri = await fn();
    if (uri) setCropUri(uri);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Photo de profil</Text>
            <Text style={styles.sub}>Galerie ou appareil photo — puis cadrage circulaire</Text>

            <Pressable
              style={styles.btn}
              onPress={() => void run(pickAvatarFromLibrary)}
            >
              <Text style={styles.btnText}>Importer depuis la galerie</Text>
            </Pressable>

            <Pressable
              style={styles.btn}
              onPress={() => void run(pickAvatarFromCamera)}
            >
              <Text style={styles.btnText}>Prendre une photo</Text>
            </Pressable>

            {hasAvatar && onCleared ? (
              <Pressable
                style={[styles.btn, styles.btnDanger]}
                onPress={() => {
                  onCleared();
                  onClose();
                }}
              >
                <Text style={[styles.btnText, styles.btnDangerText]}>Retirer la photo</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {cropUri ? (
        <AvatarCropModal
          uri={cropUri}
          visible
          onCancel={() => setCropUri(null)}
          onConfirm={(cropped) => {
            setCropUri(null);
            void (async () => {
              try {
                const durable = await persistAvatarUri(cropped);
                onPicked(durable);
              } catch {
                onPicked(cropped);
              }
            })();
          }}
        />
      ) : null}
    </>
  );
}

function makeStyles(colors: {
  bg: string;
  bgCard: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  danger: string;
  white: string;
}) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      borderTopWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    title: { fontSize: 18, fontWeight: '800', color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
    btn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
    btnDanger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    btnDangerText: { color: colors.danger },
    cancel: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },
  });
}
