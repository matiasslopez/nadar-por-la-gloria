// Nadar por la gloria — el reto: tu carrera grabada para que un amigo nade contra tu reflejo.
// Cada décima de segundo se anota cuánto avanzaste, en qué parte del carril ibas y cómo nadabas,
// en tres letras. Una carrera de un minuto entra en unas 1.800 letras (menos de 2 KB en la nube).

const GHOST_DT = 0.1;     // cada cuánto se anota, en segundos
const GHOST_MAX = 2000;   // como mucho 200 s de carrera
// cómo nadaba en cada momento (se suman)
const GF = { fly: 1, pecho: 2, breath: 4, block: 8, walk: 16, still: 32 };

function ghostRec(race) { race.rec = { n: 0, last: 15, s: "" }; } // arranca en el partidor (1,5 m)
function ghostStep(race) {
  const rec = race.rec, p = race.racers[0];
  if (!rec || race.t < 0) return;
  while (rec.n * GHOST_DT <= race.t && rec.n < GHOST_MAX && !(p.finished && rec.n * GHOST_DT > p.finishT)) {
    const dx = clamp(Math.round(p.x * 10) - rec.last, 0, 60), u = Math.round(clamp(p.u, 0, 1) * 60);
    const f = (flyingNow(p) ? GF.fly : 0) | (pechoNow(p) ? GF.pecho : 0) | (p.breathing ? GF.breath : 0) | (p.onBlock ? GF.block : 0)
      | (p.walk > 0 ? GF.walk : 0) | (p.stun > 0 || p.plancha > 0 ? GF.still : 0);
    rec.s += String.fromCharCode(48 + dx, 48 + u, 48 + f); rec.last += dx; rec.n++;
  }
}

// El reflejo de un reto guardado: { alias, char, time, track }.
function makeGhost(r) {
  const xs = [], us = [], fs = []; let x = 15;
  for (let i = 0; i + 2 < r.track.length; i += 3) {
    x += r.track.charCodeAt(i) - 48; xs.push(x / 10); us.push((r.track.charCodeAt(i + 1) - 48) / 60); fs.push(r.track.charCodeAt(i + 2) - 48);
  }
  return { alias: r.alias, ch: CHARS.find((c) => c.id === r.char) || CHARS[0], time: r.time, xs, us, fs };
}
// Dónde va el reflejo ahora, con lo que necesita el dibujo de un nadador.
function ghostNow(race) {
  const g = race.ghost, t = Math.max(0, race.t), n = g.xs.length;
  if (!n) return null;
  const done = t >= g.time, k = Math.min(n - 1, t / GHOST_DT), i = Math.floor(k), j = Math.min(n - 1, i + 1), q = k - i;
  const x = done ? race.len : Math.min(race.len, g.xs[i] + (g.xs[j] - g.xs[i]) * q), f = g.fs[i];
  const a = poolAt(race, x);
  return { ch: g.ch, alias: g.alias, ghost: true, isPlayer: false, x, u: g.us[i] + (g.us[j] - g.us[i]) * q, pp: a.p, dir: a.dir,
    v: done ? 0 : (g.xs[j] - g.xs[i]) / GHOST_DT, air: 1, fly: !!(f & GF.fly), pecho: !!(f & GF.pecho), breathing: !!(f & GF.breath),
    onBlock: race.t < 0 || !!(f & GF.block), walk: f & GF.walk ? 1 : 0, stun: f & GF.still ? 1 : 0, plancha: 0, dive: 0, immune: 0,
    objT: 0, objKind: null, drill: drillAt(race, x), finished: done, finishT: g.time, mood: "normal", moodT: 0 };
}
// Si el reflejo va adelante del jugador (o llegó antes).
function ghostAhead(race) {
  const p = race.racers[0], g = race.ghost && ghostNow(race);
  if (!g) return false;
  if (p.finished) return g.finished && g.finishT < p.finishT;
  return g.finished || g.x > p.x;
}
