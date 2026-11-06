// Nadar por la gloria — todo lo que se dibuja en la pileta: agua, nadadores, objetos, tablero.
// La pileta se ve desde arriba y la carrera avanza hacia la derecha.

const POOL_TOP = 62; // alto del tablero de arriba

// Efectos que viven entre cuadros: espuma, salpicones, rayas de velocidad y papelitos.
const FX = { parts: [], streaks: [], confetti: [], lastT: null, lead: 0.32, partyFor: null };
const CONFETTI = ["#FFD84A", "#FF6FB0", "#7CFC6A", "#5FD0F5", "#FF8A2A", "#fff"];
const flyingNow = (r) => r.fly && r.air > 0 && !r.plancha && !r.stun;

function render(ctx, race, W, H) {
  const top = POOL_TOP, ph = H - top - 8;
  const ppm = Math.max(26, W / 22);                 // píxeles por metro
  const p = race ? race.racers[0] : { x: 0 };
  const t = race ? race.t : performance.now() / 1000;
  const dt = FX.lastT === null ? 0 : clamp(t - FX.lastT, 0, 0.05); FX.lastT = t;
  // en mariposa la cámara se adelanta un poco, para que se sienta el tirón
  const lead = race && flyingNow(p) ? 0.26 : 0.32;
  FX.lead += (lead - FX.lead) * Math.min(1, dt * 3);
  const camX = p.x - (W * FX.lead) / ppm;
  const sx = (x) => (x - camX) * ppm, sy = (u) => top + u * ph;

  // borde de la pileta: baldosas claras al sol
  ctx.fillStyle = "#F6E7C8"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(190,160,110,0.35)"; ctx.lineWidth = 1;
  const tile = ppm * 0.8, off = -((camX * ppm) % tile);
  ctx.beginPath();
  for (let x = off; x < W; x += tile) { ctx.moveTo(x, top + ph + 2); ctx.lineTo(x, H); }
  ctx.stroke();

  // agua turquesa con baldosas en el fondo
  const x0 = Math.max(0, sx(-1));
  const g = ctx.createLinearGradient(0, top, 0, top + ph);
  g.addColorStop(0, "#29B6EE"); g.addColorStop(0.5, "#45CCF5"); g.addColorStop(1, "#29B6EE");
  ctx.fillStyle = g; ctx.fillRect(x0, top, W, ph);
  ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let m = Math.max(-1, Math.floor(camX)); m < camX + W / ppm + 1; m++) { ctx.moveTo(sx(m), top); ctx.lineTo(sx(m), top + ph); }
  for (let k = 1; k < 12; k++) { ctx.moveTo(x0, top + ph * k / 12); ctx.lineTo(W, top + ph * k / 12); }
  ctx.stroke();
  // luz que baila en el fondo
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  for (let i = 0; i < 34; i++) {
    const wx = Math.floor(camX) + ((i * 7.3) % 26) - 1, wu = ((i * 0.137) % 0.9) + 0.05;
    const x = sx(wx) + Math.sin(t * 1.1 + i) * 8, y = sy(wu) + Math.cos(t * 0.9 + i * 2) * 4;
    if (x < x0) continue;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 10, y - 6 - Math.sin(t * 2 + i) * 3, x + 20, y + 6, x + 32, y); ctx.stroke();
  }
  // líneas del fondo (decorativas: se nada libre, como en un circuito)
  for (const u of [1 / 6, 0.5, 5 / 6]) { ctx.fillStyle = "rgba(20,60,140,0.3)"; ctx.fillRect(x0, sy(u) - 4, W, 8); }
  // corcheras de colores: rojas cerca de las paredes, amarillas y azules en el medio
  for (const u of [1 / 3, 2 / 3]) {
    for (let m = Math.max(-0.5, Math.floor(camX * 2) / 2); m < camX + W / ppm + 1; m += 0.5) {
      const seg = Math.round(m * 2);
      const col = m < 5 || m > RACE_M - 5 ? "#E8413C" : seg % 4 < 2 ? "#FFD23A" : "#2F6FE0";
      const x = sx(m), y = sy(u) + Math.sin(t * 2 + m) * 1.2;
      ctx.fillStyle = "rgba(0,30,70,0.22)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 7, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 2.5, 1.6, 0, 0, 7); ctx.fill();
    }
  }
  // banderines a 5 m de cada punta
  for (const m of [5, RACE_M - 5]) {
    const x = sx(m); if (x < -20 || x > W + 20) continue;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + ph); ctx.stroke();
    for (let i = 0, y = top + 4; y < top + ph - 10; i++, y += 16) {
      ctx.fillStyle = CONFETTI[i % 5];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9 + Math.sin(t * 5 + i) * 2, y + 6); ctx.lineTo(x, y + 12); ctx.fill();
    }
  }
  // marcas cada 10 m, salida y llegada
  for (let m = 10; m < RACE_M; m += 10) {
    const x = sx(m); if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 1, top, 2, ph);
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillText(m + " m", x, top + ph - 12);
  }
  const fx = sx(RACE_M);
  if (fx < W + 20) {
    for (let i = 0; i < ph / 12; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff"; ctx.fillRect(fx + j * 12, top + i * 12, 12, Math.min(12, top + ph - top - i * 12));
    }
    // después de la llegada está la pared
    ctx.fillStyle = "#E9EEF2"; ctx.fillRect(fx + 24, top - 3, 12, ph + 6);
    ctx.fillStyle = "#F6E7C8"; ctx.fillRect(fx + 36, top - 3, W, ph + 6);
    ctx.save(); ctx.translate(fx + 60, top + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 22px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#E8413C"; ctx.fillText("LLEGADA", 0, 0);
    ctx.restore();
  }
  // bordes blancos del agua y pared de salida
  ctx.fillStyle = "#fff"; ctx.fillRect(x0, top - 3, W, 4); ctx.fillRect(x0, top + ph - 1, W, 4);
  ctx.fillStyle = "#E9EEF2"; ctx.fillRect(sx(-1) - 12, top - 3, 12, ph + 6);

  if (!race) return;
  for (const o of race.objs) {
    if (o.gone) continue;
    const x = sx(o.x), y = sy(o.u); if (x < -40 || x > W + 40) continue;
    const bob = Math.sin(t * 3 + o.x) * 2;
    ctx.fillStyle = "rgba(0,40,90,0.22)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, ppm * 0.5, ppm * 0.3, 0, 0, 7); ctx.fill();
    drawItem(ctx, o.kind, x, y + bob, ppm * 0.5);
  }
  stepFx(race, dt);
  drawParts(ctx, sx, sy, false);
  const rx = (r) => sx(Math.min(r.x, RACE_M - 0.5)); // al llegar, quedan tocando la pared
  for (const r of race.racers) drawSwimmer(ctx, r, rx(r), sy(r.u), ppm, t);
  drawParts(ctx, sx, sy, true);
  for (const r of race.racers) drawTags(ctx, r, rx(r), sy(r.u), ppm, t, top);
  drawStreaks(ctx, race, W, H, dt);
  drawConfetti(ctx, race, W, H, dt);
}

// Espuma de las patadas y salpicones de los brazos; en mariposa salpica mucho más.
function stepFx(race, dt) {
  for (const r of race.racers) {
    if (r.finished || r.dive || r.stun || race.t < 0) continue;
    const flying = flyingNow(r);
    const n = dt * (flying ? 34 : 14) * Math.min(1.5, r.v / 2.4);
    for (let k = 0; k < n; k++) {
      if (k + 1 > n && Math.random() > n - k) break;
      FX.parts.push({ x: r.x - 0.9 + rnd(-0.15, 0.15), u: r.u + rnd(-0.02, 0.02), vx: -rnd(0.2, 1), vu: rnd(-0.03, 0.03), life: 0, max: rnd(0.5, 0.9), s: rnd(2, 4), top: false });
    }
    if (flying && Math.random() < dt * 9) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      FX.parts.push({ x: r.x + 0.3 + rnd(-0.2, 0.2), u: r.u + s * rnd(0.03, 0.05), vx: rnd(-0.5, 0.5), vu: s * rnd(0.05, 0.15), life: 0, max: rnd(0.35, 0.6), s: rnd(2.5, 5), top: true });
    }
  }
  for (const q of FX.parts) { q.life += dt; q.x += q.vx * dt; q.u += q.vu * dt; }
  FX.parts = FX.parts.filter((q) => q.life < q.max).slice(-500);
}
function drawParts(ctx, sx, sy, top) {
  for (const q of FX.parts) {
    if (q.top !== top) continue;
    const a = 1 - q.life / q.max;
    ctx.fillStyle = `rgba(255,255,255,${(a * 0.85).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(sx(q.x), sy(q.u), q.s * (0.6 + 0.6 * (1 - a)), 0, 7); ctx.fill();
  }
}
// Rayas de velocidad cuando vas en mariposa o con algo que te acelera.
function drawStreaks(ctx, race, W, H, dt) {
  const p = race.racers[0];
  const fast = !p.finished && (flyingNow(p) || (p.objT > 0 && p.objMult > 1));
  if (fast) for (let k = 0; k < dt * 70; k++) FX.streaks.push({ x: W + rnd(0, 60), y: rnd(POOL_TOP + 10, H - 10), len: rnd(40, 120), v: rnd(900, 1500) });
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (const s of FX.streaks) {
    s.x -= s.v * dt;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); ctx.stroke();
  }
  ctx.restore();
  FX.streaks = FX.streaks.filter((s) => s.x + s.len > 0);
}
// Papelitos de colores cuando llegás primero.
function drawConfetti(ctx, race, W, H, dt) {
  const p = race.racers[0];
  if (FX.partyFor !== race) { FX.partyFor = race; FX.confetti = []; FX.parts = []; FX.streaks = []; }
  if (p.finished && standings(race)[0] === p && race.t - p.finishT < 2.5)
    for (let k = 0; k < dt * 90; k++) FX.confetti.push({ x: rnd(0, W), y: -10, vx: rnd(-40, 40), vy: rnd(120, 260), a: rnd(0, 6), va: rnd(-8, 8), c: pick(CONFETTI) });
  for (const c of FX.confetti) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillStyle = c.c; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore();
  }
  FX.confetti = FX.confetti.filter((c) => c.y < H + 10);
}

function drawSwimmer(ctx, r, x, y, ppm, t) {
  const L = ppm * 1.8, ch = r.ch, O = "rgba(20,30,50,0.55)";
  ctx.save(); ctx.translate(x, y);
  if (r.dive) ctx.globalAlpha = 0.35;
  else if (r.immune > 0 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.6;
  const back = r.plancha > 0, flying = flyingNow(r);
  // estela: más larga en mariposa
  if (r.v > 0.8) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.ellipse(-L * 0.7, 0, L * (flying ? 0.6 : 0.38) * Math.min(1.6, r.v / 2.4), L * (flying ? 0.2 : 0.14), 0, 0, 7); ctx.fill();
  }
  // sombra en el fondo
  ctx.fillStyle = "rgba(0,50,110,0.2)"; ctx.beginPath(); ctx.ellipse(L * 0.06, L * 0.12, L * 0.5, L * 0.2, 0, 0, 7); ctx.fill();
  // en mariposa el cuerpo ondula
  if (flying) ctx.rotate(Math.sin(t * 9 + r.x) * 0.03);
  // piernas: crol patea alternado, mariposa las dos juntas
  const kick = Math.sin(t * (flying ? 9 : 14) + r.x) * L * 0.06;
  ctx.lineCap = "round";
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? ch.skin : O; ctx.lineWidth = L * (pass ? 0.09 : 0.13);
    ctx.beginPath();
    ctx.moveTo(-L * 0.3, -L * 0.06); ctx.lineTo(-L * 0.62, -L * 0.07 + kick);
    ctx.moveTo(-L * 0.3, L * 0.06); ctx.lineTo(-L * 0.62, L * 0.07 + (flying ? kick : -kick));
    ctx.stroke();
  }
  // espalda y malla
  ctx.fillStyle = ch.skin; ctx.strokeStyle = O; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(L * 0.08, 0, L * 0.2, L * 0.17, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ch.suit; ctx.beginPath(); ctx.ellipse(-L * 0.12, 0, L * 0.22, L * 0.15, 0, 0, 7); ctx.fill(); ctx.stroke();
  // brazos: crol alternado, mariposa los dos juntos y bien abiertos
  const phase = r.stun || back ? 0 : t * (flying ? 9 : 6) + r.x;
  for (const s of [-1, 1]) {
    const a = phase + (s > 0 && !flying ? Math.PI : 0), reach = Math.cos(a);
    const ex = L * 0.15 + reach * L * 0.4, ey = s * L * ((flying ? 0.24 : 0.18) + (flying ? 0.14 : 0.08) * Math.sin(a));
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? ch.skin : O; ctx.lineWidth = L * (pass ? 0.08 : 0.12);
      ctx.beginPath(); ctx.moveTo(L * 0.15, s * L * 0.13); ctx.lineTo(ex, ey); ctx.stroke();
    }
  }
  // cabeza con gorra y brillo
  ctx.fillStyle = ch.cap; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.lineWidth = r.isPlayer ? 3 : 2;
  ctx.beginPath(); ctx.arc(L * 0.36, 0, L * 0.14, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(L * 0.33, -L * 0.05, L * 0.05, L * 0.03, -0.4, 0, 7); ctx.fill();
  ctx.restore();
}

// Cara, nombre y avisos de cada nadador, siempre arriba de todo.
function drawTags(ctx, r, x, y, ppm, t, top) {
  const L = ppm * 1.8, size = Math.round(clamp(ppm * 0.85, 24, 40));
  // la cara va arriba del nadador, o abajo si no entra
  const above = y - L * 0.3 - size - 4 > top;
  const fy = above ? y - L * 0.3 - size / 2 : y + L * 0.3 + size / 2;
  const fxp = x - L * 0.05;
  drawFaceBadge(ctx, r, fxp, fy, size, t);
  ctx.save(); ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const label = r.isPlayer ? "VOS" : r.ch.name, ly = above ? fy - size / 2 - 8 : fy + size / 2 + 8;
  ctx.fillStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.strokeStyle = "#0009"; ctx.lineWidth = 3;
  ctx.strokeText(label, fxp, ly); ctx.fillText(label, fxp, ly);
  if (r.stun) { ctx.fillStyle = "#FFD84A"; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(x + L * 0.36 + Math.cos(a) * 12, y + Math.sin(a) * 8, 3, 0, 7); ctx.fill(); } }
  if (r.objT > 0) drawItem(ctx, r.objKind, fxp - size / 2 - 10, fy, 7);
  if (r.isPlayer && r.bOpen) {
    const k = 1 + Math.sin(t * 14) * 0.08;
    ctx.save(); ctx.translate(x + L * 0.58, y); ctx.scale(k, k);
    ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.strokeText("¡RESPIRÁ!", 0, 0); ctx.fillStyle = "#8FE3FF"; ctx.fillText("¡RESPIRÁ!", 0, 0);
    ctx.restore();
  }
  ctx.restore();
  if (r.bubble) {
    ctx.save(); ctx.font = "bold 12px system-ui, sans-serif";
    const w = ctx.measureText(r.bubble.text).width + 12; ctx.restore();
    drawBubble(ctx, fxp + size / 2 + 6 + w / 2, fy + 10, r.bubble.text, 12);
  }
}

function drawHud(ctx, race, W, H) {
  const p = race.racers[0], st = standings(race), pos = st.indexOf(p) + 1;
  ctx.save();
  // franja de arriba
  const g = ctx.createLinearGradient(0, 0, 0, POOL_TOP);
  g.addColorStop(0, "#0E4C7E"); g.addColorStop(1, "#1A6FA8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, POOL_TOP - 3);
  // tu cara y tu puesto
  drawFaceBadge(ctx, p, 28, 29, 38, race.t);
  ctx.font = "bold 30px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.lineWidth = 5; ctx.strokeStyle = "#0008"; ctx.fillStyle = pos === 1 ? "#FFD84A" : "#fff";
  ctx.strokeText(pos + "º", 56, 22); ctx.fillText(pos + "º", 56, 22);
  ctx.font = "bold 11px system-ui, sans-serif"; ctx.fillStyle = "#CFE9FF";
  ctx.fillText(Math.min(RACE_M, Math.floor(p.x)) + " / " + RACE_M + " m", 56, 46);
  // barra de progreso con las caras de los 3
  const bx = 136, bw = W - bx - 200, by = 30;
  ctx.fillStyle = "#0005"; ctx.beginPath(); ctx.roundRect(bx, by - 4, bw, 8, 4); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw - 2, by - 10, 4, 20);
  for (const r of race.racers.slice().reverse()) drawFaceBadge(ctx, r, bx + bw * clamp(r.x / RACE_M, 0, 1), by, r.isPlayer ? 22 : 18, race.t);
  // aire, estilo y objeto activo
  const ax = W - 150, aw = 138, flying = flyingNow(p) && !p.finished;
  ctx.font = "bold 10px system-ui, sans-serif"; ctx.fillStyle = "#CFE9FF"; ctx.textAlign = "right"; ctx.fillText("AIRE", ax - 5, 16);
  ctx.fillStyle = "#0006"; ctx.beginPath(); ctx.roundRect(ax, 9, aw, 14, 7); ctx.fill();
  const blinkLow = p.air < 0.3 && Math.floor(race.t * 6) % 2;
  ctx.fillStyle = p.noAir ? "#E84A4A" : p.air < 0.3 ? (blinkLow ? "#FF5A3A" : "#F0A030") : "#7FE0FF";
  if (p.air > 0.02) { ctx.beginPath(); ctx.roundRect(ax + 2, 11, (aw - 4) * p.air, 10, 5); ctx.fill(); }
  ctx.textAlign = "left"; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3;
  ctx.font = flying ? "bold 14px system-ui, sans-serif" : "bold 12px system-ui, sans-serif";
  ctx.fillStyle = flying ? "#FFD84A" : "#fff";
  const sty = flying ? "¡MARIPOSA! »»" : "CROL";
  ctx.strokeText(sty, ax, 34); ctx.fillText(sty, ax, 34);
  if (p.objT > 0) {
    const it = ITEMS[p.objKind];
    ctx.font = "bold 11px system-ui, sans-serif"; ctx.fillStyle = it.good ? "#7CFC6A" : "#FF8A7A";
    const s = it.name + " " + (it.good ? "▲" : "▼") + " " + p.objT.toFixed(1);
    ctx.strokeText(s, ax, 49); ctx.fillText(s, ax, 49);
  }
  // largada: cada número aparece grande y se achica
  if (race.t < 0.6) {
    const n = race.t < 0 ? Math.ceil(-race.t) : 0, k = 1.5 - 0.5 * (race.t < 0 ? n + race.t : race.t / 0.6);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k);
    ctx.font = "bold 90px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 10; ctx.strokeStyle = "#0E4C7E"; ctx.fillStyle = n ? "#fff" : "#FFD84A";
    const s = n ? String(n) : "¡YA!";
    ctx.strokeText(s, 0, 0); ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// Aviso grande de la guía, centrado debajo del tablero.
function drawTip(ctx, W, text, alpha) {
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = Math.min(W - 32, ctx.measureText(text).width + 28), y = POOL_TOP + 26;
  ctx.fillStyle = "rgba(8,40,70,0.88)"; ctx.strokeStyle = "#FFD84A"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y - 17, w, 34, 17); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.fillText(text, W / 2, y + 1, w - 20);
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
  ctx.fillStyle = good ? "rgba(124,252,106,0.4)" : "rgba(255,90,70,0.4)";
  ctx.beginPath(); ctx.arc(0, 0, s * 1.25, 0, 7); ctx.fill();
  ctx.strokeStyle = good ? "rgba(124,252,106,0.9)" : "rgba(255,90,70,0.9)"; ctx.lineWidth = Math.max(1, s * 0.1);
  ctx.stroke(); ctx.strokeStyle = "#0007"; ctx.lineWidth = Math.max(1, s * 0.12);
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
  // brillo
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-s * 0.45, -s * 0.55, s * 0.22, s * 0.12, -0.6, 0, 7); ctx.fill();
  ctx.restore();
}
function itemIcon(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 40;
  drawItem(c.getContext("2d"), kind, 20, 20, 14);
  return `<img src="${c.toDataURL()}" width="20" height="20" alt="">`;
}
