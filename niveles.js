// Nadar por la gloria — el camino: niveles uno atrás del otro, como Candy Crush.
// Los primeros 75 están hechos a mano: hasta el 10 enseñan de a una cosa; después se intercalan pileta, río y niveles especiales.
// Del 76 en adelante los arma el juego solo con las mismas familias, cada vez más difíciles.
// Cada nivel da hasta 3 estrellas: ⭐ por llegar, ⭐⭐ por cumplir el objetivo (con eso pasás) y ⭐⭐⭐ por el desafío extra.

// Las etapas: el título que tenés según el nivel en el que estás.
const STAGES = [
  { from: 1, name: "PRIMEROS PASOS", icon: "🐣" },
  { from: 6, name: "ROOKIE", icon: "🌊" },
  { from: 11, name: "PRE NADADOR", icon: "🏊" },
  { from: 21, name: "NADADOR", icon: "🥽" },
  { from: 36, name: "PREMASTER", icon: "⭐" },
  { from: 51, name: "MASTER", icon: "🏅" },
  { from: 101, name: "PRO", icon: "👑" }
];
const CUP_LEVEL = 11; // la copa se abre cuando llegás a Pre nadador
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
  dive: { txt: (n) => n ? "Buena salida (tocá con la barrita bien arriba)" : "Salida perfecta (tocá en el verde)", ok: (p, pos, n) => (p.qs || [])[0] > (n || 0.88) },
  buoys: { txt: (n) => n ? `No choques más de ${n} boya${n > 1 ? "s" : ""}` : "No choques ninguna boya", ok: (p, pos, n) => p.hits <= n },
  turns: { txt: (n) => `${n} vuelta${n > 1 ? "s" : ""} perfecta${n > 1 ? "s" : ""}`, ok: (p, pos, n) => (p.qs || []).slice(1).filter((q) => q > 0.88).length >= n }
};
// Un objetivo es [tipo, número]; el de las 3 estrellas se suma al de las 2.
const goalText = (g) => GOALS[g[0]].txt(g[1]);
const goalOk = (g, p, pos) => GOALS[g[0]].ok(p, pos, g[1]);

// El río de cada nivel (ver RIVERS en carrera.js).
const RIVER_TXT = { favor: "corriente a favor", side: "corriente de costado", against: "corriente en contra", mix: "la corriente cambia" };

// c: circuito (sprint, idavuelta, abiertas) · len y pool en metros del juego · r: rivales · pace y skill: qué tan rápido y bien nadan
// fly, pecho, air: qué se puede usar · items ("all", "good", "none") · gap: cada cuántos metros hay cosas · quirks: molestias
// river: qué corriente tiene el río · vs: contra quién (si sos vos, toca otro) · two: objetivo para pasar · three: el extra
// learn: el nombre del nivel · tip: lo que se explica antes de largar
const BASE = { fly: true, pecho: true, air: true, items: "all", quirks: true, skill: 0, pace: 1 };
const RAIN = [2, 3.2], SPICY = [3, 4.5]; // lluvia de cosas · muchas rojas en el camino
const TIPS = {
  limpia: "Agua limpia: no hay nada flotando. Carrera pura: salida, ritmo y aire.",
  lluvia: "Lluvia de verdes: el agua está llena de cosas que te aceleran. Agarrá todas las que puedas.",
  manoamano: "Mano a mano: nadás contra uno solo, pero viene en su mejor día.",
  sinfly: "Hoy no hay mariposa: todo se gana con crol, pecho y respirando a tiempo.",
  sinpecho: "Hoy no hay pecho: si te quedás sin aire, vas a tener que parar a respirar.",
  favor: "Corriente a favor: el río te empuja a vos y a todos. Aprovechala y no te relajes.",
  side: "Corriente de costado: te va corriendo de lado. Corregí moviéndote para no perder las cosas verdes.",
  against: "Corriente en contra: por ratos el río te frena de frente.",
  mix: "El río cambia: a favor, en contra, de costado o calmo. Leé cada aviso y acomodate.",
  boyas: "Boyas fijas: cada fila tiene un solo hueco y va cambiando de lado. En PECHO doblás el doble de rápido: pasalas prolijo.",
  patada: "Solo patada, con tabla: vas más lento y gastás menos aire. MARIPOSA es patada de mariposa (rinde más) y PECHO, patada de pecho. Las patas valen oro; las manoplas no sirven.",
  pull: "Solo brazada, con pullbuoy: las piernas no cuentan. Las manoplas aceleran más que nunca y las patas no sirven.",
  inter: "Intercalado: en cada tramo cambia el ejercicio (patada, brazada o completo). Mirá el cartel."
};
const KICK_PULL_FULL = ["kick", "pull", "full"];
const HAND_MADE = [
  // 🐣 Primeros pasos
  { learn: "Tu primera clase", c: "sprint", len: 50, pool: 50, r: 0, fly: false, pecho: false, air: false, items: "good", quirks: false,
    tip: "Nadás crol solo. Movete para arriba y para abajo para agarrar las cosas verdes: te aceleran.", two: ["goods", 1], three: ["goods", 3] },
  { learn: "Lo que frena", c: "sprint", len: 50, pool: 50, r: 0, gap: [6, 9], fly: false, pecho: false, air: false, quirks: false,
    tip: "Ahora también hay cosas rojas (paracaídas y tablita): te frenan. Esquivalas cambiando de carril.", two: ["bads", 1], three: ["bads", 0] },
  { learn: "Solo la salida", c: "sprint", len: 25, pool: 25, r: 0, fly: false, pecho: false, air: false, items: "good", quirks: false,
    tip: "Antes de largar sube y baja una barrita: tocá cuando llega al verde y salís disparado, con turbo. Si no te sale, repetilo: son 25 m.", two: ["dive", 0.55], three: ["dive"] },
  { learn: "Tu primer rival", c: "sprint", len: 50, pool: 50, r: 1, pace: 0.78, fly: false, pecho: false, air: false,
    tip: "Hoy nada alguien al lado tuyo. Agarrá lo verde, esquivá lo rojo y llegá antes.", two: ["win"], three: ["bads", 0] },
  { learn: "Un rival más rápido", c: "sprint", len: 50, pool: 50, r: 1, pace: 0.86, fly: false, pecho: false, air: false,
    tip: "Este rival va más rápido. Una buena salida y cada cosa verde cuentan.", two: ["win"], three: ["dive"] },
  // 🌊 Rookie
  { learn: "Respirar", c: "sprint", len: 100, r: 1, pace: 0.88, fly: false, pecho: false,
    tip: "Ahora la carrera es más larga y el aire se gasta. Mantené RESPIRAR para recargar la pila: mientras respirás vas más lento.", two: ["air"], three: ["win"] },
  { learn: "Pecho", c: "sprint", len: 100, r: 1, pace: 0.9, fly: false,
    tip: "Mantené PECHO: vas un poco más lento que en crol, pero casi no gastás aire. Sirve para llegar al final sin parar a respirar.", two: ["air"], three: ["win"] },
  { learn: "Mariposa", c: "sprint", len: 100, r: 1, pace: 0.92,
    tip: "Mantené MARIPOSA y vas mucho más rápido, pero la pila se vacía rápido. Usala, y respirá o pasate a pecho a tiempo.", two: ["win"], three: ["air"] },
  { learn: "La vuelta americana", c: "idavuelta", len: 100, r: 2, pace: 0.92,
    tip: "Pileta de 50 m: a mitad de carrera llegás a la pared. Ahí aparece la barrita: tocá en el verde y salís con turbo.", two: ["top", 2], three: ["turns", 1] },
  { learn: "Todo junto", c: "idavuelta", len: 200, r: 2, pace: 0.92,
    tip: "Dos rivales, 200 m ida y vuelta, con todo lo que aprendiste. Si llegás entre los dos primeros, pasás a PRE NADADOR y se abre la copa.", two: ["top", 2], three: ["win"] },
  // 🏊 Pre nadador: el río de a poco, intercalado con pileta
  { learn: "Río a favor", c: "abiertas", len: 75, r: 1, pace: 0.92, skill: 0.3, river: "favor",
    tip: "Aguas abiertas: sin paredes ni corcheras. Hoy la corriente te empuja: es el río más fácil.", two: ["win"], three: ["goods", 3] },
  { learn: "Sprint con dos", c: "sprint", len: 100, r: 2, pace: 0.95, skill: 0.5, two: ["top", 2], three: ["bads", 1] },
  { learn: "Corriente de costado", c: "abiertas", len: 100, r: 1, pace: 0.94, skill: 0.5, river: "side", tip: TIPS.side, two: ["win"], three: ["bads", 1] },
  { learn: "Vueltas finas", c: "idavuelta", len: 200, r: 2, pace: 0.95, skill: 0.6, two: ["win"], three: ["turns", 2] },
  { learn: "Río más largo", c: "abiertas", len: 150, r: 2, pace: 0.95, skill: 0.7, river: "side",
    tip: "500 m de río con corriente de costado: dosificá el aire, es más largo que todo lo que nadaste.", two: ["top", 2], three: ["air"] },
  { learn: "Salida de campeón", c: "sprint", len: 100, r: 2, pace: 0.97, skill: 0.8, two: ["top", 2], three: ["dive"] },
  { learn: "Corriente en contra", c: "abiertas", len: 100, r: 2, pace: 0.96, skill: 0.9, river: "against", tip: TIPS.against, two: ["top", 2], three: ["win"] },
  { learn: "Aguantar el aire", c: "idavuelta", len: 200, r: 2, pace: 0.97, skill: 0.9, two: ["top", 2], three: ["air"] },
  { learn: "El río que cambia", c: "abiertas", len: 150, r: 2, pace: 0.98, skill: 1, river: "mix", tip: TIPS.mix, two: ["top", 2], three: ["bads", 1] },
  { learn: "Final de Pre nadador", c: "abiertas", len: 150, r: 2, pace: 0.99, skill: 1.3, river: "mix",
    tip: "La última de Pre nadador: el río que cambia y dos rivales que ya nadan en serio. Ganala y sos NADADOR.", two: ["win"], three: ["air"] },
  // 🥽 Nadador
  { learn: "Agua limpia", c: "sprint", len: 100, r: 2, pace: 0.95, skill: 1.35, items: "none", tip: TIPS.limpia, two: ["win"], three: ["dive"] },
  { learn: "Río a favor con dos", c: "abiertas", len: 150, r: 2, pace: 1, skill: 1.4, river: "favor", tip: TIPS.favor, two: ["win"], three: ["goods", 3] },
  { learn: "Ida y vuelta 300", c: "idavuelta", len: 300, r: 2, pace: 0.99, skill: 1.45, two: ["top", 2], three: ["turns", 3] },
  { learn: "Lluvia de verdes", c: "sprint", len: 100, r: 2, pace: 1, skill: 1.5, items: "good", gap: RAIN, tip: TIPS.lluvia, two: ["win"], three: ["goods", 6] },
  { learn: "Mano a mano", c: "idavuelta", len: 200, r: 1, vs: ["luis", "facu"], pace: 1.02, skill: 1.6, tip: TIPS.manoamano, two: ["win"], three: ["turns", 2] },
  { learn: "Costado y rojas", c: "abiertas", len: 150, r: 2, pace: 1, skill: 1.6, river: "side", gap: SPICY,
    tip: "Corriente de costado y el río lleno de cosas rojas: la corriente te tira encima de ellas.", two: ["top", 2], three: ["bads", 1] },
  { learn: "Sin mariposa", c: "idavuelta", len: 200, r: 2, pace: 0.98, skill: 1.65, fly: false, tip: TIPS.sinfly, two: ["win"], three: ["air"] },
  { learn: "En contra y largo", c: "abiertas", len: 225, r: 2, pace: 1, skill: 1.7, river: "against", tip: TIPS.against, two: ["top", 2], three: ["air"] },
  { learn: "Paredes perfectas", c: "idavuelta", len: 200, r: 2, pace: 0.99, skill: 1.75, two: ["win"], three: ["turns", 3] },
  { learn: "Mano a mano en el río", c: "abiertas", len: 150, r: 1, vs: ["facu", "pablo"], pace: 1.03, skill: 1.8, river: "mix", tip: TIPS.manoamano, two: ["win"], three: ["dive"] },
  { learn: "Sprint picante", c: "sprint", len: 100, r: 2, pace: 1.01, skill: 1.85, gap: SPICY,
    tip: "100 m llenos de cosas rojas. Elegí bien el carril.", two: ["win"], three: ["bads", 1] },
  { learn: "Ida y vuelta 400", c: "idavuelta", len: 400, r: 2, pace: 1, skill: 1.9,
    tip: "La más larga en pileta: 8 largos. Guardá aire para el final.", two: ["top", 2], three: ["turns", 3] },
  { learn: "El río que cambia, largo", c: "abiertas", len: 225, r: 2, pace: 1, skill: 1.95, river: "mix", tip: TIPS.mix, two: ["win"], three: ["air"] },
  { learn: "Lluvia en el río", c: "abiertas", len: 150, r: 2, pace: 1.02, skill: 2, river: "favor", items: "good", gap: RAIN, tip: TIPS.lluvia, two: ["win"], three: ["goods", 6] },
  { learn: "Final de Nadador", c: "idavuelta", len: 400, r: 2, pace: 1.01, skill: 2.1,
    tip: "La última de Nadador: 400 m contra los dos en su mejor nivel. Ganala y sos PREMASTER.", two: ["win"], three: ["air"] },
  // ⭐ Premaster
  { learn: "Agua limpia", c: "idavuelta", len: 200, r: 2, pace: 0.98, skill: 2.1, items: "none", tip: TIPS.limpia, two: ["win"], three: ["turns", 2] },
  { learn: "Río a favor, a fondo", c: "abiertas", len: 150, r: 2, pace: 1.03, skill: 2.15, river: "favor", tip: TIPS.favor, two: ["win"], three: ["bads", 0] },
  { learn: "Mano a mano", c: "sprint", len: 100, r: 1, vs: ["pablo", "mati"], pace: 1.04, skill: 2.2, tip: TIPS.manoamano, two: ["win"], three: ["dive"] },
  { learn: "Costado largo", c: "abiertas", len: 225, r: 2, pace: 1.02, skill: 2.25, river: "side", tip: TIPS.side, two: ["top", 2], three: ["air"] },
  { learn: "Lluvia de verdes", c: "idavuelta", len: 200, r: 2, pace: 1.03, skill: 2.3, items: "good", gap: RAIN, tip: TIPS.lluvia, two: ["win"], three: ["goods", 8] },
  { learn: "Sin mariposa", c: "sprint", len: 100, r: 2, pace: 1, skill: 2.3, fly: false, tip: TIPS.sinfly, two: ["win"], three: ["dive"] },
  { learn: "En contra, a fondo", c: "abiertas", len: 150, r: 2, pace: 1.02, skill: 2.35, river: "against", tip: TIPS.against, two: ["win"], three: ["air"] },
  { learn: "Ida y vuelta 400", c: "idavuelta", len: 400, r: 2, pace: 1.02, skill: 2.4, two: ["win"], three: ["turns", 3] },
  { learn: "Mano a mano en el río", c: "abiertas", len: 150, r: 1, vs: ["mati", "luis"], pace: 1.05, skill: 2.45, river: "mix", tip: TIPS.manoamano, two: ["win"], three: ["air"] },
  { learn: "Sprint picante", c: "sprint", len: 100, r: 2, pace: 1.03, skill: 2.5, gap: SPICY, two: ["win"], three: ["bads", 0] },
  { learn: "El río que cambia, 1000 m", c: "abiertas", len: 300, r: 2, pace: 1.02, skill: 2.5, river: "mix", tip: TIPS.mix, two: ["top", 2], three: ["win"] },
  { learn: "Sin pecho", c: "idavuelta", len: 300, r: 2, pace: 1.02, skill: 2.55, pecho: false, tip: TIPS.sinpecho, two: ["win"], three: ["air"] },
  { learn: "Lluvia en el río", c: "abiertas", len: 225, r: 2, pace: 1.03, skill: 2.55, river: "side", items: "good", gap: RAIN, tip: TIPS.lluvia, two: ["win"], three: ["goods", 8] },
  { learn: "Paredes perfectas", c: "idavuelta", len: 300, r: 2, pace: 1.03, skill: 2.6, two: ["win"], three: ["turns", 4] },
  { learn: "Final de Premaster", c: "abiertas", len: 300, r: 2, pace: 1.02, skill: 2.65, river: "mix",
    tip: "La última de Premaster: 1000 m de río que cambia contra los dos en su mejor nivel. Ganala y sos MASTER.", two: ["win"], three: ["air"] },
  // 🏅 Master: la técnica. Primero cada cosa nueva sola (boyas, patada, pullbuoy), después mezclada con todo.
  { learn: "Boyas", c: "sprint", len: 100, r: 1, pace: 0.915, skill: 2.2, items: "none", buoys: { from: 0.15, to: 0.85, sep: 4.2 }, tip: TIPS.boyas, two: ["buoys", 3], three: ["win"] },
  { learn: "Solo patada", c: "sprint", len: 100, r: 1, pace: 0.95, skill: 2.25, drill: "kick", items: "none", tip: TIPS.patada, two: ["win"], three: ["air"] },
  { learn: "Patada con patas", c: "sprint", len: 100, r: 2, pace: 0.95, skill: 2.3, drill: "kick", items: "good",
    tip: "Solo patada y el agua llena de cosas verdes: buscá las PATAS, que con tabla te hacen volar. Las manoplas acá no sirven.", two: ["win"], three: ["goods", 4] },
  { learn: "Patada de ida y vuelta", c: "idavuelta", len: 200, r: 2, pace: 0.97, skill: 2.35, drill: "kick", tip: TIPS.patada, two: ["top", 2], three: ["turns", 2] },
  { learn: "Pullbuoy", c: "sprint", len: 100, r: 2, pace: 0.97, skill: 2.4, drill: "pull", items: "good", tip: TIPS.pull, two: ["win"], three: ["goods", 3] },
  { learn: "Intercalado", c: "idavuelta", len: 200, r: 2, pace: 0.98, skill: 2.45, drill: ["kick", "pull", "kick", "full"], tip: TIPS.inter, two: ["win"], three: ["turns", 2] },
  { learn: "Boyas en el río", c: "abiertas", len: 150, r: 2, pace: 0.955, skill: 2.5, river: "favor", buoys: { from: 0.2, to: 0.8, sep: 4 }, tip: TIPS.boyas, two: ["win"], three: ["buoys", 0] },
  { learn: "Patada mano a mano", c: "idavuelta", len: 200, r: 1, vs: ["fer", "luchito"], pace: 1.02, skill: 2.55, drill: "kick", tip: TIPS.manoamano, two: ["win"], three: ["turns", 2] },
  { learn: "Pullbuoy en el río", c: "abiertas", len: 150, r: 2, pace: 0.99, skill: 2.55, river: "side", drill: "pull", tip: TIPS.pull, two: ["top", 2], three: ["air"] },
  { learn: "Boyas de ida y vuelta", c: "idavuelta", len: 300, r: 2, pace: 0.965, skill: 2.6, buoys: { from: 0, to: 1, sep: 3.8 }, tip: TIPS.boyas, two: ["win"], three: ["buoys", 1] },
  { learn: "Patada contra la corriente", c: "abiertas", len: 150, r: 2, pace: 0.99, skill: 2.6, river: "against", drill: "kick", tip: TIPS.patada, two: ["win"], three: ["air"] },
  { learn: "Intercalado en el río", c: "abiertas", len: 225, r: 2, pace: 0.99, skill: 2.65, river: "mix", drill: KICK_PULL_FULL, tip: TIPS.inter, two: ["win"], three: ["air"] },
  { learn: "Slalom picante", c: "sprint", len: 100, r: 2, pace: 0.975, skill: 2.7, gap: SPICY, buoys: { from: 0.1, to: 0.9, sep: 3.4 },
    tip: "Boyas y cosas rojas al mismo tiempo: pecho para las boyas y ojo con el carril.", two: ["win"], three: ["buoys", 0] },
  { learn: "Lluvia de manoplas", c: "idavuelta", len: 200, r: 2, pace: 1, skill: 2.7, drill: "pull", items: "good", gap: RAIN, tip: TIPS.pull, two: ["win"], three: ["goods", 6] },
  { learn: "Prueba de técnica", c: "idavuelta", len: 300, r: 2, pace: 0.975, skill: 2.75, drill: KICK_PULL_FULL, buoys: { from: 0, to: 1, sep: 4.2 },
    tip: "Todo lo nuevo junto: patada, brazada y completo, con boyas en cada largo.", two: ["win"], three: ["buoys", 1] },
  { learn: "Patada larga", c: "idavuelta", len: 400, r: 2, pace: 1, skill: 2.75, drill: "kick", tip: TIPS.patada, two: ["top", 2], three: ["air"] },
  { learn: "Boyas con corriente", c: "abiertas", len: 225, r: 2, pace: 0.975, skill: 2.8, river: "side", buoys: { from: 0.15, to: 0.85, sep: 4 },
    tip: "La corriente de costado te corre del hueco: corregí antes de cada fila.", two: ["win"], three: ["buoys", 1] },
  { learn: "Pullbuoy sin mariposa", c: "idavuelta", len: 300, r: 2, pace: 0.99, skill: 2.8, drill: "pull", fly: false, tip: TIPS.pull, two: ["win"], three: ["turns", 3] },
  { learn: "Intercalado mano a mano", c: "sprint", len: 100, r: 1, vs: ["mica", "gaston"], pace: 1.03, skill: 2.85, drill: ["full", "kick", "full"], tip: TIPS.inter, two: ["win"], three: ["dive"] },
  { learn: "Lluvia de patas", c: "abiertas", len: 150, r: 2, pace: 0.995, skill: 2.85, river: "favor", drill: "kick", items: "good", gap: RAIN, tip: TIPS.patada, two: ["win"], three: ["goods", 6] },
  { learn: "Boyas sin pecho", c: "sprint", len: 100, r: 2, pace: 0.99, skill: 2.85, pecho: false, buoys: { from: 0.15, to: 0.85, sep: 4.6 },
    tip: "Boyas y hoy no hay pecho: anticipate y empezá a doblar antes de cada fila.", two: ["top", 2], three: ["buoys", 2] },
  { learn: "Intercalado 400", c: "idavuelta", len: 400, r: 2, pace: 1.01, skill: 2.9, drill: ["kick", "pull", "full", "full"], tip: TIPS.inter, two: ["win"], three: ["air"] },
  { learn: "Slalom largo", c: "idavuelta", len: 400, r: 2, pace: 0.985, skill: 2.9, buoys: { from: 0, to: 1, sep: 3.6 }, tip: TIPS.boyas, two: ["win"], three: ["buoys", 2] },
  { learn: "El río técnico", c: "abiertas", len: 300, r: 2, pace: 0.985, skill: 2.95, river: "mix", drill: KICK_PULL_FULL, buoys: { from: 0.1, to: 0.9, sep: 4.4 },
    tip: "1000 m de río que cambia, por tramos y con boyas. Leé cada cartel.", two: ["win"], three: ["buoys", 2] },
  { learn: "Final de Master", c: "idavuelta", len: 400, r: 2, pace: 0.995, skill: 3, drill: ["kick", "pull", "full", "full"], buoys: { from: 0, to: 1, sep: 4 },
    tip: "La última de Master: 400 m intercalados, con boyas y contra los dos en su mejor nivel. Ganala y vas camino a PRO.", two: ["win"], three: ["air"] }
];

// Del 76 en adelante: las mismas familias de niveles en rueda, con rivales cada vez más hábiles y rápidos.
const FAMILIES = [
  { learn: "Agua limpia", c: "sprint", len: 100, items: "none", extraPace: -0.04, tip: TIPS.limpia, three: ["dive"] },
  { learn: "Río a favor", c: "abiertas", len: 150, river: "favor", tip: TIPS.favor, three: ["goods", 3] },
  { learn: "Ida y vuelta", c: "idavuelta", len: 300, three: ["turns", 3] },
  { learn: "Lluvia de verdes", c: "sprint", len: 100, items: "good", gap: RAIN, tip: TIPS.lluvia, three: ["goods", 6] },
  { learn: "Corriente de costado", c: "abiertas", len: 225, river: "side", extraPace: -0.01, tip: TIPS.side, three: ["bads", 1] },
  { learn: "Mano a mano", c: "idavuelta", len: 200, r: 1, extraPace: 0.02, tip: TIPS.manoamano, three: ["turns", 2] },
  { learn: "Corriente en contra", c: "abiertas", len: 150, river: "against", tip: TIPS.against, three: ["air"] },
  { learn: "Sin mariposa", c: "idavuelta", len: 200, fly: false, extraPace: -0.03, tip: TIPS.sinfly, three: ["air"] },
  { learn: "Sprint picante", c: "sprint", len: 100, gap: SPICY, three: ["bads", 1] },
  { learn: "El río que cambia", c: "abiertas", len: 300, river: "mix", extraPace: -0.01, tip: TIPS.mix, three: ["air"] },
  { learn: "Sin pecho", c: "idavuelta", len: 400, pecho: false, tip: TIPS.sinpecho, three: ["air"] },
  { learn: "Boyas", c: "sprint", len: 100, buoys: { from: 0.15, to: 0.85, sep: 3.8 }, tip: TIPS.boyas, three: ["buoys", 1] },
  { learn: "Solo patada", c: "idavuelta", len: 200, drill: "kick", tip: TIPS.patada, three: ["turns", 2] },
  { learn: "Pullbuoy", c: "idavuelta", len: 200, drill: "pull", tip: TIPS.pull, three: ["air"] },
  { learn: "Intercalado", c: "idavuelta", len: 300, drill: KICK_PULL_FULL, tip: TIPS.inter, three: ["turns", 3] },
  { learn: "Boyas en el río", c: "abiertas", len: 225, river: "mix", buoys: { from: 0.15, to: 0.85, sep: 4.2 }, tip: TIPS.boyas, three: ["buoys", 1] }
];
function autoLevel(n) {
  const k = n - HAND_MADE.length, { extraPace = 0, ...def } = FAMILIES[k % FAMILIES.length];
  return { r: 2, ...def, skill: 3, pace: Math.min(1.07, 1.04 + k * 0.0008) + extraPace,
    two: n % 5 ? ["win"] : ["top", 2] };
}
function levelDef(n) { return { ...BASE, ...(HAND_MADE[n - 1] || autoLevel(n)), n }; }

// La carrera de un nivel: con los rivales elegidos (vs) si el nivel los tiene; si vos sos uno de ellos, toca el otro.
// extra: más opciones para newRace (la semilla de un reto).
function levelRace(ch, L, extra = {}) {
  let rivals;
  if (L.vs) {
    rivals = L.vs.map((id) => CHARS.find((c) => c.id === id)).filter((c) => c !== ch).slice(0, L.r);
    if (rivals.length < L.r) rivals.push(...drawRivals(ch, 3).filter((c) => !rivals.includes(c)).slice(0, L.r - rivals.length));
  }
  return newRace(ch, CIRCUITS[L.c], rivals, L.len, { pool: L.pool, rivals: L.r, skill: L.skill, pace: L.pace, fly: L.fly, pecho: L.pecho,
    air: L.air, items: L.items, quirks: L.quirks, gap: L.gap, river: L.river, drill: L.drill, buoys: L.buoys, ...extra });
}

// Lo que aprendiste hasta el nivel n (para la práctica libre): el pecho en el 7 y la mariposa en el 8.
const learned = (n) => ({ fly: n > 8, pecho: n > 7 });

// Las estrellas de una carrera terminada: [terminó, objetivo, extra]. Para cumplir el objetivo hay que llegar a la pared.
function levelStars(L, race) {
  const p = race.racers[0], pos = standings(race).indexOf(p) + 1;
  const one = true, two = p.finished && goalOk(L.two, p, pos), three = two && goalOk(L.three, p, pos);
  return { n: three ? 3 : two ? 2 : one ? 1 : 0, checks: [one, two, three], pos };
}
