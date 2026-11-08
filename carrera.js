// Nadar por la gloria — nadadores, objetos y reglas de la carrera.
// Cuatro nadadores del grupo, con números propios tipo autitos de carrera. El humor viene de
// Nadamos por la milanga, pero las ventajas y desventajas son de este juego.
// Cada uno tiene una molestia graciosa que le pasa una sola vez por carrera (también si lo usás vos).

// Números de 1 a 5; todos suman 14. spd: velocidad en crol · air: cuánto aguanta ·
// rec: qué tan rápido recarga el aire al respirar · fly: cuánto rinde la mariposa.
const CHARS = [
  { id: "facu", name: "FACU", tag: "Guarda que te como", quirk: "Una vez por carrera le agarra un calambre y frena un toque.",
    spd: 5, air: 2, rec: 3, fly: 4,
    cap: "#1A1A1E", suit: "#1A1A1A", skin: "#EDBB95" },
  { id: "luis", name: "LUIS", tag: "El quejoso", quirk: "Cuando lo pasan, se frena un toque a quejarse (una vez por carrera).",
    spd: 4, air: 3, rec: 2, fly: 5,
    cap: "#4A5FD0", suit: "#D4A017", skin: "#E6B08A" },
  { id: "mati", name: "MATI", tag: "El diésel", quirk: "Una vez por carrera se da vuelta y hace la planchita: frena, pero recupera aire.",
    spd: 2, air: 5, rec: 5, fly: 2,
    cap: "#E8C25A", suit: "#2E8B57", skin: "#F2C6A0" },
  { id: "pablo", name: "PABLO", tag: "La losa", quirk: "Es una losa: lo que frena le hace menos efecto. Una vez por carrera se pone a caminar un toque.",
    spd: 3, air: 4, rec: 4, fly: 3,
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
// show: los metros que se muestran, cuando la carrera "equivale" a más de lo que se nada en el juego.
  sprint:    { id: "sprint", name: "SPRINT", pool: 100, len: 100, level: 0, gap: [4, 6],
               info: "100 m de un tirón en una pileta larga: sin vueltas, todo a fondo. La salida es clave." },
  idavuelta: { id: "idavuelta", name: "IDA Y VUELTA", pool: 50, len: 200, level: 1, gap: [4, 7],
               info: "En la pileta olímpica, ida y vuelta: en cada pared, vuelta americana. Hay que repartir el aire." },
  abiertas:  { id: "abiertas", name: "AGUAS ABIERTAS", len: 150, show: 500, level: 2, gap: [5, 8], current: 0.08, against: 0.14, open: true,
               info: "500 m en el río, sin paredes ni corcheras. La corriente cambia: a veces te frena de frente y a veces te lleva de costado." }
};
const CUP = ["sprint", "idavuelta", "abiertas"];
// metros que se muestran (en aguas abiertas cada metro del juego vale más)
const shownLen = (race) => race.circ.show ? Math.round(race.len * race.circ.show / race.circ.len) : race.len;
const shownM = (race, x) => Math.round(x * shownLen(race) / race.len);
const CUP_POINTS = [10, 6, 3];          // puntos por puesto en cada carrera de la copa
const BONUS = { dulce: 2, air: 2 };     // extra por agarrar dulce de leche y por no quedarse nunca sin aire
// Salida y vuelta americana: una barrita sube y baja; cuanto más arriba está cuando tocás, más empuje.
const BAR_T = 1.0;        // la barra va y vuelve en 1 segundo (en el verde a los 0,5)
const TURN_ZONE = 4;      // a cuántos metros de la pared aparece la barrita de la vuelta
const barAt = (t0, t) => (1 - Math.cos(((t - t0) / BAR_T) * Math.PI * 2)) / 2;
// cuándo toca la máquina la barrita: cuanto más hábil (skill 0 a 3), más cerca del verde
const aiTap = (skill) => Math.max(0.08, BAR_T / 2 + (rnd(-1, 1) + rnd(-1, 1)) * Math.max(0.06, 0.2 - 0.045 * skill));
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
function pickItem(goodOnly) {
  const ks = Object.keys(ITEMS).filter((k) => !goodOnly || ITEMS[k].good), tot = ks.reduce((s, k) => s + ITEMS[k].weight, 0);
  let n = Math.random() * tot;
  for (const k of ks) { n -= ITEMS[k].weight; if (n <= 0) return k; }
  return ks[0];
}

// Sortea rivales distintos del jugador (dos, si no se dice otra cosa; la pileta tiene tres andariveles).
function drawRivals(playerCh, n = 2) {
  return CHARS.filter((c) => c.id !== playerCh.id).sort(() => Math.random() - 0.5).slice(0, n);
}
// Dónde larga cada uno según cuántos son: el jugador siempre en el andarivel del medio.
const START_U = { 1: [0.5], 2: [0.5, 1 / 6], 3: [0.5, 1 / 6, 5 / 6] };
// Dónde está en la pileta alguien que nadó x metros: p desde la pared de salida, dir hacia dónde va, lap el largo.
function poolAt(race, x) {
  const L = race.pool, lap = clamp(Math.floor(x / L), 0, race.laps - 1), d = Math.min(L + 3, x - lap * L);
  return lap % 2 ? { p: L - d, dir: -1, lap } : { p: d, dir: 1, lap };
}
// opts (todo opcional; lo usan los niveles del camino):
//   pool: largo de la pileta · skill: qué tan bien nadan los rivales (0 a 3) · pace: cuánto más rápido o lento van (1 = parejo)
//   fly / pecho / air: si se puede nadar mariposa, pecho y si se gasta aire · items: "all", "good" o "none"
//   gap: cada cuántos metros hay cosas flotando · quirks: si les pasan las molestias
function newRace(playerCh, circ = CIRCUITS.sprint, rivals, len = circ.len, opts = {}) {
  // x es la punta de la mano (metros nadados en total): al tirarse del partidor ya entran con el cuerpo en el agua
  rivals = rivals || drawRivals(playerCh, opts.rivals === undefined ? 2 : opts.rivals);
  const chars = [playerCh, ...rivals];
  const pool = opts.pool || circ.pool || len, laps = Math.max(1, Math.round(len / pool));
  const lanes = START_U[chars.length];
  const skill = opts.skill === undefined ? circ.level : opts.skill, gap = opts.gap || circ.gap, items = opts.items || "all";
  const racers = chars.map((ch, i) => ({
    ch, isPlayer: i === 0, x: 1.5, u: lanes[i], v: 0, air: 1, fly: false, pecho: false,
    onBlock: true, pp: 1.5, dir: 1, nextWall: laps > 1 ? pool : Infinity, wallBar: false, barT0: 0, turnQ: null, prevB: false, push: null, steer: 0,
    breathing: false, stun: 0, plancha: 0, noAir: 0, immune: 0, boost: 0, boostMult: 1, kick: 0,
    objMult: 1, objT: 0, objKind: null, chaseSay: 0,
    dive: 0, walk: 0, slow: 0, drop: null, bubble: null, finished: false, finishT: 0, mood: "normal", moodT: 0, gotDulce: false, ranOut: false,
    goods: 0, bads: 0, quirked: false, quirkX: len * rnd(0.3, 0.75), aheadN: 0,
    ai: { wantU: lanes[i], diveAt: aiTap(skill), turnAt: 0 }
  }));
  const objs = [];
  if (items !== "none") for (let x = 8; x < len - 4; x += rnd(gap[0], gap[1])) {
    if (laps > 1 && (x % pool < 5 || x % pool > pool - 4)) continue; // nada pegado a las paredes
    const n = Math.random() < 0.4 ? 2 : 1, used = [];
    for (let k = 0; k < n; k++) {
      let u; do u = rnd(0.12, 0.88); while (used.some((v) => Math.abs(v - u) < 0.25));
      used.push(u); objs.push({ kind: pickItem(items === "good"), x: x + rnd(-0.8, 0.8), u });
    }
  }
  return { t: -3, len, pool, laps, circ, racers, objs, over: false, overT: 0, events: [], cur: 0, against: 0, curPlan: null,
    skill, pace: opts.pace || 1, river: opts.river || "mix", fly: opts.fly !== false, pecho: opts.pecho !== false, air: opts.air !== false, quirks: opts.quirks !== false };
}

function say(r, text, dur = 1.4) { r.bubble = { text, t: dur }; }
// Lo que pasa en la carrera y le interesa a la pantalla (sonidos, avisos). Se vacía en cada cuadro.
function emit(race, r, kind) {
  race.events.push({ r, kind });
  const m = MOODS[kind]; if (m) { r.mood = m[0]; r.moodT = m[1]; }
}
// La cara que pone cada uno cuando le pasa algo (ver caras.js), y por cuántos segundos.
const MOODS = { good: ["happy", 1], bad: ["hurt", 1], breath: ["gulp", 0.45], noAir: ["hurt", 1.2], finish: ["happy", 3] };

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

// La corriente del río cambia cada tantos segundos: calma, de frente, a favor o de costado (para un lado o el otro).
// Un nivel puede elegir qué río tiene (race.river): siempre a favor, de costado, en contra, o que cambia de todo (mix).
const CURRENTS = [
  { kind: "calm", side: 0, against: 0, say: "EL RÍO SE CALMA" },
  { kind: "with", side: 0, against: -1, say: "¡CORRIENTE A FAVOR!" },
  { kind: "against", side: 0, against: 1, say: "¡CORRIENTE EN CONTRA!" },
  { kind: "up", side: -1, against: 0.25, say: "CORRIENTE DE COSTADO ↑" },
  { kind: "down", side: 1, against: 0.25, say: "CORRIENTE DE COSTADO ↓" }
];
const RIVERS = { favor: ["with"], side: ["up", "down"], against: ["against", "calm"], mix: ["calm", "against", "up", "down", "with"] };
function stepCurrent(race, dt) {
  const c = race.circ, kinds = RIVERS[race.river] || RIVERS.mix;
  if (!race.curPlan || race.t >= race.curPlan.until) {
    const prev = race.curPlan ? race.curPlan.kind : null, opts = kinds.filter((k) => k !== prev);
    const kind = !prev ? (race.river && race.river !== "mix" ? kinds[0] : pick(["up", "down"])) : opts.length ? pick(opts) : prev;
    const next = CURRENTS.find((k) => k.kind === kind);
    race.curPlan = { ...next, until: race.t + rnd(6, 10), at: race.t };
    if (kind !== prev) race.events.push({ kind: "current", r: null, say: next.say });
  }
  const k = Math.min(1, dt * 0.8); // cambia de a poco
  race.cur += (race.curPlan.side * c.current - race.cur) * k;
  race.against += (race.curPlan.against * c.against - race.against) * k;
}

// La molestia de cada uno: le pasa una sola vez por carrera, un ratito.
function startQuirk(race, r) {
  r.quirked = true;
  switch (r.ch.id) {
    case "facu": r.slow = 1.3; r.slowMult = 0.5; say(r, "¡CALAMBRE!", 1.3); r.mood = "hurt"; r.moodT = 1.3; break;
    case "luis": r.slow = 1.4; r.slowMult = 0.55; say(r, pick(COMPLAINTS), 1.6); r.mood = "talk"; r.moodT = 1.6; break;
    case "mati": r.plancha = 1.3; say(r, "plancha..."); break;
    case "pablo": r.walk = 1.6; say(r, "CAMINO UN TOQUE", 1.4); break;
  }
  emit(race, r, "quirk");
}


function aiThink(race, r) {
  const ai = r.ai, ch = r.ch;
  // respirar: cuando la pila está baja recargan hasta casi llenarla; en el final aguantan
  // (en el primer circuito se dan cuenta tarde y a veces se quedan sin aire)
  const final = r.x > race.len - 12;
  // en cada circuito respiran mejor: en el club esperan a quedarse casi sin aire y recargan de más
  const low = Math.min(0.35, 0.08 + 0.1 * race.skill), full = Math.max(0.5, 0.95 - 0.2 * race.skill);
  if (r.breathing && (r.air > full || (final && r.air > 0.3))) r.breathing = false;
  else if (!r.breathing && r.air < low && !final) r.breathing = true;
  // en el final, si se quedan sin aire, terminan en pecho en vez de frenar a respirar
  if (!race.air) r.breathing = false;
  r.pecho = race.pecho && final && r.air < 0.1;
  r.fly = race.fly && !r.breathing && !r.pecho && r.air > 0.02;
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
    for (const k of ["stun", "plancha", "immune", "boost", "kick", "dive", "walk", "slow", "objT", "moodT"]) r[k] = Math.max(0, r[k] - dt);
    if (hadObj && r.objT <= 0) { // se terminó el objeto: se le cae y se nota el cambio de velocidad
      const good = ITEMS[r.objKind].good;
      r.drop = { kind: r.objKind, x: r.x, u: r.u, t: race.t };
      r.v *= good ? 0.8 : 1.15;
      r.mood = good ? "annoyed" : "happy"; r.moodT = 0.8;
      emit(race, r, "itemEnd");
    }

    if (r.isPlayer) {
      r.fly = race.fly && !!input.fly; r.pecho = race.pecho && !!input.pecho && !r.fly; r.steer = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (r.wallBar && r.turnQ === null && pressed) r.turnQ = barAt(r.barT0, race.t);
      const wantB = race.air && !!input.breathe && !r.wallBar; // llegando a la pared no se respira
      if (wantB && !r.breathing) emit(race, r, "breath");
      r.breathing = wantB;
    } else {
      aiThink(race, r);
      if (r.wallBar) { r.breathing = false; if (r.turnQ === null && race.t >= r.ai.turnAt) r.turnQ = barAt(r.barT0, race.t); }
    }

    // la molestia de cada uno, una vez por carrera: a Luis le agarra cuando lo pasan
    const blocked = r.stun > 0;
    let drain = 1, mult = 1;
    const aheadN = race.racers.filter((o) => o !== r && o.x > r.x).length;
    if (race.quirks && !r.quirked && !blocked && !r.dive && !r.kick && !r.wallBar && r.x > 8 && r.x < race.len - 6
        && (ch.id === "luis" ? aheadN > r.aheadN && race.t > 2 : r.x > r.quirkX)) startQuirk(race, r);
    r.aheadN = aheadN;
    if (r.plancha > 0) r.air = Math.min(1, r.air + dt * 0.3);
    if (!race.air) r.air = 1; // en los primeros niveles todavía no se gasta aire

    // aire: el crol gasta poco, la mariposa mucho
    const breathing = (r.breathing || r.walk > 0) && !blocked && !r.dive; // caminando, Pablo respira todo el tiempo
    const flying = r.fly && r.air > 0 && !blocked && !r.plancha && !breathing;
    const pecho = r.pecho && !flying && !blocked && !r.plancha && !breathing && !r.walk && !r.dive;
    if (breathing) { r.air = Math.min(1, r.air + dt * breathGain(ch)); r.noAir = 0; }
    else if (!r.plancha) r.air -= dt * (flying ? AIR_FLY * flyCost(ch) : pecho ? AIR_PECHO : AIR_CROL) * drain / airCap(ch);
    if (r.air <= 0) { if (!r.noAir) { say(r, "¡SIN AIRE!", 1.2); emit(race, r, "noAir"); r.ranOut = true; } r.air = 0; r.noAir = 1; } else r.noAir = 0;

    mult *= (flying ? flyMult(ch) : pecho ? PECHO_V : 1) * speedMult(ch);
    if (r.noAir) mult *= 0.45;
    if (r.walk > 0) mult *= 0.7;
    else if (breathing) mult *= BREATH_SLOW;
    if (r.slow > 0) mult *= r.slowMult;
    if (r.boost > 0) mult *= r.boostMult;
    if (r.dive > 0) mult *= 1.3;
    if (r.kick > 0) mult *= 1.18; // turbo por la salida o la vuelta perfecta
    if (r.objT > 0) mult *= r.objMult;
    if (r.plancha > 0) mult *= 0.65;
    if (blocked) mult = 0.12;
    if (!r.isPlayer) mult *= race.pace; // en el camino, los rivales van más lentos o más rápidos según el nivel
    if (!r.isPlayer && !race.fair) mult *= 1 + clamp((player.x - r.x) / 18, -0.09, 0.12) + race.skill * 0.015; // pareja hasta el final, y más difícil cuanto más hábiles
    const target = BASE_V * mult;
    r.v += (target - r.v) * Math.min(1, dt * (flying ? 4 : 2.5)); // la mariposa arranca con un tirón
    r.x += r.v * dt;
    if (!blocked) r.u = clamp(r.u + r.steer * dt * 0.65 * (ch.heavy ? 0.6 : 1), 0.08, 0.92);
    if (race.against) mult *= 1 - race.against * (ch.heavy ? 0.6 : 1); // corriente de frente: Pablo, que es una losa, la sufre menos
    if (race.cur) r.u = clamp(r.u + race.cur * dt * (ch.heavy ? 0.6 : 1), 0.08, 0.92); // la corriente del río
    // llegando a la pared aparece la barrita de la vuelta americana
    if (!r.wallBar && r.x > r.nextWall - TURN_ZONE) { r.wallBar = true; r.barT0 = race.t; r.turnQ = null; r.ai.turnAt = race.t + aiTap(race.skill); }
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
      if (it.good) r.goods++; else r.bads++;
      emit(race, r, it.good ? "good" : "bad");
    }

    place(race, r);
    if (r.x >= race.len) { r.finished = true; r.finishT = race.t; r.breathing = false; r.x = race.len; r.v = 0; place(race, r); emit(race, r, "finish"); }
  }
  const done = race.racers.filter((r) => r.finished).length;
  if (!race.over && (player.finished || (race.racers.length > 1 && done >= Math.min(2, race.racers.length - 1)))) { race.over = true; race.overT = race.t; }
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
