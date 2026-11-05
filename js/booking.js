/* ==========================================================================
   Planète Lorna — réservation sans back-end, sans abonnement
   La demande est composée ici puis envoyée par l'utilisateur lui-même :
   e-mail pré-rempli (mailto), SMS (si un mobile est renseigné), Messenger,
   fichier agenda .ics, ou appel. Rien n'est stocké ni transmis par le site.
   ========================================================================== */
(() => {
  'use strict';
  const S = window.SITE;
  if (!S) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const pad = n => String(n).padStart(2, '0');
  const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const fmtTime = min => `${Math.floor(min / 60)}h${pad(min % 60)}`;
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Heure de Paris, horaires, statut « ouvert maintenant » ---------- */
  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date());
    const o = {}; parts.forEach(p => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, dow: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[o.weekday], min: (+o.hour) * 60 + (+o.minute) };
  }
  const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const ranges = (dow, k) => ((S.fermetures || []).includes(k) ? [] : (S.horaires[dow] || []).map(([a, b]) => [toMin(a), toMin(b)]));

  function statusInfo() {
    const n = parisNow(), rs = ranges(n.dow, key(n.y, n.m, n.d));
    for (const [a, b] of rs) if (n.min >= a && n.min < b) return { open: true, txt: `Ouvert maintenant · ferme à ${fmtTime(b)}` };
    for (const [a] of rs) if (n.min < a) return { open: false, txt: `Fermé · ouvre aujourd'hui à ${fmtTime(a)}` };
    const base = Date.UTC(n.y, n.m - 1, n.d);
    for (let i = 1; i <= 9; i++) {
      const dt = new Date(base + i * 864e5), dow = dt.getUTCDay();
      const r = ranges(dow, key(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
      if (r.length) return { open: false, txt: `Fermé · ouvre ${i === 1 ? 'demain' : DAYS[dow]} à ${fmtTime(r[0][0])}` };
    }
    return { open: false, txt: 'Fermé' };
  }
  function renderStatus() {
    const s = statusInfo(), n = parisNow();
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', s.open); el.classList.toggle('is-closed', !s.open);
      $('.status__txt', el).textContent = s.txt;
    });
    $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.dow === n.dow));
  }
  renderStatus(); setInterval(renderStatus, 60000);

  /* ---------- Réservation : assistant en 4 étapes ---------- */
  const form = $('#bform');
  if (!form) return;
  const ICON = { conseil: 'gem', soin: 'spark', creation: 'star', cadeau: 'chat', piece: 'pin', avent: 'cal' };
  const services = S.services.filter(s => !(S.avent && S.avent.show === false && s.id === 'avent'));
  const state = { step: 1, svc: null, date: null, time: null, view: null };
  const n0 = parisNow();
  state.view = { y: n0.y, m: n0.m };

  const svcBox = $('#svc');
  services.forEach(s => {
    const lab = document.createElement('label');
    lab.className = 'svc__item';
    lab.innerHTML = `<input type="radio" name="svc" value="${s.id}"><span class="svc__ico"><svg width="22" height="22" aria-hidden="true"><use href="#${ICON[s.id] || 'gem'}"/></svg></span><span class="svc__t"><b></b><small></small></span><span class="svc__d"></span>`;
    $('b', lab).textContent = s.titre;
    $('small', lab).textContent = s.resume + (s.prix ? ' · ' + s.prix : '');
    $('.svc__d', lab).textContent = '≈ ' + s.duree + ' min';
    svcBox.appendChild(lab);
  });
  svcBox.addEventListener('change', e => {
    state.svc = services.find(s => s.id === e.target.value) || null;
    if (state.time != null && !slotsFor(state.date.y, state.date.m, state.date.d).includes(state.time)) state.time = null;
    renderCal(); renderSlots(); clearErr();
  });

  /* Créneaux : calculés à partir des horaires d'ouverture et de la durée de la prestation */
  function slotsFor(y, m, d) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(), k = key(y, m, d);
    const dur = state.svc ? state.svc.duree : 30, n = parisNow();
    const isToday = n.y === y && n.m === m && n.d === d;
    const out = [];
    ranges(dow, k).forEach(([a, b]) => {
      for (let t = a; t + dur <= b; t += S.pasCreneau) {
        if (isToday && t < n.min + S.delaiMinutes) continue;
        out.push(t);
      }
    });
    return out;
  }
  const diffDays = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(n0.y, n0.m - 1, n0.d)) / 864e5;

  const calTitle = $('#cal-title'), calGrid = $('#cal-grid'), calPrev = $('#cal-prev'), calNext = $('#cal-next');
  function renderCal() {
    const { y, m } = state.view;
    const first = new Date(Date.UTC(y, m - 1, 1)), dim = new Date(Date.UTC(y, m, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
    calTitle.textContent = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    calGrid.innerHTML = '';
    for (let i = 0; i < lead; i++) { const b = document.createElement('span'); b.className = 'day day--blank'; calGrid.appendChild(b); }
    for (let d = 1; d <= dim; d++) {
      const diff = diffDays(y, m, d);
      const ok = diff >= 0 && diff <= S.horizonJours && slotsFor(y, m, d).length > 0;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'day'; b.textContent = d; b.disabled = !ok;
      const dowName = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      b.setAttribute('aria-label', `${dowName} ${d} ${new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(first)}${ok ? '' : ', indisponible'}`);
      if (diff === 0) b.classList.add('is-today');
      if (state.date && state.date.y === y && state.date.m === m && state.date.d === d) { b.classList.add('is-sel'); b.setAttribute('aria-pressed', 'true'); }
      b.addEventListener('click', () => { state.date = { y, m, d }; state.time = null; renderCal(); renderSlots(); clearErr(); });
      calGrid.appendChild(b);
    }
    calPrev.disabled = (y === n0.y && m === n0.m);
    const lastDay = new Date(Date.UTC(n0.y, n0.m - 1, n0.d) + S.horizonJours * 864e5);
    calNext.disabled = (y > lastDay.getUTCFullYear()) || (y === lastDay.getUTCFullYear() && m >= lastDay.getUTCMonth() + 1);
    calPrev.style.opacity = calPrev.disabled ? .35 : 1; calNext.style.opacity = calNext.disabled ? .35 : 1;
  }
  calPrev.addEventListener('click', () => { if (calPrev.disabled) return; let { y, m } = state.view; m--; if (m < 1) { m = 12; y--; } state.view = { y, m }; renderCal(); });
  calNext.addEventListener('click', () => { if (calNext.disabled) return; let { y, m } = state.view; m++; if (m > 12) { m = 1; y++; } state.view = { y, m }; renderCal(); });

  const slotsBox = $('#slots');
  function renderSlots() {
    slotsBox.innerHTML = '';
    if (!state.date) { slotsBox.innerHTML = '<p class="slots__hint">Choisissez d\'abord un jour.</p>'; return; }
    const list = slotsFor(state.date.y, state.date.m, state.date.d);
    if (!list.length) { slotsBox.innerHTML = '<p class="slots__hint">Plus de créneau ce jour-là, essayez un autre jour.</p>'; return; }
    list.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'slot'; b.textContent = fmtTime(t);
      b.setAttribute('aria-pressed', state.time === t ? 'true' : 'false');
      b.addEventListener('click', () => { state.time = t; $$('.slot', slotsBox).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); clearErr(); });
      slotsBox.appendChild(b);
    });
  }

  /* ---------- Navigation entre étapes ---------- */
  const steps = $$('.bstep', form), stepLis = $$('#bsteps li'), btnPrev = $('#b-prev'), btnNext = $('#b-next');
  function clearErr() { $$('.bform__err', form).forEach(e => { e.hidden = true; e.textContent = ''; }); }
  function showErr(msg) { const e = $('.bstep:not([hidden]) .bform__err', form); if (e) { e.textContent = msg; e.hidden = false; } }
  const dateLabel = () => {
    const { y, m, d } = state.date;
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  };
  function go(n, focus = true) {
    state.step = n;
    steps.forEach(s => { const on = +s.dataset.step === n; s.hidden = !on; s.classList.toggle('is-on', on); });
    stepLis.forEach((li, i) => { li.classList.toggle('is-on', i + 1 === n); li.classList.toggle('is-done', i + 1 < n); });
    btnPrev.hidden = n === 1; btnNext.hidden = n === 4;
    $('.btn__t', btnNext).firstChild.textContent = n === 3 ? 'Voir ma demande ' : 'Continuer ';
    clearErr();
    const cur = steps[n - 1];
    if (window.gsap && !reduce) gsap.fromTo(cur, { autoAlpha: 0, x: 36 }, { autoAlpha: 1, x: 0, duration: .7, ease: 'expo.out', clearProps: 'transform' });
    if (n === 2) { renderCal(); renderSlots(); }
    if (n === 4) buildRecap();
    if (focus) { const lg = $('legend,.bstep__h', cur); if (lg) { lg.setAttribute('tabindex', '-1'); lg.focus({ preventScroll: true }); } }
    const top = form.getBoundingClientRect().top;
    if (focus && (top < 70 || top > innerHeight * .5) && window.__scrollToEl) window.__scrollToEl(form, { offset: -90, duration: 1.1 });
  }
  const telOK = v => v.replace(/\D/g, '').length >= 10;
  function validate(n) {
    if (n === 1 && !state.svc) { showErr('Choisissez une prestation pour continuer.'); return false; }
    if (n === 2) {
      if (!state.date) { showErr('Choisissez un jour dans le calendrier.'); return false; }
      if (state.time == null) { showErr('Choisissez une heure.'); return false; }
    }
    if (n === 3) {
      const nom = $('#f-nom'), tel = $('#f-tel'), mail = $('#f-mail');
      [nom, tel, mail].forEach(i => i.removeAttribute('aria-invalid'));
      if (!nom.value.trim()) { nom.setAttribute('aria-invalid', 'true'); nom.focus(); showErr('Indiquez votre prénom et votre nom.'); return false; }
      if (!telOK(tel.value)) { tel.setAttribute('aria-invalid', 'true'); tel.focus(); showErr('Indiquez un numéro de téléphone valide (10 chiffres) pour que Lorna puisse vous répondre.'); return false; }
      if (mail.value.trim() && !mail.checkValidity()) { mail.setAttribute('aria-invalid', 'true'); mail.focus(); showErr('Cette adresse e-mail ne semble pas valide.'); return false; }
    }
    return true;
  }
  btnNext.addEventListener('click', () => { if (validate(state.step)) go(state.step + 1); });
  btnPrev.addEventListener('click', () => go(Math.max(1, state.step - 1)));
  form.addEventListener('submit', e => { e.preventDefault(); if (state.step < 4 && validate(state.step)) go(state.step + 1); });

  /* ---------- Récapitulatif + envois ---------- */
  function message(forLink) {
    const nom = $('#f-nom').value.trim(), tel = $('#f-tel').value.trim(), mail = $('#f-mail').value.trim(), msg = $('#f-msg').value.trim();
    const lines = [
      'Bonjour Lorna,', '',
      `Je souhaite réserver : ${state.svc.titre}`,
      `Créneau souhaité : ${dateLabel()} à ${fmtTime(state.time)}`,
      `Nom : ${nom}`,
      `Téléphone : ${tel}`
    ];
    if (mail) lines.push(`E-mail : ${mail}`);
    if (msg) lines.push(`Message : ${msg}`);
    lines.push('', 'Pouvez-vous me confirmer ce rendez-vous ? Merci !');
    return lines.join(forLink ? '\r\n' : '\n');
  }
  function buildRecap() {
    const rec = $('#recap'); rec.innerHTML = '';
    const add = (t, v) => { if (!v) return; const row = document.createElement('div'); const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = t; dd.textContent = v; row.append(dt, dd); rec.appendChild(row); };
    add('Prestation', state.svc.titre + (state.svc.prix ? ' · ' + state.svc.prix : ' · tarif communiqué sur place'));
    add('Créneau', `${dateLabel()} à ${fmtTime(state.time)} (≈ ${state.svc.duree} min)`);
    add('Nom', $('#f-nom').value.trim());
    add('Téléphone', $('#f-tel').value.trim());
    add('E-mail', $('#f-mail').value.trim());
    add('Message', $('#f-msg').value.trim());
    const subject = `Demande de rendez-vous : ${state.svc.titre}, ${dateLabel()} à ${fmtTime(state.time)}`;
    $('#send-mail').href = 'mailto:' + S.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message(true));
    const sms = $('#send-sms');
    if (S.sms) { sms.hidden = false; sms.href = 'sms:' + S.sms + '?&body=' + encodeURIComponent(message(false)); } else sms.hidden = true;
    $('#send-ok').hidden = true;
  }
  const ok = txt => { const o = $('#send-ok'); o.textContent = txt; o.hidden = false; };
  $('#send-mail').addEventListener('click', () => ok('Votre messagerie s\'ouvre avec le message déjà rédigé : il ne reste qu\'à l\'envoyer. Lorna vous répond pour confirmer le créneau.'));
  $('#send-sms').addEventListener('click', () => ok('Votre application SMS s\'ouvre avec le message déjà rédigé.'));

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } ta.remove();
    });
  }
  $('#send-msgr').addEventListener('click', () => {
    const text = message(false);
    window.open(S.messenger, '_blank', 'noopener');
    copy(text).then(() => ok('Message copié ! Collez-le dans la conversation Messenger (Ctrl+V, ou appui long sur mobile).'), () => ok('Ouvrez Messenger et recopiez votre demande : le copier-coller automatique n\'est pas autorisé ici.'));
  });

  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  $('#send-ics').addEventListener('click', () => {
    const { y, m, d } = state.date, t0 = state.time, t1 = t0 + state.svc.duree;
    const dt = (t) => `${y}${pad(m)}${pad(d)}T${pad(Math.floor(t / 60))}${pad(t % 60)}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Planete Lorna//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
      'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
      'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
      'END:VTIMEZONE',
      'BEGIN:VEVENT', `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@planete-lorna`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Paris:${dt(t0)}`, `DTEND;TZID=Europe/Paris:${dt(t1)}`,
      `SUMMARY:${esc('Planète Lorna : ' + state.svc.titre + ' (à confirmer)')}`,
      `LOCATION:${esc(S.adresse.rue + ', ' + S.adresse.cp + ' ' + S.adresse.ville)}`,
      `DESCRIPTION:${esc('Demande de rendez-vous à confirmer par Lorna. Téléphone de la boutique : ' + S.tel.affiche)}`,
      'STATUS:TENTATIVE',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous Planète Lorna', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'rendez-vous-planete-lorna.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    ok('Fichier agenda téléchargé : ouvrez-le pour l\'ajouter à votre calendrier (marqué « à confirmer »).');
  });

  /* ---------- API publique : pré-remplir depuis le reste du site ---------- */
  window.Lorna = {
    book(serviceId, note) {
      const s = services.find(x => x.id === serviceId);
      if (s) {
        state.svc = s;
        const r = $(`input[name="svc"][value="${s.id}"]`, svcBox); if (r) r.checked = true;
      }
      if (note) $('#f-msg').value = note;
      if (window.__scrollToEl) window.__scrollToEl($('#reserver'), { duration: 1.6 });
      else $('#reserver').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => go(s ? 2 : 1, false), 450);
    }
  };
  $$('[data-book]').forEach(b => b.addEventListener('click', () => window.Lorna.book(b.dataset.book)));

  go(1, false);
})();
