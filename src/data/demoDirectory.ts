/** Annuaire démo — suggestions recherche d’amis (préfixe live)
 * Identifiants : minuscules + chiffres uniquement (pas de symboles).
 */

function calendarDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type DemoDirectoryMember = {
  id: string;
  username: string;
  name: string;
  city: string;
  /** Pays pour classements national / mondial (Odyssée km) */
  country: string;
  sport: string;
  km: number;
};

export type DemoProgramCard = {
  id: string;
  title: string;
  subtitle: string;
  status: 'active' | 'finished';
  weeks: number;
  sportCategory: string;
  /** Catalogue id si connu (prog-5k…) */
  catalogId?: string;
  /** Nombre de fois terminé (profils tiers) */
  timesCompleted?: number;
};

export type DemoAthletePublicStats = {
  runKm: number;
  bikeKm: number;
  swimKm: number;
  strengthSessions: number;
  completedPrograms: number;
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Résout un username de classement (y compris clones `leamartin1`)
 * vers un membre d’annuaire consultable.
 */
export function findDemoMember(username: string): DemoDirectoryMember | undefined {
  const u = username.trim().toLowerCase();
  if (!u) return undefined;
  const exact = DEMO_DIRECTORY.find((m) => m.username === u);
  if (exact) return exact;
  const base = u.replace(/\d+$/, '');
  if (!base || base === u) return undefined;
  const m = DEMO_DIRECTORY.find((x) => x.username === base);
  if (!m) return undefined;
  const suffix = u.slice(base.length);
  return {
    ...m,
    id: `${m.id}-${suffix || 'x'}`,
    username: u,
    name: suffix ? `${m.name}` : m.name,
  };
}

/** Stats visibles sans abonnement — 0 = discipline non pratiquée (affichée « — ») */
export function demoAthletePublicStats(member: DemoDirectoryMember): DemoAthletePublicStats {
  const h = hashStr(member.username);
  const s = (member.sport ?? '').toLowerCase();
  const isTri = s.includes('tri');
  const isBike = s.includes('vélo') || s.includes('velo') || s.includes('cyclo');
  const isSwim = s.includes('nata');
  const isStrength = s.includes('muscu') || s.includes('force') || s.includes('ppg');
  const isRun = s.includes('course') || s.includes('trail') || s.includes('run');

  let runKm = 0;
  let bikeKm = 0;
  let swimKm = 0;
  let strengthSessions = 0;

  if (isTri) {
    runKm = Math.round(member.km * 0.28);
    bikeKm = Math.round(member.km * 0.65);
    swimKm = Math.round(member.km * 0.04 * 10) / 10;
    strengthSessions = 6 + (h % 18);
  } else if (isBike) {
    bikeKm = Math.round(member.km);
    // Renfo léger occasionnel pour cyclistes confirmés
    strengthSessions = member.km >= 800 ? 4 + (h % 12) : 0;
  } else if (isSwim) {
    swimKm = Math.round(member.km * 10) / 10;
  } else if (isStrength) {
    strengthSessions = Math.max(8, Math.round(member.km / 8));
  } else if (isRun) {
    runKm = Math.round(member.km);
  } else {
    runKm = Math.round(member.km);
  }

  const finished = demoFinishedProgramsWithUsage(member);
  return {
    runKm,
    bikeKm,
    swimKm,
    strengthSessions,
    completedPrograms: finished.length,
  };
}

export type DemoEvolutionEntry = {
  id: string;
  label: string;
  programTitle: string;
  baselineSec: number;
  currentSec: number;
  /** Secondes gagnées (positif = plus rapide) */
  gainedSec: number;
};

/** Temps / progrès visibles si le profil laisse l’évolution en public (ou abonné). */
export function demoAthleteEvolution(member: DemoDirectoryMember): DemoEvolutionEntry[] {
  const h = hashStr(`${member.username}|evo`);
  const s = (member.sport ?? '').toLowerCase();
  const entries: DemoEvolutionEntry[] = [];

  const pushRun = (id: string, label: string, title: string, baseSec: number, improvePct: number) => {
    const baselineSec = baseSec;
    const currentSec = Math.max(60, Math.round(baseSec * (1 - improvePct)));
    entries.push({
      id: `${member.username}-${id}`,
      label,
      programTitle: title,
      baselineSec,
      currentSec,
      gainedSec: baselineSec - currentSec,
    });
  };

  if (s.includes('nata')) {
    const base = 90 + (h % 40);
    pushRun('swim100', '100 m', '100 m nage libre', base, 0.06 + (h % 5) / 100);
    if (member.km >= 80) {
      pushRun('swim1500', '1500 m', '1500 m nage libre', 1500 + (h % 200), 0.04);
    }
  } else if (s.includes('vélo') || s.includes('velo') || s.includes('cyclo')) {
    pushRun('bike40', '40 km', 'Sortie 40 km', 4200 + (h % 600), 0.05);
    if (member.km >= 700) {
      pushRun('bike100', '100 km', 'Century ride', 12_000 + (h % 1800), 0.04);
    }
  } else if (s.includes('tri')) {
    pushRun('5k', '5 km', 'Brick course', 22 * 60 + (h % 180), 0.07);
    pushRun('bike20', '20 km vélo', 'Brick vélo', 2100 + (h % 300), 0.05);
    pushRun('swim750', '750 m', 'Brick nage', 780 + (h % 90), 0.05);
  } else if (s.includes('trail')) {
    pushRun('trail15', '15 km', `Programme ${member.sport}`, 5400 + (h % 900), 0.06);
    if (member.km >= 400) {
      pushRun('trail30', '30 km', 'Trail long', 11_400 + (h % 1200), 0.04);
    }
  } else {
    // Course à pied (défaut)
    const base5 = 25 * 60 + (h % 240);
    pushRun('5k', '5 km', 'Programme 5 km', base5, 0.08 + (h % 4) / 100);
    if (member.km >= 300) {
      pushRun('10k', '10 km', 'Programme 10 km', base5 * 2.12, 0.06);
    }
    if (member.km >= 500) {
      pushRun('semi', 'semi', 'Semi', base5 * 4.7, 0.05);
    }
  }

  return entries;
}

const FINISHED_CATALOG_BY_SPORT: Record<string, Array<{ catalogId: string; title: string }>> = {
  course: [
    { catalogId: 'prog-5k', title: 'Programme 5 km' },
    { catalogId: 'prog-10k', title: 'Programme 10 km' },
    { catalogId: 'prog-semi', title: 'Semi' },
  ],
  trail: [
    { catalogId: 'prog-trail-50', title: 'Trail 50 km' },
    { catalogId: 'prog-10k', title: 'Programme 10 km' },
    { catalogId: 'prog-vma', title: 'VMA & vitesse' },
  ],
  vélo: [
    { catalogId: 'prog-bike-40', title: 'Sortie 40 km' },
    { catalogId: 'prog-bike-80', title: 'Cyclosportive 80 km' },
    { catalogId: 'prog-bike-120', title: 'Gran Fondo 120 km' },
    { catalogId: 'prog-bike-fondo', title: 'Sanctuary Ride (160 km)' },
    { catalogId: 'prog-bike-200', title: 'Brevet 200 km' },
    { catalogId: 'prog-bike-crit', title: 'Critérium & côte' },
  ],
  velo: [
    { catalogId: 'prog-bike-40', title: 'Sortie 40 km' },
    { catalogId: 'prog-bike-80', title: 'Cyclosportive 80 km' },
    { catalogId: 'prog-bike-fondo', title: 'Sanctuary Ride (160 km)' },
    { catalogId: 'prog-bike-crit', title: 'Critérium & côte' },
  ],
  natation: [
    { catalogId: 'prog-swim-100', title: '100 m nage libre' },
    { catalogId: 'prog-swim-1500', title: '1500 m nage libre' },
    { catalogId: 'prog-swim-eau-libre', title: 'Eau libre 2 km' },
  ],
  triathlon: [
    { catalogId: 'prog-tri-sprint', title: 'Triathlon sprint' },
    { catalogId: 'prog-5k', title: 'Programme 5 km' },
    { catalogId: 'prog-bike-fondo', title: 'Sanctuary Ride (160 km)' },
  ],
};

function finishedCatalogFor(member: DemoDirectoryMember) {
  const s = (member.sport ?? '').toLowerCase();
  for (const [key, list] of Object.entries(FINISHED_CATALOG_BY_SPORT)) {
    if (s.includes(key)) return list;
  }
  return FINISHED_CATALOG_BY_SPORT.course;
}

/**
 * Programmes terminés avec nombre de complétions — trié du plus utilisé.
 * Le compteur évolue légèrement chaque jour (simulation live).
 */
export function demoFinishedProgramsWithUsage(member: DemoDirectoryMember): Array<{
  id: string;
  catalogId: string;
  title: string;
  timesCompleted: number;
  reviewFeeling?: 'up' | 'down';
  reviewComment?: string;
}> {
  const list = finishedCatalogFor(member).map((p) => {
    const timesCompleted = 1 + (hashStr(`${member.username}|${p.catalogId}|n`) % 4);
    const h = hashStr(`${member.username}|review|${p.catalogId}`);
    const hasReview = h % 3 !== 0;
    return {
      id: `${member.username}-${p.catalogId}`,
      catalogId: p.catalogId,
      title: p.title,
      timesCompleted,
      ...(hasReview
        ? {
            reviewFeeling: (h % 2 === 0 ? 'up' : 'down') as 'up' | 'down',
            reviewComment:
              h % 2 === 0
                ? 'Très bon cycle, progression nette.'
                : 'Un peu trop dense sur la fin.',
          }
        : {}),
    };
  });
  return list.sort(
    (a, b) => b.timesCompleted - a.timesCompleted || a.title.localeCompare(b.title, 'fr'),
  );
}

/** Programmes visibles sur un profil tiers (en cours + terminés) */
export function demoProgramsFor(member: DemoDirectoryMember): DemoProgramCard[] {
  const weeksActive = Math.max(4, Math.min(16, Math.round(member.km / 80)));
  const finishedUsage = demoFinishedProgramsWithUsage(member);
  const active: DemoProgramCard = {
    id: `${member.username}-active`,
    title: `Programme ${member.sport}`,
    subtitle: `${weeksActive} semaines · en cours`,
    status: 'active',
    weeks: weeksActive,
    sportCategory: member.sport,
  };
  const finishedCards: DemoProgramCard[] = finishedUsage.map((p) => ({
    id: p.id,
    catalogId: p.catalogId,
    title: p.title,
    subtitle: `Terminé ${p.timesCompleted} fois`,
    status: 'finished' as const,
    weeks: 8,
    sportCategory: member.sport,
    timesCompleted: p.timesCompleted,
  }));
  if (member.km < 250) return finishedCards.slice(0, 1);
  if (member.km < 500) return [active, ...finishedCards.slice(0, 2)];
  return [active, ...finishedCards];
}

export function programLikeKey(ownerUsername: string, programId: string): string {
  return `${ownerUsername.trim().toLowerCase()}:${programId}`;
}

export function sessionLikeKey(ownerUsername: string, sessionId: string): string {
  return `sess:${ownerUsername.trim().toLowerCase()}:${sessionId}`;
}

/** Séances récentes (visibles seulement aux abonnés). */
export function demoRecentSessions(member: DemoDirectoryMember): Array<{
  id: string;
  title: string;
  dateLabel: string;
  distanceLabel: string;
  sport: string;
}> {
  const h = hashStr(`${member.username}|sessions`);
  const s = (member.sport ?? '').toLowerCase();
  const days = [1, 3, 5, 8, 12];
  const templates =
    s.includes('nata')
      ? [
          { title: 'Séries 100 m', sport: 'Natation', km: 2.4 },
          { title: 'Endurance eau libre', sport: 'Natation', km: 1.8 },
        ]
      : s.includes('vélo') || s.includes('velo')
        ? [
            { title: 'Sortie endurance', sport: 'Vélo', km: 65 },
            { title: 'Côtes & force', sport: 'Vélo', km: 42 },
          ]
        : s.includes('tri')
          ? [
              { title: 'Brick vélo-course', sport: 'Triathlon', km: 38 },
              { title: 'Nage technique', sport: 'Natation', km: 2.1 },
              { title: 'Footing récup', sport: 'Course', km: 8 },
            ]
          : [
              { title: 'Footing endurance', sport: 'Course', km: 12 },
              { title: 'VMA courte', sport: 'Course', km: 8 },
              { title: 'Sortie longue', sport: 'Course', km: 18 },
            ];

  return days.slice(0, 3 + (h % 2)).map((d, i) => {
    const t = templates[i % templates.length]!;
    const date = new Date();
    date.setDate(date.getDate() - d);
    const km = Math.round((t.km * (0.85 + (h % 20) / 100)) * 10) / 10;
    return {
      id: `${member.username}-sess-${i}`,
      title: t.title,
      dateLabel: date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      }),
      distanceLabel: `${String(km).replace('.', ',')} km`,
      sport: t.sport,
    };
  });
}

const FR = 'France';

export const DEMO_DIRECTORY: DemoDirectoryMember[] = [
  { id: 'u1', username: 'leamartin', name: 'Léa Martin', city: 'Paris', country: FR, sport: 'Course', km: 420 },
  { id: 'u2', username: 'marcdupont', name: 'Marc Dupont', city: 'Rennes', country: FR, sport: 'Triathlon', km: 890 },
  { id: 'u3', username: 'ninarossi', name: 'Nina Rossi', city: 'Nantes', country: FR, sport: 'Trail', km: 310 },
  { id: 'u4', username: 'nathanbertrand', name: 'Nathan Bertrand', city: 'Lyon', country: FR, sport: 'Course', km: 520 },
  { id: 'u5', username: 'naterun', name: 'Nathan Roux', city: 'Paris', country: FR, sport: 'Course', km: 280 },
  { id: 'u6', username: 'noahpetit', name: 'Noah Petit', city: 'Bordeaux', country: FR, sport: 'Trail', km: 640 },
  { id: 'u7', username: 'noemiel', name: 'Noémie Laurent', city: 'Nantes', country: FR, sport: 'Course', km: 190 },
  { id: 'u8', username: 'nicolasv', name: 'Nicolas Vidal', city: 'Toulouse', country: FR, sport: 'Vélo', km: 1100 },
  { id: 'u9', username: 'nadegem', name: 'Nadège Moreau', city: 'Lille', country: FR, sport: 'Course', km: 350 },
  { id: 'u10', username: 'nestork', name: 'Nestor Klein', city: 'Strasbourg', country: FR, sport: 'Triathlon', km: 700 },
  { id: 'u11', username: 'nellyc', name: 'Nelly Cohen', city: 'Paris', country: FR, sport: 'Natation', km: 120 },
  { id: 'u12', username: 'naomid', name: 'Naomi Durand', city: 'Marseille', country: FR, sport: 'Trail', km: 480 },
  { id: 'u13', username: 'alexbrun', name: 'Alex Brun', city: 'Lyon', country: FR, sport: 'Course', km: 410 },
  { id: 'u14', username: 'amelies', name: 'Amélie Simon', city: 'Paris', country: FR, sport: 'Course', km: 260 },
  { id: 'u15', username: 'antoineg', name: 'Antoine Garnier', city: 'Rennes', country: FR, sport: 'Vélo', km: 980 },
  { id: 'u16', username: 'annap', name: 'Anna Perez', city: 'Nantes', country: FR, sport: 'Triathlon', km: 540 },
  { id: 'u17', username: 'arthurm', name: 'Arthur Morel', city: 'Bordeaux', country: FR, sport: 'Trail', km: 720 },
  { id: 'u18', username: 'adeler', name: 'Adèle Rousseau', city: 'Lille', country: FR, sport: 'Course', km: 300 },
  { id: 'u19', username: 'benthomas', name: 'Ben Thomas', city: 'Paris', country: FR, sport: 'Course', km: 390 },
  { id: 'u20', username: 'camillef', name: 'Camille Faure', city: 'Lyon', country: FR, sport: 'Natation', km: 150 },
  { id: 'u21', username: 'clarab', name: 'Clara Blanc', city: 'Toulouse', country: FR, sport: 'Course', km: 440 },
  { id: 'u22', username: 'davidn', name: 'David Nguyen', city: 'Marseille', country: FR, sport: 'Vélo', km: 860 },
  { id: 'u23', username: 'emmal', name: 'Emma Lefebvre', city: 'Paris', country: FR, sport: 'Course', km: 510 },
  { id: 'u24', username: 'enzom', name: 'Enzo Marchand', city: 'Nantes', country: FR, sport: 'Trail', km: 370 },
  { id: 'u25', username: 'hugor', name: 'Hugo Rey', city: 'Rennes', country: FR, sport: 'Course', km: 290 },
  { id: 'u26', username: 'inesc', name: 'Inès Chevalier', city: 'Bordeaux', country: FR, sport: 'Triathlon', km: 610 },
  { id: 'u27', username: 'julienp', name: 'Julien Picard', city: 'Lille', country: FR, sport: 'Vélo', km: 1020 },
  { id: 'u28', username: 'juliea', name: 'Julie Arnaud', city: 'Paris', country: FR, sport: 'Course', km: 330 },
  { id: 'u29', username: 'kevins', name: 'Kevin Sanchez', city: 'Lyon', country: FR, sport: 'Course', km: 470 },
  { id: 'u30', username: 'louisg', name: 'Louis Gerard', city: 'Toulouse', country: FR, sport: 'Trail', km: 550 },
  { id: 'u31', username: 'lucasb', name: 'Lucas Bernard', city: 'Nantes', country: FR, sport: 'Course', km: 400 },
  { id: 'u32', username: 'manont', name: 'Manon Torres', city: 'Marseille', country: FR, sport: 'Course', km: 220 },
  { id: 'u33', username: 'mathisl', name: 'Mathis Leroy', city: 'Paris', country: FR, sport: 'Triathlon', km: 780 },
  { id: 'u34', username: 'oliviam', name: 'Olivia Meunier', city: 'Lyon', country: FR, sport: 'Natation', km: 180 },
  { id: 'u35', username: 'pauld', name: 'Paul Dupuis', city: 'Rennes', country: FR, sport: 'Course', km: 360 },
  { id: 'u36', username: 'pierrev', name: 'Pierre Vincent', city: 'Bordeaux', country: FR, sport: 'Vélo', km: 940 },
  { id: 'u37', username: 'sarahk', name: 'Sarah Klein', city: 'Strasbourg', country: FR, sport: 'Course', km: 430 },
  { id: 'u38', username: 'theor', name: 'Théo Roche', city: 'Lille', country: FR, sport: 'Trail', km: 500 },
  { id: 'u39', username: 'tomh', name: 'Tom Hubert', city: 'Paris', country: FR, sport: 'Course', km: 270 },
  { id: 'u40', username: 'zoem', name: 'Zoé Muller', city: 'Nantes', country: FR, sport: 'Course', km: 310 },
  { id: 'u41', username: 'nathpro', name: 'Nathan Pro', city: 'Paris', country: FR, sport: 'Course', km: 680 },
  { id: 'u42', username: 'narunclub', name: 'Na Run Club', city: 'Lyon', country: FR, sport: 'Course', km: 150 },
  { id: 'u43', username: 'maximec', name: 'Maxime Caron', city: 'Toulouse', country: FR, sport: 'Triathlon', km: 820 },
  { id: 'u44', username: 'chloeb', name: 'Chloé Breton', city: 'Rennes', country: FR, sport: 'Course', km: 340 },
  { id: 'u45', username: 'gabriels', name: 'Gabriel Soto', city: 'Marseille', country: FR, sport: 'Trail', km: 590 },
  // International — classement mondial
  { id: 'u46', username: 'lukeb', name: 'Luke Bennett', city: 'London', country: 'Royaume-Uni', sport: 'Course', km: 1250 },
  { id: 'u47', username: 'sofiam', name: 'Sofia Moretti', city: 'Milan', country: 'Italie', sport: 'Course', km: 980 },
  { id: 'u48', username: 'hansw', name: 'Hans Weber', city: 'Berlin', country: 'Allemagne', sport: 'Trail', km: 1420 },
  { id: 'u49', username: 'emmas', name: 'Emma Svensson', city: 'Stockholm', country: 'Suède', sport: 'Course', km: 1680 },
  { id: 'u50', username: 'carlosr', name: 'Carlos Ruiz', city: 'Madrid', country: 'Espagne', sport: 'Course', km: 760 },
  { id: 'u51', username: 'yukit', name: 'Yuki Tanaka', city: 'Tokyo', country: 'Japon', sport: 'Course', km: 2100 },
  { id: 'u52', username: 'noahc', name: 'Noah Clark', city: 'Toronto', country: 'Canada', sport: 'Trail', km: 1340 },
  { id: 'u53', username: 'lisav', name: 'Lisa Van den Berg', city: 'Amsterdam', country: 'Pays-Bas', sport: 'Vélo', km: 1560 },
  { id: 'u54', username: 'pierreb', name: 'Pierre Blanc', city: 'Bruxelles', country: 'Belgique', sport: 'Course', km: 910 },
  { id: 'u55', username: 'annak', name: 'Anna Keller', city: 'Zürich', country: 'Suisse', sport: 'Trail', km: 1180 },
];
