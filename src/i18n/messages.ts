import type { AppLocale } from './locales';

export type MessageKey =
  | 'common.continue'
  | 'common.back'
  | 'common.save'
  | 'common.cancel'
  | 'common.search'
  | 'common.loading'
  | 'welcome.signup'
  | 'welcome.tagline'
  | 'welcome.eyebrow'
  | 'auth.signIn'
  | 'auth.signInBusy'
  | 'auth.signInTitle'
  | 'auth.signInSubtitle'
  | 'auth.needAccount'
  | 'auth.alreadyHaveAccount'
  | 'auth.email'
  | 'auth.password'
  | 'auth.passwordConfirm'
  | 'auth.firstName'
  | 'auth.lastName'
  | 'auth.username'
  | 'auth.google'
  | 'auth.googleBusy'
  | 'auth.orEmail'
  | 'auth.createAccount'
  | 'auth.terms'
  | 'auth.countryTitle'
  | 'auth.countrySubtitle'
  | 'auth.countrySearch'
  | 'auth.countryConfirm'
  | 'auth.countryLockedHint'
  | 'tabs.home'
  | 'tabs.plan'
  | 'tabs.record'
  | 'tabs.progress'
  | 'tabs.you'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.searchPlaceholder'
  | 'settings.account'
  | 'settings.editProfile'
  | 'settings.sportProfile'
  | 'settings.accountSecurity'
  | 'settings.display'
  | 'settings.darkMode'
  | 'settings.darkModeSub'
  | 'settings.unitsMap'
  | 'settings.language'
  | 'settings.languageSub'
  | 'settings.communications'
  | 'settings.notifications'
  | 'settings.emailPrefs'
  | 'settings.privacy'
  | 'settings.whoCanSee'
  | 'settings.appPermissions'
  | 'settings.devices'
  | 'settings.watch'
  | 'settings.help'
  | 'settings.terms'
  | 'settings.metric'
  | 'settings.imperial'
  | 'settings.map'
  | 'settings.mapPosition'
  | 'settings.chooseLanguage'
  | 'settings.languageNote';

type Dict = Record<MessageKey, string>;

const fr: Dict = {
  'common.continue': 'Continuer',
  'common.back': 'Retour',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.search': 'Rechercher',
  'common.loading': 'Chargement…',
  'welcome.signup': 'Inscription',
  'welcome.tagline': 'Ton coach multi-sport, partout avec toi.',
  'welcome.eyebrow': 'MULTI-SPORT',
  'auth.signIn': 'Se connecter',
  'auth.signInBusy': 'Connexion…',
  'auth.signInTitle': 'Connexion',
  'auth.signInSubtitle': 'Content de te revoir.',
  'auth.needAccount': 'Pas encore de compte ? Inscription',
  'auth.alreadyHaveAccount': 'Déjà un compte ? Se connecter',
  'auth.email': 'E-mail',
  'auth.password': 'Mot de passe',
  'auth.passwordConfirm': 'Confirmer le mot de passe',
  'auth.firstName': 'Prénom',
  'auth.lastName': 'Nom',
  'auth.username': 'Identifiant',
  'auth.google': 'Continuer avec Google',
  'auth.googleBusy': 'Connexion Google…',
  'auth.orEmail': 'ou avec e-mail',
  'auth.createAccount': 'Créer mon compte',
  'auth.terms': 'J’accepte les conditions d’utilisation',
  'auth.countryTitle': 'Complète ton pays',
  'auth.countrySubtitle':
    'Pour les classements nationaux. L’app passe dans la langue de ton pays — tu pourras la changer dans les paramètres.',
  'auth.countrySearch': 'Rechercher un pays',
  'auth.countryConfirm': 'Continuer',
  'auth.countryLockedHint': 'Le pays sera verrouillé pour les classements.',
  'tabs.home': 'Accueil',
  'tabs.plan': 'Plan',
  'tabs.record': 'Enregistrer',
  'tabs.progress': 'Progrès',
  'tabs.you': 'Vous',
  'settings.title': 'Paramètres',
  'settings.subtitle': 'Paramètres · affichage, sync, compte',
  'settings.searchPlaceholder': 'Rechercher (montre, notifications, langue…)',
  'settings.account': 'Compte',
  'settings.editProfile': 'Modifier mon profil',
  'settings.sportProfile': 'Profil sportif',
  'settings.accountSecurity': 'Compte et sécurité',
  'settings.display': 'Affichage',
  'settings.darkMode': 'Mode sombre',
  'settings.darkModeSub': 'Interface sombre pour un confort visuel réduit',
  'settings.unitsMap': 'Unités et carte',
  'settings.language': 'Langue',
  'settings.languageSub': 'Langue de l’interface',
  'settings.communications': 'Communications',
  'settings.notifications': 'Notifications',
  'settings.emailPrefs': 'Préférences e-mail',
  'settings.privacy': 'Confidentialité',
  'settings.whoCanSee': 'Qui peut voir mon profil',
  'settings.appPermissions': 'Autorisations de l’app',
  'settings.devices': 'Appareils & sync',
  'settings.watch': 'Montre',
  'settings.help': 'Centre d’aide',
  'settings.terms': 'CGU',
  'settings.metric': 'Métrique (km, kg)',
  'settings.imperial': 'Impérial (mi, lb)',
  'settings.map': 'Carte',
  'settings.mapPosition': 'Afficher ma position sur la carte',
  'settings.chooseLanguage': 'Langue de l’app',
  'settings.languageNote':
    'Le pays de classement reste inchangé. Seule l’interface change de langue.',
};

const en: Dict = {
  ...fr,
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.search': 'Search',
  'common.loading': 'Loading…',
  'welcome.signup': 'Sign up',
  'welcome.tagline': 'Your multi-sport coach, everywhere with you.',
  'welcome.eyebrow': 'MULTI-SPORT',
  'auth.signIn': 'Sign in',
  'auth.signInBusy': 'Signing in…',
  'auth.signInTitle': 'Sign in',
  'auth.signInSubtitle': 'Welcome back.',
  'auth.needAccount': 'No account yet? Sign up',
  'auth.alreadyHaveAccount': 'Already have an account? Sign in',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordConfirm': 'Confirm password',
  'auth.firstName': 'First name',
  'auth.lastName': 'Last name',
  'auth.username': 'Username',
  'auth.google': 'Continue with Google',
  'auth.googleBusy': 'Google sign-in…',
  'auth.orEmail': 'or with email',
  'auth.createAccount': 'Create my account',
  'auth.terms': 'I accept the terms of use',
  'auth.countryTitle': 'Complete your country',
  'auth.countrySubtitle':
    'Used for national rankings. The app switches to your country’s language — you can change it later in Settings.',
  'auth.countrySearch': 'Search a country',
  'auth.countryConfirm': 'Continue',
  'auth.countryLockedHint': 'Your country will be locked for rankings.',
  'tabs.home': 'Home',
  'tabs.plan': 'Plan',
  'tabs.record': 'Record',
  'tabs.progress': 'Progress',
  'tabs.you': 'You',
  'settings.title': 'Settings',
  'settings.subtitle': 'Settings · display, sync, account',
  'settings.searchPlaceholder': 'Search (watch, notifications, language…)',
  'settings.account': 'Account',
  'settings.editProfile': 'Edit profile',
  'settings.sportProfile': 'Athlete profile',
  'settings.accountSecurity': 'Account & security',
  'settings.display': 'Display',
  'settings.darkMode': 'Dark mode',
  'settings.darkModeSub': 'Dark interface for easier viewing',
  'settings.unitsMap': 'Units & map',
  'settings.language': 'Language',
  'settings.languageSub': 'App language',
  'settings.communications': 'Communications',
  'settings.notifications': 'Notifications',
  'settings.emailPrefs': 'Email preferences',
  'settings.privacy': 'Privacy',
  'settings.whoCanSee': 'Who can see my profile',
  'settings.appPermissions': 'App permissions',
  'settings.devices': 'Devices & sync',
  'settings.watch': 'Watch',
  'settings.help': 'Help center',
  'settings.terms': 'Terms',
  'settings.metric': 'Metric (km, kg)',
  'settings.imperial': 'Imperial (mi, lb)',
  'settings.map': 'Map',
  'settings.mapPosition': 'Show my location on the map',
  'settings.chooseLanguage': 'App language',
  'settings.languageNote':
    'Your ranking country stays the same. Only the interface language changes.',
};

const es: Dict = {
  ...en,
  'common.continue': 'Continuar',
  'common.back': 'Volver',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.search': 'Buscar',
  'welcome.signup': 'Registrarse',
  'welcome.tagline': 'Tu entrenador multi-deporte, contigo en todas partes.',
  'auth.signIn': 'Iniciar sesión',
  'auth.signInBusy': 'Conectando…',
  'auth.signInTitle': 'Iniciar sesión',
  'auth.signInSubtitle': 'Qué bueno verte de nuevo.',
  'auth.needAccount': '¿Sin cuenta? Regístrate',
  'auth.alreadyHaveAccount': '¿Ya tienes cuenta? Inicia sesión',
  'auth.email': 'Correo',
  'auth.password': 'Contraseña',
  'auth.passwordConfirm': 'Confirmar contraseña',
  'auth.firstName': 'Nombre',
  'auth.lastName': 'Apellido',
  'auth.username': 'Usuario',
  'auth.google': 'Continuar con Google',
  'auth.googleBusy': 'Google…',
  'auth.orEmail': 'o con correo',
  'auth.createAccount': 'Crear mi cuenta',
  'auth.terms': 'Acepto las condiciones de uso',
  'auth.countryTitle': 'Completa tu país',
  'auth.countrySubtitle':
    'Para los rankings nacionales. La app pasa al idioma de tu país — puedes cambiarlo en Ajustes.',
  'auth.countrySearch': 'Buscar un país',
  'auth.countryConfirm': 'Continuar',
  'auth.countryLockedHint': 'El país quedará bloqueado para los rankings.',
  'tabs.home': 'Inicio',
  'tabs.plan': 'Plan',
  'tabs.record': 'Grabar',
  'tabs.progress': 'Progreso',
  'tabs.you': 'Tú',
  'settings.title': 'Ajustes',
  'settings.subtitle': 'Ajustes · pantalla, sync, cuenta',
  'settings.language': 'Idioma',
  'settings.languageSub': 'Idioma de la app',
  'settings.darkMode': 'Modo oscuro',
  'settings.chooseLanguage': 'Idioma de la app',
  'settings.languageNote':
    'Tu país de ranking no cambia. Solo cambia el idioma de la interfaz.',
};

const de: Dict = {
  ...en,
  'common.continue': 'Weiter',
  'common.back': 'Zurück',
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'common.search': 'Suchen',
  'welcome.signup': 'Registrieren',
  'welcome.tagline': 'Dein Multi-Sport-Coach, überall bei dir.',
  'auth.signIn': 'Anmelden',
  'auth.signInBusy': 'Anmeldung…',
  'auth.signInTitle': 'Anmelden',
  'auth.signInSubtitle': 'Schön, dich wiederzusehen.',
  'auth.needAccount': 'Noch kein Konto? Registrieren',
  'auth.alreadyHaveAccount': 'Schon ein Konto? Anmelden',
  'auth.email': 'E-Mail',
  'auth.password': 'Passwort',
  'auth.passwordConfirm': 'Passwort bestätigen',
  'auth.firstName': 'Vorname',
  'auth.lastName': 'Nachname',
  'auth.username': 'Benutzername',
  'auth.google': 'Mit Google fortfahren',
  'auth.googleBusy': 'Google…',
  'auth.orEmail': 'oder per E-Mail',
  'auth.createAccount': 'Konto erstellen',
  'auth.terms': 'Ich akzeptiere die Nutzungsbedingungen',
  'auth.countryTitle': 'Land vervollständigen',
  'auth.countrySubtitle':
    'Für nationale Rankings. Die App wechselt in die Sprache deines Landes — änderbar in den Einstellungen.',
  'auth.countrySearch': 'Land suchen',
  'auth.countryConfirm': 'Weiter',
  'auth.countryLockedHint': 'Das Land wird für Rankings gesperrt.',
  'tabs.home': 'Start',
  'tabs.plan': 'Plan',
  'tabs.record': 'Aufnehmen',
  'tabs.progress': 'Fortschritt',
  'tabs.you': 'Du',
  'settings.title': 'Einstellungen',
  'settings.language': 'Sprache',
  'settings.languageSub': 'App-Sprache',
  'settings.darkMode': 'Dunkelmodus',
  'settings.chooseLanguage': 'App-Sprache',
  'settings.languageNote':
    'Dein Ranking-Land bleibt gleich. Nur die Oberflächensprache ändert sich.',
};

const it: Dict = {
  ...en,
  'common.continue': 'Continua',
  'common.back': 'Indietro',
  'common.save': 'Salva',
  'common.cancel': 'Annulla',
  'common.search': 'Cerca',
  'welcome.signup': 'Registrati',
  'welcome.tagline': 'Il tuo coach multi-sport, ovunque con te.',
  'auth.signIn': 'Accedi',
  'auth.signInBusy': 'Accesso…',
  'auth.signInTitle': 'Accedi',
  'auth.signInSubtitle': 'Bentornato.',
  'auth.needAccount': 'Non hai un account? Registrati',
  'auth.alreadyHaveAccount': 'Hai già un account? Accedi',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordConfirm': 'Conferma password',
  'auth.firstName': 'Nome',
  'auth.lastName': 'Cognome',
  'auth.username': 'Username',
  'auth.google': 'Continua con Google',
  'auth.googleBusy': 'Google…',
  'auth.orEmail': 'oppure con email',
  'auth.createAccount': 'Crea il mio account',
  'auth.terms': 'Accetto le condizioni d’uso',
  'auth.countryTitle': 'Completa il tuo paese',
  'auth.countrySubtitle':
    'Per le classifiche nazionali. L’app passa alla lingua del tuo paese — puoi cambiarla nelle Impostazioni.',
  'auth.countrySearch': 'Cerca un paese',
  'auth.countryConfirm': 'Continua',
  'auth.countryLockedHint': 'Il paese sarà bloccato per le classifiche.',
  'tabs.home': 'Home',
  'tabs.plan': 'Piano',
  'tabs.record': 'Registra',
  'tabs.progress': 'Progressi',
  'tabs.you': 'Tu',
  'settings.title': 'Impostazioni',
  'settings.language': 'Lingua',
  'settings.languageSub': 'Lingua dell’app',
  'settings.darkMode': 'Modalità scura',
  'settings.chooseLanguage': 'Lingua dell’app',
  'settings.languageNote':
    'Il paese di classifica non cambia. Cambia solo la lingua dell’interfaccia.',
};

const pt: Dict = {
  ...en,
  'common.continue': 'Continuar',
  'common.back': 'Voltar',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.search': 'Pesquisar',
  'welcome.signup': 'Registar',
  'welcome.tagline': 'O teu coach multi-desporto, contigo em todo o lado.',
  'auth.signIn': 'Entrar',
  'auth.signInBusy': 'A entrar…',
  'auth.signInTitle': 'Entrar',
  'auth.signInSubtitle': 'Bem-vindo de volta.',
  'auth.needAccount': 'Ainda sem conta? Regista-te',
  'auth.alreadyHaveAccount': 'Já tens conta? Entrar',
  'auth.email': 'E-mail',
  'auth.password': 'Palavra-passe',
  'auth.passwordConfirm': 'Confirmar palavra-passe',
  'auth.firstName': 'Nome',
  'auth.lastName': 'Apelido',
  'auth.username': 'Nome de utilizador',
  'auth.google': 'Continuar com Google',
  'auth.googleBusy': 'Google…',
  'auth.orEmail': 'ou com e-mail',
  'auth.createAccount': 'Criar a minha conta',
  'auth.terms': 'Aceito as condições de utilização',
  'auth.countryTitle': 'Completa o teu país',
  'auth.countrySubtitle':
    'Para os rankings nacionais. A app muda para a língua do teu país — podes alterar nas Definições.',
  'auth.countrySearch': 'Pesquisar um país',
  'auth.countryConfirm': 'Continuar',
  'auth.countryLockedHint': 'O país ficará bloqueado para os rankings.',
  'tabs.home': 'Início',
  'tabs.plan': 'Plano',
  'tabs.record': 'Gravar',
  'tabs.progress': 'Progresso',
  'tabs.you': 'Tu',
  'settings.title': 'Definições',
  'settings.language': 'Idioma',
  'settings.languageSub': 'Idioma da app',
  'settings.darkMode': 'Modo escuro',
  'settings.chooseLanguage': 'Idioma da app',
  'settings.languageNote':
    'O país do ranking não muda. Só muda o idioma da interface.',
};

const nl: Dict = {
  ...en,
  'common.continue': 'Doorgaan',
  'common.back': 'Terug',
  'common.save': 'Opslaan',
  'common.cancel': 'Annuleren',
  'common.search': 'Zoeken',
  'welcome.signup': 'Registreren',
  'welcome.tagline': 'Jouw multi-sport coach, overal bij je.',
  'auth.signIn': 'Inloggen',
  'auth.signInBusy': 'Bezig…',
  'auth.signInTitle': 'Inloggen',
  'auth.signInSubtitle': 'Welkom terug.',
  'auth.needAccount': 'Nog geen account? Registreren',
  'auth.alreadyHaveAccount': 'Al een account? Inloggen',
  'auth.email': 'E-mail',
  'auth.password': 'Wachtwoord',
  'auth.passwordConfirm': 'Bevestig wachtwoord',
  'auth.firstName': 'Voornaam',
  'auth.lastName': 'Achternaam',
  'auth.username': 'Gebruikersnaam',
  'auth.google': 'Doorgaan met Google',
  'auth.googleBusy': 'Google…',
  'auth.orEmail': 'of met e-mail',
  'auth.createAccount': 'Account aanmaken',
  'auth.terms': 'Ik accepteer de gebruiksvoorwaarden',
  'auth.countryTitle': 'Vul je land in',
  'auth.countrySubtitle':
    'Voor nationale rankings. De app schakelt naar de taal van je land — later te wijzigen in Instellingen.',
  'auth.countrySearch': 'Zoek een land',
  'auth.countryConfirm': 'Doorgaan',
  'auth.countryLockedHint': 'Je land wordt vergrendeld voor rankings.',
  'tabs.home': 'Home',
  'tabs.plan': 'Plan',
  'tabs.record': 'Opnemen',
  'tabs.progress': 'Voortgang',
  'tabs.you': 'Jij',
  'settings.title': 'Instellingen',
  'settings.language': 'Taal',
  'settings.languageSub': 'App-taal',
  'settings.darkMode': 'Donkere modus',
  'settings.chooseLanguage': 'App-taal',
  'settings.languageNote':
    'Je rankingland blijft hetzelfde. Alleen de interfacetaal verandert.',
};

export const MESSAGES: Record<AppLocale, Dict> = { fr, en, es, de, it, pt, nl };

export function translate(locale: AppLocale, key: MessageKey): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES.fr[key] ?? key;
}
