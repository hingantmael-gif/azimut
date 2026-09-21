/* Site vitrine Mova — menu, apparitions, compteurs, avis (lecture + dépôt). Aucune dépendance. */
(function () {
  var d = document;
  d.documentElement.classList.add('js');

  // Menu mobile
  var burger = d.querySelector('.burger');
  var nav = d.querySelector('nav.main');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') nav.classList.remove('open');
    });
  }

  // Apparition douce au défilement
  var els = [].slice.call(d.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Compteurs
  [].forEach.call(d.querySelectorAll('[data-count]'), function (el) {
    var to = parseFloat(el.getAttribute('data-count'));
    if (!isFinite(to)) return;
    var run = function () {
      var t0 = null;
      var step = function (t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 1100);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('fr-FR') + (el.getAttribute('data-suffix') || '');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: 0.5 });
      o.observe(el);
    } else run();
  });

  // ——— Avis ———
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/></svg>';
  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += STAR.replace('<svg ', i <= n ? '<svg ' : '<svg class="off" ');
    return '<span class="stars" role="img" aria-label="' + n + ' sur 5">' + s + '</span>';
  }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var SPORTS = { course: 'Course à pied', velo: 'Vélo', natation: 'Natation', triathlon: 'Triathlon', musculation: 'Musculation', callisthenie: 'Callisthénie', autre: 'Autre' };
  function when(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); } catch (e) { return ''; }
  }

  function renderReviews(root, data) {
    var list = root.querySelector('[data-reviews-list]');
    var sum = root.querySelector('[data-reviews-summary]');
    if (!list) return;
    if (!data || !data.count) {
      if (sum) sum.hidden = true;
      list.innerHTML = '<div class="empty"><strong>Pas encore d’avis publié.</strong><br>Mova est tout jeune : les avis affichés ici sont uniquement ceux de vraies personnes qui l’utilisent. Sois la première à donner le tien ↓</div>';
      return;
    }
    if (sum) {
      var max = Math.max.apply(null, data.distribution.concat([1]));
      var rows = '';
      for (var i = 5; i >= 1; i--) {
        var c = data.distribution[i - 1] || 0;
        rows += '<div class="bar-row"><span>' + i + '★</span><i><b style="width:' + Math.round((c / max) * 100) + '%"></b></i><span>' + c + '</span></div>';
      }
      sum.hidden = false;
      sum.innerHTML = '<div><div class="big">' + String(data.average).replace('.', ',') + '</div>' + stars(Math.round(data.average)) + '<div class="note">' + data.count + ' avis</div></div><div class="bars">' + rows + '</div>';
    }
    list.innerHTML = data.reviews.map(function (r) {
      var meta = [r.city, r.sport && SPORTS[r.sport], when(r.at)].filter(Boolean).join(' · ');
      return '<article class="review">' + stars(r.rating) + '<p>' + esc(r.text) + '</p><div class="who"><span class="av">' + esc((r.name || '?').charAt(0).toUpperCase()) + '</span><span><strong>' + esc(r.name) + '</strong><br>' + esc(meta) + '</span></div></article>';
    }).join('');
    // Données structurées : uniquement à partir de vrais avis en nombre suffisant.
    if (data.count >= 5 && !d.getElementById('ld-rating')) {
      var s = d.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'ld-rating';
      s.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Mova', applicationCategory: 'HealthApplication', operatingSystem: 'Android, iOS, Web', aggregateRating: { '@type': 'AggregateRating', ratingValue: data.average, ratingCount: data.count, bestRating: 5, worstRating: 1 } });
      d.head.appendChild(s);
    }
  }

  window.MovaReviews = {
    init: function (api, limit) {
      var root = d.querySelector('[data-reviews]');
      if (!root) return;
      var url = api + '/reviews?limit=' + (limit || 12);
      var load = function () {
        fetch(url, { headers: { Accept: 'application/json' } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { renderReviews(root, j && j.ok ? j : null); })
          .catch(function () { renderReviews(root, null); });
      };
      load();

      var form = root.querySelector('form.rev');
      if (!form) return;
      var born = Date.now();
      var rating = 0;
      var picks = [].slice.call(form.querySelectorAll('.starpick button'));
      var msg = form.querySelector('.msg');
      var txt = form.querySelector('textarea');
      var cnt = form.querySelector('.count');
      picks.forEach(function (b, idx) {
        b.addEventListener('click', function () {
          rating = idx + 1;
          picks.forEach(function (x, j) { x.classList.toggle('on', j < rating); x.setAttribute('aria-pressed', j < rating ? 'true' : 'false'); });
        });
      });
      if (txt && cnt) txt.addEventListener('input', function () { cnt.textContent = txt.value.length + ' / 600'; });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        msg.className = 'msg';
        if (!rating) { msg.textContent = 'Choisis une note en touchant les étoiles.'; msg.className = 'msg err'; return; }
        var btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        var body = {
          rating: rating,
          name: form.elements.name.value,
          city: form.elements.city.value,
          sport: form.elements.sport.value,
          text: form.elements.text.value,
          website: form.elements.website.value,
          elapsedMs: Date.now() - born
        };
        fetch(api + '/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (res.ok) {
              msg.textContent = 'Merci ! Ton avis est publié.';
              msg.className = 'msg ok';
              form.reset();
              rating = 0;
              picks.forEach(function (x) { x.classList.remove('on'); });
              if (cnt) cnt.textContent = '0 / 600';
              load();
            } else {
              msg.textContent = (res.j && res.j.error) || 'Impossible d’envoyer ton avis pour le moment.';
              msg.className = 'msg err';
            }
          })
          .catch(function () { msg.textContent = 'Connexion impossible : réessaie dans un instant.'; msg.className = 'msg err'; })
          .then(function () { btn.disabled = false; });
      });
    }
  };

  // Les avis ne sont demandés à l'API que lorsque la section approche de l'écran (pas de requête inutile, page plus rapide).
  var rv = d.querySelector('[data-reviews]');
  if (rv) {
    var startReviews = function () {
      if (rv.getAttribute('data-started')) return;
      rv.setAttribute('data-started', '1');
      window.MovaReviews.init(rv.getAttribute('data-api'), parseInt(rv.getAttribute('data-limit'), 10) || 12);
    };
    if ('IntersectionObserver' in window) {
      var ro = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { startReviews(); ro.disconnect(); } }, { rootMargin: '500px 0px' });
      ro.observe(rv);
    } else startReviews();
    if (location.hash === '#donner-mon-avis') startReviews();
  }

  // Bouton d'appel à l'action collé en bas sur mobile, une fois le premier écran passé.
  var sticky = d.querySelector('.sticky-cta');
  if (sticky) {
    var tick = false;
    var onScroll = function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        sticky.classList.toggle('show', window.scrollY > 700);
        tick = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Navigation instantanée : la page visée est préchargée dès que le doigt / la souris s'en approche.
  var seen = {};
  var prefetch = function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.origin !== location.origin || a.pathname === location.pathname || seen[a.pathname]) return;
    if (!/\.html$/.test(a.pathname) && a.pathname !== '/') return;
    seen[a.pathname] = 1;
    var l = d.createElement('link');
    l.rel = 'prefetch';
    l.href = a.pathname;
    d.head.appendChild(l);
  };
  d.addEventListener('pointerover', prefetch, { passive: true });
  d.addEventListener('touchstart', prefetch, { passive: true });
})();
