// Nadar por la gloria — todo lo que se dibuja en la pileta: agua, nadadores, objetos, tablero.
// La pileta se ve desde arriba y la carrera avanza hacia la derecha.

const POOL_TOP = 62; // alto del tablero de arriba

// Efectos que viven entre cuadros: espuma, salpicones, rayas de velocidad y papelitos.
const FX = { parts: [], streaks: [], confetti: [], lastT: null, lead: 0.32, partyFor: null };
const CONFETTI = ["#FFD84A", "#FF6FB0", "#7CFC6A", "#5FD0F5", "#FF8A2A", "#fff"];
const flyingNow = (r) => r.fly && r.air > 0 && !r.plancha && !r.stun;

// Dónde se dibuja cada nadador: r.x es la punta de la mano, así al llegar la mano toca la pared.
const HAND = 1.5;
const LANES = [1 / 6, 0.5, 5 / 6];

function render(ctx, race, W, H) {
  const top = POOL_TOP, ph = H - top - 8;
  const ppm = Math.max(26, W / 22);                 // píxeles por metro
  const p = race ? race.racers[0] : { x: 0 };
  const t = race ? race.t : performance.now() / 1000;
  const len = race ? race.len : RACE_M, open = race && race.circ.open;
  const dt = FX.lastT === null ? 0 : clamp(t - FX.lastT, 0, 0.05); FX.lastT = t;
  // en mariposa la cámara se adelanta un poco, para que se sienta el tirón
  const lead = race && flyingNow(p) ? 0.26 : 0.32;
  FX.lead += (lead - FX.lead) * Math.min(1, dt * 3);
  const camX = Math.max(p.x - HAND, 0) - (W * FX.lead) / ppm + 1;
  const sx = (x) => (x - camX) * ppm, sy = (u) => top + u * ph;
  const m0 = Math.floor(camX), m1 = camX + W / ppm + 1;

  if (open) drawRiver(ctx, race, W, H, top, ph, sx, sy, m0, m1, t, ppm);
  else drawPool(ctx, len, W, H, top, ph, sx, sy, m0, m1, t, ppm);

  if (!race) return;
  for (const o of race.objs) {
    if (o.gone) continue;
    const x = sx(o.x), y = sy(o.u); if (x < -40 || x > W + 40) continue;
    const bob = Math.sin(t * 3 + o.x) * 2;
    ctx.fillStyle = "rgba(0,40,90,0.22)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, ppm * 0.5, ppm * 0.3, 0, 0, 7); ctx.fill();
    drawItem(ctx, o.kind, x, y + bob, ppm * 0.5);
  }
  // la largada: parados en el partidor (o en el muelle) y después el salto al agua
  const block = -0.7, diveT = 0.35;
  if (race.t >= 0.25 && !FX.splashed) {
    FX.splashed = true;
    for (const r of race.racers) for (let k = 0; k < 26; k++) {
      const a = rnd(0, 7), v = rnd(0.4, 1.4);
      FX.parts.push({ x: 0.6 + Math.cos(a) * 0.2, u: r.u + Math.sin(a) * 0.02, vx: Math.cos(a) * v, vu: Math.sin(a) * v * 0.08, life: 0, max: rnd(0.5, 0.9), s: rnd(3, 6), top: true });
    }
  }
  stepFx(race, dt);
  drawParts(ctx, sx, sy, false);
  const pos = (r) => Math.min(r.x, len) - HAND;
  for (const r of race.racers) {
    if (race.t < 0) drawStanding(ctx, r, sx(block), sy(r.u), ppm);
    else if (race.t < diveT) {
      const q = race.t / diveT, k = 1 + Math.sin(Math.PI * q) * 0.25;
      ctx.save(); ctx.translate(sx(block + (pos(r) - block) * q), sy(r.u)); ctx.scale(k, k);
      drawSwimmer(ctx, { ...r, stun: 1, v: 0 }, 0, 0, ppm, t); ctx.restore();
    } else drawSwimmer(ctx, r, sx(pos(r)), sy(r.u), ppm, t);
  }
  drawParts(ctx, sx, sy, true);
  for (const r of race.racers) drawTags(ctx, r, sx(race.t < 0 ? 1.2 : pos(r)), sy(r.u), ppm, t, top); // antes de largar, las caras al lado del partidor
  drawStreaks(ctx, race, W, H, dt);
  drawConfetti(ctx, race, W, H, dt);
}

// Pileta: baldosas, corcheras, partidores en la salida y placas para tocar en la llegada.
function drawPool(ctx, len, W, H, top, ph, sx, sy, m0, m1, t, ppm) {
  ctx.fillStyle = "#F6E7C8"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(190,160,110,0.35)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let m = Math.floor(m0 / 0.8) * 0.8; m < m1; m += 0.8) { const x = sx(m); ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  ctx.stroke();
  // agua turquesa con baldosas en el fondo, solo entre las dos paredes
  const x0 = Math.max(0, sx(0)), x1 = Math.min(W, sx(len));
  if (x1 > x0) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, top, x1 - x0, ph); ctx.clip();
    const g = ctx.createLinearGradient(0, top, 0, top + ph);
    g.addColorStop(0, "#29B6EE"); g.addColorStop(0.5, "#45CCF5"); g.addColorStop(1, "#29B6EE");
    ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, ph);
    ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let m = Math.max(0, m0); m < m1; m++) { ctx.moveTo(sx(m), top); ctx.lineTo(sx(m), top + ph); }
    for (let k = 1; k < 12; k++) { ctx.moveTo(x0, top + ph * k / 12); ctx.lineTo(x1, top + ph * k / 12); }
    ctx.stroke();
    caustics(ctx, sx, sy, m0, t, "rgba(255,255,255,0.22)");
    // líneas del fondo con la T antes de cada pared, y la cruz en las paredes
    ctx.fillStyle = "rgba(20,60,140,0.35)";
    for (const u of LANES) {
      const y = sy(u);
      ctx.fillRect(sx(2), y - 4, sx(len - 2) - sx(2), 8);
      for (const m of [2, len - 2]) ctx.fillRect(sx(m) - 4, y - ppm * 0.5, 8, ppm);
      for (const m of [0, len - 0.6]) { ctx.fillRect(sx(m), y - 4, ppm * 0.6, 8); ctx.fillRect(sx(m + 0.3) - 4, y - ppm * 0.3, 8, ppm * 0.6); }
    }
    // corcheras de colores: rojas cerca de las paredes, amarillas y azules en el medio
    for (const u of [1 / 3, 2 / 3]) {
      for (let m = Math.max(0.25, Math.floor(m0 * 2) / 2); m < Math.min(m1, len); m += 0.5) {
        const seg = Math.round(m * 2);
        const col = m < 5 || m > len - 5 ? "#E8413C" : seg % 4 < 2 ? "#FFD23A" : "#2F6FE0";
        float(ctx, sx(m), sy(u) + Math.sin(t * 2 + m) * 1.2, col);
      }
    }
    // banderines a 5 m de cada pared
    for (const m of [5, len - 5]) {
      const x = sx(m); if (x < -20 || x > W + 20) continue;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + ph); ctx.stroke();
      for (let i = 0, y = top + 4; y < top + ph - 10; i++, y += 16) {
        ctx.fillStyle = CONFETTI[i % 5];
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9 + Math.sin(t * 5 + i) * 2, y + 6); ctx.lineTo(x, y + 12); ctx.fill();
      }
    }
    // marcas cada 10 m
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let m = 10; m < len; m += 10) {
      const x = sx(m); if (x < -20 || x > W + 20) continue;
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 1, top, 2, ph);
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillText(m + " m", x, top + ph - 12);
    }
    ctx.restore();
  }
  // bordes del agua
  ctx.fillStyle = "#fff";
  if (x1 > x0) { ctx.fillRect(x0, top - 4, x1 - x0, 4); ctx.fillRect(x0, top + ph, x1 - x0, 4); }
  // pared de salida con los partidores y el número de cada carril
  const ws = sx(0);
  if (ws > -ppm * 3) {
    ctx.fillStyle = "#DCE3EA"; ctx.fillRect(ws - 8, top - 4, 8, ph + 8);
    LANES.forEach((u, i) => {
      const y = sy(u), bw = ppm * 0.9, bh = Math.min(ph / 3 - 14, ppm * 1.1);
      ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.roundRect(ws - 8 - bw + 4, y - bh / 2 + 5, bw, bh, 6); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(ws - 8 - bw, y - bh / 2, bw, bh, 6); ctx.fill();
      ctx.fillStyle = "#2F6FE0"; ctx.fillRect(ws - 8 - bw, y - bh / 2 + bh * 0.72, bw, bh * 0.14);
      ctx.fillStyle = "#10324F"; ctx.font = `bold ${Math.round(bh * 0.4)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), ws - 8 - bw / 2, y - bh * 0.08);
    });
    ctx.save(); ctx.translate(ws - ppm * 1.6, top + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 20px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#2F6FE0"; ctx.fillText("SALIDA", 0, 0);
    ctx.restore();
  }
  // pared de llegada: placas amarillas para tocar, y el cartel
  const wf = sx(len);
  if (wf < W + 40) {
    ctx.fillStyle = "#DCE3EA"; ctx.fillRect(wf, top - 4, 10, ph + 8);
    for (const u of LANES) { ctx.fillStyle = "#FFD23A"; ctx.fillRect(wf - 4, sy(u) - ph / 6 + 8, 6, ph / 3 - 16); }
    for (let i = 0; i < ph / 12; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff"; ctx.fillRect(wf + 18 + j * 12, top + i * 12, 12, Math.min(12, ph - i * 12));
    }
    ctx.save(); ctx.translate(wf + 70, top + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 22px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#E8413C"; ctx.fillText("LLEGADA", 0, 0);
    ctx.restore();
  }
}

// Aguas abiertas: río verdoso, boyas naranjas, muelle de salida y arco inflable de llegada.
function drawRiver(ctx, race, W, H, top, ph, sx, sy, m0, m1, t, ppm) {
  const len = race.len;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1C8CA6"); g.addColorStop(0.5, "#2AA5B5"); g.addColorStop(1, "#1C8CA6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // olitas
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    const wx = Math.floor(m0) + ((i * 5.7) % 24) - 1, wu = ((i * 0.173) % 1);
    const x = sx(wx) + Math.sin(t * 1.4 + i) * 6, y = top + wu * ph;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 5, x + 18, y); ctx.quadraticCurveTo(x + 27, y + 5, x + 36, y); ctx.stroke();
  }
  // la corriente: flechitas que se mueven hacia donde empuja
  if (race.cur) {
    ctx.strokeStyle = "rgba(220,255,250,0.4)"; ctx.lineWidth = 2;
    const dir = Math.sign(race.cur), sp = Math.abs(race.cur) / race.circ.current;
    for (let i = 0; i < 26; i++) {
      const x = sx(Math.floor(m0) + ((i * 3.9) % 24)), base = (((i * 0.291 + t * 0.25 * dir * sp) % 1) + 1) % 1;
      const y = top + base * ph, L = 18 * sp;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dir * L); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 4, y + dir * (L - 6)); ctx.lineTo(x, y + dir * L); ctx.lineTo(x + 4, y + dir * (L - 6)); ctx.stroke();
    }
  }
  // boyas naranjas a los costados, con los metros cada 25
  for (let m = 12.5; m < len; m += 12.5) {
    const x = sx(m); if (x < -40 || x > W + 40) continue;
    for (const u of [0.02, 0.98]) {
      const y = sy(u);
      ctx.fillStyle = "rgba(0,30,50,0.25)"; ctx.beginPath(); ctx.arc(x + 3, y + 4, ppm * 0.32, 0, 7); ctx.fill();
      ctx.fillStyle = "#FF7A1A"; ctx.beginPath(); ctx.arc(x, y, ppm * 0.32, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(x - ppm * 0.1, y - ppm * 0.12, ppm * 0.1, ppm * 0.06, -0.5, 0, 7); ctx.fill();
    }
    if (m % 25 === 0) {
      ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff";
      ctx.fillText(m + " m", x, sy(0.02) + ppm * 0.6);
    }
  }
  // muelle de madera en la salida
  const ws = sx(0);
  if (ws > 0) {
    ctx.fillStyle = "rgba(0,30,50,0.3)"; ctx.fillRect(0, top + 6, ws + 6, ph);
    ctx.fillStyle = "#B07A45"; ctx.fillRect(0, top - 4, ws, ph + 8);
    ctx.strokeStyle = "#8A5A30"; ctx.lineWidth = 2; ctx.beginPath();
    for (let y = top; y < top + ph; y += ppm * 0.45) { ctx.moveTo(0, y); ctx.lineTo(ws, y); }
    ctx.stroke();
    ctx.save(); ctx.translate(ws - ppm * 1.6, top + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 20px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#FFE9C8"; ctx.fillText("SALIDA", 0, 0);
    ctx.restore();
  }
  // arco inflable de llegada
  const wf = sx(len);
  if (wf < W + 60) {
    ctx.fillStyle = "rgba(0,30,50,0.25)"; ctx.fillRect(wf + 6, top + 6, 30, ph);
    ctx.fillStyle = "#E8413C"; ctx.fillRect(wf, top - 8, 30, ph + 16);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(wf + 4, top - 8, 6, ph + 16);
    ctx.save(); ctx.translate(wf + 15, top + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 18px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText("★ LLEGADA ★", 0, 0);
    ctx.restore();
  }
}

function caustics(ctx, sx, sy, m0, t, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  for (let i = 0; i < 34; i++) {
    const wx = Math.floor(m0) + ((i * 7.3) % 26) - 1, wu = ((i * 0.137) % 0.9) + 0.05;
    const x = sx(wx) + Math.sin(t * 1.1 + i) * 8, y = sy(wu) + Math.cos(t * 0.9 + i * 2) * 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 10, y - 6 - Math.sin(t * 2 + i) * 3, x + 20, y + 6, x + 32, y); ctx.stroke();
  }
}
function float(ctx, x, y, col) {
  ctx.fillStyle = "rgba(0,30,70,0.22)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, 7, 5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, 7, 5.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(x - 2, y - 2, 2.5, 1.6, 0, 0, 7); ctx.fill();
}

// Parado en el partidor antes de largar: visto desde arriba, agachado, con las manos adelante.
function drawStanding(ctx, r, x, y, ppm) {
  const k = ppm * 1.4, ch = r.ch;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.ellipse(k * 0.05, k * 0.08, k * 0.32, k * 0.26, 0, 0, 7); ctx.fill();
  ctx.lineCap = "round";
  for (const s of [-1, 1]) {
    ctx.strokeStyle = shade(ch.skin, -0.08); ctx.lineWidth = k * 0.1;
    ctx.beginPath(); ctx.moveTo(0, s * k * 0.17); ctx.lineTo(k * 0.3, s * k * 0.12); ctx.stroke();
  }
  ctx.fillStyle = ch.skin; ctx.strokeStyle = "rgba(20,30,50,0.4)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-k * 0.02, 0, k * 0.16, k * 0.24, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ch.cap; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.lineWidth = r.isPlayer ? 3 : 2;
  ctx.beginPath(); ctx.arc(k * 0.14, 0, k * 0.13, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Espuma de las patadas y salpicones de los brazos; en mariposa salpica mucho más.
function stepFx(race, dt) {
  for (const r of race.racers) {
    if (r.finished || r.dive || r.stun || race.t < 0) continue;
    const flying = flyingNow(r);
    const n = dt * (flying ? 34 : 14) * Math.min(1.5, r.v / 2.4);
    for (let k = 0; k < n; k++) {
      if (k + 1 > n && Math.random() > n - k) break;
      FX.parts.push({ x: r.x - HAND - 0.9 + rnd(-0.15, 0.15), u: r.u + rnd(-0.02, 0.02), vx: -rnd(0.2, 1), vu: rnd(-0.03, 0.03), life: 0, max: rnd(0.5, 0.9), s: rnd(2, 4), top: false });
    }
    if (flying && Math.random() < dt * 9) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      FX.parts.push({ x: r.x - HAND + 0.3 + rnd(-0.2, 0.2), u: r.u + s * rnd(0.03, 0.05), vx: rnd(-0.5, 0.5), vu: s * rnd(0.05, 0.15), life: 0, max: rnd(0.35, 0.6), s: rnd(2.5, 5), top: true });
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
  if (FX.partyFor !== race) { FX.partyFor = race; FX.confetti = []; FX.parts = []; FX.streaks = []; FX.splashed = false; }
  if (p.finished && standings(race)[0] === p && race.t - p.finishT < 2.5)
    for (let k = 0; k < dt * 90; k++) FX.confetti.push({ x: rnd(0, W), y: -10, vx: rnd(-40, 40), vy: rnd(120, 260), a: rnd(0, 6), va: rnd(-8, 8), c: pick(CONFETTI) });
  for (const c of FX.confetti) {
    c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillStyle = c.c; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore();
  }
  FX.confetti = FX.confetti.filter((c) => c.y < H + 10);
}

// Aclara (k > 0) u oscurece (k < 0) un color "#rrggbb".
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), f = (c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Dónde está la mano en cada momento de la brazada (en metros, mirando hacia +x).
// De 0 a 0,6 tira por abajo del agua; de 0,6 a 1 vuelve por arriba. En mariposa el recobro es bien abierto.
// Brazo y antebrazo miden siempre lo mismo: si la mano queda más cerca, el codo se dobla hacia afuera.
const ARM = 0.3; // largo de brazo y de antebrazo
function armPose(ph, side, fly) {
  const S = { x: 0.52, y: side * 0.19 };
  let hx, hy, above;
  if (ph < 0.6) {
    const q = ph / 0.6, e = q * q * (3 - 2 * q);
    hx = 1.1 - e * 1.1; hy = side * (fly ? 0.22 + 0.16 * Math.sin(Math.PI * q) : 0.12 + 0.07 * Math.sin(Math.PI * q));
    above = false;
  } else {
    // en el aire, vista desde arriba la mano va más cerca del hombro (el brazo está levantado)
    const q = (ph - 0.6) / 0.4, lift = Math.sin(Math.PI * q);
    hx = 0.0 + q * 1.1; hy = side * (0.2 + (fly ? 0.36 : 0.1) * lift);
    hx = S.x + (hx - S.x) * (1 - 0.3 * lift); hy = S.y + (hy - S.y) * (1 - 0.3 * lift);
    above = true;
  }
  // la mano nunca más lejos que el brazo estirado
  let dx = hx - S.x, dy = hy - S.y, d = Math.hypot(dx, dy);
  if (d > ARM * 2 * 0.99) { const f = ARM * 2 * 0.99 / d; dx *= f; dy *= f; d = ARM * 2 * 0.99; }
  const H = { x: S.x + dx, y: S.y + dy };
  // codo: a mitad de camino, corrido hacia afuera lo justo para que los dos tramos midan ARM
  const h = Math.sqrt(Math.max(0, ARM * ARM - (d / 2) * (d / 2)));
  let px = -dy / d, py = dx / d;
  if (py * side < 0) { px = -px; py = -py; }
  const E = { x: S.x + dx / 2 + px * h, y: S.y + dy / 2 + py * h };
  return { S, E, H, above };
}

function drawSwimmer(ctx, r, x, y, ppm, t) {
  const ch = r.ch, k = ppm * 1.4, skin = ch.skin;
  const back = r.plancha > 0, flying = flyingNow(r), still = r.stun > 0 || back || r.finished;
  const P = (px, py) => [px * k, py * k];
  ctx.save(); ctx.translate(x, y);
  if (r.dive) ctx.globalAlpha = 0.35;
  else if (r.immune > 0 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.6;
  // estela: más larga en mariposa
  if (r.v > 0.8) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.ellipse(-k * 1.05, 0, k * (flying ? 0.7 : 0.45) * Math.min(1.6, r.v / 2.4), k * (flying ? 0.24 : 0.16), 0, 0, 7); ctx.fill();
  }
  // sombra en el fondo de la pileta
  ctx.fillStyle = "rgba(0,45,100,0.22)";
  ctx.beginPath(); ctx.ellipse(k * 0.12, k * 0.16, k * 0.95, k * 0.24, 0, 0, 7); ctx.fill();

  const rate = flying ? 1.25 : 0.95;                 // brazadas por segundo
  const base = still ? 0.15 : (t * rate + r.x * 0.07) % 1;
  const arms = [-1, 1].map((s) => armPose(still ? (back ? 0.15 : 0.05) : flying ? base : (base + (s > 0 ? 0.5 : 0)) % 1, s, flying));
  if (back) for (const a of arms) { a.E = { x: a.S.x - 0.05, y: a.S.y + Math.sign(a.S.y) * ARM }; a.H = { x: a.S.x - 0.12, y: a.S.y + Math.sign(a.S.y) * ARM * 1.95 }; a.above = true; }

  const drawArm = (a) => {
    const [sx, sy] = P(a.S.x, a.S.y), [ex, ey] = P(a.E.x, a.E.y), [hx, hy] = P(a.H.x, a.H.y);
    const thick = a.above ? 1.12 : 1;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(20,30,50,0.35)"; ctx.lineWidth = k * 0.15 * thick;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = shade(skin, -0.08); ctx.lineWidth = k * 0.12 * thick;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = k * 0.1 * thick;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
    // luz arriba del brazo
    ctx.strokeStyle = shade(skin, 0.25); ctx.lineWidth = k * 0.03;
    ctx.beginPath(); ctx.moveTo(sx, sy - k * 0.02); ctx.lineTo(ex, ey - k * 0.02); ctx.lineTo(hx, hy - k * 0.015); ctx.stroke();
    // mano
    const ang = Math.atan2(hy - ey, hx - ex);
    ctx.fillStyle = shade(skin, -0.05);
    ctx.beginPath(); ctx.ellipse(hx + Math.cos(ang) * k * 0.05, hy + Math.sin(ang) * k * 0.05, k * 0.085, k * 0.055, ang, 0, 7); ctx.fill();
    if (a.above && !back && !still) { // gotas que caen de la mano
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(hx - k * 0.05 * i, hy + k * (0.06 + 0.04 * i), k * 0.02, 0, 7); ctx.fill(); }
    }
  };
  // brazos que tiran por abajo del agua: se ven apagados
  ctx.save(); ctx.globalAlpha *= 0.55;
  for (const a of arms) if (!a.above) drawArm(a);
  ctx.restore();

  // piernas: crol patea alternado; mariposa, las dos juntas
  const kickT = t * (flying ? rate * 2 : 7) + r.x;
  for (const s of [-1, 1]) {
    const kk = still ? 0 : Math.sin(kickT + (flying || s < 0 ? 0 : Math.PI));
    const hip = P(-0.14, s * 0.085), knee = P(-0.47, s * 0.085), ankle = P(-0.8 + kk * 0.03, s * (0.07 + kk * 0.012));
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(20,30,50,0.25)"; ctx.lineWidth = k * 0.17;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...ankle); ctx.stroke();
    ctx.strokeStyle = shade(skin, -0.04); ctx.lineWidth = k * 0.15;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.stroke();
    ctx.lineWidth = k * 0.11; ctx.beginPath(); ctx.moveTo(...knee); ctx.lineTo(...ankle); ctx.stroke();
    // pie estirado hacia atrás
    ctx.fillStyle = shade(skin, -0.08);
    ctx.beginPath(); ctx.ellipse(ankle[0] - k * 0.07, ankle[1], k * (0.085 + kk * 0.015), k * 0.04, 0, 0, 7); ctx.fill();
  }
  // las piernas van más hundidas: un velo de agua encima
  const gv = ctx.createLinearGradient(-k * 0.95, 0, -k * 0.2, 0);
  gv.addColorStop(0, "rgba(41,182,238,0.4)"); gv.addColorStop(1, "rgba(41,182,238,0)");
  ctx.fillStyle = gv; ctx.fillRect(-k * 0.98, -k * 0.2, k * 0.8, k * 0.4);

  // torso: hombros anchos que se afinan hasta la cintura
  const breathe = flying ? 1 + Math.max(0, Math.sin(base * Math.PI * 2)) * 0.06 : 1;
  ctx.save(); ctx.scale(breathe, breathe);
  ctx.beginPath();
  ctx.moveTo(...P(0.66, 0));
  ctx.bezierCurveTo(...P(0.66, -0.12), ...P(0.6, -0.24), ...P(0.48, -0.24));
  ctx.bezierCurveTo(...P(0.3, -0.24), ...P(0.12, -0.16), ...P(0.02, -0.14));
  ctx.bezierCurveTo(...P(-0.1, -0.15), ...P(-0.2, -0.15), ...P(-0.24, -0.1));
  ctx.lineTo(...P(-0.24, 0.1));
  ctx.bezierCurveTo(...P(-0.2, 0.15), ...P(-0.1, 0.15), ...P(0.02, 0.14));
  ctx.bezierCurveTo(...P(0.12, 0.16), ...P(0.3, 0.24), ...P(0.48, 0.24));
  ctx.bezierCurveTo(...P(0.6, 0.24), ...P(0.66, 0.12), ...P(0.66, 0));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -k * 0.24, 0, k * 0.24);
  g.addColorStop(0, shade(skin, 0.18)); g.addColorStop(0.45, skin); g.addColorStop(1, shade(skin, -0.22));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(20,30,50,0.4)"; ctx.lineWidth = Math.max(1.5, k * 0.02); ctx.stroke();
  // omóplatos y columna
  ctx.strokeStyle = shade(skin, -0.2); ctx.lineWidth = Math.max(1, k * 0.015);
  ctx.beginPath(); ctx.moveTo(...P(0.42, 0)); ctx.lineTo(...P(0.02, 0)); ctx.stroke();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(...P(0.46, s * 0.06)); ctx.quadraticCurveTo(...P(0.36, s * 0.16), ...P(0.24, s * 0.1)); ctx.stroke(); }
  // malla
  ctx.beginPath();
  ctx.moveTo(...P(0.0, -0.14)); ctx.bezierCurveTo(...P(-0.1, -0.15), ...P(-0.2, -0.15), ...P(-0.24, -0.1));
  ctx.lineTo(...P(-0.24, 0.1)); ctx.bezierCurveTo(...P(-0.2, 0.15), ...P(-0.1, 0.15), ...P(0.0, 0.14));
  ctx.closePath();
  const gs = ctx.createLinearGradient(0, -k * 0.15, 0, k * 0.15);
  gs.addColorStop(0, shade(ch.suit, 0.3)); gs.addColorStop(0.5, ch.suit); gs.addColorStop(1, shade(ch.suit, -0.3));
  ctx.fillStyle = gs; ctx.fill(); ctx.stroke();

  // cabeza con gorra, antiparras y la ola que hace al avanzar
  const turn = !flying && !still ? Math.sin(base * Math.PI * 2) * 0.06 : 0; // en crol gira la cabeza para respirar
  const [hx, hy] = P(0.8, turn);
  if (!still && r.v > 0.8) {
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = Math.max(1.5, k * 0.03);
    ctx.beginPath(); ctx.arc(hx, hy, k * 0.19, -1.1, 1.1); ctx.stroke();
  }
  if (back) { // panza arriba: se le ve la cara
    ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(hx, hy, k * 0.14, k * 0.12, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ch.cap; ctx.beginPath(); ctx.ellipse(hx - k * 0.05, hy, k * 0.1, k * 0.12, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    ctx.fillStyle = "#2A1B14"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + k * 0.05, hy + s * k * 0.045, k * 0.015, 0, 7); ctx.fill(); }
    ctx.strokeStyle = "#2A1B14"; ctx.lineWidth = Math.max(1, k * 0.012); ctx.beginPath(); ctx.arc(hx + k * 0.07, hy, k * 0.03, -0.8, 0.8); ctx.stroke();
  } else {
    const gc = ctx.createRadialGradient(hx - k * 0.04, hy - k * 0.05, k * 0.01, hx, hy, k * 0.15);
    gc.addColorStop(0, shade(ch.cap, 0.45)); gc.addColorStop(0.6, ch.cap); gc.addColorStop(1, shade(ch.cap, -0.35));
    ctx.fillStyle = gc; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "rgba(255,255,255,0.9)"; ctx.lineWidth = r.isPlayer ? 3 : 2;
    ctx.beginPath(); ctx.ellipse(hx, hy, k * 0.16, k * 0.135, 0, 0, 7); ctx.fill(); ctx.stroke();
    // tira y vidrios de las antiparras
    ctx.strokeStyle = "rgba(20,20,30,0.8)"; ctx.lineWidth = Math.max(1, k * 0.018);
    ctx.beginPath(); ctx.ellipse(hx, hy, k * 0.11, k * 0.115, 0, -1.2, 1.2, true); ctx.stroke();
    ctx.fillStyle = "#1B2A3A";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + k * 0.11, hy + s * k * 0.05, k * 0.03, k * 0.022, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = "rgba(127,224,255,0.9)";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + k * 0.115, hy + s * k * 0.05 - k * 0.006, k * 0.009, 0, 7); ctx.fill(); }
  }
  ctx.restore();

  // brazos en el aire, por encima de todo
  for (const a of arms) if (a.above) drawArm(a);
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
  ctx.fillText(Math.min(race.len, Math.floor(p.x)) + " / " + race.len + " m", 56, 46);
  // barra de progreso con las caras de los 3
  const bx = 136, bw = W - bx - 200, by = 30;
  ctx.fillStyle = "#0005"; ctx.beginPath(); ctx.roundRect(bx, by - 4, bw, 8, 4); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw - 2, by - 10, 4, 20);
  for (const r of race.racers.slice().reverse()) drawFaceBadge(ctx, r, bx + bw * clamp(r.x / race.len, 0, 1), by, r.isPlayer ? 22 : 18, race.t);
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
  } else if (kind === "latita") {
    // lata azul y plateada con un rayo
    ctx.fillStyle = "#2F5FD0"; ctx.beginPath(); ctx.roundRect(-s * 0.42, -s * 0.8, s * 0.84, s * 1.6, s * 0.18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#C9D3DE"; ctx.fillRect(-s * 0.42, -s * 0.8, s * 0.84, s * 0.22); ctx.fillRect(-s * 0.42, s * 0.6, s * 0.84, s * 0.2);
    ctx.fillStyle = "#FFD23A"; ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.5); ctx.lineTo(-s * 0.22, s * 0.05); ctx.lineTo(0, s * 0.05); ctx.lineTo(-s * 0.1, s * 0.45); ctx.lineTo(s * 0.24, -s * 0.08); ctx.lineTo(s * 0.02, -s * 0.08); ctx.closePath(); ctx.fill();
  } else if (kind === "dulce") {
    // pote de dulce de leche: tapa blanca, frasco marrón, etiqueta
    ctx.fillStyle = "#8B5A2B"; ctx.beginPath(); ctx.roundRect(-s * 0.62, -s * 0.5, s * 1.24, s * 1.25, s * 0.25); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(-s * 0.7, -s * 0.82, s * 1.4, s * 0.38, s * 0.12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#F4E3B5"; ctx.fillRect(-s * 0.62, -s * 0.12, s * 1.24, s * 0.46);
    ctx.fillStyle = "#C0392B"; ctx.beginPath(); ctx.ellipse(0, s * 0.11, s * 0.3, s * 0.15, 0, 0, 7); ctx.fill();
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
