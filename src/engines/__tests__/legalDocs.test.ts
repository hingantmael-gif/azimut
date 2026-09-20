import { describe, expect, it } from 'vitest';
import { LEGAL_DOCS, LEGAL_DOC_ORDER, isLegalDocId, readingMinutes, sectionText } from '../../legal/legalDocs';
import { getAuthRedirect } from '../../navigation/authRoute';

describe('centre légal', () => {
  it('chaque document a des sections uniques et non vides', () => {
    for (const id of LEGAL_DOC_ORDER) {
      const doc = LEGAL_DOCS[id];
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const s of doc.sections) expect(s.blocks.length).toBeGreaterThan(0);
    }
  });

  it('les liens internes pointent vers un document existant', () => {
    for (const id of LEGAL_DOC_ORDER) {
      for (const s of LEGAL_DOCS[id].sections) {
        for (const b of s.blocks) if (b.type === 'link') expect(isLegalDocId(b.doc)).toBe(true);
      }
    }
  });

  it('la confidentialité couvre les mentions RGPD essentielles', () => {
    const text = LEGAL_DOCS.privacy.sections.map(sectionText).join(' ');
    for (const word of ['responsable', 'base légale', 'durée', 'droits', 'cnil', 'transferts', 'consentement']) {
      expect(text).toContain(word);
    }
  });

  it('la recherche et le temps de lecture fonctionnent', () => {
    expect(readingMinutes(LEGAL_DOCS.terms)).toBeGreaterThan(3);
    expect(sectionText(LEGAL_DOCS.health.sections[0])).toContain('médical');
  });

  it('les documents légaux sont accessibles sans compte', () => {
    const anon = { authToken: null, emailVerified: false, onboardingCompleted: false };
    expect(getAuthRedirect(['settings', 'legal', '[doc]'], anon)).toBeNull();
    expect(getAuthRedirect(['settings', 'terms'], anon)).toBeNull();
    expect(getAuthRedirect(['settings', 'account'], anon)).toBe('/(auth)/welcome');
  });
});
