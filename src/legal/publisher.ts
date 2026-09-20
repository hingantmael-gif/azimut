/**
 * Identité juridique de l'éditeur — UNE seule source pour les Mentions légales, la politique de
 * confidentialité et les CGU. À tenir à jour (obligatoire dès que l'app devient payante/professionnelle).
 */
/** Aucune adresse e-mail publique : le contact passe par le formulaire intégré à l'application. */
export const LEGAL_CONTACT_CHANNEL = 'le formulaire « Écrire à Mova » de l’application (Paramètres → Aide)';
export const LEGAL_CONTACT_SHORT = 'Formulaire « Écrire à Mova » (Paramètres → Aide)';

export const PUBLISHER = {
  name: 'Mova',
  status: 'Personne physique, éditant le service à titre non professionnel',
  /**
   * LCEN art. 6-III-2 : un éditeur non professionnel peut rester anonyme si son identité est
   * communiquée à l'hébergeur. À REMPLACER par nom + adresse dès qu'une activité payante démarre.
   */
  identityNote:
    'Conformément à l’article 6-III-2 de la loi n° 2004-575 (LCEN), l’identité de l’éditeur est communiquée à l’hébergeur.',
  director: 'L’éditeur du service',
} as const;

export const HOSTS = [
  {
    role: 'Site et application web (PWA)',
    name: 'GitHub Pages — GitHub, Inc.',
    address: '88 Colin P. Kelly Jr Street, San Francisco, CA 94107, États-Unis',
    site: 'pages.github.com',
  },
  {
    role: 'API de compte et d’authentification',
    name: 'Render — Render Services, Inc.',
    address: '525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis',
    site: 'render.com',
  },
] as const;

export const CNIL = { name: 'CNIL', site: 'www.cnil.fr', url: 'https://www.cnil.fr/fr/plaintes' } as const;
