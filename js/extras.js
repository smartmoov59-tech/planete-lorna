/* ==========================================================================
   Planète Lorna — détails qui surprennent
   composeur de bracelet · calendrier de l'Avent · galerie plein écran · avis
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasG = typeof gsap !== 'undefined';
  const NS = 'http://www.w3.org/2000/svg';

  /* ====================================================================
   *  1. Composeur de bracelet
   * ==================================================================== */
  const STONES = [
    { id: 'ameth', nom: 'Améthyste', c: '#8b5cc8' },
    { id: 'rose', nom: 'Quartz rose', c: '#f1bccb' },
    { id: 'cristal', nom: 'Cristal de roche', c: '#e2eff5' },
    { id: 'tigre', nom: 'Œil de tigre', c: '#b0731f' },
    { id: 'lapis', nom: 'Lapis-lazuli', c: '#2b4c9b' },
    { id: 'obs', nom: 'Obsidienne', c: '#241d2c' },
    { id: 'labra', nom: 'Labradorite', c: '#4e8a97' },
    { id: 'mala', nom: 'Malachite', c: '#1f8a5b' }
  ];
  const mix = (hex, to, t) => {
    const h = hex.replace('#', ''), r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const k = to === 'w' ? 255 : 0, f = v => Math.round(v + (k - v) * t).toString(16).padStart(2, '0');
    return '#' + f(r) + f(g) + f(b);
  };

  const builder = $('#builder');
  if (builder) {
    const N = 12, R = 108;
    const defs = $('#builder-defs'), gBeads = $('#builder-beads'), stonesBox = $('#builder-stones'), sum = $('#builder-sum');
    const beads = new Array(N).fill(null);
    let sel = 0;

    STONES.forEach(s => {
      const g = document.createElementNS(NS, 'radialGradient');
      g.setAttribute('id', 'g-' + s.id); g.setAttribute('cx', '.34'); g.setAttribute('cy', '.28'); g.setAttribute('r', '.85');
      [[0, mix(s.c, 'w', .6)], [.5, s.c], [1, mix(s.c, 'b', .45)]].forEach(([o, c]) => {
        const st = document.createElementNS(NS, 'stop'); st.setAttribute('offset', o); st.setAttribute('stop-color', c); g.appendChild(st);
      });
      defs.appendChild(g);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'stone'; b.style.setProperty('--sc', s.c);
      b.setAttribute('aria-label', s.nom); b.title = s.nom;
      b.addEventListener('click', () => place(s));
      stonesBox.appendChild(b);
    });

    const els = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'bead'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('transform', `translate(${(Math.cos(a) * R).toFixed(2)} ${(Math.sin(a) * R).toFixed(2)})`);
      const ring = document.createElementNS(NS, 'circle'); ring.setAttribute('class', 'ring'); ring.setAttribute('r', '20');
      const body = document.createElementNS(NS, 'circle'); body.setAttribute('class', 'body'); body.setAttribute('r', '15');
      const hi = document.createElementNS(NS, 'circle'); hi.setAttribute('r', '15'); hi.setAttribute('fill', 'none'); hi.setAttribute('stroke', 'rgba(255,255,255,.1)');
      const inner = document.createElementNS(NS, 'g'); inner.setAttribute('class', 'pop'); inner.append(body, hi);
      g.append(ring, inner); gBeads.appendChild(g);
      g.addEventListener('click', () => select(i));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
      els.push({ g, body, inner });
    }
    function paint(i, animate) {
      const e = els[i], s = beads[i];
      e.body.setAttribute('fill', s ? `url(#g-${s.id})` : 'rgba(246,240,250,.07)');
      e.body.setAttribute('stroke', s ? 'none' : 'rgba(246,240,250,.35)');
      e.body.setAttribute('stroke-dasharray', s ? '' : '3 4');
      e.g.setAttribute('aria-label', `Perle ${i + 1} : ${s ? s.nom : 'vide'}`);
      if (animate && hasG && !reduce) gsap.fromTo(e.inner, { scale: .3, svgOrigin: '0 0' }, { scale: 1, duration: .9, ease: 'elastic.out(1,.45)' });
    }
    function select(i) { sel = i; els.forEach((e, k) => e.g.classList.toggle('is-sel', k === i)); }
    function place(s) { beads[sel] = s; paint(sel, true); select((sel + 1) % N); summary(); }
    function summary() {
      const count = {}; beads.forEach(b => { if (b) count[b.nom] = (count[b.nom] || 0) + 1; });
      const names = Object.keys(count), done = beads.filter(Boolean).length;
      sum.textContent = done
        ? `${done} perle${done > 1 ? 's' : ''} sur ${N} : ` + names.map(n => `${count[n]} × ${n}`).join(', ') + (done < N ? `. Il en reste ${N - done} à choisir (ou laissez Lorna décider).` : '. Votre bracelet est complet !')
        : 'Cliquez sur une pierre pour commencer.';
    }
    $('#builder-clear').addEventListener('click', () => { beads.fill(null); els.forEach((_, i) => paint(i)); select(0); summary(); });
    $('#builder-shuffle').addEventListener('click', () => {
      for (let i = 0; i < N; i++) { beads[i] = STONES[Math.floor(Math.random() * STONES.length)]; paint(i, false); }
      if (hasG && !reduce) gsap.fromTo(els.map(e => e.inner), { scale: .2, svgOrigin: '0 0' },{ scale: 1, duration: .9, ease: 'elastic.out(1,.5)', stagger: .04 });
      summary();
    });
    $('#builder-send').addEventListener('click', () => {
      if (!beads.some(Boolean)) { sum.textContent = 'Choisissez au moins une pierre avant d\'envoyer votre idée à Lorna.'; return; }
      const chosen = beads.map((b, i) => (b ? `${i + 1}. ${b.nom}` : null)).filter(Boolean).join(' · ');
      const free = beads.some(b => !b) ? ' Les perles non précisées sont au choix de Lorna.' : '';
      const note = `Mon idée de bracelet (${N} perles) : ${chosen}.${free} Tour de poignet : … cm.`;
      if (window.Lorna) window.Lorna.book('creation', note);
    });
    els.forEach((_, i) => paint(i)); select(0);
  }

  /* ====================================================================
   *  2. Calendrier de l'Avent : 24 cases à ouvrir (jeu d'illustration)
   * ==================================================================== */
  const doors = $('#doors');
  if (doors) {
    const COLORS = ['#9b6bff', '#f4c6d7', '#d9b26a', '#6ee7a8', '#7fb2ff', '#ff9bb3', '#c9a8ff', '#ffd56a'];
    for (let i = 1; i <= 24; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'door'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', `Case ${i}, fermée`);
      b.style.setProperty('--g', COLORS[(i * 5) % COLORS.length]);
      b.innerHTML = `<span class="door__in"><span class="door__f"><span>${i}</span></span><span class="door__b"><svg aria-hidden="true"><use href="#gem"/></svg></span></span>`;
      b.addEventListener('click', () => {
        const open = b.classList.toggle('is-open');
        b.setAttribute('aria-pressed', open); b.setAttribute('aria-label', `Case ${i}, ${open ? 'ouverte' : 'fermée'}`);
        if (open) sparkle(b);
      });
      doors.appendChild(b);
    }
    function sparkle(el) {
      if (!hasG || reduce) return;
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let k = 0; k < 12; k++) {
        const s = document.createElement('span'); s.className = 'spark';
        s.innerHTML = '<svg width="8" height="8" aria-hidden="true"><use href="#spark"/></svg>';
        s.style.left = cx + 'px'; s.style.top = cy + 'px'; document.body.appendChild(s);
        const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 60;
        gsap.fromTo(s, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, opacity: 0, duration: .9 + Math.random() * .5, ease: 'power3.out', delay: .25, onComplete: () => s.remove() });
      }
    }
  }

  /* ====================================================================
   *  3. Galerie plein écran
   * ==================================================================== */
  const triggers = $$('[data-lightbox]');
  if (triggers.length) {
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Galerie photo');
    lb.innerHTML = '<button type="button" class="lb__x" aria-label="Fermer"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg></button>' +
      '<button type="button" class="lb__p" aria-label="Photo précédente"><svg width="22" height="22" style="transform:scaleX(-1)"><use href="#arrow"/></svg></button>' +
      '<button type="button" class="lb__n" aria-label="Photo suivante"><svg width="22" height="22"><use href="#arrow"/></svg></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(lb);
    const img = $('img', lb), cap = $('figcaption', lb);
    const items = triggers.map(t => ({ src: $('img', t).currentSrc || $('img', t).src, alt: $('img', t).alt, cap: $('figcaption', t).textContent, el: t }));
    let cur = 0, openFrom = null;
    const show = (i, dir = 0) => {
      cur = (i + items.length) % items.length;
      const it = items[cur];
      img.src = it.src; img.alt = it.alt; cap.textContent = it.cap;
      if (hasG && !reduce) gsap.fromTo(img, { autoAlpha: 0, x: dir * 60, scale: .96 }, { autoAlpha: 1, x: 0, scale: 1, duration: .7, ease: 'expo.out' });
    };
    const open = i => {
      openFrom = document.activeElement; show(i); lb.classList.add('is-open');
      if (window.__lenis) window.__lenis.stop(); else document.body.style.overflow = 'hidden';
      $('.lb__x', lb).focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      if (window.__lenis) window.__lenis.start(); else document.body.style.overflow = '';
      if (openFrom) openFrom.focus();
    };
    triggers.forEach((t, i) => t.addEventListener('click', () => open(i)));
    $('.lb__x', lb).addEventListener('click', close);
    $('.lb__p', lb).addEventListener('click', () => show(cur - 1, -1));
    $('.lb__n', lb).addEventListener('click', () => show(cur + 1, 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1, -1);
      else if (e.key === 'ArrowRight') show(cur + 1, 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ====================================================================
   *  4. Avis : carrousel qui défile tout seul (et se laisse prendre en main)
   * ==================================================================== */
  const rev = $('#rev');
  if (rev) {
    const cards = $$('.rcard', rev);
    const step = dir => {
      const c = cards[0], gap = parseFloat(getComputedStyle(rev).columnGap || getComputedStyle(rev).gap) || 24;
      rev.scrollBy({ left: dir * (c.offsetWidth + gap), behavior: reduce ? 'auto' : 'smooth' });
    };
    $('#rev-prev').addEventListener('click', () => { pause(); step(-1); });
    $('#rev-next').addEventListener('click', () => { pause(); step(1); });

    const dots = document.createElement('div'); dots.className = 'rev__dots'; dots.setAttribute('aria-hidden', 'true');
    cards.forEach(() => dots.appendChild(document.createElement('i')));
    rev.after(dots);
    const updateDots = () => {
      const c = cards[0], gap = parseFloat(getComputedStyle(rev).columnGap) || 24;
      const idx = Math.round(rev.scrollLeft / (c.offsetWidth + gap));
      $$('i', dots).forEach((d, i) => d.classList.toggle('is-on', i === Math.min(idx, cards.length - 1)));
    };
    rev.addEventListener('scroll', updateDots, { passive: true }); updateDots();

    let timer = null, paused = false, visible = false;
    const tick = () => {
      if (paused || !visible || document.hidden) return;
      const atEnd = rev.scrollLeft + rev.clientWidth >= rev.scrollWidth - 4;
      if (atEnd) rev.scrollTo({ left: 0, behavior: 'smooth' }); else step(1);
    };
    function pause() { paused = true; clearInterval(timer); }
    if (!reduce) {
      timer = setInterval(tick, 5200);
      ['pointerdown', 'focusin', 'wheel', 'touchstart'].forEach(ev => rev.addEventListener(ev, pause, { passive: true }));
      rev.addEventListener('pointerenter', () => { paused = true; });
      rev.addEventListener('pointerleave', () => { if (!rev.matches(':focus-within')) paused = false; });
      if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: .35 }).observe(rev);
    }
  }
})();
