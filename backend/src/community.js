/**
 * Module Community Mova — persistance JSON (users.json style).
 * Multi-utilisateur dès que l’API est déployée ; le client garde un fallback local.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const communityFile = path.join(dataDir, 'community.json');

const EMPTY = () => ({
  posts: [],
  likes: [],
  reactions: [],
  comments: [],
  follows: [],
  clubs: [],
  clubMembers: [],
  clubPosts: [],
  reports: [],
  blocks: [],
  notifications: [],
});

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(communityFile)) {
    const seed = EMPTY();
    seed.posts = [
      {
        id: 'seed_1',
        authorUsername: 'leamartin',
        authorName: 'Léa Martin',
        text: '6×1000 m validés — merci pour les likes !',
        km: 12.4,
        insight: 'Negative split réussi — tu as bien géré l’allure.',
        rankTier: 'or',
        rankDivision: 2,
        createdAt: new Date(Date.now() - 3600_000).toISOString(),
      },
      {
        id: 'seed_2',
        authorUsername: 'noahpetit',
        authorName: 'Noah Petit',
        text: 'Sortie longue 22 km · D+ 650',
        km: 22,
        insight: 'Bonne compliance au plan — rythme maîtrisé.',
        rankTier: 'argent',
        rankDivision: 1,
        createdAt: new Date(Date.now() - 7200_000).toISOString(),
      },
      {
        id: 'seed_3',
        authorUsername: 'annap',
        authorName: 'Anna P.',
        text: 'Brick vélo + footing transition',
        km: 45,
        insight: null,
        rankTier: 'platine',
        rankDivision: 3,
        createdAt: new Date(Date.now() - 10800_000).toISOString(),
      },
    ];
    fs.writeFileSync(communityFile, JSON.stringify(seed, null, 2), 'utf8');
  }
}

export function loadCommunity() {
  ensure();
  try {
    return { ...EMPTY(), ...JSON.parse(fs.readFileSync(communityFile, 'utf8')) };
  } catch {
    return EMPTY();
  }
}

export function saveCommunity(data) {
  ensure();
  fs.writeFileSync(communityFile, JSON.stringify(data, null, 2), 'utf8');
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

function isBlocked(db, a, b) {
  return db.blocks.some(
    (x) =>
      (x.blockerUsername === a && x.blockedUsername === b) ||
      (x.blockerUsername === b && x.blockedUsername === a),
  );
}

/**
 * Monte les routes /community/* sur l’app Express.
 * @param {import('express').Express} app
 * @param {{ authMiddleware: Function, loadUsers: Function }} deps
 */
export function mountCommunityRoutes(app, { authMiddleware, loadUsers }) {
  app.get('/community/hub-summary', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const following = new Set(
      db.follows
        .filter((f) => f.followerUsername === username && f.status === 'accepted')
        .map((f) => f.followeeUsername),
    );
    const feedCount = db.posts.filter(
      (p) =>
        following.has(p.authorUsername) ||
        p.authorUsername === username ||
        p.id.startsWith('seed_'),
    ).length;
    const myClubs = db.clubMembers.filter((m) => m.username === username).length;
    const unread = db.notifications.filter(
      (n) => n.toUsername === username && !n.read,
    ).length;
    res.json({
      ok: true,
      feedPosts: Math.max(feedCount, db.posts.length),
      clubsJoined: myClubs,
      unreadSocial: unread,
    });
  });

  app.get('/community/feed', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    const limit = Math.min(30, Number(req.query.limit) || 20);

    let posts = [...db.posts].sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt)),
    );
    posts = posts.filter((p) => !isBlocked(db, username, p.authorUsername));
    if (cursor) {
      const idx = posts.findIndex((p) => p.id === cursor);
      posts = idx >= 0 ? posts.slice(idx + 1) : posts;
    }
    const page = posts.slice(0, limit);
    const enriched = page.map((p) => {
      const likeCount = db.likes.filter((l) => l.postId === p.id).length;
      const likedByMe = db.likes.some(
        (l) => l.postId === p.id && l.username === username,
      );
      const reactionCounts = {};
      for (const r of db.reactions.filter((x) => x.postId === p.id)) {
        reactionCounts[r.kind] = (reactionCounts[r.kind] || 0) + 1;
      }
      const myReaction =
        db.reactions.find((r) => r.postId === p.id && r.username === username)
          ?.kind ?? null;
      const commentCount = db.comments.filter((c) => c.postId === p.id).length;
      return {
        ...p,
        likeCount,
        likedByMe,
        reactionCounts,
        myReaction,
        commentCount,
      };
    });
    const nextCursor =
      page.length === limit ? page[page.length - 1]?.id ?? null : null;
    res.json({ ok: true, posts: enriched, nextCursor });
  });

  app.post('/community/posts/:id/like', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    if (!username) return res.status(400).json({ error: 'Profil incomplet' });
    const postId = req.params.id;
    const post = db.posts.find((p) => p.id === postId);
    if (!post) return res.status(404).json({ error: 'Post introuvable' });
    if (isBlocked(db, username, post.authorUsername)) {
      return res.status(403).json({ error: 'Bloqué' });
    }
    const existing = db.likes.findIndex(
      (l) => l.postId === postId && l.username === username,
    );
    if (existing >= 0) {
      db.likes.splice(existing, 1);
    } else {
      db.likes.push({
        postId,
        username,
        createdAt: new Date().toISOString(),
      });
      if (post.authorUsername !== username) {
        db.notifications.unshift({
          id: id('notif'),
          toUsername: post.authorUsername,
          fromUsername: username,
          type: 'like_post',
          postId,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    saveCommunity(db);
    const likeCount = db.likes.filter((l) => l.postId === postId).length;
    const likedByMe = db.likes.some(
      (l) => l.postId === postId && l.username === username,
    );
    res.json({
      ok: true,
      likeCount,
      likedByMe,
      insight: post.insight || null,
    });
  });

  app.post('/community/posts/:id/react', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const kind = String(req.body?.kind || '').slice(0, 24);
    const allowed = ['costaud', 'regulier', 'bravo'];
    if (!allowed.includes(kind)) {
      return res.status(400).json({ error: 'Réaction invalide' });
    }
    const postId = req.params.id;
    db.reactions = db.reactions.filter(
      (r) => !(r.postId === postId && r.username === username),
    );
    db.reactions.push({
      postId,
      username,
      kind,
      createdAt: new Date().toISOString(),
    });
    saveCommunity(db);
    const reactionCounts = {};
    for (const r of db.reactions.filter((x) => x.postId === postId)) {
      reactionCounts[r.kind] = (reactionCounts[r.kind] || 0) + 1;
    }
    res.json({ ok: true, reactionCounts, myReaction: kind });
  });

  app.get('/community/posts/:id/comments', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const comments = db.comments
      .filter((c) => c.postId === req.params.id)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    res.json({ ok: true, comments });
  });

  app.post('/community/posts/:id/comments', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const text = String(req.body?.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).json({ error: 'Texte requis' });
    const comment = {
      id: id('cmt'),
      postId: req.params.id,
      username,
      name: `${me?.firstName || ''} ${me?.lastName || ''}`.trim() || username,
      text,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(comment);
    saveCommunity(db);
    res.status(201).json({ ok: true, comment });
  });

  app.post('/community/follow/:username', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const follower = (me?.username || '').toLowerCase();
    const followee = String(req.params.username || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!follower || !followee || follower === followee) {
      return res.status(400).json({ error: 'Follow invalide' });
    }
    if (isBlocked(db, follower, followee)) {
      return res.status(403).json({ error: 'Bloqué' });
    }
    const existing = db.follows.find(
      (f) => f.followerUsername === follower && f.followeeUsername === followee,
    );
    if (existing) {
      return res.json({ ok: true, status: existing.status });
    }
    const status = req.body?.requireApproval ? 'pending' : 'accepted';
    db.follows.push({
      followerUsername: follower,
      followeeUsername: followee,
      status,
      createdAt: new Date().toISOString(),
    });
    db.notifications.unshift({
      id: id('notif'),
      toUsername: followee,
      fromUsername: follower,
      type: status === 'pending' ? 'follow_request' : 'follow',
      read: false,
      createdAt: new Date().toISOString(),
    });
    saveCommunity(db);
    res.json({ ok: true, status });
  });

  app.delete('/community/follow/:username', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const follower = (me?.username || '').toLowerCase();
    const followee = String(req.params.username || '').toLowerCase();
    db.follows = db.follows.filter(
      (f) =>
        !(f.followerUsername === follower && f.followeeUsername === followee),
    );
    saveCommunity(db);
    res.json({ ok: true });
  });

  app.get('/community/users/search', authMiddleware, (req, res) => {
    const q = String(req.query.q || '')
      .toLowerCase()
      .trim();
    if (q.length < 1) return res.json({ ok: true, users: [] });
    const users = loadUsers()
      .filter((u) => {
        const un = (u.username || '').toLowerCase();
        const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        return un.includes(q) || name.includes(q);
      })
      .slice(0, 20)
      .map((u) => ({
        username: u.username,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: undefined,
      }));
    res.json({ ok: true, users });
  });

  app.post('/community/reports', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const reporter = (me?.username || '').toLowerCase();
    const { targetType, targetId, reason } = req.body || {};
    if (!targetType || !targetId) {
      return res.status(400).json({ error: 'Cible requise' });
    }
    const report = {
      id: id('rep'),
      reporterUsername: reporter,
      targetType: String(targetType).slice(0, 32),
      targetId: String(targetId).slice(0, 64),
      reason: String(reason || 'other').slice(0, 120),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    db.reports.push(report);
    saveCommunity(db);
    res.status(201).json({ ok: true, report });
  });

  app.post('/community/blocks', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const blocker = (me?.username || '').toLowerCase();
    const blocked = String(req.body?.username || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (!blocker || !blocked || blocker === blocked) {
      return res.status(400).json({ error: 'Blocage invalide' });
    }
    if (
      !db.blocks.some(
        (b) => b.blockerUsername === blocker && b.blockedUsername === blocked,
      )
    ) {
      db.blocks.push({
        blockerUsername: blocker,
        blockedUsername: blocked,
        createdAt: new Date().toISOString(),
      });
      db.follows = db.follows.filter(
        (f) =>
          !(
            (f.followerUsername === blocker && f.followeeUsername === blocked) ||
            (f.followerUsername === blocked && f.followeeUsername === blocker)
          ),
      );
      saveCommunity(db);
    }
    res.json({ ok: true });
  });

  app.get('/community/blocks', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const blocker = (me?.username || '').toLowerCase();
    const list = db.blocks
      .filter((b) => b.blockerUsername === blocker)
      .map((b) => b.blockedUsername);
    res.json({ ok: true, blocked: list });
  });

  app.get('/community/notifications', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const unread = db.notifications
      .filter((n) => n.toUsername === username && !n.read)
      .slice(0, 20);
    for (const n of unread) n.read = true;
    if (unread.length) saveCommunity(db);
    res.json({ ok: true, notifications: unread });
  });

  app.delete('/community/blocks/:username', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const blocker = (me?.username || '').toLowerCase();
    const blocked = String(req.params.username || '').toLowerCase();
    db.blocks = db.blocks.filter(
      (b) =>
        !(b.blockerUsername === blocker && b.blockedUsername === blocked),
    );
    saveCommunity(db);
    res.json({ ok: true });
  });

  // Clubs cloud
  app.get('/community/clubs/discover', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const city = String(req.query.city || '').toLowerCase();
    const sport = String(req.query.sport || '').toLowerCase();
    let clubs = [...db.clubs];
    if (city) clubs = clubs.filter((c) => (c.city || '').toLowerCase().includes(city));
    if (sport) clubs = clubs.filter((c) => (c.sport || '').toLowerCase().includes(sport));
    const out = clubs.slice(0, 40).map((c) => ({
      ...c,
      memberCount: db.clubMembers.filter((m) => m.clubId === c.id).length,
    }));
    res.json({ ok: true, clubs: out });
  });

  app.post('/community/clubs', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const name = String(req.body?.name || '').trim().slice(0, 80);
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const club = {
      id: id('club'),
      name,
      description: String(req.body?.description || '').slice(0, 400),
      city: String(req.body?.city || '').slice(0, 80),
      sport: String(req.body?.sport || '').slice(0, 40),
      ownerUsername: username,
      createdAt: new Date().toISOString(),
    };
    db.clubs.push(club);
    db.clubMembers.push({
      clubId: club.id,
      username,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    });
    saveCommunity(db);
    res.status(201).json({ ok: true, club });
  });

  app.post('/community/clubs/:id/join', authMiddleware, (req, res) => {
    const db = loadCommunity();
    const me = loadUsers().find((u) => u.email === req.authEmail);
    const username = (me?.username || '').toLowerCase();
    const clubId = req.params.id;
    if (!db.clubs.some((c) => c.id === clubId)) {
      return res.status(404).json({ error: 'Club introuvable' });
    }
    if (!db.clubMembers.some((m) => m.clubId === clubId && m.username === username)) {
      db.clubMembers.push({
        clubId,
        username,
        role: 'member',
        joinedAt: new Date().toISOString(),
      });
      saveCommunity(db);
    }
    res.json({ ok: true });
  });

  console.log('[community] routes montées');
}
