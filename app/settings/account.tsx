import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
} from '../../src/ui/settings/SettingsList';
import { EditFieldSheet } from '../../src/ui/settings/EditFieldSheet';
import { useApp } from '../../src/store/AppContext';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { AppScrollView } from '../../src/ui/scrolling';
import { clearSession } from '../../src/storage/sessionPersistence';
import { removeRegistryUser, resetRegistryToSeedOnly } from '../../src/storage/userRegistry';
import { verifyAccountPassword } from '../../src/utils/accountSecurity';
import { downloadUserData } from '../../src/utils/exportUserData';
import { TRIAL_ACCOUNT_EMAIL, TRIAL_PASSWORD } from '../../src/utils/demoAuth';
import { apiDeleteTrialAccount } from '../../src/services/api';
import { clearNotificationPromptHandled } from '../../src/storage/notificationPrompt';
import { clearOnboardingCompleted } from '../../src/storage/onboardingPersistence';
import { PhoneModal } from '../../src/ui/PhoneModal';
import { radii, spacing } from '../../src/theme/tokens';

type DeleteStep = 'confirm1' | 'password' | 'confirmFinal' | null;

function ConfirmModal({
  visible,
  title,
  body,
  cancelLabel,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useThemeColors();

  return (
    <PhoneModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: colors.bg }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.modalBody, { color: colors.textMuted }]}>{body}</Text>
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtnSecondary, { backgroundColor: colors.bgSecondary }]}
              onPress={onCancel}
            >
              <Text style={[styles.modalBtnSecondaryText, { color: colors.text }]}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalBtnDanger,
                destructive
                  ? { backgroundColor: colors.danger }
                  : { backgroundColor: colors.accent },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.modalBtnDangerText, { color: colors.white }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </PhoneModal>
  );
}

export default function AccountScreen() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [editEmail, setEditEmail] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');

  const onDownloadData = async () => {
    setExportError('');
    setExportBusy(true);
    try {
      await downloadUserData(state);
    } catch {
      setExportError('Impossible d’exporter vos données pour le moment.');
    } finally {
      setExportBusy(false);
    }
  };

  const startDeleteFlow = () => {
    setDeleteStep('confirm1');
  };

  const onDeletePasswordSubmit = async (pwd: string) => {
    const ok = await verifyAccountPassword(
      state.profile.email,
      state.profile.username,
      pwd,
    );
    if (!ok) {
      throw new Error('Mot de passe incorrect. Vérifiez votre saisie et réessayez.');
    }
    setDeleteStep('confirmFinal');
  };

  const finalizeDelete = async () => {
    const userId = state.profile.id;
    const isTrial =
      state.profile.email === TRIAL_ACCOUNT_EMAIL || state.profile.username === '1';
    try {
      await clearNotificationPromptHandled(userId);
      if (isTrial) {
        await resetRegistryToSeedOnly();
        await clearOnboardingCompleted(TRIAL_ACCOUNT_EMAIL, '1', state.profile.username);
        try {
          await apiDeleteTrialAccount('1', TRIAL_PASSWORD);
        } catch {
          /* API optionnelle */
        }
      } else if (userId) {
        await removeRegistryUser(userId);
        await clearOnboardingCompleted(
          state.profile.email,
          state.profile.username,
          userId,
        );
      }
      await clearSession();
      dispatch({ type: 'DELETE_ACCOUNT' });
      setDeleteStep(null);
      router.replace('/(auth)/welcome');
    } catch {
      setDeleteStep(null);
      setExportError('La suppression a échoué. Réessayez.');
    }
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title="Connexion">
          <SettingsRow
            label="E-mail"
            value={state.profile.email || '—'}
            onPress={() => setEditEmail(true)}
          />
          <SettingsRow label="Mot de passe" value="Modifier" onPress={() => setEditPassword(true)} />
          <SettingsRow
            label="Authentification à deux facteurs"
            value={state.profile.twoFactorEnabled ? 'Activée' : 'Désactivée'}
            onPress={() =>
              dispatch({
                type: 'UPDATE_PROFILE',
                patch: { twoFactorEnabled: !state.profile.twoFactorEnabled },
              })
            }
          />
        </SettingsSection>

        <SettingsSection title="Données (RGPD)">
          <SettingsRow
            label="Télécharger mes données"
            value={exportBusy ? 'Préparation…' : undefined}
            onPress={() => void onDownloadData()}
          />
          <SettingsRow
            label="Supprimer mon compte"
            destructive
            showChevron={false}
            onPress={startDeleteFlow}
          />
          {exportError ? <Text style={styles.inlineError}>{exportError}</Text> : null}
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            label="Se déconnecter"
            destructive
            showChevron={false}
            onPress={() => {
              void clearSession();
              dispatch({ type: 'LOGOUT' });
              router.replace('/(auth)/welcome');
            }}
          />
        </SettingsSection>
      </AppScrollView>

      <EditFieldSheet
        visible={editEmail}
        title="E-mail"
        label="Adresse de connexion"
        value={state.profile.email}
        keyboardType="email-address"
        autoCapitalize="none"
        onClose={() => setEditEmail(false)}
        onSave={(v) => {
          const email = v.trim();
          if (!email.includes('@')) throw new Error('E-mail invalide.');
          dispatch({ type: 'UPDATE_PROFILE', patch: { email } });
        }}
      />
      <EditFieldSheet
        visible={editPassword}
        title="Mot de passe"
        label="8 caractères minimum"
        value=""
        secureTextEntry
        placeholder="Nouveau mot de passe"
        onClose={() => setEditPassword(false)}
        onSave={(v) => {
          if (v.length < 8) throw new Error('8 caractères minimum.');
          dispatch({ type: 'FINALIZE_ACCOUNT', password: v });
        }}
      />

      <ConfirmModal
        visible={deleteStep === 'confirm1'}
        title="Supprimer le compte"
        body="Souhaitez-vous réellement supprimer votre compte ?"
        cancelLabel="Non"
        confirmLabel="Oui"
        destructive
        onCancel={() => setDeleteStep(null)}
        onConfirm={() => setDeleteStep('password')}
      />

      <EditFieldSheet
        visible={deleteStep === 'password'}
        title="Supprimer le compte"
        label="Saisissez votre mot de passe pour continuer"
        value=""
        secureTextEntry
        placeholder="Mot de passe"
        saveLabel="Suivant"
        closeOnSave={false}
        onClose={() => setDeleteStep(null)}
        onSave={(v) => {
          onDeletePasswordSubmit(v);
        }}
      />

      <ConfirmModal
        visible={deleteStep === 'confirmFinal'}
        title="Confirmation finale"
        body="Souhaitez-vous réellement que nous supprimions votre compte ? Cette action est définitive et efface vos données sur cet appareil."
        cancelLabel="Non"
        confirmLabel="Oui, supprimer"
        destructive
        onCancel={() => setDeleteStep(null)}
        onConfirm={() => void finalizeDelete()}
      />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
    ...(Platform.OS === 'web' ? ({ cursor: 'default' } as object) : null),
  },
  modalCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  modalBtnSecondaryText: {
    fontWeight: '700',
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  modalBtnDangerText: {
    fontWeight: '700',
  },
  inlineError: {
    color: '#DC2626',
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
