// Nadar por la gloria — base común de los prototipos (descartable).
// Personajes y rasgos tomados de Nadamos por la milanga (index.html, const CHARS).

const CHARS = [
  { id: "pablito", name: "PABLITO", tag: "Te levanta una losa y te nada 2000 metros en el mismo día", special: "CAMINAR", cd: 4, cap: "#F0BE98", suit: "#1F3F8F", skin: "#F0BE98", speed: 1, breathGap: 1.2, breath: 0.35, breathMin: 1.15 },
  { id: "luis", name: "LUIS", tag: "Nadador rápido, pero necesita quejarse para ir más rápido", special: "SALTAR", cd: 4, cap: "#4A5FD0", suit: "#D4A017", skin: "#E6B08A", speed: 1.08, breathGap: 1.2, breath: 0.15, fade: true, complains: true, slowStart: true },
  { id: "facu", name: "FACU", tag: "Guarda que te como", special: "TE COMO", cd: 3, cap: "#1A1A1E", suit: "#1A1A1A", skin: "#EDBB95", speed: 1.09, breathGap: 1.15, breath: 0, aggro: true },
  { id: "mati", name: "MATI", tag: "Nada un poco pachorra", special: "SUMERGIR", cd: 4, cap: "#E8C25A", suit: "#2E8B57", skin: "#F2C6A0", speed: 1, breathGap: 1, breath: 0.1, lazy: true },
  { id: "andre", name: "ANDRE", tag: "La maestra repostera", special: "UNA MASITA", cd: 2.4, cap: "#2B2D3A", suit: "#111111", skin: "#E3AE86", speed: 0.95, breathGap: 1, breath: 0.2 },
  { id: "mika", name: "MICA", tag: "Aparece donde menos la esperás", special: "AYAHUASCA", cd: 3, cap: "#16161C", suit: "#2F6FE0", skin: "#F0C4A2", speed: 1, breathGap: 1, breath: 0.25 },
  { id: "gaston", name: "GASTÓN", tag: "Cuando zarpa, no lo para nadie", special: "NAVEGANTE", cd: 6, cap: "#A9A9A9", suit: "#1E3A5F", skin: "#E8B48E", speed: 0.92, breathGap: 1, breath: 0.15, drowns: true, aggro: true },
  { id: "luchito", name: "LUCHITO", tag: "Nadador rápido, aunque los calambres lo tienen a maltraer", special: "ACELERADA", cd: 4, cap: "#1A1410", suit: "#18A558", skin: "#EEC09A", speed: 1.08, breathGap: 1.25, breath: 0.3, fade: true, cramps: true },
  { id: "fer", name: "FER", tag: "Nadador con experiencia: lee la pileta como nadie", special: "BULLET TIME", cd: 8, cap: "#E6B48C", suit: "#2B4C7E", skin: "#E6B48C", speed: 0.9, breathGap: 0.8, breath: 0.3, calm: true }
];
const COMPLAINTS = ["¡ESTÁ HELADA!", "¿QUIÉN ARMÓ ESTA SERIE?", "ME DUELE EL HOMBRO", "¡LA PROFE ME ODIA!", "HAY MUCHA GENTE HOY", "¿SALE MILANGA HOY?"];

// Objetos que flotan en la pileta: los buenos aceleran, los malos frenan, por unos segundos.
const ITEMS = {
  patas:      { name: "PATAS",      mult: 1.6,  secs: 2.5, good: true,  weight: 10 },
  manoplas:   { name: "MANOPLAS",   mult: 1.35, secs: 3,   good: true,  weight: 18 },
  antiparras: { name: "ANTIPARRAS", mult: 1.15, secs: 4,   good: true,  weight: 24 },
  paracaidas: { name: "PARACAÍDAS", mult: 0.6,  secs: 3,   good: false, weight: 26 },
  tablita:    { name: "TABLITA",    mult: 0.4,  secs: 3,   good: false, weight: 22 }
};

const RACE_M = 100;       // largo de la carrera, en metros
const BASE_V = 2.4;       // velocidad de crol, m/s
const FLY_MULT = 1.4;     // mariposa: cuánto más rápido que crol
const AIR_CROL = 0.045;   // aire que gasta el crol por segundo
const AIR_FLY = 0.2;      // aire que gasta la mariposa por segundo
const AIR_BREATH = 0.38;  // aire que da una respirada a tiempo
const AIR_WATER = 0.12;   // aire que perdés si tragás agua
const SPECIAL_K = 3;      // segundos de carga del especial = cd del juego original × esto

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function pickItem() {
  const ks = Object.keys(ITEMS), tot = ks.reduce((s, k) => s + ITEMS[k].weight, 0);
  let n = Math.random() * tot;
  for (const k of ks) { n -= ITEMS[k].weight; if (n <= 0) return k; }
  return ks[0];
}

// ---------- Carrera ----------
function newRace(playerCh, opts) {
  const others = CHARS.filter((c) => c.id !== playerCh.id).sort(() => Math.random() - 0.5);
  const chars = [playerCh, others[0], others[1]];
  const lanes = [0.5, 0.2, 0.8];
  const racers = chars.map((ch, i) => ({
    ch, isPlayer: i === 0, x: 0, u: lanes[i], v: 0, air: 1, fly: false, steer: 0,
    nextBreath: rnd(2.5, 4), bOpen: false, bT: 0, bLen: 1,
    stun: 0, eat: 0, cramp: 0, plancha: 0, drown: 0, noAir: 0, gulp: 0, immune: 0, boost: 0, boostMult: 1,
    objMult: 1, objT: 0, objKind: null,
    boat: 0, dive: 0, charge: 0, slapCd: 0, bubble: null, finished: false, finishT: 0,
    ai: { breathAt: 0, useAt: 0, slapAt: rnd(1, 3), wantU: lanes[i], flyUntil: 0, nextFly: rnd(6, 14) }, complainAt: rnd(5, 9)
  }));
  const objs = [];
  for (let x = 8; x < RACE_M - 4; x += rnd(4, 7)) {
    const n = Math.random() < 0.4 ? 2 : 1, used = [];
    for (let k = 0; k < n; k++) {
      let u; do u = rnd(0.12, 0.88); while (used.some((v) => Math.abs(v - u) < 0.25));
      used.push(u); objs.push({ kind: pickItem(), x: x + rnd(-0.8, 0.8), u });
    }
  }
  return { t: -3, racers, objs, bulletOwner: null, bullet: 0, slaps: !!opts.slaps, over: false, overT: 0, fx: [] };
}

function say(r, text, dur = 1.4) { r.bubble = { text, t: dur }; }
const specialSecs = (ch) => ch.cd * SPECIAL_K;
const specialReady = (r) => r.charge >= 1;

function ahead(race, r, range) {
  let best = null;
  for (const o of race.racers) if (o !== r && !o.finished && o.x > r.x && o.x - r.x < range && (!best || o.x < best.x)) best = o;
  return best;
}
function behind(race, r, range) {
  let best = null;
  for (const o of race.racers) if (o !== r && !o.finished && o.x < r.x && r.x - o.x < range && (!best || o.x > best.x)) best = o;
  return best;
}
function hit(o, secs, text) {
  if (o.immune > 0) return false;
  o.stun = Math.max(o.stun, secs); o.v *= 0.3; if (text) say(o, text, 1);
  return true;
}

function useSpecial(race, r) {
  if (!specialReady(r)) return;
  r.charge = 0;
  const ch = r.ch;
  say(r, ch.special + "!", 1.3);
  race.fx.push({ kind: "special", r, t: 0.8 });
  switch (ch.id) {
    case "pablito": r.immune = 3; r.boost = 3; r.boostMult = 1.12; break;
    case "luis": r.immune = 1.2; r.x += 3; break;
    case "facu": { const o = ahead(race, r, 30); if (o) hit(o, 1.6, "¡ME COMIÓ!"); else { r.boost = 1; r.boostMult = 1.3; } break; }
    case "mati": r.immune = 2.5; r.dive = 2.5; break;
    case "andre": { const o = ahead(race, r, 22) || behind(race, r, 10); if (o && o.immune <= 0) { o.eat = 2.5; o.v *= 0.2; say(o, "ÑAM ÑAM", 2.5); } break; }
    case "mika": { const o = ahead(race, r, 60); r.x = o ? o.x + 1 : r.x + 4; if (o) r.u = o.u; break; }
    case "gaston": r.boat = 3; r.immune = 3; r.boost = 3; r.boostMult = 1.45; break;
    case "luchito": r.immune = 1.5; r.boost = 1.5; r.boostMult = 2; break;
    case "fer": race.bulletOwner = r; race.bullet = 3; break;
  }
}

function breathe(r) {
  if (r.bOpen) {
    r.bOpen = false; r.air = Math.min(1, r.air + AIR_BREATH); r.noAir = 0;
    r.nextBreath = rnd(4.5, 6.5) * r.ch.breathGap;
    if (r.isPlayer) say(r, "¡AIRE!", 0.7);
  } else if (r.gulp <= 0) { // respirar a destiempo: tragás agua
    r.air = Math.max(0, r.air - AIR_WATER); r.gulp = 0.6; say(r, "¡GLUB!", 0.8);
  }
}

function slap(race, r) {
  if (r.slapCd > 0 || r.stun > 0) return;
  r.slapCd = 1.2;
  race.fx.push({ kind: "slap", r, t: 0.3 });
  for (const o of race.racers) {
    if (o === r || o.finished) continue;
    if (Math.abs(o.x - r.x) < 2.4 && Math.abs(o.u - r.u) < 0.3) {
      if (hit(o, 0.9, "¡PAF!")) o.u = clamp(o.u + (o.u >= r.u ? 0.12 : -0.12), 0.08, 0.92);
    }
  }
}

function aiThink(race, r, dt, player) {
  const ai = r.ai, ch = r.ch;
  // respirar: con un poco de reacción; a veces se les pasa (a Fer casi nunca)
  if (r.bOpen) {
    if (!ai.breathAt) ai.breathAt = race.t + (Math.random() < (ch.calm ? 0.03 : 0.12) ? 99 : rnd(0.15, 0.6));
    if (race.t > ai.breathAt) { breathe(r); ai.breathAt = 0; }
  } else ai.breathAt = 0;
  // mariposa: en tramos cortos, con aire de sobra, y a fondo en el final
  if (!r.fly && race.t > ai.nextFly && r.air > 0.65) { ai.flyUntil = race.t + rnd(1.5, 3); ai.nextFly = race.t + rnd(7, 13); }
  r.fly = (race.t < ai.flyUntil || (r.x > RACE_M - 15 && r.air > 0.25)) && r.air > 0.2;
  // carril: esquivar lo que frena, buscar lo que acelera, molestar (los agresivos)
  let want = ai.wantU, best = 99;
  for (const o of race.objs) {
    const dx = o.x - r.x;
    if (o.gone || dx < 0 || dx > 12) continue;
    const it = ITEMS[o.kind];
    if (!it.good && Math.abs(o.u - r.u) < 0.13 && dx < best) { want = o.u > r.u ? o.u - 0.25 : o.u + 0.25; best = dx; }
    else if (it.good && best === 99 && Math.abs(o.u - r.u) < 0.35) want = o.u;
  }
  if (race.slaps && ch.aggro && Math.abs(player.x - r.x) < 4 && !player.finished && best === 99) want = player.u;
  want = clamp(want, 0.1, 0.9);
  r.steer = Math.abs(want - r.u) > 0.03 ? Math.sign(want - r.u) : 0;
  // especial
  if (specialReady(r)) {
    if (!ai.useAt) ai.useAt = race.t + rnd(0.6, 2.5);
    const needsAhead = ["facu", "andre", "mika"].includes(ch.id);
    if (race.t > ai.useAt && (!needsAhead || ahead(race, r, 25) || ch.id === "andre" && behind(race, r, 10))) { useSpecial(race, r); ai.useAt = 0; }
  }
  // manotazo
  if (race.slaps && race.t > ai.slapAt) {
    for (const o of race.racers) if (o !== r && Math.abs(o.x - r.x) < 2 && Math.abs(o.u - r.u) < 0.25) { slap(race, r); break; }
    ai.slapAt = race.t + rnd(ch.aggro ? 0.6 : 1.5, ch.aggro ? 1.4 : 3.5);
  }
}

function stepRace(race, dt, input) {
  race.t += dt;
  for (const f of race.fx) f.t -= dt;
  race.fx = race.fx.filter((f) => f.t > 0);
  if (race.t < 0) return;
  const player = race.racers[0];
  if (race.bullet > 0) { race.bullet -= dt; if (race.bullet <= 0) race.bulletOwner = null; }

  for (const r of race.racers) {
    const ch = r.ch;
    if (r.bubble) { r.bubble.t -= dt; if (r.bubble.t <= 0) r.bubble = null; }
    if (r.finished) { r.v *= 1 - dt * 1.5; r.x += r.v * dt; continue; }
    for (const k of ["stun", "eat", "cramp", "plancha", "drown", "gulp", "immune", "boost", "boat", "dive", "slapCd", "objT"]) r[k] = Math.max(0, r[k] - dt);
    r.charge = Math.min(1, r.charge + dt / specialSecs(ch));

    // ventana para respirar, como en Nadamos por la milanga
    if (r.bOpen) {
      r.bT -= dt;
      if (r.bT <= 0) { r.bOpen = false; r.air = Math.max(0, r.air - AIR_WATER); say(r, "¡TRAGUÉ AGUA!", 1); r.nextBreath = rnd(4.5, 6.5) * ch.breathGap; }
    } else {
      r.nextBreath -= dt;
      if (r.nextBreath <= 0) { r.bOpen = true; r.bLen = Math.max(ch.breathMin || 0.9, 1.5 + ch.breath); r.bT = r.bLen; }
    }

    if (r.isPlayer) {
      r.fly = input.fly; r.steer = (input.down || input.right ? 1 : 0) - (input.up || input.left ? 1 : 0);
      if (input.breathePressed) breathe(r);
      if (input.specialPressed) useSpecial(race, r);
      if (input.slapPressed && race.slaps) slap(race, r);
    } else aiThink(race, r, dt, player);

    // rasgos de cada personaje
    const blocked = r.stun || r.eat || r.cramp || r.drown;
    if (!blocked) {
      if (ch.complains && race.t > r.complainAt) { say(r, pick(COMPLAINTS), 1.8); r.boost = 1.8; r.boostMult = 1.25; r.complainAt = race.t + rnd(7, 11); }
      if (ch.cramps && r.x > 20 && Math.random() < dt * 0.045) { r.cramp = 1.1; say(r, "¡CALAMBRE!"); }
      if (ch.lazy && r.x > 10 && Math.random() < dt * 0.03) { r.plancha = 1.2; say(r, "plancha..."); }
      if (ch.drowns && r.x > 15 && Math.random() < dt * 0.02) { r.drown = 1.8; say(r, "¡AYUDA!", 1.8); }
    }

    // aire: el crol gasta poco, la mariposa mucho
    const flying = r.fly && r.air > 0 && !blocked && !r.plancha;
    r.air -= dt * (flying ? AIR_FLY : AIR_CROL) * (ch.calm ? 0.8 : 1);
    if (r.air <= 0) { if (!r.noAir) say(r, "¡SIN AIRE!", 1.2); r.air = 0; r.noAir = 1; } else r.noAir = 0;

    let mult = flying ? FLY_MULT : 1;
    mult *= 1 + (ch.speed - 1) * 0.6;
    if (r.noAir) mult *= 0.45;
    if (r.gulp > 0) mult *= 0.7;
    if (ch.slowStart && race.t < 4) mult *= 0.75;
    if (ch.lazy && r.x < 25) mult *= 1.12; // Mati arranca a full
    if (ch.fade) mult *= 1 - 0.12 * clamp(r.x / RACE_M, 0, 1);
    if (r.boost > 0) mult *= r.boostMult;
    if (r.objT > 0) mult *= r.objMult;
    if (r.plancha > 0) mult *= 0.6;
    if (blocked) mult = r.drown ? 0 : 0.12;
    if (race.bullet > 0 && race.bulletOwner !== r) mult *= 0.5;
    if (!r.isPlayer) mult *= 1 + clamp((player.x - r.x) / 30, -0.08, 0.1); // que la carrera venga pareja
    const target = BASE_V * mult;
    r.v += (target - r.v) * Math.min(1, dt * 2.5);
    r.x += r.v * dt;
    if (!blocked) r.u = clamp(r.u + r.steer * dt * 0.65, 0.08, 0.92);

    // objetos: el que lo toca se lo lleva
    for (const o of race.objs) {
      if (o.gone || Math.abs(o.x - r.x) > 0.9 || Math.abs(o.u - r.u) > 0.1) continue;
      const it = ITEMS[o.kind];
      if (!it.good && (r.immune > 0 || r.boat)) { if (r.boat) o.gone = true; continue; }
      o.gone = true; r.objKind = o.kind; r.objMult = it.mult; r.objT = it.secs;
      say(r, it.name + (it.good ? " ▲" : " ▼"), 1.2);
    }
    // el barquito de Gastón se lleva puesto a todos
    if (r.boat) for (const o of race.racers) if (o !== r && Math.abs(o.x - r.x) < 1.5 && Math.abs(o.u - r.u) < 0.15) hit(o, 1.2, "¡ME PISÓ!");

    if (r.x >= RACE_M) { r.finished = true; r.finishT = race.t; r.bOpen = false; }
  }
  // empujones de costado (solo en el modo con manotazos)
  if (race.slaps) {
    const rs = race.racers;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const a = rs[i], b = rs[j];
      if (Math.abs(a.x - b.x) < 1.2 && Math.abs(a.u - b.u) < 0.1) {
        const s = a.u < b.u ? -1 : 1;
        a.u = clamp(a.u + s * 0.02, 0.08, 0.92); b.u = clamp(b.u - s * 0.02, 0.08, 0.92);
      }
    }
  }
  const done = race.racers.filter((r) => r.finished).length;
  if (!race.over && (player.finished || done >= 2)) { race.over = true; race.overT = race.t; }
}

function standings(race) {
  return race.racers.slice().sort((a, b) => {
    if (a.finished && b.finished) return a.finishT - b.finishT;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.x - a.x;
  });
}

// ---------- Pantallas y controles ----------
function startApp(cfg) {
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize); resize();

  const input = { up: false, down: false, left: false, right: false, fly: false, breathePressed: false, specialPressed: false, slapPressed: false };
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", c: "fly", C: "fly", Shift: "fly" };
  const presses = { " ": "breathePressed", x: "specialPressed", X: "specialPressed", z: "slapPressed", Z: "slapPressed" };
  window.addEventListener("keydown", (e) => {
    if (keys[e.key]) { input[keys[e.key]] = true; e.preventDefault(); }
    if (presses[e.key] && !e.repeat) { input[presses[e.key]] = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { if (keys[e.key]) input[keys[e.key]] = false; });

  // botones táctiles
  const pad = document.getElementById("pad");
  for (const b of cfg.buttons) {
    const el = document.createElement("div");
    el.className = "btn " + b.cls; el.innerHTML = `<i class="fill"></i><span>${b.label}</span>`;
    const on = (e) => { e.preventDefault(); el.classList.add("on"); if (b.hold) input[b.hold] = true; if (b.press) input[b.press] = true; };
    const off = (e) => { e.preventDefault(); el.classList.remove("on"); if (b.hold) input[b.hold] = false; };
    el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
    pad.appendChild(el);
    if (b.id) el.id = b.id;
  }

  const scr = document.getElementById("scr");
  let race = null, player = null, chosen = null;

  function show(html) { scr.innerHTML = html; scr.style.display = "flex"; pad.style.display = "none"; }
  function face(ch, size) {
    return `<span class="face" style="width:${size}px;height:${size}px;background:${ch.skin};border-color:${ch.cap};box-shadow:inset 0 ${size * 0.38}px 0 ${ch.cap}"></span>`;
  }
  function goFull() {
    try { const d = document.documentElement; if (d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {})).catch(() => {}); } catch (e) {}
  }

  function selectScreen() {
    race = null;
    show(`<h1>${cfg.title}</h1><p class="sub">${cfg.subtitle}</p><p>Elegí tu nadador</p>
      <div class="grid">${CHARS.map((c) => `<button class="ch" data-id="${c.id}">${face(c, 34)}<b>${c.name}</b><small>${c.special}</small></button>`).join("")}</div>`);
    scr.querySelectorAll(".ch").forEach((b) => b.onclick = () => { goFull(); chosen = CHARS.find((c) => c.id === b.dataset.id); drawScreen(); });
  }
  function drawScreen() {
    const draft = newRace(chosen, cfg);
    const [p, a, b] = draft.racers;
    const legend = Object.keys(ITEMS).map((k) => `<span class="it">${itemIcon(k)} ${ITEMS[k].name} ${ITEMS[k].good ? "▲" : "▼"}</span>`).join("");
    show(`<p class="sub">Sorteo de rivales</p>
      <div class="vs">${[p, a, b].map((r, i) => `<div class="card ${i ? "" : "me"}">${face(r.ch, 46)}<b>${r.ch.name}${i ? "" : " (vos)"}</b><small>${r.ch.tag}</small><small class="sp">Especial: ${r.ch.special}</small></div>`).join("")}</div>
      <p class="help">${cfg.help}</p><div class="legend">${legend}</div><button class="go">¡A LA PILETA!</button>`);
    scr.querySelector(".go").onclick = () => {
      race = draft; player = race.racers[0]; scr.style.display = "none"; pad.style.display = "block";
    };
  }
  function endScreen() {
    const st = standings(race), pos = st.indexOf(player) + 1;
    const win = pos === 1;
    show(`<h1 class="${win ? "win" : "lose"}">${win ? "¡GANASTE!" : pos === 2 ? "SALISTE 2º" : "SALISTE 3º"}</h1>
      <p class="sub">${win ? "La gloria es tuya. Se desbloquearía el próximo circuito." : "Sin gloria esta vez: hay que repetir el circuito."}</p>
      <ol class="podio">${st.map((r) => `<li>${face(r.ch, 22)} ${r.ch.name}${r.isPlayer ? " (vos)" : ""} <small>${r.finished ? r.finishT.toFixed(1) + " s" : Math.floor(r.x) + " m"}</small></li>`).join("")}</ol>
      <div class="row"><button class="go" id="again">OTRA VEZ</button><button id="change">CAMBIAR NADADOR</button></div>`);
    document.getElementById("again").onclick = drawScreen;
    document.getElementById("change").onclick = selectScreen;
  }

  const setBtn = (id, ready, fill, label) => {
    const el = document.getElementById(id); if (!el) return;
    el.classList.toggle("ready", ready); el.querySelector(".fill").style.width = (fill * 100) + "%";
    if (label) el.querySelector("span").textContent = label;
  };
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    if (race) {
      stepRace(race, dt, input);
      input.breathePressed = false; input.specialPressed = false; input.slapPressed = false;
      cfg.render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      setBtn("bbr", player.bOpen, player.bOpen ? player.bT / player.bLen : 0, player.bOpen ? "¡RESPIRÁ!" : "RESPIRAR");
      setBtn("bsp", specialReady(player), player.charge, player.ch.special);
      if (race.over && race.t - race.overT > 1.4 && scr.style.display === "none") endScreen();
    } else cfg.render(ctx, null, W, H);
    requestAnimationFrame(frame);
  }
  selectScreen();
  requestAnimationFrame(frame);
}

function drawHud(ctx, race, W, H) {
  const p = race.racers[0], st = standings(race), pos = st.indexOf(p) + 1;
  ctx.save();
  // posición
  ctx.font = "bold 34px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.lineWidth = 5; ctx.strokeStyle = "#0008"; ctx.fillStyle = pos === 1 ? "#FFD84A" : "#fff";
  ctx.strokeText(pos + "º", 12, 8); ctx.fillText(pos + "º", 12, 8);
  ctx.font = "bold 13px system-ui, sans-serif"; ctx.fillStyle = "#fff";
  const m = Math.min(RACE_M, Math.floor(p.x)) + " / " + RACE_M + " m";
  ctx.strokeText(m, 12, 46); ctx.fillText(m, 12, 46);
  // barra de progreso con los 3
  const bx = 80, bw = W - 80 - 200, by = 18;
  ctx.fillStyle = "#0006"; ctx.fillRect(bx, by - 3, bw, 6);
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw - 2, by - 8, 4, 16);
  for (const r of race.racers) {
    const x = bx + bw * clamp(r.x / RACE_M, 0, 1);
    ctx.beginPath(); ctx.arc(x, by, r.isPlayer ? 8 : 6, 0, 7); ctx.fillStyle = r.ch.cap; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.stroke();
  }
  // aire y estilo
  const ax = W - 140, aw = 128;
  ctx.fillStyle = "#0006"; ctx.fillRect(ax, 10, aw, 14);
  ctx.fillStyle = p.noAir ? "#E84A4A" : p.air < 0.3 ? "#F0A030" : "#7FE0FF"; ctx.fillRect(ax + 2, 12, (aw - 4) * p.air, 10);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "right";
  ctx.fillText("AIRE", ax - 4, 11);
  ctx.textAlign = "left"; ctx.fillStyle = p.fly && p.air > 0 ? "#FFD84A" : "#fff";
  ctx.strokeText(p.fly && p.air > 0 ? "MARIPOSA" : "CROL", ax, 30); ctx.fillText(p.fly && p.air > 0 ? "MARIPOSA" : "CROL", ax, 30);
  if (p.objT > 0) {
    const it = ITEMS[p.objKind];
    ctx.fillStyle = it.good ? "#7CFC6A" : "#FF8A7A";
    const s = it.name + " " + (it.good ? "▲" : "▼") + " " + p.objT.toFixed(1);
    ctx.strokeText(s, ax, 46); ctx.fillText(s, ax, 46);
  }
  // largada
  if (race.t < 0.6) {
    const n = race.t < 0 ? Math.ceil(-race.t) : 0;
    ctx.font = "bold 90px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 8; ctx.strokeStyle = "#0009"; ctx.fillStyle = n ? "#fff" : "#7CFC6A";
    const s = n ? String(n) : "¡YA!";
    ctx.strokeText(s, W / 2, H / 2); ctx.fillText(s, W / 2, H / 2);
  }
  if (race.bullet > 0) { ctx.fillStyle = "rgba(120,80,200,0.15)"; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

function drawBubble(ctx, x, y, text, size = 13) {
  ctx.save();
  ctx.font = `bold ${size}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 12, h = size + 9;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h, w, h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#222"; ctx.fillText(text, x, y - h / 2 + 1);
  ctx.restore();
}

// Dibuja un objeto centrado en (x, y), con tamaño s (radio aproximado en píxeles).
function drawItem(ctx, kind, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = Math.max(1, s * 0.12); ctx.strokeStyle = "#0007";
  const good = ITEMS[kind].good;
  // halo: verde si conviene, rojo si frena
  ctx.fillStyle = good ? "rgba(124,252,106,0.35)" : "rgba(255,90,70,0.35)";
  ctx.beginPath(); ctx.arc(0, 0, s * 1.25, 0, 7); ctx.fill();
  if (kind === "patas") {
    ctx.fillStyle = "#FFD23A";
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * s * 0.35, -s * 0.8); ctx.lineTo(d * s * 0.35 + s * 0.45, s * 0.8); ctx.lineTo(d * s * 0.35 - s * 0.45, s * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  } else if (kind === "manoplas") {
    ctx.fillStyle = "#FF8A2A";
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.roundRect(d * s * 0.5 - s * 0.38, -s * 0.6, s * 0.76, s * 1.2, s * 0.3); ctx.fill(); ctx.stroke(); }
  } else if (kind === "antiparras") {
    ctx.fillStyle = "#2B2B33"; ctx.fillRect(-s, -s * 0.08, s * 2, s * 0.16);
    ctx.fillStyle = "#7FE0FF";
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * s * 0.42, 0, s * 0.38, s * 0.3, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  } else if (kind === "paracaidas") {
    ctx.fillStyle = "#E23B3B";
    ctx.beginPath(); ctx.arc(0, 0, s * 0.85, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, s * 0.08);
    for (const d of [-0.8, 0, 0.8]) { ctx.beginPath(); ctx.moveTo(d * s, 0); ctx.lineTo(0, s * 0.75); ctx.stroke(); }
  } else if (kind === "tablita") {
    ctx.fillStyle = "#3A6FE0";
    ctx.beginPath(); ctx.roundRect(-s * 0.6, -s * 0.85, s * 1.2, s * 1.7, [s * 0.6, s * 0.6, s * 0.2, s * 0.2]); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function itemIcon(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 40;
  drawItem(c.getContext("2d"), kind, 20, 20, 14);
  return `<img src="${c.toDataURL()}" width="20" height="20" alt="">`;
}
