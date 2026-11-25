/* ==========================================================================
   24 Briefe – Logik.  Inhalte und Einstellungen stehen in gedichte.js
   (in der veröffentlichten Fassung verschlüsselt in inhalt.json)
   ========================================================================== */
(() => {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const P = new URLSearchParams(location.search);
const VORSCHAU = P.has('vorschau');
const WERKSTATT = VORSCHAU && P.has('werkstatt');
const RUHIG = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Laden (offen oder verschlüsselt) ---------- */
const b64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function entschluesseln() {
  const ausLink = new URLSearchParams(location.hash.slice(1)).get('k');
  if (ausLink) try { localStorage.setItem('24briefe:k', ausLink); } catch (e) {}
  const k = ausLink || (() => { try { return localStorage.getItem('24briefe:k'); } catch (e) { return null; } })();
  if (!k || !window.crypto || !crypto.subtle) return null;
  try {
    const inhalt = await (await fetch('inhalt.json', { cache: 'no-store' })).json();
    const schluessel = await crypto.subtle.importKey('raw', b64(k), 'AES-GCM', false, ['decrypt']);
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(inhalt.iv) }, schluessel, b64(inhalt.daten));
    return JSON.parse(new TextDecoder().decode(klar));
  } catch (e) { console.warn('Entschlüsseln fehlgeschlagen', e); return null; }
}
(async () => {
  const K = window.KALENDER || await entschluesseln();
  if (!K) { $('#tor').hidden = false; $('#seite').hidden = true; return; }
  starte(K);
})();

function starte(K) {
const FX = Object.assign({ einleitung: true, haptik: true, toene: false }, K.effekte || {});
const STIL = P.get('stil') || K.stil || 'tanne';
document.documentElement.dataset.stil = STIL;
$('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--grund').trim() || '#15392A';

/* ---------- Speicher ---------- */
const SCHLUESSEL = `24briefe:${K.name}:${K.jahr}`;
const SPEICHER = SCHLUESSEL + (VORSCHAU ? ':vorschau' : '');
if (P.has('zuruecksetzen')) { localStorage.removeItem(SCHLUESSEL); localStorage.removeItem(SCHLUESSEL + ':vorschau'); }
const zustand = (() => {
  const leer = { offen: [], einleitung: false, finale: false };
  try { return Object.assign(leer, JSON.parse(localStorage.getItem(SPEICHER) || '{}')); } catch (e) { return leer; }
})();
if (WERKSTATT) { // Zustand kommt komplett aus der Adresse
  const n = Math.max(0, Math.min(24, parseInt(P.get('gelesen') || '0', 10) || 0));
  zustand.offen = [...Array(n)].map((_, i) => i + 1);
  zustand.einleitung = !P.has('einleitung');
  zustand.finale = P.has('finaleGesehen');
}
const sichern = () => { if (WERKSTATT) return; try { localStorage.setItem(SPEICHER, JSON.stringify(zustand)); } catch (e) {} };
const istOffen = t => zustand.offen.includes(t);
const anzahlOffen = () => zustand.offen.filter(t => t >= 1 && t <= 24).length;
const alleOffen = () => anzahlOffen() >= 24;

/* ---------- Datum ---------- */
const JETZT = (() => {
  const d = VORSCHAU ? P.get('datum') : null;
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { const [y, m, t] = d.split('-').map(Number); return new Date(y, m - 1, t, 12); }
  return new Date();
})();
const HEUTE = (() => {
  const y = JETZT.getFullYear(), m = JETZT.getMonth(), d = JETZT.getDate();
  if (y > K.jahr) return 99;
  if (y === K.jahr && m === 11) return d;
  return 0;
})();
const zugaenglich = t => (VORSCHAU && !WERKSTATT) || t <= HEUTE;
const tageBis = t => Math.round((new Date(K.jahr, 11, t) - new Date(JETZT.getFullYear(), JETZT.getMonth(), JETZT.getDate())) / 864e5);
const ADVENT = {};
(() => { const v = 24 - new Date(K.jahr, 11, 24).getDay(); [0, 7, 14, 21].forEach((x, i) => { if (v - x >= 1) ADVENT[v - x] = 4 - i; }); })();
const WOCHENTAG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONAT = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const zwei = n => String(n).padStart(2, '0');
const tage = n => n === 1 ? 'einem Tag' : `${n} Tagen`;
function datumZeile(t) {
  const d = new Date(K.jahr, 11, t);
  let s = `${WOCHENTAG[d.getDay()]}, ${t}. Dez`;
  if (t === 24) s = `Heiligabend · ${t}. Dez`;
  else if (t === 6) s += ' · Nikolaus';
  else if (ADVENT[t]) s += ` · ${ADVENT[t]}. Advent`;
  return s;
}

/* ---------- Helfer ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s).toLowerCase().replace(/[^\p{L}]/gu, '');
const warte = ms => new Promise(r => setTimeout(r, RUHIG ? Math.min(ms, 30) : ms));
const anim = (el, frames, opt) => {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, Object.assign({ fill: 'forwards', easing: 'cubic-bezier(.22,1,.36,1)' }, opt, RUHIG ? { duration: 1 } : {}));
  return a.finished.catch(() => {});
};
function zufall(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const haptik = (() => {
  if (!FX.haptik) return () => {};
  const l = document.createElement('label'); l.setAttribute('aria-hidden', 'true');
  l.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
  const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
  l.appendChild(i); document.body.appendChild(l);
  return () => { try { if (navigator.vibrate) navigator.vibrate(14); else l.click(); } catch (e) {} };
})();
let ac = null;
function audio() {
  if (!FX.toene) return null;
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
['pointerdown', 'touchend'].forEach(e => document.addEventListener(e, () => audio(), { passive: true, capture: true }));
function rauschen(dauer, typ, freq, laut, start = 0) {
  if (!audio()) return;
  const t = ac.currentTime + start, n = Math.floor(ac.sampleRate * dauer), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; f.type = typ; f.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + Math.min(.012, dauer / 4)); g.gain.exponentialRampToValueAtTime(.0005, t + dauer);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t); s.stop(t + dauer + .02);
}
const knacken = () => { rauschen(.05, 'bandpass', 2600, .4); rauschen(.04, 'bandpass', 1600, .3, .04); };
const rascheln = () => rauschen(.45, 'highpass', 2400, .08);

/* ==========================================================================
   Der Kranz: verborgenes Gedicht aus den ersten Zeilen
   ========================================================================== */
const KRANZ_STROPHEN = (K.kranz && K.kranz.text || '').trim().split(/\n\s*\n/).map(s => s.split('\n').map(z => z.trim()).filter(Boolean));
const KRANZ = KRANZ_STROPHEN.flat();
const ersteZeile = t => { const g = K.gedichte[t - 1]; return g ? g.verse.trim().split('\n')[0] : ''; };
const PRUEFUNG = (() => {
  const f = [];
  if (KRANZ.length !== 24) f.push(`Der Kranz hat ${KRANZ.length} statt 24 Zeilen.`);
  if (K.gedichte.length !== 24) f.push(`Es gibt ${K.gedichte.length} statt 24 Gedichte.`);
  for (let t = 1; t <= Math.min(24, K.gedichte.length); t++) {
    if (KRANZ[t - 1] && norm(ersteZeile(t)) !== norm(KRANZ[t - 1])) f.push(`Gedicht ${t} beginnt nicht mit Kranzzeile ${t}.`);
  }
  if (f.length) console.warn('24 Briefe – bitte prüfen:\n' + f.join('\n'));
  return f;
})();

function kranzBauen(svg, { alle = false } = {}) {
  const R = 90;
  const deg = a => a * Math.PI / 180;
  const pt = (r, a) => [r * Math.cos(deg(a)), r * Math.sin(deg(a))];
  const f = n => n.toFixed(2);
  let h = '';
  for (let k = 0; k < 24; k++) {
    const t = k + 1, r = zufall(t * 977 + 5), a0 = -90 + (k + .5) * 15;
    const offen = alle || istOffen(t);
    const heute = !alle && !offen && t === HEUTE && !WERKSTATT ? ' heute' : (!alle && !offen && WERKSTATT && t === HEUTE ? ' heute' : '');
    const [x1, y1] = pt(R, a0 - 8.5), [x2, y2] = pt(R, a0 + 8.5);
    let gruen = `<path class="ast" pathLength="1" d="M${f(x1)} ${f(y1)} A${R} ${R} 0 0 1 ${f(x2)} ${f(y2)}" fill="none" stroke="var(--zweig)" stroke-width="1.2" stroke-linecap="round"/>`;
    let i = 0;
    const n = 10;
    for (let j = 0; j < n; j++) {
      const a = a0 - 8 + (j / (n - 1)) * 16 + (r() - .5) * 2.4;
      const seite = j % 2 ? 1 : -1;
      const rr = R + seite * (1.5 + r() * 6);
      const [x, y] = pt(rr, a);
      const L = 10 + r() * 8, w = 2.6 + r() * 1.8;
      const kipp = 40 + r() * 28;
      const dreh = seite === 1 ? a + 90 + kipp : a - 90 - kipp;
      const farbe = `var(--blatt-${1 + Math.floor(r() * 5)})`;
      gruen += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(dreh)})"><path class="blatt-form" style="fill:${farbe};--i:${i++}" d="M0 0 C${f(w)} ${f(-L * .35)} ${f(w * .9)} ${f(-L * .72)} 0 ${f(-L)} C${f(-w * .9)} ${f(-L * .72)} ${f(-w)} ${f(-L * .35)} 0 0Z"/></g>`;
    }
    const beeren = 1 + Math.floor(r() * 2.2);
    for (let b = 0; b < beeren; b++) {
      const [x, y] = pt(R + (r() - .5) * 8, a0 + (r() - .5) * 12);
      gruen += `<circle class="beere-form" style="fill:var(--beere);--i:${i++}" cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 1.1)}"/>`;
    }
    if (t % 4 === 0) {
      const [x, y] = pt(R + 12 * (t % 8 === 0 ? 1 : -1), a0);
      gruen += `<g transform="translate(${f(x)} ${f(y)})"><path class="stern-form" style="fill:var(--kerze);--i:${i++}" d="${sternPfad(4, 4.2, 1.1)}"/></g>`;
    }
    let punkte = '';
    [-5, 0, 5].forEach(d => { const [x, y] = pt(R, a0 + d); punkte += `<circle cx="${f(x)}" cy="${f(y)}" r="${d ? .9 : 1.3}"/>`; });
    h += `<g class="zweig${offen ? '' : ' leer'}${heute}" data-tag="${t}"><g class="punkte">${punkte}</g><g class="gruen">${gruen}</g></g>`;
  }
  svg.innerHTML = h;
}
function kranzAktualisieren() {
  $$('#kranz .zweig').forEach(z => {
    const t = +z.dataset.tag;
    z.classList.toggle('leer', !istOffen(t));
    z.classList.toggle('heute', !istOffen(t) && t === HEUTE);
  });
  $('#kranzZahl').textContent = anzahlOffen();
}

/* ==========================================================================
   Siegel + Umschlag
   ========================================================================== */
const FARBEN = {
  rot:   ['#EE6A52', '#D9432C', '#8A2214'],
  gruen: ['#4C8C69', '#25573F', '#0E2B1E'],
  gold:  ['#FBE2A6', '#E0AF55', '#87591A']
};
const siegelFarbe = t => (t === 24 || t === 25) ? 'gold' : (STIL === 'beere' ? 'gruen' : 'rot');
function sternPfad(z = 8, aussen = 9.5, innen = 3.4) {
  let d = '';
  for (let i = 0; i < z * 2; i++) { const a = i / (z * 2) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? innen : aussen; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(2) + ' ' + (Math.sin(a) * rr).toFixed(2); }
  return d + 'Z';
}
let siegelNr = 0;
function siegelSVG(t, { geteilt = false, inschrift, farbe } = {}) {
  const id = 'sg' + (++siegelNr);
  const [hell, basis, dunkel] = FARBEN[farbe || siegelFarbe(t)];
  const r = zufall(t * 7919 + 13);
  const n = 18, pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, rad = 44 + (r() * 2 - 1) * 2.2 + (i % 4 === 0 ? r() * 2 : 0);
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
  }
  const f = p => p[0].toFixed(2) + ' ' + p[1].toFixed(2), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = 'M' + f(mid(pts[0], pts[1]));
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[(i + 1) % n]; d += ` Q${f(p)} ${f(mid(p, q))}`; }
  d += 'Z';
  const text = inschrift != null ? inschrift : String(t);
  const schrift = `font-family="Fraunces, Georgia, serif" font-weight="500" font-size="${text.length > 2 ? 28 : 40}" y="${text.length > 2 ? 10 : 13.5}" text-anchor="middle" style="font-variation-settings:'SOFT' 100,'WONK' 1,'opsz' 72"`;
  const inhalt = `
    <path d="${d}" fill="url(#${id}g)"/>
    <circle r="30.5" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="1.2" transform="translate(.7 .9)"/>
    <circle r="30.5" fill="none" stroke="${dunkel}" stroke-opacity=".45" stroke-width="1.3"/>
    <text ${schrift} fill="#fff" fill-opacity=".22" transform="translate(.7 .9)">${esc(text)}</text>
    <text ${schrift} fill="${dunkel}" fill-opacity=".85">${esc(text)}</text>`;
  const defs = `<radialGradient id="${id}g" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="${hell}"/><stop offset=".55" stop-color="${basis}"/><stop offset="1" stop-color="${dunkel}"/></radialGradient>`;
  if (!geteilt) return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs>${defs}</defs>${inhalt}</svg>`;
  const rs = [[2, -52], [-3, -30], [4, -12], [-2, 4], [5, 22], [-1, 37], [1, 52]].map(p => p.join(' ')).join(' L');
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs>${defs}
      <g id="${id}c">${inhalt}</g>
      <clipPath id="${id}L"><path d="M-70 -70 L2 -70 L${rs} L1 70 L-70 70Z"/></clipPath>
      <clipPath id="${id}R"><path d="M70 -70 L2 -70 L${rs} L1 70 L70 70Z"/></clipPath></defs>
    <use class="siegel-voll" href="#${id}c"/>
    <g class="siegel-haelfte links"><use href="#${id}c" clip-path="url(#${id}L)"/></g>
    <g class="siegel-haelfte rechts"><use href="#${id}c" clip-path="url(#${id}R)"/></g>
    <path class="siegel-riss" d="M${rs}" fill="none" stroke="${dunkel}" stroke-width="1.4"/></svg>`;
}
function umschlagHTML(t, opt = {}) {
  const titel = t >= 1 && t <= 24 && K.gedichte[t - 1] ? K.gedichte[t - 1].titel : '';
  return `<div class="umschlag">
    <div class="umschlag-schatten"></div>
    <div class="u-ruecken futter"></div>
    <div class="u-einlage"><span class="u-titel">${esc(titel)}</span></div>
    <div class="u-tasche"></div>
    <svg class="u-schatten" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M-2 0 L50 55 L102 0" fill="none" stroke="rgba(60,40,15,.18)" stroke-width="2" vector-effect="non-scaling-stroke" style="filter:blur(1.4px)"/></svg>
    <div class="u-klappe"><div class="vorne"></div><div class="hinten futter"></div></div>
    <div class="u-siegel">${siegelSVG(t, opt)}</div>
  </div>`;
}
function krumen(siegel, farbe) {
  if (RUHIG) return;
  const r = siegel.getBoundingClientRect(), [hell, basis, dunkel] = FARBEN[farbe];
  for (let i = 0; i < 8; i++) {
    const k = document.createElement('span'); k.className = 'krume';
    const g = 3 + Math.random() * 5;
    Object.assign(k.style, { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', width: g + 'px', height: g + 'px',
      background: `radial-gradient(circle at 35% 30%, ${hell}, ${basis} 55%, ${dunkel})` });
    document.body.appendChild(k);
    const w = Math.random() * Math.PI * 2, s = 24 + Math.random() * 50;
    anim(k, [{ transform: 'translate(-50%,-50%)', opacity: 1 },
      { transform: `translate(${Math.cos(w) * s}px, ${Math.sin(w) * s * .5 + 60 + Math.random() * 50}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }],
      { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)' }).then(() => k.remove());
  }
}

/* ==========================================================================
   Raster + Lage
   ========================================================================== */
const raster = $('#raster');
function rasterBauen() {
  raster.innerHTML = '';
  for (let t = 1; t <= 24; t++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'brief'; b.dataset.tag = t;
    b.innerHTML = `<div class="brief-umschlag">${umschlagHTML(t)}</div><div class="brief-zeile"><span>${zwei(t)}</span><span class="brief-notiz"></span></div>`;
    b.addEventListener('click', () => oeffne(t, b));
    raster.appendChild(b);
  }
  rasterAktualisieren();
}
function rasterAktualisieren() {
  $$('.brief', raster).forEach(b => {
    const t = +b.dataset.tag, offen = istOffen(t), frei = zugaenglich(t);
    const heute = t === HEUTE && !offen;
    b.classList.toggle('offen', offen);
    b.classList.toggle('zu', !frei);
    b.classList.toggle('heute', heute);
    $('.brief-notiz', b).textContent = heute ? 'Heute' : (t === 24 ? 'Heiligabend' : t === 6 ? 'Nikolaus' : '');
    b.setAttribute('aria-label', `Brief ${t}` + (offen ? ', gelesen' : frei ? ', versiegelt' : `, öffnet am ${t}. Dezember`));
  });
}
function lageAktualisieren() {
  const l = $('#lage');
  let text = '', knopf = '';
  const pfeil = '<svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  if (zugaenglich(24) && alleOffen()) {
    text = zustand.finale ? 'Der Kranz ist vollständig.' : '<b>Alle 24 Briefe sind offen.</b>';
    knopf = `<button class="knopf" id="zumFinale">${zustand.finale ? 'Den Kranz lesen' : 'Weiter'} ${pfeil}</button>`;
  } else if (VORSCHAU && !WERKSTATT) {
    text = '<b>Vorschau.</b> Alle Briefe lassen sich öffnen.';
  } else if (HEUTE === 0) {
    const n = tageBis(1);
    text = `Der erste Brief öffnet am <b>1. Dezember</b>${n > 0 ? ` – in ${tage(n)}` : ''}.`;
  } else if (HEUTE <= 24 && !istOffen(HEUTE)) {
    text = `Heute ist <b>Brief Nr. ${HEUTE}</b> dran.`;
    knopf = `<button class="knopf" id="zuHeute">Öffnen ${pfeil}</button>`;
  } else if (HEUTE < 24) {
    const fehlt = [...Array(HEUTE)].map((_, i) => i + 1).filter(t => !istOffen(t));
    text = fehlt.length ? `Für heute gelesen. Noch zu: <b>Nr. ${fehlt.join(', ')}</b>.` : `Für heute gelesen. <b>Nr. ${HEUTE + 1}</b> kommt morgen.`;
  } else {
    const fehlt = [...Array(24)].map((_, i) => i + 1).filter(t => !istOffen(t));
    text = `Noch zu: <b>Nr. ${fehlt.join(', ')}</b>.`;
  }
  l.innerHTML = `<p class="lage-text">${text}</p>${knopf}`;
  const zh = $('#zuHeute'); if (zh) zh.onclick = () => oeffne(HEUTE, $(`.brief[data-tag="${HEUTE}"]`, raster));
  const zf = $('#zumFinale'); if (zf) zf.onclick = () => finale();
  $('#warnung')?.remove();
  if (VORSCHAU && PRUEFUNG.length) l.insertAdjacentHTML('afterend', `<div class="vorschau-warnung" id="warnung">${PRUEFUNG.map(esc).join('<br>')}</div>`);
  const bis = tageBis(24);
  $('#fuss').innerHTML = `<p class="zeile-klein"><span>Advent ${K.jahr}</span><span>${bis > 1 ? `Heiligabend in ${bis} Tagen` : bis === 1 ? 'Morgen ist Heiligabend' : bis === 0 ? 'Frohe Weihnachten' : ''}</span></p>`;
  $('#kopfDatum').textContent = `${JETZT.getDate()}. ${MONAT[JETZT.getMonth()]}`;
  kranzAktualisieren();
}

let hinweisUhr;
function hinweis(text) {
  const h = $('#hinweis'); h.textContent = text; h.classList.add('da');
  clearTimeout(hinweisUhr); hinweisUhr = setTimeout(() => h.classList.remove('da'), 2400);
}
function gesperrt(t, b) {
  b.classList.remove('wackeln'); void b.offsetWidth; b.classList.add('wackeln');
  const n = tageBis(t);
  hinweis(n === 1 ? 'Öffnet morgen.' : `Öffnet am ${t}. Dezember – in ${n} Tagen.`);
}

/* ==========================================================================
   Brief öffnen
   ========================================================================== */
const buehne = $('#buehne'), ebene = $('#buehneEbene'), grund = $('#buehneGrund'), leiste = $('#leiste');
let offenerTag = null, laeuft = false, frisch = null, imFinale = false;
const STERN_SVG = `<svg class="blatt-stern" viewBox="-10 -10 20 20" aria-hidden="true"><path d="${sternPfad(8, 9.5, 3.4)}"/></svg>`;

function blattInhalt(t, basis, schnell) {
  const schritt = schnell ? .06 : .32;
  let d = basis, h = '';
  const stufe = (html, pause = .25) => { h += `<div class="stufe" style="--d:${d.toFixed(2)}s">${html}</div>`; d += schnell ? .05 : pause; };
  if (t === 0) {
    stufe(`<p class="zeile-klein"><span>Für ${esc(K.name)}</span><span>Advent ${K.jahr}</span></p>`, .15);
    stufe(`<h2 class="blatt-titel">Vierundzwanzig Briefe.</h2>`, .4);
    stufe(`<p class="blatt-text">Vom 1. bis zum 24. Dezember öffnet sich jeden Tag einer – frühestens an seinem Tag.</p>`);
    stufe(`<p class="blatt-text">Jeder gelesene Brief lässt einen Zweig am Kranz wachsen.</p>`);
    stufe(`<button class="knopf" id="einleitungWeiter">Zum Kalender</button>`);
    return h;
  }
  if (t === 25) {
    stufe(`<p class="zeile-klein"><span>Nr. 25</span><span>Heiligabend</span></p>`, .15);
    h += '<div class="verse prosa" style="margin-top:34px">';
    K.finale.brief.trim().split(/\n\s*\n/).forEach(abs => { h += `<p class="vers" style="--d:${d.toFixed(2)}s">${esc(abs)}</p>`; d += .45; });
    h += '</div>';
    if (K.unterschrift) stufe(`<p class="blatt-unterschrift">${esc(K.unterschrift)}</p>`);
    if (K.finale.hinweis) stufe(`<div class="blatt-fuss"><p class="blatt-text" style="margin:0">${esc(K.finale.hinweis)}</p></div>`);
    return h;
  }
  const g = K.gedichte[t - 1] || { titel: '', verse: '' };
  stufe(`<p class="zeile-klein"><span>Nr. ${zwei(t)}</span><span>${esc(datumZeile(t))}</span></p>`, .15);
  stufe(`<h2 class="blatt-titel">${esc(g.titel)}</h2>`, .45);
  h += '<div class="verse">';
  g.verse.trim().split(/\n\s*\n/).forEach(strophe => {
    h += '<p class="strophe">';
    strophe.split('\n').forEach(zeile => { h += `<span class="vers" style="--d:${d.toFixed(2)}s">${esc(zeile)}</span>`; d += schritt; });
    h += '</p>';
    d += schritt * .8;
  });
  h += '</div>';
  if (K.unterschrift) stufe(`<p class="blatt-unterschrift">${esc(K.unterschrift)}</p>`);
  stufe(`<div class="blatt-fuss zeile-klein"><span>${STERN_SVG}</span><span>Brief ${t} von 24</span></div>`);
  return h;
}

function zielRechteck() {
  const w = Math.min(innerWidth * .8, 360), h = w / 1.42;
  return { left: (innerWidth - w) / 2, top: innerHeight * .5 - h / 2, width: w, height: h };
}
async function entsiegeln(t, quelle, opt = {}) {
  const z = zielRechteck();
  const box = document.createElement('div');
  box.className = 'buehne-umschlag';
  Object.assign(box.style, { left: z.left + 'px', top: z.top + 'px', width: z.width + 'px', height: z.height + 'px', transformOrigin: '0 0' });
  box.innerHTML = umschlagHTML(t, Object.assign({ geteilt: true }, opt));
  ebene.appendChild(box);
  if (quelle) {
    const r = quelle.getBoundingClientRect();
    quelle.closest('.brief')?.classList.add('verborgen');
    await anim(box, [
      { transform: `translate(${r.left - z.left}px, ${r.top - z.top}px) scale(${r.width / z.width}, ${r.height / z.height})` },
      { transform: 'translate(0,0) scale(1)' }
    ], { duration: 720 });
  } else {
    await anim(box, [{ opacity: 0, transform: 'translateY(24px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 700 });
  }
  await warte(180);
  const siegel = $('.u-siegel', box);
  siegel.classList.add('bricht'); knacken(); haptik(); krumen(siegel, opt.farbe || siegelFarbe(t));
  await warte(480);
  const klappe = $('.u-klappe', box);
  $('.umschlag', box).classList.add('offen-buehne'); rascheln();
  setTimeout(() => { klappe.style.zIndex = 0; }, RUHIG ? 0 : 350);
  await warte(750);
  const einlage = $('.u-einlage', box);
  await anim(einlage, [{ transform: 'translateY(0)' }, { transform: 'translateY(-62%)' }], { duration: 720, easing: 'cubic-bezier(.45,0,.2,1)' });
  return { box, von: einlage.getBoundingClientRect() };
}
async function blattZeigen(t, von, { schnell = false, box = null } = {}) {
  const blatt = document.createElement('article');
  blatt.className = 'blatt schreibt';
  blatt.innerHTML = `<div class="blatt-inhalt">${blattInhalt(t, schnell ? .25 : .62, schnell)}</div>`;
  const rahmen = document.createElement('div'); rahmen.className = 'blatt-rahmen';
  rahmen.appendChild(blatt); ebene.appendChild(rahmen);
  if (document.fonts && document.fonts.status !== 'loaded') { try { await document.fonts.ready; } catch (e) {} }
  einpassen($('.verse:not(.prosa)', blatt));
  const f = blatt.getBoundingClientRect();
  blatt.style.transformOrigin = '0 0';
  if (box) anim(box, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(50px)' }], { duration: 600, easing: 'ease-in' });
  if (von) {
    await anim(blatt, [
      { transform: `translate(${von.left - f.left}px, ${von.top - f.top}px) scale(${von.width / f.width}, ${von.height / f.height})`, opacity: (box || t === 0) ? 1 : 0 },
      { transform: 'none', opacity: 1 }
    ], { duration: box ? 760 : 480 });
  }
  if (box) box.remove();
  blatt.addEventListener('click', () => blatt.classList.add('fertig'));
  return blatt;
}

/* Schrift so weit verkleinern, dass kein Vers umbricht (nicht unter 14.5 px) */
function einpassen(el, min = 14.5) {
  if (!el) return;
  el.style.fontSize = '';
  const zeilen = $$('.vers', el);
  if (!zeilen.length) return;
  const umbricht = () => { const h = zeilen.map(z => z.offsetHeight), eine = Math.min(...h); return h.some(x => x > eine * 1.4); };
  let gr = parseFloat(getComputedStyle(el).fontSize);
  while (gr > min && umbricht()) { gr = Math.max(min, gr - .25); el.style.fontSize = gr + 'px'; }
}

async function oeffne(t, quelle) {
  if (laeuft || offenerTag !== null) return;
  if (t >= 1 && t <= 24 && !zugaenglich(t)) return gesperrt(t, quelle);
  laeuft = true;
  const erstesMal = t === 0 || t === 25 || !istOffen(t);
  document.body.classList.add('gesperrt');
  buehne.hidden = false; ebene.innerHTML = '';
  anim(grund, [{ opacity: 0 }, { opacity: 1 }], { duration: 550, easing: 'ease-out' });
  history.pushState({ brief: t }, '');
  offenerTag = t;
  if (t >= 1 && t <= 24 && erstesMal) { zustand.offen.push(t); sichern(); frisch = t; }
  const umschlagEl = quelle && $('.brief-umschlag', quelle);
  let von, box = null;
  if (erstesMal) {
    const opt = t === 25 ? { inschrift: '25' } : {};
    ({ box, von } = await entsiegeln(t, t >= 1 && t <= 24 ? umschlagEl : null, opt));
  } else {
    von = umschlagEl.getBoundingClientRect();
    quelle.classList.add('verborgen');
  }
  await blattZeigen(t, von, { schnell: !erstesMal, box });
  leisteAktualisieren();
  laeuft = false;
}

const lesbare = () => zustand.offen.filter(t => t >= 1 && t <= 24).sort((a, b) => a - b);
function leisteAktualisieren() {
  const l = lesbare(), i = l.indexOf(offenerTag), nurZu = offenerTag === 25 || offenerTag === 0;
  leiste.hidden = false; requestAnimationFrame(() => leiste.classList.add('da'));
  $('#zurueck').disabled = i <= 0; $('#weiter').disabled = i < 0 || i >= l.length - 1;
  $('#zurueck').style.display = $('#weiter').style.display = nurZu ? 'none' : '';
}
async function blaettern(richtung) {
  if (laeuft || !offenerTag || offenerTag > 24) return;
  const l = lesbare(), neu = l[l.indexOf(offenerTag) + richtung];
  if (!neu) return;
  laeuft = true;
  const alt = $('.blatt', ebene);
  await anim(alt, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-richtung * 36}px)` }], { duration: 220, easing: 'ease-in' });
  alt.parentNode.remove();
  $(`.brief[data-tag="${offenerTag}"]`, raster)?.classList.remove('verborgen');
  offenerTag = neu;
  $(`.brief[data-tag="${neu}"]`, raster)?.classList.add('verborgen');
  const blatt = await blattZeigen(neu, null, { schnell: true });
  anim(blatt, [{ opacity: 0, transform: `translateX(${richtung * 36}px)` }, { opacity: 1, transform: 'none' }], { duration: 360 });
  history.replaceState({ brief: neu }, '');
  leisteAktualisieren();
  laeuft = false;
}

async function schliessen() {
  if (offenerTag === null || laeuft) return;
  laeuft = true;
  const t = offenerTag, war = frisch; frisch = null;
  leiste.classList.remove('da');
  const blatt = $('.blatt', ebene);
  if (blatt) await anim(blatt, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(30px) scale(.97)' }], { duration: 380, easing: 'cubic-bezier(.5,0,.75,0)' });
  await anim(grund, [{ opacity: 1 }, { opacity: 0 }], { duration: 320 });
  buehne.hidden = true; leiste.hidden = true; ebene.innerHTML = '';
  offenerTag = null;
  if (!imFinale) document.body.classList.remove('gesperrt');
  rasterAktualisieren();
  $$('.brief.verborgen', raster).forEach(b => b.classList.remove('verborgen'));
  if (war) await zweigWaechst(war);
  lageAktualisieren();
  laeuft = false;
  if (t === 0) return;
  if (war && alleOffen() && zugaenglich(24) && !zustand.finale) { await warte(900); finale(); }
}

async function zweigWaechst(t) {
  const z = $(`#kranz .zweig[data-tag="${t}"]`);
  if (!z) return;
  if (!RUHIG) {
    const r = $('#kranz').getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) { scrollTo({ top: Math.max(0, scrollY + r.top - 60), behavior: 'smooth' }); await warte(700); }
  }
  z.classList.remove('leer', 'heute');
  z.classList.add('waechst');
  haptik();
  $('#kranzZahl').textContent = anzahlOffen();
  await warte(1400);
  z.classList.remove('waechst');
}

/* ==========================================================================
   Finale: der Kranz
   ========================================================================== */
let finaleLaeuft = false, weiterDruck = null;
async function finale() {
  if (finaleLaeuft) return;
  finaleLaeuft = true; imFinale = true;
  const f = $('#finale'), svg = $('#finaleKranz'), zeile = $('#finaleZeile');
  kranzBauen(svg, { alle: true });
  $('#finaleMitte').textContent = (K.kranz && K.kranz.titel) || 'Kranz';
  let nr = 0;
  $('#finaleGedicht').innerHTML = KRANZ_STROPHEN.map((s, si) => `<p class="strophe" style="transition-delay:${(.3 + si * .18).toFixed(2)}s">` +
    s.map(z => `<span class="vers"><span class="nr">${zwei(++nr)}</span>${esc(z)}</span>`).join('') + '</p>').join('');
  $('#finaleJahr').textContent = `Dezember ${K.jahr}`;
  $('#finaleBrief').hidden = !(K.finale && K.finale.brief && K.finale.brief.trim());
  f.classList.remove('gelesen'); svg.classList.remove('lesen');
  f.hidden = false; f.scrollTop = 0;
  einpassen($('#finaleGedicht'));
  document.body.classList.add('gesperrt');
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.add('da')));
  if (!zustand.finale) {
    const z = $$('.zweig', svg);
    z.forEach(e => e.classList.add('leer'));
    await warte(700);
    for (let i = 0; i < 24; i++) { z[i].classList.remove('leer'); z[i].classList.add('waechst'); await warte(70); }
    await warte(900);
    zeile.innerHTML = '<span class="klein">Du hast es nicht bemerkt.</span>';
    await warteOderTippen(2600);
    zeile.innerHTML = '<span class="klein">Jeder Brief begann mit einer Zeile.</span>';
    await warteOderTippen(2800);
    svg.classList.add('lesen');
    for (let i = 0; i < KRANZ.length; i++) {
      z.forEach(e => e.classList.remove('leuchtet'));
      z[i] && z[i].classList.add('leuchtet');
      zeile.innerHTML = `<span>${esc(KRANZ[i])}</span>`;
      await warteOderTippen(2300);
    }
    z.forEach(e => e.classList.remove('leuchtet'));
    svg.classList.remove('lesen');
    zeile.innerHTML = '';
    zustand.finale = true; sichern();
  }
  f.classList.add('gelesen');
  lageAktualisieren();
}
function warteOderTippen(ms) {
  return new Promise(r => { const t = setTimeout(() => { weiterDruck = null; r(); }, RUHIG ? 30 : ms); weiterDruck = () => { clearTimeout(t); weiterDruck = null; r(); }; });
}
$('#finale').addEventListener('click', e => { if (!e.target.closest('button') && weiterDruck) weiterDruck(); });
$('#finaleBrief').addEventListener('click', () => oeffne(25, null));
$('#finaleZu').addEventListener('click', () => {
  const f = $('#finale'); f.classList.remove('da');
  setTimeout(() => { f.hidden = true; finaleLaeuft = false; imFinale = false; document.body.classList.remove('gesperrt'); }, 850);
});

/* ---------- Bedienung ---------- */
$('#schliessen').addEventListener('click', () => { if (history.state && history.state.brief !== undefined) history.back(); else schliessen(); });
$('#zurueck').addEventListener('click', () => blaettern(-1));
$('#weiter').addEventListener('click', () => blaettern(1));
addEventListener('popstate', () => { if (offenerTag !== null) schliessen(); });
addEventListener('keydown', e => {
  if (offenerTag === null) return;
  if (e.key === 'Escape') $('#schliessen').click();
  if (e.key === 'ArrowLeft') blaettern(-1);
  if (e.key === 'ArrowRight') blaettern(1);
});
(() => {
  let x0 = 0, y0 = 0;
  ebene.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  ebene.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) blaettern(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
ebene.addEventListener('click', e => { if (e.target.id === 'einleitungWeiter') $('#schliessen').click(); });

/* ---------- Einleitung ---------- */
function einleitung() {
  if (!FX.einleitung || zustand.einleitung) return;
  const e = $('#einleitung'), b = $('#einleitungBrief');
  $('#einleitungName').textContent = K.name;
  b.innerHTML = umschlagHTML(0, { geteilt: true, inschrift: K.name.charAt(0) });
  e.hidden = false;
  document.body.classList.add('gesperrt', 'wartet');
  b.addEventListener('click', async () => {
    audio(); e.classList.add('oeffnet');
    const s = $('.u-siegel', b);
    s.classList.add('bricht'); knacken(); haptik(); krumen(s, siegelFarbe(0));
    await warte(480);
    $('.umschlag', b).classList.add('offen-buehne'); rascheln();
    setTimeout(() => { $('.u-klappe', b).style.zIndex = 0; }, 350);
    await warte(750);
    const einlage = $('.u-einlage', b);
    await anim(einlage, [{ transform: 'none' }, { transform: 'translateY(-62%)' }], { duration: 720, easing: 'cubic-bezier(.45,0,.2,1)' });
    const von = einlage.getBoundingClientRect();
    zustand.einleitung = true; sichern();
    buehne.hidden = false; ebene.innerHTML = ''; grund.style.opacity = 1;
    history.pushState({ brief: 0 }, ''); offenerTag = 0;
    e.classList.add('weg'); document.body.classList.remove('wartet');
    await blattZeigen(0, von, { box: null });
    leisteAktualisieren();
    setTimeout(() => { e.hidden = true; }, 900);
  }, { once: true });
}

/* ---------- Start ---------- */
document.title = `24 Briefe für ${K.name}`;
$('#kopfName').textContent = K.name;
$('#kopfJahr').textContent = `Advent ${K.jahr}`;
kranzBauen($('#kranz'));
rasterBauen();
lageAktualisieren();
if (VORSCHAU) { const v = document.createElement('div'); v.className = 'vorschau-marke'; v.textContent = WERKSTATT ? 'Werkstatt' : 'Vorschau'; document.body.appendChild(v); }
einleitung();
if (WERKSTATT) {
  const brief = parseInt(P.get('brief') || '', 10);
  if (brief >= 1 && brief <= 25) setTimeout(() => oeffne(brief, brief <= 24 ? $(`.brief[data-tag="${brief}"]`, raster) : null), 900);
  if (P.has('finale')) setTimeout(() => finale(), 700);
}
}
})();
