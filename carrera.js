// Nadar por la gloria — nadadores, objetos y reglas de la carrera.
// Cuatro nadadores del grupo, con números propios tipo autitos de carrera. El humor viene de
// Nadamos por la milanga, pero las ventajas y desventajas son de este juego.

// Números de 1 a 5; todos suman 14. spd: velocidad en crol · air: cuánto aguanta ·
// rec: qué tan rápido recarga el aire al respirar · fly: cuánto rinde la mariposa.
const CHARS = [
  { id: "facu", name: "FACU", tag: "Guarda que te como", quirk: "Si tiene a alguien cerca adelante, se acelera solo y gasta un poco más de aire.",
    special: "TE COMO", specialInfo: "agarra al de adelante y lo pasa", charge: 15, spd: 5, air: 2, rec: 3, fly: 4,
    cap: "#1A1A1E", suit: "#1A1A1A", skin: "#EDBB95" },
  { id: "luis", name: "LUIS", tag: "El quejoso", quirk: "Arranca lento, y cada vez que se queja pega un tirón.",
    special: "SALTAR", specialInfo: "pasa por arriba de lo que tenga adelante", charge: 10, spd: 4, air: 3, rec: 2, fly: 5,
    cap: "#4A5FD0", suit: "#D4A017", skin: "#E6B08A" },
  { id: "mati", name: "MATI", tag: "El diésel", quirk: "Cada tanto hace la plancha: frena, pero recupera aire.",
    special: "SUMERGIR", specialInfo: "nada por abajo del agua rapidísimo y esquiva todo", charge: 12, spd: 2, air: 5, rec: 5, fly: 2,
    cap: "#E8C25A", suit: "#2E8B57", skin: "#F2C6A0" },
  { id: "pablo", name: "PABLO", tag: "La losa", quirk: "Es una losa: lo que frena le hace menos efecto, pero cambia de carril más lento.",
    special: "CAMINAR", specialInfo: "camina un poco más lento, esquiva todo y mientras tanto recarga el aire", charge: 10, spd: 3, air: 4, rec: 4, fly: 3,
    cap: "#F0BE98", suit: "#1F3F8F", skin: "#F0BE98", heavy: true }
];
const STATS = [["spd", "Velocidad"], ["air", "Aire"], ["rec", "Recarga"], ["fly", "Mariposa"]];
const COMPLAINTS = ["¡ESTÁ HELADA!", "¿QUIÉN ARMÓ ESTA SERIE?", "ME DUELE EL HOMBRO", "¡LA PROFE ME ODIA!", "HAY MUCHA GENTE HOY", "¿SALE MILANGA HOY?"];

// Objetos que flotan en la pileta: los buenos aceleran, los malos frenan, por unos segundos.
const ITEMS = {
  patas:      { name: "PATAS",      mult: 1.9,  secs: 3,   good: true,  weight: 10 },
  manoplas:   { name: "MANOPLAS",   mult: 1.6,  secs: 3.5, good: true,  weight: 18 },
  latita:     { name: "LATITA",     mult: 1.5,  secs: 3.5, good: true,  weight: 16, air: 0.25 }, // energía: acelera y da un poco de aire
  dulce:      { name: "DULCE DE LECHE", mult: 1.4, secs: 3, good: true, weight: 7, air: 1 },  // premio raro: te llena el aire
  paracaidas: { name: "PARACAÍDAS", mult: 0.6,  secs: 3,   good: false, weight: 26 },
  tablita:    { name: "TABLITA",    mult: 0.4,  secs: 3,   good: false, weight: 22 }
};

const RACE_M = 100;       // largo de la carrera si no se dice otro, en metros

// Los tres circuitos de la copa. Cada uno cambia una regla y los rivales se ponen más difíciles.
const CIRCUITS = {
// pool: largo de la pileta; si la carrera es más larga, en cada pared se hace la vuelta americana.
// dists: los largos de carrera que se pueden elegir en la carrera rápida (la copa usa len).
// show: los metros que se muestran, cuando la carrera "equivale" a más de lo que se nada en el juego.
  sprint:    { id: "sprint", name: "SPRINT", pool: 50, len: 50, level: 0, gap: [4, 6],
               info: "Un solo largo de 50 m en la pileta olímpica: sin vueltas, todo a fondo. La salida es clave." },
  idavuelta: { id: "idavuelta", name: "IDA Y VUELTA", pool: 50, len: 200, dists: [100, 200, 400], level: 1, gap: [4, 7],
               info: "En la pileta olímpica, ida y vuelta: en cada pared, vuelta americana. Hay que repartir el aire." },
  abiertas:  { id: "abiertas", name: "AGUAS ABIERTAS", len: 150, show: 500, level: 2, gap: [5, 8], current: 0.08, against: 0.14, open: true,
               info: "500 m en el río, sin paredes ni corcheras. La corriente cambia: a veces te frena de frente y a veces te lleva de costado." }
};
const CUP = ["sprint", "idavuelta", "abiertas"];
// metros que se muestran (en aguas abiertas cada metro del juego vale más)
const shownLen = (race) => race.circ.show && race.len === race.circ.len ? race.circ.show : race.len;
const shownM = (race, x) => Math.round(x * shownLen(race) / race.len);
const CUP_POINTS = [10, 6, 3];          // puntos por puesto en cada carrera de la copa
const BONUS = { dulce: 2, air: 2 };     // extra por agarrar dulce de leche y por no quedarse nunca sin aire
// Salida y vuelta americana: una barrita sube y baja; cuanto más arriba está cuando tocás, más empuje.
const BAR_T = 1.0;        // la barra va y vuelve en 1 segundo (en el verde a los 0,5)
const TURN_ZONE = 4;      // a cuántos metros de la pared aparece la barrita de la vuelta
const barAt = (t0, t) => (1 - Math.cos(((t - t0) / BAR_T) * Math.PI * 2)) / 2;
const aiTap = (level) => Math.max(0.08, BAR_T / 2 + (rnd(-1, 1) + rnd(-1, 1)) * [0.2, 0.15, 0.11][level]); // cuándo toca la máquina
const BASE_V = 3.1;       // velocidad de crol de un nadador con velocidad 3, m/s
// El aire es una pila: el crol la gasta despacio, la mariposa rápido, y mantener RESPIRAR la recarga
// (mientras respirás vas más lento).
const AIR_CROL = 0.07;    // aire que gasta el crol por segundo (aire 3)
const AIR_FLY = 0.3;      // aire que gasta la mariposa por segundo (aire 3, mariposa 3)
const BREATH_SLOW = 0.7;  // mientras respirás perdés un 30% de la velocidad
const PECHO_V = 0.85;     // el pecho va más lento que el crol...
const AIR_PECHO = 0.015;  // ...pero casi no gasta aire

// Lo que significa cada número en la pileta.
const TUNE = { a: 0.03, cap: 0.24, gain: 0.2, fm: 0.04, fc: 0.04 };
const speedMult = (ch) => 1 + (ch.spd - 3) * TUNE.a;
const airCap = (ch) => 1.06 + TUNE.cap * (ch.air - 3);
const breathGain = (ch) => 0.6 + TUNE.gain * (ch.rec - 3);
const flyMult = (ch) => 1.63 + TUNE.fm * (ch.fly - 3);
const flyCost = (ch) => 1.06 - TUNE.fc * (ch.fly - 3);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function pickItem() {
  const ks = Object.keys(ITEMS), tot = ks.reduce((s, k) => s + ITEMS[k].weight, 0);
  let n = Math.random() * tot;
  for (const k of ks) { n -= ITEMS[k].weight; if (n <= 0) return k; }
  return ks[0];
}

// Sortea dos rivales distintos del jugador.
function drawRivals(playerCh) {
  return CHARS.filter((c) => c.id !== playerCh.id).sort(() => Math.random() - 0.5).slice(0, 2);
}
// Dónde está en la pileta alguien que nadó x metros: p desde la pared de salida, dir hacia dónde va, lap el largo.
function poolAt(race, x) {
  const L = race.pool, lap = clamp(Math.floor(x / L), 0, race.laps - 1), d = Math.min(L + 3, x - lap * L);
  return lap % 2 ? { p: L - d, dir: -1, lap } : { p: d, dir: 1, lap };
}
function newRace(playerCh, circ = CIRCUITS.olimpica, rivals = drawRivals(playerCh), len = circ.len) {
  // x es la punta de la mano (metros nadados en total): al tirarse del partidor ya entran con el cuerpo en el agua
  const chars = [playerCh, rivals[0], rivals[1]];
  const pool = circ.pool || len, laps = Math.max(1, Math.round(len / pool));
  const lanes = [0.5, 1 / 6, 5 / 6];
  const racers = chars.map((ch, i) => ({
    ch, isPlayer: i === 0, x: 1.5, u: lanes[i], v: 0, air: 1, fly: false, pecho: false,
    onBlock: true, pp: 1.5, dir: 1, nextWall: laps > 1 ? pool : Infinity, wallBar: false, barT0: 0, turnQ: null, prevB: false, push: null, steer: 0,
    breathing: false, stun: 0, plancha: 0, noAir: 0, immune: 0, boost: 0, boostMult: 1, kick: 0,
    objMult: 1, objT: 0, objKind: null, chaseSay: 0,
    dive: 0, walk: 0, drop: null, lunge: 0, lungeTo: 0, lungeU: 0, charge: 1, bubble: null, finished: false, finishT: 0, mood: "normal", moodT: 0, gotDulce: false, ranOut: false,
    ai: { useAt: 0, wantU: lanes[i], diveAt: aiTap(circ.level), turnAt: 0 }, complainAt: rnd(5, 9)
  }));
  const objs = [];
  for (let x = 8; x < len - 4; x += rnd(circ.gap[0], circ.gap[1])) {
    if (laps > 1 && (x % pool < 5 || x % pool > pool - 4)) continue; // nada pegado a las paredes
    const n = Math.random() < 0.4 ? 2 : 1, used = [];
    for (let k = 0; k < n; k++) {
      let u; do u = rnd(0.12, 0.88); while (used.some((v) => Math.abs(v - u) < 0.25));
      used.push(u); objs.push({ kind: pickItem(), x: x + rnd(-0.8, 0.8), u });
    }
  }
  return { t: -3, len, pool, laps, circ, racers, objs, over: false, overT: 0, events: [], cur: 0, against: 0, curPlan: null };
}

function say(r, text, dur = 1.4) { r.bubble = { text, t: dur }; }
// Lo que pasa en la carrera y le interesa a la pantalla (sonidos, avisos). Se vacía en cada cuadro.
function emit(race, r, kind) {
  race.events.push({ r, kind });
  const m = MOODS[kind]; if (m) { r.mood = m[0]; r.moodT = m[1]; }
}
// La cara que pone cada uno cuando le pasa algo (ver caras.js), y por cuántos segundos.
const MOODS = { good: ["happy", 1], bad: ["hurt", 1], hit: ["dead", 1.6], breath: ["gulp", 0.45],
  noAir: ["hurt", 1.2], special: ["happy", 1], finish: ["happy", 3] };
const specialReady = (r) => r.charge >= 1;

// Salto del partidor: con la barrita arriba entra más lejos y más rápido.
// Si la toca perfecta, además sale con turbo un rato (kick).
const kickFor = (q) => q > 0.88 ? 1.8 : q > 0.55 ? 0.7 : 0;
function startDive(race, r, q) {
  r.onBlock = false; r.x = 1.5 + 3 * q; r.v = BASE_V * (1.0 + 1.4 * q); r.kick = kickFor(q);
  r.push = { kind: "SALIDA", q, t: race.t }; r.qs = [q]; emit(race, r, q > 0.88 ? "perfect" : "dive");
}
// Vuelta americana: gira en la pared y empuja; con la barrita arriba sale disparado.
function turnAround(race, r) {
  const q = r.turnQ === null ? 0.1 : r.turnQ, wall = r.nextWall; // si no tocó, gira tarde y sin fuerza
  r.x = wall + 1 + 2.2 * q; r.v = BASE_V * (0.65 + 1.25 * q); r.dive = Math.max(r.dive, 0.2 + 0.4 * q); r.kick = kickFor(q);
  r.wallBar = false; r.nextWall = wall + race.pool < race.len - 0.01 ? wall + race.pool : Infinity;
  r.push = { kind: "VUELTA", q, t: race.t }; (r.qs = r.qs || []).push(q); emit(race, r, q > 0.88 ? "perfect" : "turn");
}
function place(race, r) { const a = poolAt(race, r.x); r.pp = a.p; r.dir = a.dir; }

// La corriente del río cambia cada tantos segundos: calma, de frente o de costado (para un lado o el otro).
const CURRENTS = [
  { kind: "calm", side: 0, against: 0, say: "EL RÍO SE CALMA" },
  { kind: "against", side: 0, against: 1, say: "¡CORRIENTE EN CONTRA!" },
  { kind: "up", side: -1, against: 0.25, say: "CORRIENTE DE COSTADO ↑" },
  { kind: "down", side: 1, against: 0.25, say: "CORRIENTE DE COSTADO ↓" }
];
function stepCurrent(race, dt) {
  const c = race.circ;
  if (!race.curPlan || race.t >= race.curPlan.until) {
    const prev = race.curPlan ? race.curPlan.kind : "calm";
    const opts = CURRENTS.filter((k) => k.kind !== prev), next = race.curPlan ? pick(opts) : CURRENTS[2 + (Math.random() < 0.5 ? 0 : 1)];
    race.curPlan = { ...next, until: race.t + rnd(6, 10), at: race.t };
    race.events.push({ kind: "current", r: null, say: next.say });
  }
  const k = Math.min(1, dt * 0.8); // cambia de a poco
  race.cur += (race.curPlan.side * c.current - race.cur) * k;
  race.against += (race.curPlan.against * c.against - race.against) * k;
}

function ahead(race, r, range) {
  let best = null;
  for (const o of race.racers) if (o !== r && !o.finished && o.x > r.x && o.x - r.x < range && (!best || o.x < best.x)) best = o;
  return best;
}
function hit(race, o, secs, text) {
  if (o.immune > 0) return false;
  if (o.ch.heavy) secs *= 0.4; // Pablo es una losa
  o.stun = Math.max(o.stun, secs); o.v *= o.ch.heavy ? 0.7 : 0.3; if (text) say(o, text, 1);
  return true;
}

function useSpecial(race, r) {
  if (!specialReady(r)) return;
  r.charge = 0;
  say(r, r.ch.special + "!", 1.3);
  emit(race, r, "special");
  switch (r.ch.id) {
    case "facu": { // se tira encima del de adelante, lo frena y sale por delante de él
      // siempre lo pasa; si el otro no está protegido por su especial, además lo deja frenado
      const o = ahead(race, r, 12);
      if (o) {
        if (hit(race, o, 1.4, "¡ME COMIÓ!")) emit(race, o, "hit"); else say(o, "¡EPA!", 1);
        r.lunge = 0.5; r.lungeTo = Math.min(race.len - 0.5, o.x + 1.6); r.lungeU = o.u; r.immune = 0.8;
      } else { r.boost = 1.5; r.boostMult = 1.3; }
      break;
    }
    case "luis": r.immune = 1.2; r.x += 3.5; break;
    case "mati": r.immune = 2.5; r.dive = 2.5; r.boost = 4; r.boostMult = 1.06; r.v = Math.max(r.v, BASE_V * 1.6); break; // se hunde con envión y abajo del agua va más rápido
    case "pablo": r.immune = 4; r.walk = 4; break; // camina: más lento, pero respira todo el tiempo
  }
}


function aiThink(race, r) {
  const ai = r.ai, ch = r.ch;
  // respirar: cuando la pila está baja recargan hasta casi llenarla; en el final aguantan
  // (en el primer circuito se dan cuenta tarde y a veces se quedan sin aire)
  const final = r.x > race.len - 12;
  // en cada circuito respiran mejor: en el club esperan a quedarse casi sin aire y recargan de más
  const low = [0.08, 0.18, 0.28][race.circ.level], full = [0.95, 0.75, 0.55][race.circ.level];
  if (r.breathing && (r.air > full || (final && r.air > 0.3))) r.breathing = false;
  else if (!r.breathing && r.air < low && !final) r.breathing = true;
  // en el final, si se quedan sin aire, terminan en pecho en vez de frenar a respirar
  r.pecho = final && r.air < 0.1;
  r.fly = !r.breathing && !r.pecho && r.air > 0.02;
  // carril: esquivar lo que frena, buscar lo que acelera
  let want = ai.wantU, best = 99;
  for (const o of race.objs) {
    const dx = o.x - r.x;
    if (o.gone || dx < 0 || dx > 12) continue;
    const it = ITEMS[o.kind];
    if (!it.good && Math.abs(o.u - r.u) < 0.13 && dx < best) { want = o.u > r.u ? o.u - 0.25 : o.u + 0.25; best = dx; }
    else if (it.good && best === 99 && Math.abs(o.u - r.u) < 0.35) want = o.u;
  }
  want = clamp(want, 0.1, 0.9);
  r.steer = Math.abs(want - r.u) > 0.03 ? Math.sign(want - r.u) : 0;
  // especial
  if (specialReady(r)) {
    if (!ai.useAt) ai.useAt = race.t + (ch.id === "facu" ? rnd(3, 7) : rnd(0.6, 2.5));
    const fits = ch.id === "facu" ? ahead(race, r, 10) : ch.id === "pablo" ? r.air < 0.45 : true; // Pablo camina cuando le falta aire
    if (race.t > ai.useAt && fits) { useSpecial(race, r); ai.useAt = 0; }
  }
}

function stepRace(race, dt, input) {
  const wasWaiting = race.t < 0;
  race.t += dt;
  if (race.t < 0) return;
  if (race.circ.current && race.t >= 0) stepCurrent(race, dt);
  const player = race.racers[0];

  for (const r of race.racers) {
    const ch = r.ch;
    if (r.bubble) { r.bubble.t -= dt; if (r.bubble.t <= 0) r.bubble = null; }
    if (r.finished) { r.v = 0; r.x = race.len; place(race, r); continue; } // ya llegó: queda agarrado de la pared
    const pressed = r.isPlayer && (!!input.tap || (!!input.breathe && !r.prevB)); // cualquier toque o tecla sirve para saltar y para la vuelta
    if (r.isPlayer) r.prevB = !!input.breathe;
    if (r.onBlock) { // en el partidor la barrita sube y baja; si no salta, a los 1,6 segundos se tira tarde
      if (pressed) startDive(race, r, barAt(0, race.t));
      else if (!r.isPlayer && race.t >= r.ai.diveAt) startDive(race, r, barAt(0, r.ai.diveAt));
      else if (race.t > 1.6) startDive(race, r, 0.1);
      continue;
    }
    const hadObj = r.objT > 0;
    if (r.walk > 0 && r.air >= 1 && r.walk < 3) r.walk = 0; // Pablo deja de caminar cuando ya tiene la pila llena
    for (const k of ["stun", "plancha", "immune", "boost", "kick", "dive", "walk", "lunge", "objT", "chaseSay", "moodT"]) r[k] = Math.max(0, r[k] - dt);
    if (hadObj && r.objT <= 0) { // se terminó el objeto: se le cae y se nota el cambio de velocidad
      const good = ITEMS[r.objKind].good;
      r.drop = { kind: r.objKind, x: r.x, u: r.u, t: race.t };
      r.v *= good ? 0.8 : 1.15;
      r.mood = good ? "annoyed" : "happy"; r.moodT = 0.8;
      emit(race, r, "itemEnd");
    }
    r.charge = Math.min(1, r.charge + dt / ch.charge);

    if (r.isPlayer) {
      r.fly = input.fly; r.pecho = !!input.pecho && !input.fly; r.steer = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (r.wallBar && r.turnQ === null && pressed) r.turnQ = barAt(r.barT0, race.t);
      const wantB = !!input.breathe && !r.wallBar; // llegando a la pared no se respira
      if (wantB && !r.breathing) emit(race, r, "breath");
      r.breathing = wantB;
      if (input.specialPressed) useSpecial(race, r);
    } else {
      aiThink(race, r);
      if (r.wallBar) { r.breathing = false; if (r.turnQ === null && race.t >= r.ai.turnAt) r.turnQ = barAt(r.barT0, race.t); }
    }

    // manías
    const blocked = r.stun > 0;
    let drain = 1, mult = 1;
    if (!blocked) {
      if (ch.id === "luis" && race.t > r.complainAt) { say(r, pick(COMPLAINTS), 1.8); r.mood = "talk"; r.moodT = 1.8; r.boost = 1.8; r.boostMult = 1.25; r.complainAt = race.t + rnd(7, 11); }
      if (ch.id === "mati" && r.x > 10 && !r.plancha && Math.random() < dt * 0.03) { r.plancha = 1; say(r, "plancha..."); }
      if (ch.id === "facu" && ahead(race, r, 3)) {
        mult *= 1.1; drain *= 1.05;
        if (!r.chaseSay) { say(r, "¡TE COMO!", 1); r.chaseSay = 5; }
      }
    }
    if (r.plancha > 0) r.air = Math.min(1, r.air + dt * 0.3);

    // aire: el crol gasta poco, la mariposa mucho
    const breathing = (r.breathing || r.walk > 0) && !blocked && !r.dive; // caminando, Pablo respira todo el tiempo
    const flying = r.fly && r.air > 0 && !blocked && !r.plancha && !breathing;
    const pecho = r.pecho && !flying && !blocked && !r.plancha && !breathing && !r.walk && !r.dive;
    if (breathing) { r.air = Math.min(1, r.air + dt * breathGain(ch)); r.noAir = 0; }
    else if (!r.plancha) r.air -= dt * (flying ? AIR_FLY * flyCost(ch) : pecho ? AIR_PECHO : AIR_CROL) * drain / airCap(ch);
    if (r.air <= 0) { if (!r.noAir) { say(r, "¡SIN AIRE!", 1.2); emit(race, r, "noAir"); r.ranOut = true; } r.air = 0; r.noAir = 1; } else r.noAir = 0;

    mult *= (flying ? flyMult(ch) : pecho ? PECHO_V : 1) * speedMult(ch);
    if (r.noAir) mult *= 0.45;
    if (r.walk > 0) mult *= 0.88;
    else if (breathing) mult *= BREATH_SLOW;
    if (ch.id === "luis" && race.t < 2) mult *= 0.85;
    if (r.boost > 0) mult *= r.boostMult;
    if (r.dive > 0) mult *= 1.3;
    if (r.kick > 0) mult *= 1.18; // turbo por la salida o la vuelta perfecta
    if (r.objT > 0) mult *= r.objMult;
    if (r.plancha > 0) mult *= 0.8;
    if (blocked) mult = 0.12;
    if (!r.isPlayer && !race.fair) mult *= 1 + clamp((player.x - r.x) / 18, -0.09, 0.12) + race.circ.level * 0.015; // pareja hasta el final, y más difícil en cada circuito
    const target = BASE_V * mult;
    r.v += (target - r.v) * Math.min(1, dt * (flying ? 4 : 2.5)); // la mariposa arranca con un tirón
    r.x += r.v * dt;
    if (r.lunge > 0) { const k = Math.min(1, dt * 10); r.x += (r.lungeTo - r.x) * k; r.u += (r.lungeU - r.u) * k; }
    if (!blocked) r.u = clamp(r.u + r.steer * dt * 0.65 * (ch.heavy ? 0.6 : 1), 0.08, 0.92);
    if (race.against) mult *= 1 - race.against * (ch.heavy ? 0.6 : 1); // corriente de frente: Pablo, que es una losa, la sufre menos
    if (race.cur) r.u = clamp(r.u + race.cur * dt * (ch.heavy ? 0.6 : 1), 0.08, 0.92); // la corriente del río
    // llegando a la pared aparece la barrita de la vuelta americana
    if (!r.wallBar && r.x > r.nextWall - TURN_ZONE) { r.wallBar = true; r.barT0 = race.t; r.turnQ = null; r.ai.turnAt = race.t + aiTap(race.circ.level); }
    if (r.x >= r.nextWall) turnAround(race, r);

    // objetos: el que lo toca se lo lleva
    for (const o of race.objs) {
      if (o.gone || Math.abs(o.x - r.x) > 0.9 || Math.abs(o.u - r.u) > 0.1) continue;
      const it = ITEMS[o.kind];
      if (!it.good && r.immune > 0) continue;
      // a Pablo, que es una losa, lo que frena le hace menos
      const mult = !it.good && ch.heavy ? 1 - (1 - it.mult) * 0.75 : it.mult;
      o.gone = true; r.objKind = o.kind; r.objMult = mult; r.objT = it.secs; r.drop = null;
      r.v *= it.good ? 1 + (mult - 1) * 0.6 : 1 - (1 - mult) * 0.6; // el tirón (o el frenazo) se siente enseguida
      if (it.air) { r.air = Math.min(1, r.air + it.air); r.noAir = 0; }
      if (o.kind === "dulce") r.gotDulce = true;
      emit(race, r, it.good ? "good" : "bad");
    }

    place(race, r);
    if (r.x >= race.len) { r.finished = true; r.finishT = race.t; r.breathing = false; r.x = race.len; r.v = 0; place(race, r); emit(race, r, "finish"); }
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

// Puntos de copa de cada nadador en una carrera terminada: puesto más los extras.
function racePoints(race) {
  return standings(race).map((r, i) => {
    const bonus = (r.gotDulce ? BONUS.dulce : 0) + (!r.ranOut ? BONUS.air : 0);
    return { r, place: i + 1, base: CUP_POINTS[i], bonus, total: CUP_POINTS[i] + bonus };
  });
}
