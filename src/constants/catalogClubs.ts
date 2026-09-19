import type { Club } from '../types/domain';

/** Clubs publics à découvrir (non persistés tant qu’on ne les rejoint pas). */
export type CatalogClub = Omit<Club, 'members' | 'posts' | 'createdByUsername'> & {
  memberCount: number;
  sampleMembers: Array<{ username: string; displayName: string; role?: Club['members'][0]['role'] }>;
  samplePosts: Array<{
    authorUsername: string;
    authorDisplayName: string;
    kind: Club['posts'][0]['kind'];
    text?: string;
    activityTitle?: string;
    activityDistanceKm?: number;
    programTitle?: string;
  }>;
};

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString();
};

export const CATALOG_CLUBS: CatalogClub[] = [
  {
    id: 'catalog-runners-paris',
    catalogId: 'catalog-runners-paris',
    name: 'Runners Paris',
    description:
      'Sorties collectives, allures partagées et programmes de préparation (5 km → marathon).',
    city: 'Paris',
    sportLabel: 'Course',
    visibility: 'public',
    createdAt: day(120),
    memberCount: 1240,
    sampleMembers: [
      { username: 'leamartin', displayName: 'Léa Martin', role: 'owner' },
      { username: 'noahpetit', displayName: 'Noah Petit', role: 'admin' },
      { username: 'annap', displayName: 'Anna P.', role: 'member' },
    ],
    samplePosts: [
      {
        authorUsername: 'leamartin',
        authorDisplayName: 'Léa Martin',
        kind: 'message',
        text: 'Sortie longue dimanche 9h — RDV canal Saint-Martin. Allure conversational.',
      },
      {
        authorUsername: 'noahpetit',
        authorDisplayName: 'Noah Petit',
        kind: 'activity',
        text: 'Seance fractionnée du soir',
        activityTitle: '6×1000 m',
        activityDistanceKm: 12.4,
      },
      {
        authorUsername: 'annap',
        authorDisplayName: 'Anna P.',
        kind: 'program',
        text: 'Je partage mon plan semi — on peut s’aligner sur les mêmes semaines clés.',
        programTitle: 'Semi 12 semaines',
      },
    ],
  },
  {
    id: 'catalog-trail-bretagne',
    catalogId: 'catalog-trail-bretagne',
    name: 'Trail Bretagne',
    description: 'Sentiers côtiers, D+ et sorties weekend. Partagez vos tracés et préparations trail.',
    city: 'Bretagne',
    sportLabel: 'Trail',
    visibility: 'public',
    createdAt: day(90),
    memberCount: 890,
    sampleMembers: [
      { username: 'narunclub', displayName: 'Na Run Club', role: 'owner' },
      { username: 'leamartin', displayName: 'Léa Martin', role: 'member' },
    ],
    samplePosts: [
      {
        authorUsername: 'narunclub',
        authorDisplayName: 'Na Run Club',
        kind: 'message',
        text: 'Boucle GR34 samedi — 22 km / ~650 D+. Emportez lampe si départ tôt.',
      },
      {
        authorUsername: 'leamartin',
        authorDisplayName: 'Léa Martin',
        kind: 'activity',
        text: 'Recce sentier',
        activityTitle: 'Trail côte sauvage',
        activityDistanceKm: 18.2,
      },
    ],
  },
  {
    id: 'catalog-tri-nantes',
    catalogId: 'catalog-tri-nantes',
    name: 'Triathlon Nantes',
    description: 'Brick, natation et sorties vélo communes. Programmes Ironman / Olymique partagés.',
    city: 'Nantes',
    sportLabel: 'Triathlon',
    visibility: 'public',
    createdAt: day(60),
    memberCount: 456,
    sampleMembers: [
      { username: 'annap', displayName: 'Anna P.', role: 'owner' },
      { username: 'noahpetit', displayName: 'Noah Petit', role: 'member' },
    ],
    samplePosts: [
      {
        authorUsername: 'annap',
        authorDisplayName: 'Anna P.',
        kind: 'program',
        text: 'Bloc spécifique 70.3 — dispo pour coacher les semaines 5–8.',
        programTitle: 'Ironman 70.3 — 16 semaines',
      },
    ],
  },
];

export function catalogClubToClub(
  catalog: CatalogClub,
  joiner?: { username: string; displayName: string },
): Club {
  const members: Club['members'] = catalog.sampleMembers.map((m, i) => ({
    username: m.username,
    displayName: m.displayName,
    role: m.role ?? (i === 0 ? 'owner' : 'member'),
    joinedAt: day(30 + i),
  }));
  if (joiner && !members.some((m) => m.username === joiner.username)) {
    members.push({
      username: joiner.username,
      displayName: joiner.displayName,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });
  }
  const posts: Club['posts'] = catalog.samplePosts.map((p, i) => ({
    id: `${catalog.id}-post-${i}`,
    authorUsername: p.authorUsername,
    authorDisplayName: p.authorDisplayName,
    createdAt: day(i + 1),
    kind: p.kind,
    text: p.text,
    activityTitle: p.activityTitle,
    activityDistanceKm: p.activityDistanceKm,
    programTitle: p.programTitle,
  }));
  return {
    id: catalog.id,
    catalogId: catalog.catalogId,
    name: catalog.name,
    description: catalog.description,
    city: catalog.city,
    sportLabel: catalog.sportLabel,
    visibility: catalog.visibility,
    createdAt: catalog.createdAt,
    createdByUsername: catalog.sampleMembers[0]?.username ?? 'azimut',
    members,
    posts,
  };
}
