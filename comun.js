// Nadar por la gloria — base común de los prototipos (descartable).
// Personajes y rasgos tomados de Nadamos por la milanga (index.html, const CHARS).

const CHARS = [
  { id: "pablito", name: "PABLITO", tag: "Te levanta una losa y te nada 2000 metros en el mismo día", special: "CAMINAR", cap: "#F0BE98", suit: "#1F3F8F", skin: "#F0BE98", speed: 1, breathGap: 1.2, breath: 0.35 },
  { id: "luis", name: "LUIS", tag: "Nadador rápido, pero necesita quejarse para ir más rápido", special: "SALTAR", cap: "#4A5FD0", suit: "#D4A017", skin: "#E6B08A", speed: 1.08, breathGap: 1.2, breath: 0.15, fade: true, complains: true, slowStart: true },
  { id: "facu", name: "FACU", tag: "Guarda que te como", special: "TE COMO", cap: "#1A1A1E", suit: "#1A1A1A", skin: "#EDBB95", speed: 1.09, breathGap: 1.15, breath: 0, aggro: true },
  { id: "mati", name: "MATI", tag: "Nada un poco pachorra", special: "SUMERGIR", cap: "#E8C25A", suit: "#2E8B57", skin: "#F2C6A0", speed: 1, breathGap: 1, breath: 0.1, lazy: true },
  { id: "andre", name: "ANDRE", tag: "La maestra repostera", special: "UNA MASITA", cap: "#2B2D3A", suit: "#111111", skin: "#E3AE86", speed: 0.95, breathGap: 1, breath: 0.2 },
  { id: "mika", name: "MICA", tag: "Aparece donde menos la esperás", special: "AYAHUASCA", cap: "#16161C", suit: "#2F6FE0", skin: "#F0C4A2", speed: 1, breathGap: 1, breath: 0.25 },
  { id: "gaston", name: "GASTÓN", tag: "Cuando zarpa, no lo para nadie", special: "NAVEGANTE", cap: "#A9A9A9", suit: "#1E3A5F", skin: "#E8B48E", speed: 0.92, breathGap: 1, breath: 0.15, drowns: true, aggro: true },
  { id: "luchito", name: "LUCHITO", tag: "Nadador rápido, aunque los calambres lo tienen a maltraer", special: "ACELERADA", cap: "#1A1410", suit: "#18A558", skin: "#EEC09A", speed: 1.08, breathGap: 1.25, breath: 0.3, fade: true, cramps: true },
  { id: "fer", name: "FER", tag: "Nadador con experiencia: lee la pileta como nadie", special: "BULLET TIME", cap: "#E6B48C", suit: "#2B4C7E", skin: "#E6B48C", speed: 0.9, breathGap: 0.8, breath: 0.3, calm: true }
];
const COMPLAINTS = ["¡ESTÁ HELADA!", "¿QUIÉN ARMÓ ESTA SERIE?", "ME DUELE EL HOMBRO", "¡LA PROFE ME ODIA!", "HAY MUCHA GENTE HOY", "¿SALE MILANGA HOY?"];

const RACE_M = 100;   // largo de la carrera, en metros
const BASE_V = 2.5;   // velocidad tope base, m/s

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ---------- Carrera ----------
function newRace(playerCh, opts) {
  const others = CHARS.filter((c) => c.id !== playerCh.id).sort(() => Math.random() - 0.5);
  const chars = [playerCh, others[0], others[1]];
  const lanes = [0.5, 0.2, 0.8];
  const racers = chars.map((ch, i) => ({
    ch, isPlayer: i === 0, x: 0, u: lanes[i], v: 0, air: 1, hold: false, steer: 0,
    stun: 0, eat: 0, cramp: 0, plancha: 0, drown: 0, noAir: 0, immune: 0, boost: 0, boostMult: 1,
    boat: 0, dive: 0, item: false, slapCd: 0, bubble: null, finished: false, finishT: 0,
    ai: { breathing: false, useAt: 0, slapAt: rnd(1, 3), wantU: lanes[i] }, complainAt: rnd(5, 9)
  }));
  const objs = [];
  for (let x = 12; x < RACE_M - 6; x += rnd(6, 10)) objs.push({ kind: "churro", x, u: rnd(0.12, 0.88) });
  for (const x of [18, 42, 66, 84]) {
    for (const u of [0.2, 0.5, 0.8]) objs.push({ kind: "milanga", x: x + rnd(-1, 1), u: u + rnd(-0.05, 0.05) });
  }
  return { t: -3, racers, objs, bulletOwner: null, bullet: 0, slaps: !!opts.slaps, over: false, overT: 0, fx: [] };
}

function say(r, text, dur = 1.4) { r.bubble = { text, t: dur }; }

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
  if (!r.item) return;
  r.item = false;
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
  // respirar
  if (r.air < 0.22) ai.breathing = true;
  if (ai.breathing && r.air > (ch.calm ? 0.6 : 0.75)) ai.breathing = false;
  r.hold = !ai.breathing;
  // carril: esquivar churros, ir a milanesas, molestar (los agresivos)
  let want = ai.wantU;
  for (const o of race.objs) {
    const dx = o.x - r.x;
    if (dx < 0 || dx > 12) continue;
    if (o.kind === "churro" && Math.abs(o.u - r.u) < 0.13) { want = o.u > r.u ? o.u - 0.25 : o.u + 0.25; break; }
    if (o.kind === "milanga" && !r.item && Math.abs(o.u - r.u) < 0.35) want = o.u;
  }
  if (race.slaps && ch.aggro && Math.abs(player.x - r.x) < 4 && !player.finished) want = player.u;
  want = clamp(want, 0.1, 0.9);
  r.steer = Math.abs(want - r.u) > 0.03 ? Math.sign(want - r.u) : 0;
  // especial
  if (r.item) {
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
    for (const k of ["stun", "eat", "cramp", "plancha", "drown", "noAir", "immune", "boost", "boat", "dive", "slapCd"]) r[k] = Math.max(0, r[k] - dt);

    if (r.isPlayer) {
      r.hold = input.swim; r.steer = (input.down || input.right ? 1 : 0) - (input.up || input.left ? 1 : 0);
      if (input.specialPressed) useSpecial(race, r);
      if (input.slapPressed && race.slaps) slap(race, r);
    } else aiThink(race, r, dt, player);

    // rasgos de cada personaje
    const blocked = r.stun || r.eat || r.cramp || r.drown;
    if (!blocked) {
      if (ch.complains && race.t > r.complainAt) { say(r, pick(COMPLAINTS), 1.8); r.boost = 1.8; r.boostMult = 1.25; r.complainAt = race.t + rnd(7, 11); }
      if (ch.cramps && r.x > 20 && Math.random() < dt * 0.045) { r.cramp = 1.1; say(r, "¡CALAMBRE!"); }
      if (ch.lazy && r.x > 10 && Math.random() < dt * 0.03) { r.plancha = 1.5; say(r, "plancha..."); }
      if (ch.drowns && r.x > 15 && Math.random() < dt * 0.02) { r.drown = 1.8; say(r, "¡AYUDA!", 1.8); }
    }

    // aire
    let swimming = r.hold && !r.noAir;
    if (swimming) {
      r.air -= dt * 0.17 / (ch.breathGap * (1 + ch.breath)) * (ch.calm ? 0.75 : 1);
      if (r.air <= 0) { r.air = 0; r.noAir = 1.4; say(r, "¡AIRE!", 1.2); swimming = false; }
    } else r.air = Math.min(1, r.air + dt * 0.32);

    let vtop = BASE_V * (1 + (ch.speed - 1) * 0.6);
    let mult = swimming ? 1 : 0.55;
    if (ch.slowStart && race.t < 4) mult *= 0.75;
    if (ch.fade) mult *= 1 - 0.12 * clamp(r.x / RACE_M, 0, 1);
    if (r.boost > 0) mult *= r.boostMult;
    if (ch.lazy && r.x < 12) mult *= 1.12; // Mati arranca a full
    if (r.plancha > 0) mult *= 0.45;
    if (blocked) mult = r.drown ? 0 : 0.12;
    if (race.bullet > 0 && race.bulletOwner !== r) mult *= 0.5;
    if (!r.isPlayer) mult *= 1 + clamp((player.x - r.x) / 30, -0.08, 0.1); // que la carrera venga pareja
    const target = vtop * mult;
    r.v += (target - r.v) * Math.min(1, dt * 2.5);
    r.x += r.v * dt;
    if (!blocked) r.u = clamp(r.u + r.steer * dt * 0.65, 0.08, 0.92);

    // objetos
    for (const o of race.objs) {
      if (o.gone || Math.abs(o.x - r.x) > 0.9 || Math.abs(o.u - r.u) > 0.1) continue;
      if (o.kind === "milanga") { if (!r.item) { r.item = true; o.gone = true; if (r.isPlayer) say(r, "¡MILANGA! → " + ch.special, 1.2); } }
      else if (r.boat) o.gone = true;
      else if (r.immune <= 0 && !(o.hits || (o.hits = new Set())).has(r)) { o.hits.add(r); hit(r, 0.8, "¡UH!"); }
    }
    // el barquito de Gastón se lleva puesto a todos
    if (r.boat) for (const o of race.racers) if (o !== r && Math.abs(o.x - r.x) < 1.5 && Math.abs(o.u - r.u) < 0.15) hit(o, 1.2, "¡ME PISÓ!");

    if (r.x >= RACE_M) { r.finished = true; r.finishT = race.t; }
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

  const input = { up: false, down: false, left: false, right: false, swim: false, specialPressed: false, slapPressed: false };
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", " ": "swim" };
  window.addEventListener("keydown", (e) => {
    if (keys[e.key]) { input[keys[e.key]] = true; e.preventDefault(); }
    if (e.key === "x" || e.key === "X") input.specialPressed = true;
    if (e.key === "z" || e.key === "Z") input.slapPressed = true;
  });
  window.addEventListener("keyup", (e) => { if (keys[e.key]) input[keys[e.key]] = false; });

  // botones táctiles
  const pad = document.getElementById("pad");
  for (const b of cfg.buttons) {
    const el = document.createElement("div");
    el.className = "btn " + b.cls; el.textContent = b.label;
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
    race = newRace(chosen, cfg);
    const [p, a, b] = race.racers;
    show(`<p class="sub">Sorteo de rivales</p>
      <div class="vs">${[p, a, b].map((r, i) => `<div class="card ${i ? "" : "me"}">${face(r.ch, 46)}<b>${r.ch.name}${i ? "" : " (vos)"}</b><small>${r.ch.tag}</small><small class="sp">Especial: ${r.ch.special}</small></div>`).join("")}</div>
      <p class="help">${cfg.help}</p><button class="go">¡A LA PILETA!</button>`);
    race = null;
    scr.querySelector(".go").onclick = () => {
      race = newRace(chosen, cfg); race.racers[1].ch = a.ch; race.racers[2].ch = b.ch;
      player = race.racers[0]; scr.style.display = "none"; pad.style.display = "block";
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

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    if (race) {
      stepRace(race, dt, input);
      input.specialPressed = false; input.slapPressed = false;
      cfg.render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      const sp = document.getElementById("bsp");
      if (sp) { sp.classList.toggle("ready", player.item); sp.textContent = player.item ? player.ch.special : "ESPECIAL"; }
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
  ctx.strokeText(Math.min(RACE_M, Math.floor(p.x)) + " / " + RACE_M + " m", 12, 46); ctx.fillText(Math.min(RACE_M, Math.floor(p.x)) + " / " + RACE_M + " m", 12, 46);
  // barra de progreso con los 3
  const bx = 80, bw = W - 80 - 200, by = 18;
  ctx.fillStyle = "#0006"; ctx.fillRect(bx, by - 3, bw, 6);
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw - 2, by - 8, 4, 16);
  for (const r of race.racers) {
    const x = bx + bw * clamp(r.x / RACE_M, 0, 1);
    ctx.beginPath(); ctx.arc(x, by, r.isPlayer ? 8 : 6, 0, 7); ctx.fillStyle = r.ch.cap; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.stroke();
  }
  // aire
  const ax = W - 140, aw = 128;
  ctx.fillStyle = "#0006"; ctx.fillRect(ax, 10, aw, 14);
  ctx.fillStyle = p.noAir ? "#E84A4A" : p.air < 0.3 ? "#F0A030" : "#7FE0FF"; ctx.fillRect(ax + 2, 12, (aw - 4) * p.air, 10);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "right";
  ctx.fillText("AIRE", ax - 4, 11);
  // largada
  if (race.t < 0.6) {
    const n = race.t < 0 ? Math.ceil(-race.t) : 0;
    ctx.font = "bold 90px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 8; ctx.strokeStyle = "#0009"; ctx.fillStyle = n ? "#fff" : "#7CFC6A";
    const s = n ? String(n) : "¡YA!";
    ctx.strokeText(s, W / 2, H / 2); ctx.fillText(s, W / 2, H / 2);
  }
  if (race.bullet > 0) {
    ctx.fillStyle = "rgba(120,80,200,0.15)"; ctx.fillRect(0, 0, W, H);
  }
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

function drawMilanga(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#B8722C"; ctx.strokeStyle = "#7A4518"; ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.68, -0.3, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#D8963E";
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.3) * s * 0.5, Math.sin(i * 2.1) * s * 0.3, s * 0.1, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#F4E04A"; ctx.beginPath(); ctx.moveTo(s * 0.55, -s * 0.45); ctx.arc(s * 0.55, -s * 0.45, s * 0.35, 0.2, 1.9); ctx.fill();
  ctx.restore();
}

function drawChurro(ctx, x, y, len, thick, color) {
  ctx.save();
  ctx.fillStyle = color; ctx.strokeStyle = "#0004"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - thick / 2, y - len / 2, thick, len, thick / 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
