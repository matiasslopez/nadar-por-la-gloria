// Nadar por la gloria — el camino: niveles uno atrás del otro, como Candy Crush.
// Los primeros 20 están hechos a mano y enseñan de a una cosa; del 21 en adelante los arma el juego solo.
// Cada nivel da hasta 3 estrellas: ⭐ por llegar, ⭐⭐ por cumplir el objetivo (con eso pasás) y ⭐⭐⭐ por el desafío extra.

// Las etapas: el título que tenés según el nivel en el que estás.
const STAGES = [
  { from: 1, name: "PRIMEROS PASOS", icon: "🐣" },
  { from: 6, name: "VA QUERIENDO", icon: "🌊" },
  { from: 11, name: "ASIDUO", icon: "🏊" },
  { from: 21, name: "NADADOR", icon: "🥽" },
  { from: 36, name: "PREMASTER", icon: "⭐" },
  { from: 51, name: "MASTER", icon: "🏅" },
  { from: 101, name: "PRO", icon: "👑" }
];
const CUP_LEVEL = 11; // la copa se abre cuando llegás a Asiduo
const stageOf = (n) => STAGES.filter((s) => n >= s.from).pop();
const nextStage = (n) => STAGES.find((s) => s.from > n);

// Objetivos: qué hay que hacer (txt) y si se cumplió (ok), mirando cómo terminó la carrera.
// p: el jugador · pos: el puesto
const GOALS = {
  win: { txt: () => "Ganá la carrera", ok: (p, pos) => pos === 1 },
  top: { txt: (n) => `Llegá entre los ${n} primeros`, ok: (p, pos, n) => pos <= n },
  goods: { txt: (n) => n > 1 ? `Agarrá ${n} cosas verdes` : "Agarrá una cosa verde", ok: (p, pos, n) => p.goods >= n },
  bads: { txt: (n) => n ? `No toques más de ${n} cosa${n > 1 ? "s" : ""} roja${n > 1 ? "s" : ""}` : "No toques nada rojo", ok: (p, pos, n) => p.bads <= n },
  air: { txt: () => "No te quedes nunca sin aire", ok: (p) => !p.ranOut },
  dive: { txt: () => "Salida perfecta (tocá en el verde)", ok: (p) => (p.qs || [])[0] > 0.88 },
  turns: { txt: (n) => `${n} vuelta${n > 1 ? "s" : ""} perfecta${n > 1 ? "s" : ""}`, ok: (p, pos, n) => (p.qs || []).slice(1).filter((q) => q > 0.88).length >= n }
};
// Un objetivo es [tipo, número]; el de las 3 estrellas se suma al de las 2.
const goalText = (g) => GOALS[g[0]].txt(g[1]);
const goalOk = (g, p, pos) => GOALS[g[0]].ok(p, pos, g[1]);

// c: circuito (sprint, idavuelta, abiertas) · len y pool en metros del juego · r: rivales · pace y skill: qué tan rápido y bien nadan
// fly, pecho, air: qué se puede usar · items · quirks: molestias · two: objetivo para pasar · three: el extra
// learn: lo que enseña (título) · tip: lo que se explica antes de largar
const BASE = { fly: true, pecho: true, air: true, items: "all", quirks: true, skill: 0, pace: 1 };
const HAND_MADE = [
  { learn: "Tu primera clase", c: "sprint", len: 50, pool: 50, r: 0, fly: false, pecho: false, air: false, items: "good", quirks: false,
    tip: "Nadás crol solo. Movete para arriba y para abajo para agarrar las cosas verdes: te aceleran.", two: ["goods", 1], three: ["goods", 3] },
  { learn: "Lo que frena", c: "sprint", len: 50, pool: 50, r: 0, gap: [6, 9], fly: false, pecho: false, air: false, quirks: false,
    tip: "Ahora también hay cosas rojas (paracaídas y tablita): te frenan. Esquivalas cambiando de carril.", two: ["bads", 1], three: ["bads", 0] },
  { learn: "Tu primer rival", c: "sprint", len: 50, pool: 50, r: 1, pace: 0.78, fly: false, pecho: false, air: false,
    tip: "Hoy nada alguien al lado tuyo. Agarrá lo verde, esquivá lo rojo y llegá antes.", two: ["win"], three: ["bads", 0] },
  { learn: "Un rival más rápido", c: "sprint", len: 50, pool: 50, r: 1, pace: 0.86, fly: false, pecho: false, air: false,
    tip: "Este rival va más rápido. Cada cosa verde que agarres cuenta.", two: ["win"], three: ["goods", 2] },
  { learn: "La salida", c: "sprint", len: 50, pool: 50, r: 1, pace: 0.88, fly: false, pecho: false, air: false,
    tip: "Antes de largar sube y baja una barrita: tocá cuando llega al verde y salís disparado, con turbo.", two: ["win"], three: ["dive"] },
  { learn: "Respirar", c: "sprint", len: 100, r: 1, pace: 0.88, fly: false, pecho: false,
    tip: "Ahora la carrera es más larga y el aire se gasta. Mantené RESPIRAR para recargar la pila: mientras respirás vas más lento.", two: ["air"], three: ["win"] },
  { learn: "Mariposa", c: "sprint", len: 100, r: 1, pace: 0.92, pecho: false,
    tip: "Mantené MARIPOSA y vas mucho más rápido, pero la pila se vacía rápido. Usala y respirá a tiempo.", two: ["win"], three: ["air"] },
  { learn: "La vuelta americana", c: "idavuelta", len: 100, r: 2, pace: 0.92, pecho: false,
    tip: "Pileta de 50 m: a mitad de carrera llegás a la pared. Ahí aparece la barrita: tocá en el verde y salís con turbo.", two: ["top", 2], three: ["turns", 1] },
  { learn: "Pecho", c: "sprint", len: 100, r: 2, pace: 0.92,
    tip: "Mantené PECHO: vas un poco más lento que en crol, pero casi no gastás aire. Sirve para llegar al final sin parar a respirar.", two: ["air"], three: ["win"] },
  { learn: "Todo junto", c: "idavuelta", len: 200, r: 2, pace: 0.92,
    tip: "Dos rivales, 200 m ida y vuelta, con todo lo que aprendiste. Si llegás entre los dos primeros, pasás a ASIDUO y se abre la copa.", two: ["top", 2], three: ["win"] },
  { learn: "El río", c: "abiertas", len: 75, r: 1, pace: 0.94, skill: 0.3,
    tip: "Aguas abiertas: sin paredes ni corcheras. La corriente cambia: a veces te frena de frente y a veces te lleva de costado.", two: ["win"], three: ["air"] },
  { learn: "Sprint con dos", c: "sprint", len: 100, r: 2, pace: 0.96, skill: 0.5, two: ["top", 2], three: ["bads", 1] },
  { learn: "Vueltas finas", c: "idavuelta", len: 200, r: 2, pace: 0.95, skill: 0.6, two: ["win"], three: ["turns", 2] },
  { learn: "Río con compañía", c: "abiertas", len: 150, r: 2, pace: 0.97, skill: 0.7, two: ["top", 2], three: ["win"] },
  { learn: "Salida de campeón", c: "sprint", len: 100, r: 2, pace: 0.97, skill: 0.8, two: ["top", 2], three: ["dive"] },
  { learn: "Aguantar el aire", c: "idavuelta", len: 200, r: 2, pace: 0.97, skill: 0.9, two: ["top", 2], three: ["air"] },
  { learn: "Río revuelto", c: "abiertas", len: 150, r: 2, pace: 0.98, skill: 1, two: ["top", 2], three: ["bads", 1] },
  { learn: "A la caza de lo verde", c: "sprint", len: 100, r: 2, pace: 0.98, skill: 1.1, two: ["win"], three: ["goods", 3] },
  { learn: "Tres paredes", c: "idavuelta", len: 200, r: 2, pace: 0.99, skill: 1.2, two: ["top", 2], three: ["turns", 3] },
  { learn: "Final de Asiduo", c: "abiertas", len: 150, r: 2, pace: 0.99, skill: 1.3, two: ["win"], three: ["air"] }
];

// Del 21 en adelante: rotan los tres circuitos, los rivales son cada vez más hábiles y rápidos,
// y hay más cosas flotando. El desafío extra va cambiando.
const EXTRAS = [["bads", 0], ["air"], ["dive"], ["goods", 3], ["turns", 2], ["bads", 1]];
function autoLevel(n) {
  const k = n - 20, c = ["sprint", "idavuelta", "abiertas"][n % 3];
  let three = EXTRAS[n % EXTRAS.length];
  if (three[0] === "turns" && c !== "idavuelta") three = ["air"];
  return { learn: c === "sprint" ? "Sprint" : c === "idavuelta" ? "Ida y vuelta" : "Aguas abiertas", c, len: CIRCUITS[c].len, r: 2,
    skill: Math.min(3, 1.3 + k * 0.03), pace: Math.min(1.06, 0.99 + k * 0.0015), gap: k > 30 ? [3, 5] : k > 10 ? [3.5, 6] : undefined,
    two: n % 4 ? ["win"] : ["top", 2], three };
}
function levelDef(n) { return { ...BASE, ...(HAND_MADE[n - 1] || autoLevel(n)), n }; }

// Lo que aprendiste hasta el nivel n (para la práctica libre y la copa).
const learned = (n) => ({ fly: n > 7, pecho: n > 9 });

// Las estrellas de una carrera terminada: [terminó, objetivo, extra]. Para cumplir el objetivo hay que llegar a la pared.
function levelStars(L, race) {
  const p = race.racers[0], pos = standings(race).indexOf(p) + 1;
  const one = true, two = p.finished && goalOk(L.two, p, pos), three = two && goalOk(L.three, p, pos);
  return { n: three ? 3 : two ? 2 : one ? 1 : 0, checks: [one, two, three], pos };
}
