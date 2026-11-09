// Nadar por la gloria — caras animadas de los nadadores, en pixel art de 24×24.
// Son las mismas caras de Nadamos por la milanga (mismos colores, barba, gorra y antiparras),
// para que el grupo se reconozca. Cada cara cambia de gesto según lo que le pasa en la carrera.

const FACES = {
  pablo: { skin: "#F0BE98", shade: "#D99A72", shade2: "#C4825E", top: "bald", beard: "candado", beardC: "#9C8E80", beardC2: "#7E7064", brow: "#5E4A3C", iris: "#4A6E96", goggles: true, mouth: "half" },
  luis: { skin: "#E6B08A", shade: "#CC9068", shade2: "#B67A55", top: "cap", capC: "#4A5FD0", capC2: "#3546A8", capHi: "#8394F5", beard: "stubble", beardC: "#6E5A4C", beardC2: "#5A4638", brow: "#3A2A20", iris: "#4A2E1C", goggles: false, mouth: "grin" },
  facu: { skin: "#EDBB95", shade: "#D49B74", shade2: "#BC845E", top: "cap", capC: "#1A1A1E", capC2: "#0A0A0C", capHi: "#4A4D58", beard: "light", beardC: "#B89A80", beardC2: "#A08268", brow: "#3A2A1E", iris: "#4F7A4A", goggles: true, mouth: "smirk" },
  mati: { skin: "#F2C6A0", shade: "#DCA27C", shade2: "#C58A64", top: "hairMid", hairC: "#F0CC62", hairC2: "#C99E38", beard: "none", brow: "#B88A3A", iris: "#4A6E96", goggles: false, mouth: "grin", blush: true },
  luchito: { slim: true, skin: "#EEC09A", shade: "#D6A07A", shade2: "#BE8862", top: "hair", hairC: "#1A1410", hairC2: "#3A2E26", beard: "none", brow: "#1A1410", iris: "#5A3A22", goggles: true, mouth: "grin" },
  fer: { skin: "#E6B48C", shade: "#CC9A72", shade2: "#B5825C", top: "bald", beard: "none", brow: "#8A7A6C", iris: "#4A6E96", goggles: true, mouth: "half", wrinkles: true },
  gaston: { skin: "#E8B48E", shade: "#CF966E", shade2: "#B88058", top: "hair", hairC: "#A9A9A9", hairC2: "#C8C8C8", beard: "short", beardC: "#A8A8A8", beardC2: "#8C8C8C", brow: "#8C8C8C", iris: "#4A6E96", goggles: true, mouth: "grin" },
  mica: { slim: true, skin: "#F0C4A2", shade: "#D9A27E", shade2: "#C28A66", top: "cap", capC: "#16161C", capC2: "#0A0A0E", capHi: "#4A4A5C", locks: "#3A2618", tail: "#3A2618", tailSide: -1, tie: "#FF6FB0", beard: "none", brow: "#3A2618", iris: "#5A3A22", goggles: true, mouth: "lips", lip: "#C8506A", blush: true, lashes: true, fem: true },
  andre: { skin: "#E3AE86", shade: "#C98F68", shade2: "#B27852", top: "cap", capC: "#2B2D3A", capC2: "#1A1B24", capHi: "#5A5E78", locks: "#2A1C14", tail: "#2A1C14", tailSide: 1, tie: "#5FCB4A", beard: "none", brow: "#2E2018", iris: "#3E2A1C", goggles: true, mouth: "lips", lip: "#B8475E", blush: true, lashes: true, fem: true }
};
const FACE_BASE = { out: "#2A1B14", lip: "#8A4436", water: "#2E9ED8", waterL: "#6FD3F5" };
const HEAD = [[2, 8, 15], [3, 6, 17], [4, 5, 18], [5, 4, 19], [6, 4, 19], [7, 4, 19], [8, 4, 19], [9, 4, 19], [10, 4, 19], [11, 4, 19], [12, 4, 19], [13, 4, 19], [14, 4, 19], [15, 4, 19], [16, 5, 18], [17, 5, 18], [18, 6, 17], [19, 7, 16], [20, 9, 14]];
const headRow = (r) => HEAD.find((h) => h[0] === r);
const HEAD_BASE = HEAD;

// Gestos: normal (parpadea y mira), happy, hurt, gulp, annoyed, dead (ojos en cruz), effort (mariposa).
function paintFace(c, id, expr, t) {
  const P = FACES[id];
  const HEAD = P.slim ? HEAD_BASE.map(([r, a, b]) => r >= 14 ? [r, Math.min(a + 1, b), Math.max(b - 1, a)] : [r, a, b]) : HEAD_BASE; // cara más finita
  const F = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  F(0, 0, 24, 24, FACE_BASE.water);
  F(1, 22, 6, 1, FACE_BASE.waterL); F(16, 21, 5, 1, FACE_BASE.waterL); F(3, 3, 2, 1, FACE_BASE.waterL);
  for (const [r, a, b] of HEAD) F(a - 1, r - 1, b - a + 3, 3, FACE_BASE.out);
  F(2, 9, 2, 6, FACE_BASE.out); F(20, 9, 2, 6, FACE_BASE.out);
  F(3, 10, 1, 4, P.shade); F(20, 10, 1, 4, P.shade2);
  for (const [r, a, b] of HEAD) F(a, r, b - a + 1, 1, P.skin);
  for (const [r, a, b] of HEAD) if (r > 4 && r < 18) F(b - 1, r, 2, 1, P.shade);
  // parte de arriba de la cabeza
  if (P.top === "bald") {
    F(8, 3, 3, 1, "#FFFFFF"); F(7, 4, 2, 1, "#FFF1E0"); F(12, 3, 1, 1, "#FFF1E0");
  } else if (P.top === "cap") {
    for (const [r, a, b] of HEAD) if (r <= 8) F(a, r, b - a + 1, 1, P.capC);
    F(4, 8, 16, 1, P.capC2); F(18, 4, 1, 4, P.capC2);
    F(8, 3, 3, 1, P.capHi); F(7, 4, 2, 1, P.capHi);
  } else if (P.top === "hairMid") {
    const HAIR = [[1, 8, 15], [2, 5, 18], [3, 4, 19], [4, 3, 20], [5, 3, 20], [6, 3, 20], [7, 3, 9], [7, 14, 20], [8, 3, 7], [8, 16, 20], [9, 3, 5], [9, 18, 20], [10, 3, 4], [10, 19, 20]];
    for (const [r, a, b] of HAIR) F(a - 1, r - 1, b - a + 3, 3, FACE_BASE.out);
    for (const [r, a, b] of HEAD) if (r >= 7 && r <= 10) F(Math.max(a, 6), r, Math.min(b, 17) - Math.max(a, 6) + 1, 1, P.skin);
    for (const [r, a, b] of HAIR) F(a, r, b - a + 1, 1, P.hairC);
    F(11, 2, 2, 5, "#F5D9B8");
    for (const [x, y] of [[8, 3], [7, 4], [6, 5], [5, 6], [15, 3], [16, 4], [17, 5], [18, 6], [9, 5], [14, 5]]) F(x, y, 1, 1, P.hairC2);
    F(7, 2, 3, 1, "#FFF3B8"); F(14, 2, 3, 1, "#FFF3B8"); F(5, 4, 1, 1, "#FFF3B8"); F(18, 4, 1, 1, "#FFF3B8");
  } else if (P.top === "hair") {
    for (const [r, a, b] of HEAD) if (r <= 6) F(a, r, b - a + 1, 1, P.hairC);
    F(4, 7, 3, 1, P.hairC); F(9, 7, 4, 1, P.hairC); F(16, 7, 4, 1, P.hairC); F(4, 8, 1, 3, P.hairC); F(19, 8, 1, 3, P.hairC);
    F(8, 3, 2, 1, P.hairC2 || "#5A4636");
  }
  // barba
  for (let r = 12; r <= 20; r++) {
    const row = headRow(r); if (!row) continue;
    for (let x = row[1]; x <= row[2]; x++) {
      let on = false, col = P.beardC;
      if (P.beard === "candado") { on = r >= 14 && ((r >= 16) || (x >= 8 && x <= 15)) && (r + x) % 2 === 0; col = r > 18 ? P.beardC2 : P.beardC; }
      else if (P.beard === "stubble") { on = (r >= 15 && x >= 5 && x <= 18 && (r + x) % 2 === 0) || (r >= 12 && r <= 14 && (x <= 5 || x >= 18) && (r + x) % 2 === 0); col = r > 18 ? P.beardC2 : P.beardC; }
      else if (P.beard === "light") { on = r >= 16 && (r * 3 + x) % 4 === 0; }
      else if (P.beard === "short") { on = (r >= 17 && x >= 6 && x <= 17) || (r === 16 && (x <= 7 || x >= 16)); col = (r + x) % 2 ? P.beardC : P.beardC2; }
      if (on) F(x, r, 1, 1, col);
    }
  }
  if (P.beard === "candado" || P.beard === "short") F(9, 15, 6, 1, P.beardC);
  // antiparras en la frente
  if (P.goggles) { F(4, 7, 16, 1, FACE_BASE.out); F(6, 6, 4, 2, "#5FD0F5"); F(14, 6, 4, 2, "#5FD0F5"); F(6, 6, 1, 1, "#FFFFFF"); F(14, 6, 1, 1, "#FFFFFF"); }
  const blink = expr === "normal" && (t % 3.2) < 0.13;
  // cejas
  const B = P.brow, O = FACE_BASE.out, L = FACE_BASE.lip;
  if (expr === "hurt" || expr === "dead") { F(6, 9, 4, 1, B); F(14, 9, 4, 1, B); }
  else if (expr === "annoyed" || expr === "effort") { F(6, 10, 2, 1, B); F(8, 9, 2, 1, B); F(14, 9, 2, 1, B); F(16, 10, 2, 1, B); }
  else if (expr === "happy") { F(6, 8, 4, 1, B); F(14, 8, 4, 1, B); }
  else if (P.fem) { F(6, 9, 1, 1, B); F(7, 8, 3, 1, B); F(14, 8, 3, 1, B); F(17, 9, 1, 1, B); }
  else { F(6, 9, 4, 1, B); F(14, 9, 4, 1, B); if (P.mouth === "half") F(17, 8, 1, 1, B); }
  // ojos
  if (expr === "dead") {
    F(7, 10, 1, 1, O); F(9, 10, 1, 1, O); F(8, 11, 1, 1, O); F(7, 12, 1, 1, O); F(9, 12, 1, 1, O);
    F(14, 10, 1, 1, O); F(16, 10, 1, 1, O); F(15, 11, 1, 1, O); F(14, 12, 1, 1, O); F(16, 12, 1, 1, O);
  } else if (expr === "hurt") {
    F(7, 10, 1, 1, O); F(8, 11, 2, 1, O); F(7, 12, 1, 1, O);
    F(16, 10, 1, 1, O); F(14, 11, 2, 1, O); F(16, 12, 1, 1, O);
  } else if (blink || expr === "happy") {
    F(7, 11, 3, 1, O); F(14, 11, 3, 1, O);
    if (expr === "happy") { F(7, 10, 1, 1, P.shade); F(16, 10, 1, 1, P.shade); }
  } else {
    F(7, 11, 3, 1, "#FFFFFF"); F(14, 11, 3, 1, "#FFFFFF");
    const look = expr === "normal" && Math.floor(t * 0.7) % 4 === 3 ? 1 : expr === "effort" ? 1 : 0;
    F(8 + look, 11, 1, 1, P.iris); F(15 + look, 11, 1, 1, P.iris);
    F(7, 12, 3, 1, P.shade); F(14, 12, 3, 1, P.shade);
  }
  if (P.wrinkles) { F(8, 4, 6, 1, P.shade); F(9, 5, 4, 1, P.shade); F(5, 11, 1, 1, P.shade2); F(18, 11, 1, 1, P.shade2); F(5, 13, 1, 1, P.shade2); F(18, 13, 1, 1, P.shade2); F(8, 15, 1, 1, P.shade2); F(15, 15, 1, 1, P.shade2); }
  if (P.blush || expr === "effort") { F(6, 14, 2, 1, "#F0A08A"); F(16, 14, 2, 1, "#F0A08A"); }
  if (P.lashes && expr !== "dead") { F(6, 10, 1, 2, O); F(10, 10, 1, 1, O); F(13, 10, 1, 1, O); F(17, 10, 1, 2, O); F(5, 10, 1, 1, O); F(18, 10, 1, 1, O); }
  if (P.locks) { F(4, 9, 1, 5, P.locks); F(5, 9, 1, 2, P.locks); F(19, 9, 1, 5, P.locks); F(18, 9, 1, 2, P.locks); }
  if (P.tail) { // la colita atada que sale del gorro hacia un costado
    const X = (x) => P.tailSide > 0 ? x : 23 - x;
    const TAIL = [[5, 19, 21], [6, 20, 22], [7, 20, 22], [8, 21, 23], [9, 21, 23], [10, 21, 23], [11, 21, 23], [12, 21, 22], [13, 21, 22], [14, 22, 22]];
    for (const [r, a, b] of TAIL) for (let x = a - 1; x <= b + 1; x++) if (x >= 0 && x <= 23) F(X(x), r, 1, 1, O);
    F(X(20), 15, 1, 1, O); F(X(22), 15, 1, 1, O); F(X(21), 15, 1, 1, O);
    for (const [r, a, b] of TAIL) for (let x = a; x <= b; x++) if (x <= 23) F(X(x), r, 1, 1, (x + r) % 3 ? P.tail : "#5A4030");
    F(X(20), 6, 2, 1, P.tie); F(X(19), 5, 1, 1, P.tie);
  }
  // nariz
  F(11, 11, 1, 3, P.shade); F(12, 12, 1, 2, "#F7D2B4"); F(10, 14, 1, 1, P.shade2); F(13, 14, 1, 1, P.shade2);
  // boca
  const grin = () => { const L = P.lip || FACE_BASE.lip; F(9, 17, 6, 1, L); F(8, 16, 1, 1, L); F(15, 16, 1, 1, L); F(10, 17, 4, 1, "#FFFFFF"); F(10, 18, 4, 1, L); };
  if (expr === "happy") grin();
  else if (expr === "gulp" || expr === "hurt") { F(11, 16, 2, 3, O); F(10, 17, 1, 1, O); F(13, 17, 1, 1, O); }
  else if (expr === "effort") { F(9, 16, 6, 3, O); F(10, 16, 4, 1, "#FFFFFF"); F(10, 18, 4, 1, "#FFFFFF"); F(19, 5, 1, 2, "#8FE3FF"); }
  else if (expr === "annoyed") { F(9, 17, 6, 1, L); F(15, 18, 1, 1, L); F(19, 5, 1, 2, "#8FE3FF"); F(19, 7, 1, 1, "#5FD0F5"); }
  else if (expr === "talk") { const o = Math.floor(t * 8) % 2; F(10, 17, 4, 1 + o, O); }
  else if (expr === "dead") { for (let i = 0; i < 6; i++) F(9 + i, 17 + (i % 2), 1, 1, L); }
  else if (P.mouth === "grin") grin();
  else if (P.mouth === "smirk") { F(9, 17, 5, 1, L); F(8, 16, 1, 1, L); }
  else if (P.mouth === "lips") { F(10, 16, 1, 1, P.lip); F(13, 16, 1, 1, P.lip); F(9, 17, 6, 1, P.lip); F(10, 18, 4, 1, "#E07C92"); F(11, 17, 2, 1, "#8A2E44"); }
  else { F(9, 17, 5, 1, L); F(14, 16, 1, 1, L); F(15, 15, 1, 1, P.shade); }
  if (expr === "gulp") { F(19, 13, 1, 1, "#FFFFFF"); F(20, 11, 1, 1, "#FFFFFF"); }
}

// Las caras se pintan una vez por gesto y se guardan; el parpadeo y la mirada cambian solos.
const faceCache = {};
function faceCanvas(id, expr, t) {
  const key = id + "|" + expr + "|" + (expr === "normal" ? ((t % 3.2) < 0.13 ? "b" : Math.floor(t * 0.7) % 4 === 3 ? "l" : "o") : expr === "talk" ? Math.floor(t * 8) % 2 : "");
  if (!faceCache[key]) {
    const c = document.createElement("canvas"); c.width = c.height = 24;
    paintFace(c.getContext("2d"), id, expr, t);
    faceCache[key] = c;
  }
  return faceCache[key];
}

// El gesto de cada nadador según lo que le está pasando.
function moodOf(r) {
  if (r.moodT > 0) return r.mood;
  if (r.stun > 0) return "dead";
  if (r.noAir) return "hurt";
  if (r.walk > 0) return "happy";
  if (r.breathing) return "gulp";
  if (r.bubble && r.ch.id === "luis" && r.boost > 0) return "talk";
  if (r.fly && r.air > 0 && !r.plancha) return "effort";
  if (r.pecho) return "happy";
  if (r.plancha > 0) return "happy";
  return "normal";
}

// Cara dentro de un marco redondeado, para la pileta y el tablero.
function drawFaceBadge(ctx, r, x, y, size, t) {
  const c = faceCanvas(r.ch.id, moodOf(r), t);
  ctx.save();
  ctx.fillStyle = r.isPlayer ? "#FFD84A" : "#fff";
  ctx.beginPath(); ctx.roundRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6, size * 0.28); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.22); ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

// Para las pantallas de elegir y de resultado.
function faceImg(ch, size, expr = "normal") {
  return `<img class="face" src="${faceCanvas(ch.id, expr, 1).toDataURL()}" width="${size}" height="${size}" alt="${ch.name}">`;
}
