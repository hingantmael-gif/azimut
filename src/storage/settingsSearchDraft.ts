/** Brouillon de recherche paramètres — survit à la navigation interne, vidé en quittant Paramètres. */

let draft = '';

export function getSettingsSearchDraft(): string {
  return draft;
}

export function setSettingsSearchDraft(query: string): void {
  draft = query;
}

export function clearSettingsSearchDraft(): void {
  draft = '';
}
