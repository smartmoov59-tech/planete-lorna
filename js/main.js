/* ==========================================================================
   Planète Lorna — mouvement (GSAP + ScrollTrigger + Lenis)
   Règles : courbes douces (power3 / expo), transform + opacity en priorité,
   version allégée sur mobile et si « réduire les animations » est activé.
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SITE = window.SITE || {};
  if (reduce) root.classList.add('reduce');
  try { history.scrollRestoration = 'manual'; } catch (e) {}

  /* Sécurité : si GSAP n'a pas chargé, on montre simplement le contenu */
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    const l = $('.loader'); if (l) l.style.display = 'none';
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Calendrier de l'Avent désactivable depuis config.js */
  if (SITE.avent && SITE.avent.show === false) {
    $$('[data-advent-section],[data-avent],[data-book="avent"]').forEach(n => n.remove());
  }

  /* ------------------------------------------------------------------ *
   *  Découpe de texte (mots + lettres) en gardant le HTML (<em>)
   * ------------------------------------------------------------------ */
  function splitText(el) {
    if (el.dataset.splitDone) return [];
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const frag = document.createDocumentFragment();
    const chars = [];
    const walk = (node, parent) => {
      node.childNodes.forEach(ch => {
        if (ch.nodeType === 3) {
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            Array.from(part).forEach(chr => {
              const c = document.createElement('span'); c.className = 'c'; c.textContent = chr;
              wi.appendChild(c); chars.push(c);
            });
            w.appendChild(wi); parent.appendChild(w);
          });
        } else if (ch.nodeType === 1) {
          const clone = ch.cloneNode(false); parent.appendChild(clone); walk(ch, clone);
        }
      });
    };
    walk(el, frag);
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true'); vis.appendChild(frag);
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = label;
    el.textContent = ''; el.append(sr, vis); el.dataset.splitDone = '1';
    return chars;
  }

  /* ------------------------------------------------------------------ *
   *  Défilement fluide (Lenis)
   * ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  window.__lenis = lenis;
  const scrollToEl = (target, opts = {}) => {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, Object.assign({ duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4) }, opts));
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  window.__scrollToEl = scrollToEl;

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = id === '#top' ? document.body : $(id);
    if (!t) return;
    e.preventDefault();
    closeMenu(true);
    if (id === '#top') { lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0 }); return; }
    scrollToEl(t);
    history.replaceState(null, '', id);
  });

  /* ------------------------------------------------------------------ *
   *  Barre de progression + navigation qui se cache
   * ------------------------------------------------------------------ */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  const nav = $('#nav');
  let navHidden = false;
  let menuOpen = false;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 60);
      if (menuOpen) return;
      if (self.direction === 1 && y > 260 && !navHidden) { navHidden = true; gsap.to(nav, { yPercent: -110, duration: 0.6, ease: 'power3.out' }); }
      else if ((self.direction === -1 || y <= 260) && navHidden) { navHidden = false; gsap.to(nav, { yPercent: 0, duration: 0.6, ease: 'power3.out' }); }
    }
  });

  /* ------------------------------------------------------------------ *
   *  Menu mobile plein écran
   * ------------------------------------------------------------------ */
  const burger = $('#burger'), menu = $('#menu');
  gsap.set('.menu__bg', { yPercent: -100 });
  const mtl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
    .set(menu, { visibility: 'visible' })
    .to('.menu__bg', { yPercent: 0, duration: 0.9 })
    .fromTo('.menu__nav a', { y: 70, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.05, ease: 'expo.out' }, 0.35)
    .fromTo('.menu__foot > *', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06, ease: 'expo.out' }, 0.7);
  mtl.eventCallback('onReverseComplete', () => gsap.set(menu, { visibility: 'hidden' }));
  function openMenu() {
    menuOpen = true; burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fermer le menu');
    menu.setAttribute('aria-hidden', 'false'); mtl.timeScale(1).play();
    lenis ? lenis.stop() : (document.body.style.overflow = 'hidden');
    gsap.to(nav, { yPercent: 0, duration: .3 });
  }
  function closeMenu(instant) {
    if (!menuOpen) return;
    menuOpen = false; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', 'true'); mtl.timeScale(instant ? 2.2 : 1.4).reverse();
    lenis ? lenis.start() : (document.body.style.overflow = '');
  }
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ------------------------------------------------------------------ *
   *  Curseur (souris uniquement)
   * ------------------------------------------------------------------ */
  if (finePointer && !reduce) {
    const cur = $('.cursor');
    const qx = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
    const qy = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); cur.style.opacity = 1; }, { passive: true });
    document.addEventListener('pointerover', e => {
      const hot = e.target.closest('a,button,[data-tilt],input,textarea,label');
      gsap.to(cur, { scale: hot ? 1.8 : 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    });
    document.addEventListener('pointerleave', () => { cur.style.opacity = 0; });
  }

  /* ------------------------------------------------------------------ *
   *  Boutons aimantés + remplissage animé
   * ------------------------------------------------------------------ */
  $$('[data-magnetic]').forEach(el => {
    const setFill = e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', (e.clientX - r.left) + 'px');
      el.style.setProperty('--y', (e.clientY - r.top) + 'px');
    };
    el.addEventListener('pointerenter', setFill);
    el.addEventListener('pointermove', e => {
      setFill(e);
      if (!finePointer || reduce) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: x * 0.28, y: y * 0.38, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
    });
    el.addEventListener('pointerleave', e => {
      setFill(e);
      if (finePointer && !reduce) gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,0.4)', overwrite: 'auto' });
    });
  });

  /* ------------------------------------------------------------------ *
   *  Inclinaison 3D + reflet qui suit la souris
   * ------------------------------------------------------------------ */
  if (finePointer && !reduce) {
    $$('[data-tilt], .tile > button').forEach(el => {
      const amp = el.matches('[data-tilt]') ? 11 : 5;
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * amp * 2); rx(-(py - 0.5) * amp * 2);
        el.style.setProperty('--mx', (px * 100) + '%'); el.style.setProperty('--my', (py * 100) + '%');
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Orbites : une perle qui tourne (fil rouge)
   * ------------------------------------------------------------------ */
  const orbits = $$('[data-orbit]').map(el => ({
    el, bead: $('.orbit__bead', el), a: Math.random() * 6.28, speed: parseFloat(el.dataset.speed) || 0.2, w: 0, h: 0, on: false
  }));
  const measureOrbits = () => orbits.forEach(o => { o.w = o.el.offsetWidth; o.h = o.el.offsetHeight; });
  measureOrbits();
  addEventListener('resize', measureOrbits);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { const o = orbits.find(x => x.el === en.target); if (o) o.on = en.isIntersecting; }), { rootMargin: '150px' });
    orbits.forEach(o => io.observe(o.el));
  } else orbits.forEach(o => (o.on = true));
  const placeBead = o => gsap.set(o.bead, { x: o.w / 2 + (o.w / 2 - 2) * Math.cos(o.a), y: o.h / 2 + (o.h / 2 - 2) * Math.sin(o.a) });
  orbits.forEach(placeBead);
  if (!reduce) gsap.ticker.add((t, dt) => orbits.forEach(o => { if (!o.on) return; o.a += o.speed * dt / 1000; placeBead(o); }));

  /* ------------------------------------------------------------------ *
   *  Bandeaux défilants : vitesse et sens réagissent au scroll
   * ------------------------------------------------------------------ */
  if (!reduce) {
    const rows = $$('[data-marquee]').map(el => {
      const inner = $('.marquee__inner', el);
      return { el, inner, dir: parseInt(el.dataset.marquee, 10) || 1, x: 0, w: 0, setX: gsap.quickSetter(inner, 'x', 'px'), setSkew: gsap.quickSetter(el, 'skewX', 'deg') };
    });
    const measure = () => rows.forEach(r => { r.w = r.inner.scrollWidth / 2; });
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    let lastY = scrollY, vel = 0, dirScroll = 1;
    gsap.ticker.add((t, dt) => {
      const y = scrollY, d = y - lastY; lastY = y;
      vel += (d - vel) * 0.12;
      if (Math.abs(d) > 0.5) dirScroll = Math.sign(d);
      const boost = Math.min(Math.abs(vel) * 60, 1100);
      rows.forEach(r => {
        if (!r.w) return;
        r.x -= (70 + boost) * r.dir * dirScroll * dt / 1000;
        if (r.x <= -r.w) r.x += r.w; else if (r.x > 0) r.x -= r.w;
        r.setX(r.x);
        r.setSkew(gsap.utils.clamp(-7, 7, -vel * 0.5 * r.dir));
      });
    });
  }

  /* ------------------------------------------------------------------ *
   *  Vidéos : lecture seulement quand elles sont visibles
   * ------------------------------------------------------------------ */
  const heroVideo = $('.hero__video');
  if (heroVideo) {
    if (reduce) { heroVideo.pause(); heroVideo.removeAttribute('autoplay'); }
    else { heroVideo.play().catch(() => {}); }
  }
  if ('IntersectionObserver' in window && !reduce) {
    const vio = new IntersectionObserver(es => es.forEach(en => {
      const v = en.target;
      if (v.dataset.lazyvideo !== undefined && !v.dataset.ready) {
        if (!en.isIntersecting) return;
        $$('source[data-src]', v).forEach(s => (s.src = s.dataset.src));
        v.load(); v.dataset.ready = '1';
      }
      if (en.isIntersecting) v.play().catch(() => {}); else v.pause();
    }), { threshold: 0.05 });
    $$('video').forEach(v => vio.observe(v));
  }

  /* Poussière d'étoiles du hero */
  const dust = $('.hero__dust');
  if (dust && !reduce) {
    const n = innerWidth < 700 ? 14 : 30;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${(Math.random() * 5).toFixed(2)}s;animation-duration:${(3 + Math.random() * 4).toFixed(2)}s;transform:scale(${(0.6 + Math.random() * 1.2).toFixed(2)})`;
      dust.appendChild(s);
    }
  }

  /* ------------------------------------------------------------------ *
   *  États initiaux (cachés derrière le préchargeur) + titres découpés
   * ------------------------------------------------------------------ */
  const heroChars = $$('[data-hero-line]').flatMap(splitText);
  const splitTargets = $$('[data-split]').map(el => ({ el, chars: splitText(el) }));
  const loaderChars = splitText($('.loader__name'));
  if (!reduce) {
    gsap.set(heroChars, { yPercent: 118 });
    splitTargets.forEach(t => gsap.set(t.chars, { yPercent: 118 }));
    gsap.set(loaderChars, { yPercent: 118 });
  }
  $$('.eyebrow').forEach(e => e.setAttribute('data-reveal', ''));
  const revealEls = $$('[data-reveal]');
  if (!reduce) gsap.set(revealEls, { autoAlpha: 0, y: 36 });

  /* ------------------------------------------------------------------ *
   *  Préchargeur → entrée spectaculaire
   * ------------------------------------------------------------------ */
  let introRan = false, finished = false;
  function runLoader() {
    const loader = $('.loader');
    /* Filet de sécurité : le préchargeur ne doit jamais bloquer le site plus de 9 s */
    if (loader) setTimeout(() => { if (!finished) { gsap.killTweensOf('.loader__center,.loader__panels i'); intro(); finish(); } }, 9000);
    const finish = () => {
      if (finished) return; finished = true;
      if (loader) loader.style.display = 'none';
      ScrollTrigger.refresh();
      if (lenis) lenis.start();
      window.dispatchEvent(new Event('lorna:ready'));
    };
    if (!loader || getComputedStyle(loader).display === 'none') { intro(); finish(); return; }
    if (reduce) {
      gsap.to(loader, { opacity: 0, duration: 0.4, onComplete: () => { loader.style.display = 'none'; } });
      intro(); finish(); return;
    }
    const counter = $('.loader__count span');
    const st = { v: 0 };
    const ready = new Promise(res => {
      const done = () => res();
      if (!heroVideo || heroVideo.readyState >= 3) return done();
      heroVideo.addEventListener('canplay', done, { once: true });
      setTimeout(done, 2000);
    });
    const tl = gsap.timeline();
    tl.to(st, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { counter.textContent = Math.round(st.v); } }, 0)
      .fromTo('.loader__gem .f', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.14, ease: 'back.out(1.8)' }, 0.05)
      .to(loaderChars, { yPercent: 0, duration: 0.9, stagger: 0.04, ease: 'expo.out' }, 0.25);
    tl.eventCallback('onComplete', () => {
      ready.then(() => {
        const out = gsap.timeline({ onComplete: finish });
        out.to('.loader__center', { scale: 1.5, autoAlpha: 0, duration: 0.65, ease: 'power3.in' })
          .to('.loader__panels i', { yPercent: -102, duration: 1.05, ease: 'expo.inOut', stagger: { each: 0.08, from: 'center' } }, '-=0.3')
          .add(intro, '-=0.75');
      });
    });
  }

  function intro() {
    if (introRan) return; introRan = true;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (!reduce) {
      tl.to(heroChars, { yPercent: 0, duration: 1.6, stagger: 0.045 }, 0)
        .from('.hero__eyebrow', { y: 24, autoAlpha: 0, duration: 1.1 }, 0.15)
        .from('.hero__lead', { y: 30, autoAlpha: 0, duration: 1.2 }, 0.55)
        .from('.hero__cta .btn', { y: 34, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, 0.7)
        .from('.hero__foot > *', { y: 22, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, 0.95)
        .from('.hero__ribbon', { x: 40, autoAlpha: 0, duration: 1.1 }, 1.05)
        .from('.nav', { yPercent: -100, duration: 1.1 }, 0.8)
        .from('.orbit--hero', { autoAlpha: 0, scale: 0.85, duration: 2.2 }, 0.2);
    }
    setupScroll();
  }

  /* ------------------------------------------------------------------ *
   *  Animations liées au scroll
   * ------------------------------------------------------------------ */
  let scrollReady = false;
  function setupScroll() {
    if (scrollReady) return; scrollReady = true;

    /* Titres : lettre par lettre, masque qui monte */
    if (!reduce) splitTargets.forEach(t => ScrollTrigger.create({
      trigger: t.el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(t.chars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: { each: 0.016 } })
    }));
    /* Éléments qui montent en douceur */
    if (!reduce) ScrollTrigger.batch(revealEls, {
      start: 'top 90%', once: true,
      onEnter: b => gsap.to(b, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, overwrite: true })
    });

    /* Compteurs */
    $$('.count').forEach(el => {
      const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || 0, 10);
      const fmt = v => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (reduce) { el.textContent = fmt(target); return; }
      el.textContent = fmt(0);
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } })
      });
    });

    if (reduce) { $$('.story__img').forEach(f => (f.style.clipPath = 'none')); return; }

    /* ---- HERO : parallaxe multicouche ---- */
    const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('[data-hero-bg]', { yPercent: 14, scale: 1.1, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero__inner', { y: -90, autoAlpha: 0.1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '75% top', scrub: true } });
    gsap.to('.orbit--hero', { rotation: -6, scale: 1.12, ease: 'none', scrollTrigger: heroST });
    $$('.shard').forEach(s => {
      const sp = parseFloat(s.dataset.speed) || 1;
      gsap.to(s, { y: () => -innerHeight * 0.38 * sp, rotation: () => (sp - 0.9) * 40, ease: 'none', scrollTrigger: heroST });
      if (finePointer) {
        const qx = gsap.quickTo(s, 'x', { duration: 1.2, ease: 'power3.out' });
        $('.hero').addEventListener('pointermove', e => qx((e.clientX / innerWidth - 0.5) * -40 * sp));
      }
    });
    gsap.to('.hero__video', { scale: 1.08, duration: 22, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    /* ---- Images qui bougent dans leur cadre ---- */
    $$('.tile__img img').forEach(img => gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.closest('.tile'), start: 'top bottom', end: 'bottom top', scrub: true } }));

    /* ---- Bandeau : cercle qui s'agrandit + Ken Burns + parallaxe ---- */
    gsap.fromTo('.band__mask', { clipPath: 'circle(9% at 50% 50%)' }, { clipPath: 'circle(76% at 50% 50%)', ease: 'none', scrollTrigger: { trigger: '.band', start: 'top 90%', end: 'top 15%', scrub: true } });
    gsap.fromTo('.band__img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.band__img', { scale: 1.12, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    /* ---- Rideaux sur images / carte ---- */
    $$('[data-curtain]').forEach(el => {
      const inner = $('img, iframe', el);
      if (!inner) return;
      gsap.fromTo(inner, { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.25 }, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });

    /* ---- Galerie : apparition en cascade ---- */
    gsap.set('.tile', { autoAlpha: 0, y: 70 });
    ScrollTrigger.batch('.tile', { start: 'top 92%', once: true, onEnter: b => gsap.to(b, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }) });

    /* ---- Avis : apparition ---- */
    gsap.set('.rcard', { autoAlpha: 0, y: 60 });
    ScrollTrigger.create({ trigger: '#rev', start: 'top 88%', once: true, onEnter: () => gsap.to('.rcard', { autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.12 }) });

    /* ---- Pied de page : le grand nom se lève ---- */
    gsap.fromTo('.foot__giant', { yPercent: 35, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: '.foot__giant', start: 'top 105%', end: 'top 65%', scrub: true } });

    /* ================= Mises en scène épinglées (bureau uniquement) ================= */
    const mm = gsap.matchMedia();

    mm.add('(min-width: 901px)', () => {
      /* ---- HISTOIRE : section épinglée, storytelling étape par étape ---- */
      const steps = $$('.story__step'), imgs = $$('.story__img'), dots = $$('.story__dots li');
      const hidden = 'polygon(50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%,50% 50%)';
      const full = 'polygon(0% 0%,50% 0%,100% 0%,100% 50%,100% 100%,50% 100%,0% 100%,0% 50%)';
      gsap.set(imgs.slice(1), { clipPath: hidden });
      gsap.set(imgs[0], { clipPath: full });
      gsap.set(steps, { autoAlpha: 0, y: 50 }); gsap.set(steps[0], { autoAlpha: 1, y: 0 });
      steps.forEach(s => s.classList.remove('is-active'));
      const GAP = 1.25;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.story', start: 'top top', end: '+=380%', pin: true, scrub: 0.8, anticipatePin: 1 },
        onUpdate: () => {
          const t = tl.time();
          const idx = Math.min(steps.length - 1, Math.floor((t + 0.4) / GAP));
          dots.forEach((d, i) => d.classList.toggle('is-on', i <= idx));
        }
      });
      tl.fromTo(imgs[0].querySelector('img'), { scale: 1.18 }, { scale: 1, duration: GAP * 0.9 }, 0);
      for (let i = 1; i < steps.length; i++) {
        const at = i * GAP;
        tl.to(steps[i - 1], { autoAlpha: 0, y: -40, duration: 0.4, ease: 'power2.in' }, at)
          .to(imgs[i], { clipPath: full, duration: 0.85, ease: 'power2.inOut' }, at)
          .fromTo(imgs[i].querySelector('img'), { scale: 1.3 }, { scale: 1, duration: GAP * 0.95, ease: 'power1.out' }, at)
          .fromTo(steps[i], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at + 0.38);
      }
      tl.to({}, { duration: 0.9 });
      tl.to('.orbit--story', { rotation: 140, duration: tl.duration() }, 0);

      /* ---- PIERRES : défilement horizontal piloté par le scroll vertical ---- */
      const track = $('.hs__track'), bar = $('.hs__bar span');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const hs = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.hs', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: self => { bar.style.transform = 'scaleX(' + self.progress + ')'; }
        }
      });
      $$('.pcard__img img').forEach(img => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.pcard'), containerAnimation: hs, start: 'left right', end: 'right left', scrub: true } }));
    });

    /* Mobile / tablette : version allégée, pas d'épinglage */
    mm.add('(max-width: 900px)', () => {
      $$('.story__img, .pcard').forEach(el => gsap.from(el, { autoAlpha: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
      $$('.story__step').forEach(el => gsap.from(el, { autoAlpha: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    });

    addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* Démarrage (filet de sécurité : si « load » traîne trop, on lance quand même) */
  let started = false;
  const start = () => { if (started) return; started = true; runLoader(); };
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  setTimeout(start, 5000);
})();
