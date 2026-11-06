// Nadar por la gloria — nadadores, objetos y reglas de la carrera.
// Cuatro nadadores del grupo, con números propios tipo autitos de carrera. El humor viene de
// Nadamos por la milanga, pero las ventajas y desventajas son de este juego.

// Números de 1 a 5; todos suman 14. spd: velocidad en crol · air: cuánto aguanta ·
// rec: cuánto da cada respirada y cuánto dura la ventana · fly: cuánto rinde la mariposa.
const CHARS = [
  { id: "facu", name: "FACU", tag: "Guarda que te como", quirk: "Si tiene a alguien cerca adelante, se acelera solo y gasta un poco más de aire.",
    special: "TE COMO", specialInfo: "frena al de adelante", charge: 8, spd: 5, air: 2, rec: 3, fly: 4,
    cap: "#1A1A1E", suit: "#1A1A1A", skin: "#EDBB95" },
  { id: "luis", name: "LUIS", tag: "El quejoso", quirk: "Arranca lento, y cada vez que se queja pega un tirón.",
    special: "SALTAR", specialInfo: "pasa por arriba de lo que tenga adelante", charge: 10, spd: 4, air: 3, rec: 2, fly: 5,
    cap: "#4A5FD0", suit: "#D4A017", skin: "#E6B08A" },
  { id: "mati", name: "MATI", tag: "El diésel", quirk: "Cada tanto hace la plancha: frena, pero recupera aire.",
    special: "SUMERGIR", specialInfo: "pasa por abajo de lo que frena", charge: 12, spd: 2, air: 5, rec: 5, fly: 2,
    cap: "#E8C25A", suit: "#2E8B57", skin: "#F2C6A0" },
  { id: "pablo", name: "PABLO", tag: "La losa", quirk: "Es una losa: lo que frena le hace menos efecto, pero cambia de carril más lento.",
    special: "CAMINAR", specialInfo: "camina por el costado y esquiva todo", charge: 12, spd: 3, air: 4, rec: 4, fly: 3,
    cap: "#F0BE98", suit: "#1F3F8F", skin: "#F0BE98", heavy: true }
];
const STATS = [["spd", "Velocidad"], ["air", "Aire"], ["rec", "Recuperación"], ["fly", "Mariposa"]];
const COMPLAINTS = ["¡ESTÁ HELADA!", "¿QUIÉN ARMÓ ESTA SERIE?", "ME DUELE EL HOMBRO", "¡LA PROFE ME ODIA!", "HAY MUCHA GENTE HOY", "¿SALE MILANGA HOY?"];

// Objetos que flotan en la pileta: los buenos aceleran, los malos frenan, por unos segundos.
const ITEMS = {
  patas:      { name: "PATAS",      mult: 1.6,  secs: 2.5, good: true,  weight: 10 },
  manoplas:   { name: "MANOPLAS",   mult: 1.35, secs: 3,   good: true,  weight: 18 },
  latita:     { name: "LATITA",     mult: 1.3,  secs: 3,   good: true,  weight: 16, air: 0.15 }, // energía: acelera y da un poco de aire
  dulce:      { name: "DULCE DE LECHE", mult: 1.2, secs: 2.5, good: true, weight: 7, air: 1 },  // premio raro: te llena el aire
  paracaidas: { name: "PARACAÍDAS", mult: 0.6,  secs: 3,   good: false, weight: 26 },
  tablita:    { name: "TABLITA",    mult: 0.4,  secs: 3,   good: false, weight: 22 }
};

const RACE_M = 100;       // largo de la carrera si no se dice otro, en metros

// Los tres circuitos de la copa. Cada uno cambia una regla y los rivales se ponen más difíciles.
const CIRCUITS = {
  club:     { id: "club", name: "PILETA DEL CLUB", len: 50, level: 0, gap: [4, 6],
              info: "50 m cortitos: es un pique, la mariposa rinde a fondo." },
  olimpica: { id: "olimpica", name: "PILETA OLÍMPICA", len: 100, level: 1, gap: [4, 7],
              info: "100 m: hay que repartir el aire." },
  abiertas: { id: "abiertas", name: "AGUAS ABIERTAS", len: 150, level: 2, gap: [5, 8], current: 0.07, open: true,
              info: "150 m en el río: no hay corcheras y la corriente te lleva de costado." }
};
const CUP = ["club", "olimpica", "abiertas"];
const CUP_POINTS = [10, 6, 3];          // puntos por puesto en cada carrera de la copa
const BONUS = { dulce: 2, air: 2 };     // extra por agarrar dulce de leche y por no quedarse nunca sin aire
const BASE_V = 2.4;       // velocidad de crol de un nadador con velocidad 3, m/s
const AIR_CROL = 0.06;    // aire que gasta el crol por segundo (aire 3)
const AIR_FLY = 0.2;      // aire que gasta la mariposa por segundo (aire 3, mariposa 3)
const AIR_WATER = 0.12;   // aire que perdés si tragás agua

// Lo que significa cada número en la pileta.
const speedMult = (ch) => 1 + (ch.spd - 3) * 0.03;   // 0,94 a 1,06
const airCap = (ch) => 0.7 + 0.12 * ch.air;          // aguante: 0,82 a 1,30
const breathGain = (ch) => 0.2 + 0.07 * ch.rec;      // 0,34 a 0,55 de aire por respirada
const breathWindow = (ch) => 0.9 + 0.2 * ch.rec;     // 1,1 a 1,9 segundos para tocar RESPIRAR
const flyMult = (ch) => 1.38 + 0.08 * ch.fly;        // mariposa: 1,54 a 1,78 veces el crol
const flyCost = (ch) => 1.36 - 0.12 * ch.fly;        // y su gasto de aire: 1,24 a 0,76

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
function newRace(playerCh, circ = CIRCUITS.olimpica, rivals = drawRivals(playerCh)) {
  // x es la punta de la mano: al tirarse del partidor ya entran con el cuerpo en el agua
  const chars = [playerCh, rivals[0], rivals[1]];
  const lanes = [0.5, 1 / 6, 5 / 6];
  const racers = chars.map((ch, i) => ({
    ch, isPlayer: i === 0, x: 1.5, u: lanes[i], v: 0, air: 1, fly: false, steer: 0,
    nextBreath: rnd(2.5, 4), bOpen: false, bT: 0, bLen: 1,
    stun: 0, plancha: 0, noAir: 0, gulp: 0, immune: 0, boost: 0, boostMult: 1,
    objMult: 1, objT: 0, objKind: null, chaseSay: 0,
    dive: 0, charge: 0, bubble: null, finished: false, finishT: 0, mood: "normal", moodT: 0, gotDulce: false, ranOut: false,
    ai: { breathAt: 0, useAt: 0, wantU: lanes[i] }, complainAt: rnd(5, 9)
  }));
  const objs = [];
  for (let x = 8; x < circ.len - 4; x += rnd(circ.gap[0], circ.gap[1])) {
    const n = Math.random() < 0.4 ? 2 : 1, used = [];
    for (let k = 0; k < n; k++) {
      let u; do u = rnd(0.12, 0.88); while (used.some((v) => Math.abs(v - u) < 0.25));
      used.push(u); objs.push({ kind: pickItem(), x: x + rnd(-0.8, 0.8), u });
    }
  }
  return { t: -3, len: circ.len, circ, racers, objs, over: false, overT: 0, events: [], cur: 0, curPh: rnd(0, 6) };
}

function say(r, text, dur = 1.4) { r.bubble = { text, t: dur }; }
// Lo que pasa en la carrera y le interesa a la pantalla (sonidos, avisos). Se vacía en cada cuadro.
function emit(race, r, kind) {
  race.events.push({ r, kind });
  const m = MOODS[kind]; if (m) { r.mood = m[0]; r.moodT = m[1]; }
}
// La cara que pone cada uno cuando le pasa algo (ver caras.js), y por cuántos segundos.
const MOODS = { good: ["happy", 1], bad: ["hurt", 1], hit: ["dead", 1.6], gulp: ["gulp", 0.8], breath: ["gulp", 0.45],
  noAir: ["hurt", 1.2], special: ["happy", 1], finish: ["happy", 3] };
const specialReady = (r) => r.charge >= 1;

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
    case "facu": { const o = ahead(race, r, 30); if (o && hit(race, o, 1.6, "¡ME COMIÓ!")) emit(race, o, "hit"); else { r.boost = 1; r.boostMult = 1.3; } break; }
    case "luis": r.immune = 1.2; r.x += 3; break;
    case "mati": r.immune = 2.5; r.dive = 2.5; break;
    case "pablo": r.immune = 3; r.boost = 3; r.boostMult = 1.04; break;
  }
}

function breathe(race, r) {
  if (r.bOpen) {
    r.bOpen = false; r.air = Math.min(1, r.air + breathGain(r.ch)); r.noAir = 0;
    r.nextBreath = rnd(4.5, 6.5);
    if (r.isPlayer) say(r, "¡AIRE!", 0.7);
    emit(race, r, "breath");
  } else if (r.gulp <= 0) { // respirar a destiempo: tragás agua
    r.air = Math.max(0, r.air - AIR_WATER); r.gulp = 0.6; say(r, "¡GLUB!", 0.8);
    emit(race, r, "gulp");
  }
}

function aiThink(race, r) {
  const ai = r.ai, ch = r.ch;
  // respirar: con un poco de reacción; a veces se les pasa (más a los que respiran mal)
  if (r.bOpen) {
    const miss = (0.2 - ch.rec * 0.03) * (1 - race.circ.level * 0.35); // en cada circuito se les pasa menos
    if (!ai.breathAt) ai.breathAt = race.t + (Math.random() < miss ? 99 : rnd(0.15, 0.6));
    if (race.t > ai.breathAt) { breathe(race, r); ai.breathAt = 0; }
  } else ai.breathAt = 0;
  // mariposa: mientras le sobre el aire, y a fondo en el final
  const final = r.x > race.len - 15;
  const careful = Math.max(0, 3 - ch.air) * 0.1; // los de poco aire se cuidan más
  if (r.fly && r.air < (final ? 0.08 : 0.3 + careful)) r.fly = false;
  else if (!r.fly && r.air > (final ? 0.3 : 0.55 + careful)) r.fly = true;
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
    if (!ai.useAt) ai.useAt = race.t + rnd(0.6, 2.5);
    if (race.t > ai.useAt && (ch.id !== "facu" || ahead(race, r, 25))) { useSpecial(race, r); ai.useAt = 0; }
  }
}

function stepRace(race, dt, input) {
  const wasWaiting = race.t < 0;
  race.t += dt;
  if (race.t < 0) return;
  // largada: se tiran del partidor y entran al agua con envión
  if (wasWaiting) for (const r of race.racers) { r.v = BASE_V * 1.5; emit(race, r, "dive"); }
  if (race.circ.current) race.cur = Math.sin(race.t * 0.22 + race.curPh) * race.circ.current;
  const player = race.racers[0];

  for (const r of race.racers) {
    const ch = r.ch;
    if (r.bubble) { r.bubble.t -= dt; if (r.bubble.t <= 0) r.bubble = null; }
    if (r.finished) { r.v *= 1 - dt * 1.5; r.x += r.v * dt; continue; }
    for (const k of ["stun", "plancha", "gulp", "immune", "boost", "dive", "objT", "chaseSay", "moodT"]) r[k] = Math.max(0, r[k] - dt);
    r.charge = Math.min(1, r.charge + dt / ch.charge);

    // ventana para respirar, como en Nadamos por la milanga
    if (r.bOpen) {
      r.bT -= dt;
      if (r.bT <= 0) { r.bOpen = false; r.air = Math.max(0, r.air - AIR_WATER); say(r, "¡TRAGUÉ AGUA!", 1); r.nextBreath = rnd(4.5, 6.5); emit(race, r, "gulp"); }
    } else {
      r.nextBreath -= dt;
      if (r.nextBreath <= 0) { r.bOpen = true; r.bLen = breathWindow(ch); r.bT = r.bLen; emit(race, r, "breathOpen"); }
    }

    if (r.isPlayer) {
      r.fly = input.fly; r.steer = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      if (input.breathePressed) breathe(race, r);
      if (input.specialPressed) useSpecial(race, r);
    } else aiThink(race, r);

    // manías
    const blocked = r.stun > 0;
    let drain = 1, mult = 1;
    if (!blocked) {
      if (ch.id === "luis" && race.t > r.complainAt) { say(r, pick(COMPLAINTS), 1.8); r.mood = "talk"; r.moodT = 1.8; r.boost = 1.8; r.boostMult = 1.25; r.complainAt = race.t + rnd(7, 11); }
      if (ch.id === "mati" && r.x > 10 && !r.plancha && Math.random() < dt * 0.03) { r.plancha = 1.4; say(r, "plancha..."); }
      if (ch.id === "facu" && ahead(race, r, 3)) {
        mult *= 1.1; drain *= 1.05;
        if (!r.chaseSay) { say(r, "¡TE COMO!", 1); r.chaseSay = 5; }
      }
    }
    if (r.plancha > 0) r.air = Math.min(1, r.air + dt * 0.3);

    // aire: el crol gasta poco, la mariposa mucho
    const flying = r.fly && r.air > 0 && !blocked && !r.plancha;
    if (!r.plancha) r.air -= dt * (flying ? AIR_FLY * flyCost(ch) : AIR_CROL) * drain / airCap(ch);
    if (r.air <= 0) { if (!r.noAir) { say(r, "¡SIN AIRE!", 1.2); emit(race, r, "noAir"); r.ranOut = true; } r.air = 0; r.noAir = 1; } else r.noAir = 0;

    mult *= (flying ? flyMult(ch) : 1) * speedMult(ch);
    if (r.noAir) mult *= 0.45;
    if (r.gulp > 0) mult *= 0.7;
    if (ch.id === "luis" && race.t < 4) mult *= 0.75;
    if (r.boost > 0) mult *= r.boostMult;
    if (r.objT > 0) mult *= r.objMult;
    if (r.plancha > 0) mult *= 0.8;
    if (blocked) mult = 0.12;
    if (!r.isPlayer) mult *= 1 + clamp((player.x - r.x) / 30, -0.08, 0.1) + race.circ.level * 0.015; // pareja, y más difícil en cada circuito
    const target = BASE_V * mult;
    r.v += (target - r.v) * Math.min(1, dt * (flying ? 4 : 2.5)); // la mariposa arranca con un tirón
    r.x += r.v * dt;
    if (!blocked) r.u = clamp(r.u + r.steer * dt * 0.65 * (ch.heavy ? 0.6 : 1), 0.08, 0.92);
    if (race.cur) r.u = clamp(r.u + race.cur * dt * (ch.heavy ? 0.6 : 1), 0.08, 0.92); // la corriente del río

    // objetos: el que lo toca se lo lleva
    for (const o of race.objs) {
      if (o.gone || Math.abs(o.x - r.x) > 0.9 || Math.abs(o.u - r.u) > 0.1) continue;
      const it = ITEMS[o.kind];
      if (!it.good && r.immune > 0) continue;
      // a Pablo, que es una losa, lo que frena le hace menos
      const mult = !it.good && ch.heavy ? 1 - (1 - it.mult) * 0.75 : it.mult;
      o.gone = true; r.objKind = o.kind; r.objMult = mult; r.objT = it.secs;
      if (it.air) { r.air = Math.min(1, r.air + it.air); r.noAir = 0; }
      if (o.kind === "dulce") r.gotDulce = true;
      say(r, it.name + (it.good ? " ▲" : " ▼"), 1.2);
      emit(race, r, it.good ? "good" : "bad");
    }

    if (r.x >= race.len) { r.finished = true; r.finishT = race.t; r.bOpen = false; emit(race, r, "finish"); }
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
