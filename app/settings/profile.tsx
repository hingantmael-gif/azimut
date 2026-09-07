import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SettingsRow, SettingsScreen, SettingsSection } from '../../src/ui/settings/SettingsList';
import { EditFieldSheet } from '../../src/ui/settings/EditFieldSheet';
import { MeasurePickerSheet } from '../../src/ui/settings/MeasurePickerSheet';
import {
  GenderPickerSheet,
  type GenderChoice,
} from '../../src/ui/settings/GenderPickerSheet';
import { useApp } from '../../src/store/AppContext';
import { isUsernameTaken } from '../../src/storage/userRegistry';
import {
  formatUsernameDisplay,
  limitUsernameInput,
  validateUsernameFormat,
} from '../../src/utils/username';
import { AppScrollView } from '../../src/ui/scrolling';

type FieldKey =
  | 'firstName'
  | 'lastName'
  | 'username'
  | 'city'
  | 'gender'
  | 'weightKg'
  | 'heightCm'
  | 'bio';

function formatGenderLabel(raw?: string): string {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'homme') return 'Homme';
  if (v === 'femme') return 'Femme';
  if (v === 'autre') return 'Autre';
  return raw?.trim() || 'Ajouter';
}

function formatWeight(kg: number | undefined, units: 'metric' | 'imperial'): string {
  if (!kg) return 'Ajouter';
  if (units === 'imperial') {
    const lb = Math.round(kg * 2.20462);
    return `${lb} lb`;
  }
  return `${kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`;
}

function formatHeight(cm: number | undefined, units: 'metric' | 'imperial'): string {
  if (!cm) return 'Ajouter';
  if (units === 'imperial') {
    const totalIn = cm / 2.54;
    const ft = Math.floor(totalIn / 12);
    const inch = Math.round(totalIn - ft * 12);
    return `${ft}′ ${inch}″`;
  }
  return `${Math.round(cm)} cm`;
}

export default function ProfileSettingsScreen() {
  const { state, dispatch } = useApp();
  const p = state.profile;
  const units = p.units === 'imperial' ? 'imperial' : 'metric';
  const router = useRouter();
  const [editField, setEditField] = useState<FieldKey | null>(null);

  const saveText = (key: FieldKey, value: string) => {
    dispatch({ type: 'UPDATE_PROFILE', patch: { [key]: value } });
  };

  const saveUsername = async (raw: string) => {
    const username = limitUsernameInput(raw);
    const format = validateUsernameFormat(username);
    if (!format.ok) throw new Error(format.error);
    const taken = await isUsernameTaken(username, p.id);
    if (taken) throw new Error('Cet identifiant est déjà utilisé.');
    dispatch({ type: 'UPDATE_PROFILE', patch: { username } });
  };

  return (
    <SettingsScreen>
      <AppScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SettingsSection title="Identité">
          <SettingsRow
            label="Prénom"
            value={p.firstName || 'Ajouter'}
            onPress={() => setEditField('firstName')}
          />
          <SettingsRow
            label="Nom"
            value={p.lastName || 'Ajouter'}
            onPress={() => setEditField('lastName')}
          />
          <SettingsRow
            label="Identifiant"
            value={formatUsernameDisplay(p.username)}
            onPress={() => setEditField('username')}
          />
          <SettingsRow
            label="Bio"
            value={p.bio || 'Ajouter'}
            onPress={() => setEditField('bio')}
          />
          <SettingsRow
            label="Fond de profil"
            onPress={() => router.push('/settings/profile-cover')}
          />
        </SettingsSection>
        <SettingsSection title="Coordonnées">
          <SettingsRow
            label="E-mail"
            value={p.email || '—'}
            onPress={() => router.push('/settings/account')}
          />
          <SettingsRow
            label="Ville"
            value={p.city || 'Ajouter'}
            onPress={() => setEditField('city')}
          />
        </SettingsSection>
        <SettingsSection title="Athlète">
          <SettingsRow
            label="Objectifs & niveau"
            onPress={() => router.push('/settings/goals')}
          />
          <SettingsRow
            label="Données sportives (VMA, FTP…)"
            onPress={() => router.push('/settings/sports-data')}
          />
          <SettingsRow
            label="Ma forme"
            onPress={() => router.push('/settings/performance')}
          />
        </SettingsSection>
        <SettingsSection title="Physique">
          <SettingsRow
            label="Sexe"
            value={formatGenderLabel(p.gender || p.bodyGender)}
            onPress={() => setEditField('gender')}
          />
          <SettingsRow
            label="Poids"
            value={formatWeight(p.weightKg, units)}
            onPress={() => setEditField('weightKg')}
          />
          <SettingsRow
            label="Taille"
            value={formatHeight(p.heightCm, units)}
            onPress={() => setEditField('heightCm')}
          />
        </SettingsSection>
      </AppScrollView>

      <EditFieldSheet
        visible={editField === 'firstName'}
        title="Prénom"
        label="Votre prénom"
        value={p.firstName}
        autoCapitalize="words"
        onClose={() => setEditField(null)}
        onSave={(v) => {
          if (!v.trim()) throw new Error('Le prénom est requis.');
          saveText('firstName', v.trim());
        }}
      />
      <EditFieldSheet
        visible={editField === 'lastName'}
        title="Nom"
        label="Votre nom"
        value={p.lastName}
        autoCapitalize="words"
        onClose={() => setEditField(null)}
        onSave={(v) => {
          if (!v.trim()) throw new Error('Le nom est requis.');
          saveText('lastName', v.trim());
        }}
      />
      <EditFieldSheet
        visible={editField === 'username'}
        title="Identifiant"
        label="Unique — lettres minuscules et chiffres uniquement (longueur libre)"
        value={p.username}
        prefix="@"
        placeholder="nathan42"
        sanitize={limitUsernameInput}
        autoCapitalize="none"
        onClose={() => setEditField(null)}
        onSave={saveUsername}
      />
      <EditFieldSheet
        visible={editField === 'bio'}
        title="Bio"
        label="Texte libre · @identifiant pour mentionner un compte · liens https://… autorisés"
        value={p.bio ?? ''}
        multiline
        maxLength={280}
        placeholder="Ex. Coureur à Lyon · @nathan42 · https://strava.com/athletes/…"
        onClose={() => setEditField(null)}
        onSave={(v) => saveText('bio', v.trim())}
      />
      <EditFieldSheet
        visible={editField === 'city'}
        title="Ville"
        label="Votre ville"
        value={p.city ?? ''}
        autoCapitalize="words"
        onClose={() => setEditField(null)}
        onSave={(v) => saveText('city', v.trim())}
      />
      <GenderPickerSheet
        visible={editField === 'gender'}
        value={p.gender || p.bodyGender}
        onClose={() => setEditField(null)}
        onSave={(choice: GenderChoice) => {
          dispatch({
            type: 'UPDATE_PROFILE',
            patch: {
              gender: choice,
              bodyGender: choice === 'autre' ? undefined : choice,
            },
          });
        }}
      />

      <MeasurePickerSheet
        visible={editField === 'weightKg'}
        kind="weight"
        value={p.weightKg}
        units={units}
        onClose={() => setEditField(null)}
        onSave={(kg) => {
          dispatch({ type: 'UPDATE_PROFILE', patch: { weightKg: kg } });
        }}
      />
      <MeasurePickerSheet
        visible={editField === 'heightCm'}
        kind="height"
        value={p.heightCm}
        units={units}
        onClose={() => setEditField(null)}
        onSave={(cm) => {
          dispatch({ type: 'UPDATE_PROFILE', patch: { heightCm: cm } });
        }}
      />
    </SettingsScreen>
  );
}
