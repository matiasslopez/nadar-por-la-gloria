// Nadar por la gloria — todo lo que se dibuja en la pileta: agua, nadadores, objetos, tablero.
// La pileta se ve desde arriba y la carrera avanza hacia la derecha.

const POOL_TOP = 62; // alto del tablero de arriba

// Efectos que viven entre cuadros: espuma, salpicones, rayas de velocidad y papelitos.
const FX = { parts: [], streaks: [], confetti: [], lastT: null, lead: 0.32, partyFor: null };
const CONFETTI = ["#FFD84A", "#FF6FB0", "#7CFC6A", "#5FD0F5", "#FF8A2A", "#fff"];
const flyingNow = (r) => r.fly && r.air > 0 && !r.plancha && !r.stun;
const pechoNow = (r) => r.pecho && !flyingNow(r) && !r.breathing && !r.plancha && !r.stun && !r.walk && !r.dive;

// Dónde se dibuja cada nadador: r.x es la punta de la mano, así al llegar la mano toca la pared.
const HAND = 1.5;
const LANES = [1 / 6, 0.5, 5 / 6];

function render(ctx, race, W, H) {
  const top = POOL_TOP, ph = H - top - 8;
  const ppm = Math.max(26, W / 22);                 // píxeles por metro
  const p = race ? race.racers[0] : { x: 0 };
  const t = race ? race.t : performance.now() / 1000;
  const len = race ? race.pool : 50, open = race && race.circ.open; // len: largo de la pileta
  const dt = FX.lastT === null ? 0 : clamp(t - FX.lastT, 0, 0.05); FX.lastT = t;
  // en mariposa la cámara se adelanta un poco, para que se sienta el tirón
  const lead = race && flyingNow(p) ? 0.26 : 0.32;
  FX.lead += (lead - FX.lead) * Math.min(1, dt * 3);
  // la cámara sigue al jugador para el lado que nade; después de cada vuelta se da vuelta despacio
  const dir = race ? p.dir : 1, hp = race && !p.onBlock ? Math.max(0, p.pp - dir * HAND) : 0;
  const want = hp - (dir > 0 ? W * FX.lead : W * (1 - FX.lead)) / ppm + dir;
  if (FX.camFor !== race) { FX.camFor = race; FX.cam = want; }
  FX.cam += (want - FX.cam) * Math.min(1, dt * 4);
  const camX = FX.cam;
  const sx = (x) => (x - camX) * ppm, sy = (u) => top + u * ph;
  const m0 = Math.floor(camX), m1 = camX + W / ppm + 1;

  if (open) drawRiver(ctx, race, W, H, top, ph, sx, sy, m0, m1, t, ppm);
  else drawPool(ctx, len, W, H, top, ph, sx, sy, m0, m1, t, ppm, race && race.laps > 1);
  // la hinchada se entusiasma en la largada y cuando alguien está por llegar
  const near = race ? Math.max(...race.racers.map((r) => r.x)) / race.len : 0;
  const hype = !race ? 0.4 : race.t < 1 ? 1 : 0.35 + Math.max(0, near - 0.75) * 2.6;
  drawStands(ctx, sx(-14), sx(-2.2), top, ph, ppm, t, hype, 1);
  drawStands(ctx, sx(len) + (open ? 45 : 100), sx(len + 16), top, ph, ppm, t, hype, 2);

  if (!race) return;
  const myLap = poolAt(race, p.x).lap; // solo se ven los objetos del largo que estás nadando
  for (const o of race.objs) {
    if (o.gone) continue;
    const oa = poolAt(race, o.x); if (oa.lap !== myLap) continue;
    const x = sx(oa.p), y = sy(o.u); if (x < -40 || x > W + 40) continue;
    const bob = Math.sin(t * 3 + o.x) * 2;
    ctx.fillStyle = "rgba(0,40,90,0.22)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, ppm * 0.5, ppm * 0.3, 0, 0, 7); ctx.fill();
    drawItem(ctx, o.kind, x, y + bob, ppm * 0.5);
  }
  // las boyas fijas: una fila de pared a pared, con el hueco marcado por dos boyas a rayas
  for (const g of race.buoys) {
    const ga = poolAt(race, g.x); if (ga.lap !== myLap) continue;
    const x = sx(ga.p); if (x < -40 || x > W + 40) continue;
    const r0 = ppm * 0.22;
    ctx.strokeStyle = "rgba(255,122,26,0.7)"; ctx.lineWidth = Math.max(2, ppm * 0.08); // la soga que une las boyas
    for (const [a, b] of [[0.03, g.u - BUOY_GAP], [g.u + BUOY_GAP, 0.97]]) if (b > a) { ctx.beginPath(); ctx.moveTo(x, sy(a)); ctx.lineTo(x, sy(b)); ctx.stroke(); }
    if (g === race.buoys[p.gate]) { // el hueco de la próxima fila del jugador brilla
      ctx.fillStyle = `rgba(124,252,106,${(0.25 + Math.sin(t * 8) * 0.1).toFixed(2)})`;
      ctx.fillRect(x - r0, sy(g.u - BUOY_GAP), r0 * 2, sy(g.u + BUOY_GAP) - sy(g.u - BUOY_GAP));
    }
    for (let u = 0.05; u < 0.96; u += 0.06) {
      if (Math.abs(u - g.u) < BUOY_GAP + 0.02) continue;
      const y = sy(u) + Math.sin(t * 3 + u * 9 + g.x) * 1.5;
      ctx.fillStyle = "rgba(0,40,90,0.25)"; ctx.beginPath(); ctx.ellipse(x + 3, y + 4, r0, r0 * 0.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#FF7A1A"; ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.arc(x - r0 * 0.3, y - r0 * 0.3, r0 * 0.3, 0, 7); ctx.fill();
    }
    for (const s2 of [-1, 1]) { // las dos del hueco, a rayas blancas y rojas
      const y = sy(g.u + s2 * (BUOY_GAP + 0.02)), r1 = r0 * 1.35;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r1, 0, 7); ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = "#E23B3B"; ctx.fillRect(x - r1, y - r1 * 0.33, r1 * 2, r1 * 0.66); ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, r1, 0, 7); ctx.stroke();
    }
  }
  // la largada: parados en el partidor (o en el muelle) y después el salto al agua; en cada vuelta, un salpicón en la pared
  const block = -0.7, diveT = 0.35;
  for (const r of race.racers) if (r.push && r.push !== r.fxPush) {
    r.fxPush = r.push;
    const x0 = r.push.kind === "SALIDA" ? 0.6 + 2.5 * r.push.q * 0.5 : r.dir > 0 ? 0.3 : len - 0.3;
    for (let k = 0; k < (r.push.kind === "SALIDA" ? 26 : 18); k++) {
      const a = rnd(0, 7), v = rnd(0.4, 1.4);
      FX.parts.push({ x: x0 + Math.cos(a) * 0.2, u: r.u + Math.sin(a) * 0.02, vx: Math.cos(a) * v, vu: Math.sin(a) * v * 0.08, life: 0, max: rnd(0.5, 0.9), s: rnd(3, 6), top: true });
    }
  }
  stepFx(race, dt);
  drawParts(ctx, sx, sy, false);
  const pos = (r) => r.pp - r.dir * HAND; // centro del cuerpo: la mano va adelante
  for (const r of race.racers) {
    const diving = r.push && r.push.kind === "SALIDA" && race.t - r.push.t < diveT;
    if (r.onBlock) drawStanding(ctx, r, sx(block), sy(r.u), ppm);
    else if (r.finished) {
      ctx.save(); ctx.translate(sx(r.pp), sy(r.u)); if (r.dir < 0) ctx.scale(-1, 1);
      drawAtWall(ctx, r, ppm, t, race.t - r.finishT, standings(race)[0] === r); ctx.restore();
    }
    else if (diving) {
      const q = (race.t - r.push.t) / diveT, k = 1 + Math.sin(Math.PI * q) * 0.25;
      ctx.save(); ctx.translate(sx(block + (pos(r) - block) * q), sy(r.u)); ctx.scale(k, k);
      drawSwimmer(ctx, { ...r, stun: 1, v: 0 }, 0, 0, ppm, t); ctx.restore();
    } else {
      ctx.save(); ctx.translate(sx(pos(r)), sy(r.u)); if (r.dir < 0) ctx.scale(-1, 1); // de vuelta nada para la izquierda
      if (r.walk > 0) drawWalker(ctx, r, 0, 0, ppm, t); else drawSwimmer(ctx, r, 0, 0, ppm, t);
      ctx.restore();
    }
    // el objeto que se le terminó queda flotando atrás
    if (r.drop && race.t - r.drop.t < 1.6) {
      const q = (race.t - r.drop.t) / 1.6, da = poolAt(race, r.drop.x);
      ctx.save(); ctx.globalAlpha = 1 - q; ctx.translate(sx(da.p - da.dir * (HAND + 0.4)), sy(r.drop.u + q * 0.05)); ctx.rotate(q * 3);
      drawItem(ctx, r.drop.kind, 0, 0, ppm * 0.4); ctx.restore();
    }
  }
  drawParts(ctx, sx, sy, true);
  for (const r of race.racers) drawTags(ctx, r, sx(r.onBlock ? 1.2 : pos(r)), sy(r.u), ppm, t, top); // antes de largar, las caras al lado del partidor
  drawPushBar(ctx, race, p, sx(p.onBlock ? 1.2 : pos(p)), sy(p.u), ppm, t, W, H);
  drawStreaks(ctx, race, W, H, dt);
  drawConfetti(ctx, race, W, H, dt);
  if (p.air < 0.25 && !p.breathing && !p.finished && race.t > 0) { // el borde titila cuando queda poco aire
    const a = 0.6 + Math.sin(t * 16) * 0.2, e = Math.min(W, H) * 0.22;
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, e, 0, 0, top, e, H], [W, 0, W - e, 0, W - e, top, e, H], [0, H, 0, H - e, 0, H - e, W, e]]) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, `rgba(255,70,50,${(a * 0.7).toFixed(2)})`); g.addColorStop(1, "rgba(255,70,50,0)");
      ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    }
    ctx.strokeStyle = Math.floor(t * 8) % 2 ? "#fff" : "#FF4A3A"; ctx.lineWidth = 6;
    ctx.strokeRect(3, top + 3, W - 6, H - top - 6);
  }
}

// Pileta: baldosas, corcheras, partidores en la salida y placas para tocar en la llegada.
function drawPool(ctx, len, W, H, top, ph, sx, sy, m0, m1, t, ppm, turns) {
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
    g.addColorStop(0, "#0F86C9"); g.addColorStop(0.18, "#1FA9E4"); g.addColorStop(0.5, "#3CC4F0"); g.addColorStop(0.82, "#1FA9E4"); g.addColorStop(1, "#0F86C9");
    ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, ph);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let m = Math.max(0, m0); m < m1; m++) { ctx.moveTo(sx(m), top); ctx.lineTo(sx(m), top + ph); }
    for (let k = 1; k < 12; k++) { ctx.moveTo(x0, top + ph * k / 12); ctx.lineTo(x1, top + ph * k / 12); }
    ctx.stroke();
    causticLight(ctx, sx, x0, top, x1 - x0, ph, t, ppm, 0.3);
    // el globo de HSJ pintado en el fondo, en la mitad de la pileta
    if (HSJ_LOGO.complete && HSJ_LOGO.naturalWidth) {
      const lh = ph * 0.26, lw = lh / HSJ_LOGO_H;
      for (const u of [1 / 6, 5 / 6]) {
        const lx = sx(len / 2) - lw / 2, ly = sy(u) - lh / 2; if (lx < -lw || lx > W) continue;
        ctx.save(); ctx.globalAlpha = 0.65; ctx.drawImage(HSJ_LOGO, lx, ly, lw, lh); ctx.restore();
      }
    }
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
    glints(ctx, sx, sy, m0, m1, t);
    // marcas cada 10 m
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let m = 10; m < len; m += 10) {
      const x = sx(m); if (x < -20 || x > W + 20) continue;
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 1, top, 2, ph);
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillText(m + " m", x, top + ph - 12);
    }
    ctx.restore();
  }
  // bordes del agua: canaleta con sombra hacia adentro
  if (x1 > x0) {
    for (const [y, d] of [[top, 1], [top + ph, -1]]) {
      const gs = ctx.createLinearGradient(0, y, 0, y + d * 16);
      gs.addColorStop(0, "rgba(0,40,90,0.35)"); gs.addColorStop(1, "rgba(0,40,90,0)");
      ctx.fillStyle = gs; ctx.fillRect(x0, d > 0 ? y : y - 16, x1 - x0, 16);
    }
    ctx.fillStyle = "#fff"; ctx.fillRect(x0, top - 5, x1 - x0, 5); ctx.fillRect(x0, top + ph, x1 - x0, 5);
    ctx.fillStyle = "#C9D6E2"; ctx.fillRect(x0, top - 1, x1 - x0, 1); ctx.fillRect(x0, top + ph + 4, x1 - x0, 1);
  }
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
    ctx.font = "bold 20px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#2F6FE0"; ctx.fillText(turns ? "SALIDA Y LLEGADA" : "SALIDA", 0, 0);
    ctx.restore();
    if (turns) for (const u of LANES) { ctx.fillStyle = "#FFD23A"; ctx.fillRect(ws - 2, sy(u) - ph / 6 + 8, 6, ph / 3 - 16); } // placas para tocar al llegar
  }
  // pared de llegada: placas amarillas para tocar, y el cartel
  const wf = sx(len);
  if (wf < W + 40) {
    ctx.fillStyle = "#DCE3EA"; ctx.fillRect(wf, top - 4, 10, ph + 8);
    for (const u of LANES) { ctx.fillStyle = "#FFD23A"; ctx.fillRect(wf - 4, sy(u) - ph / 6 + 8, 6, ph / 3 - 16); }
    if (!turns) for (let i = 0; i < ph / 12; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff"; ctx.fillRect(wf + 18 + j * 12, top + i * 12, 12, Math.min(12, ph - i * 12));
    }
    ctx.save(); ctx.translate(wf + 70, top + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = "bold 22px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = turns ? "#2F6FE0" : "#E8413C"; ctx.fillText(turns ? "VUELTA ↺" : "LLEGADA", 0, 0);
    ctx.restore();
  }
}

// Aguas abiertas: río verdoso, boyas naranjas, muelle de salida y arco inflable de llegada.
function drawRiver(ctx, race, W, H, top, ph, sx, sy, m0, m1, t, ppm) {
  const len = race.len;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1C8CA6"); g.addColorStop(0.5, "#2AA5B5"); g.addColorStop(1, "#1C8CA6");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  causticLight(ctx, sx, 0, top, W, ph, t, ppm, 0.18);
  // olitas
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let i = 0; i < 40; i++) {
    const wx = Math.floor(m0) + ((i * 5.7) % 24) - 1, wu = ((i * 0.173) % 1);
    const x = sx(wx) + Math.sin(t * 1.4 + i) * 6, y = top + wu * ph;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 5, x + 18, y); ctx.quadraticCurveTo(x + 27, y + 5, x + 36, y); ctx.stroke();
  }
  // la corriente: flechitas que se mueven hacia donde empuja
  if (race.against > 0.01) { // de frente: flechitas que van para atrás
    ctx.strokeStyle = "rgba(220,255,250,0.45)"; ctx.lineWidth = 2;
    const sp = race.against / race.circ.against;
    for (let i = 0; i < 22; i++) {
      const base = ((((i * 0.37) - t * 0.35 * sp) % 1) + 1) % 1, x = sx(Math.floor(m0) - 2 + base * 26), y = top + ((i * 0.193) % 1) * ph, L = 20 * sp;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - L, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - L + 6, y - 4); ctx.lineTo(x - L, y); ctx.lineTo(x - L + 6, y + 4); ctx.stroke();
    }
  }
  if (Math.abs(race.cur) > 0.005) {
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

// Luz del sol que se mueve en el fondo: una red de líneas claras (como en una pileta de verdad).
// Se dibuja una sola vez en una baldosa que se repite, y en cada cuadro se mueven dos capas.
let CAUSTIC = null;
function causticTile() {
  if (CAUSTIC) return CAUSTIC;
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"), img = x.createImageData(S, S), pts = [];
  let seed = 7; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 26; i++) pts.push([rr() * S, rr() * S]);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    let f1 = 1e9, f2 = 1e9;
    for (const [qx, qy] of pts) {
      let dx = Math.abs(px - qx), dy = Math.abs(py - qy); if (dx > S / 2) dx = S - dx; if (dy > S / 2) dy = S - dy;
      const d = dx * dx + dy * dy; if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    const e = Math.sqrt(f2) - Math.sqrt(f1), v = Math.max(0, 1 - e / 5);
    const i = (py * S + px) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(v * v * 255);
  }
  x.putImageData(img, 0, 0);
  return CAUSTIC = { c, pat: null };
}
function causticLight(ctx, sx, x, y, w, h, t, ppm, alpha) {
  const tile = causticTile();
  if (!tile.pat) tile.pat = ctx.createPattern(tile.c, "repeat");
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (const [sc, vx, vy, a] of [[ppm / 42, 0.3, 0.2, 1], [ppm / 34, -0.24, 0.27, 0.6]]) { // dos capas que se cruzan: la luz titila
    tile.pat.setTransform(new DOMMatrix().translate(sx(0) + t * vx * ppm, y + t * vy * ppm).scale(sc));
    ctx.globalAlpha = alpha * a; ctx.fillStyle = tile.pat; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
// Brillitos que titilan en la superficie, fijos en la pileta (se van con la cámara).
function glints(ctx, sx, sy, m0, m1, t) {
  ctx.save(); ctx.fillStyle = "#fff";
  for (let m = Math.floor(m0); m < m1; m++) for (let j = 0; j < 3; j++) {
    const n = m * 7 + j, a = Math.sin(t * (2 + hash(n) * 3) + n * 3);
    if (a < 0.75) continue;
    const x = sx(m + hash(n + 1)), y = sy(0.04 + hash(n + 2) * 0.92), s = (a - 0.75) * 4 * (2 + hash(n + 3) * 2);
    ctx.globalAlpha = (a - 0.75) * 3;
    ctx.beginPath(); ctx.moveTo(x - s * 2, y); ctx.lineTo(x, y - s * 0.5); ctx.lineTo(x + s * 2, y); ctx.lineTo(x, y + s * 0.5); ctx.fill();
  }
  ctx.restore();
}

// Ya llegó: parado en el agua contra la pared, con los antebrazos apoyados en el borde y la cabeza afuera.
// x = 0 es la pared; el agua queda hacia la izquierda. El que ganó saluda con un brazo para arriba.
function drawAtWall(ctx, r, ppm, t, since, won) {
  const ch = r.ch, k = ppm * 1.4, skin = ch.skin;
  // ondas que salen del nadador
  for (let i = 0; i < 3; i++) {
    const q = ((t * 0.7 + i / 3) % 1), R = k * (0.3 + q * 0.9);
    ctx.strokeStyle = `rgba(255,255,255,${(0.5 * (1 - q)).toFixed(2)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-k * 0.3, 0, R, R * 0.8, 0, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  }
  // el cuerpo, abajo del agua y parado: se ve apagado
  ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = shade(ch.suit, -0.1);
  ctx.beginPath(); ctx.ellipse(-k * 0.42, 0, k * 0.2, k * 0.17, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shade(skin, -0.2);
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-k * 0.62 + Math.sin(t * 3 + s) * k * 0.03, s * k * 0.08, k * 0.16, k * 0.05, 0, 0, 7); ctx.fill(); }
  ctx.restore();
  // brazos: apoyados en el borde (el que ganó levanta uno y lo agita)
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const s of [-1, 1]) {
    const up = won && s < 0 && since < 6, sh = [-k * 0.22, s * k * 0.2];
    let el = [k * 0.1, s * k * 0.34], ha = [k * 0.32, s * k * 0.16];
    if (up) { const w = Math.sin(t * 12) * k * 0.08; el = [-k * 0.18, s * k * 0.42]; ha = [-k * 0.08 + w, s * k * 0.6]; }
    ctx.strokeStyle = "rgba(20,30,50,0.35)"; ctx.lineWidth = k * 0.15;
    ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...el); ctx.lineTo(...ha); ctx.stroke();
    ctx.strokeStyle = shade(skin, -0.06); ctx.lineWidth = k * 0.115;
    ctx.beginPath(); ctx.moveTo(...sh); ctx.lineTo(...el); ctx.lineTo(...ha); ctx.stroke();
    ctx.fillStyle = shade(skin, -0.03); ctx.beginPath(); ctx.arc(ha[0], ha[1], k * 0.075, 0, 7); ctx.fill();
    if (up) { // rayitas de festejo al lado de la mano
      ctx.strokeStyle = "#FFD84A"; ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i++) { const a = s * (Math.PI / 2) + i * 0.6; ctx.beginPath(); ctx.moveTo(ha[0] + Math.cos(a) * k * 0.13, ha[1] + Math.sin(a) * k * 0.13); ctx.lineTo(ha[0] + Math.cos(a) * k * 0.24, ha[1] + Math.sin(a) * k * 0.24); ctx.stroke(); }
    }
  }
  // hombros con la línea del agua
  ctx.fillStyle = skin; ctx.strokeStyle = "rgba(20,30,50,0.4)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-k * 0.25, 0, k * 0.13, k * 0.27, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(-k * 0.25, 0, k * 0.2, k * 0.33, 0, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke();
  // cabeza con gorra, mirando la pared, y las antiparras subidas a la frente
  const hx = -k * 0.2, hy = Math.sin(t * 2.2) * k * 0.01;
  const gc = ctx.createRadialGradient(hx - k * 0.04, hy - k * 0.05, k * 0.01, hx, hy, k * 0.16);
  gc.addColorStop(0, shade(ch.cap, 0.45)); gc.addColorStop(0.6, ch.cap); gc.addColorStop(1, shade(ch.cap, -0.35));
  ctx.fillStyle = gc; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "rgba(255,255,255,0.9)"; ctx.lineWidth = r.isPlayer ? 3 : 2;
  ctx.beginPath(); ctx.ellipse(hx, hy, k * 0.15, k * 0.14, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1B2A3A";
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + k * 0.02, hy + s * k * 0.055, k * 0.03, k * 0.024, 0, 0, 7); ctx.fill(); }
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
    if (r.finished || r.stun || r.onBlock || race.t < 0) continue;
    const flying = flyingNow(r), d = r.dir, at = (off) => r.pp + d * (off - HAND); // off: metros desde la mano hacia adelante
    const n = dt * (flying ? 34 : 14) * Math.min(1.5, r.v / 2.4);
    for (let k = 0; k < n; k++) {
      if (k + 1 > n && Math.random() > n - k) break;
      FX.parts.push({ x: at(-0.9 + rnd(-0.15, 0.15)), u: r.u + rnd(-0.02, 0.02), vx: -d * rnd(0.2, 1), vu: rnd(-0.03, 0.03), life: 0, max: rnd(0.5, 0.9), s: rnd(2, 4), top: false });
    }
    if (r.breathing) for (let k = 0; k < dt * 25; k++) // respirando: saca la cabeza y salpica al costado
      FX.parts.push({ x: at(1.1 + rnd(-0.2, 0.2)), u: r.u + rnd(0.02, 0.06), vx: d * rnd(-0.5, 0.3), vu: rnd(0.02, 0.08), life: 0, max: rnd(0.3, 0.6), s: rnd(2, 4), top: true });
    if (r.dive) for (let k = 0; k < dt * 40; k++) // burbujas del que va por abajo del agua
      FX.parts.push({ x: at(rnd(-0.6, 0.9)), u: r.u + rnd(-0.03, 0.03), vx: d * rnd(-0.3, 0.1), vu: rnd(-0.02, 0.02), life: 0, max: rnd(0.4, 0.8), s: rnd(1.5, 3.5), top: true });
    if (r.lunge > 0) for (let k = 0; k < dt * 80; k++) // Facu tirándose encima
      FX.parts.push({ x: at(rnd(-1, 1)), u: r.u + rnd(-0.04, 0.04), vx: -d * rnd(2, 4), vu: rnd(-0.1, 0.1), life: 0, max: rnd(0.3, 0.5), s: rnd(3, 6), top: true });
    if (flying && Math.random() < dt * 9) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      FX.parts.push({ x: at(0.3 + rnd(-0.2, 0.2)), u: r.u + s * rnd(0.03, 0.05), vx: rnd(-0.5, 0.5), vu: s * rnd(0.05, 0.15), life: 0, max: rnd(0.35, 0.6), s: rnd(2.5, 5), top: true });
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
  if (fast) for (let k = 0; k < dt * 70; k++) FX.streaks.push({ x: p.dir > 0 ? W + rnd(0, 60) : -rnd(120, 180), y: rnd(POOL_TOP + 10, H - 10), len: rnd(40, 120), v: rnd(900, 1500), d: p.dir });
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3; ctx.lineCap = "round";
  for (const s of FX.streaks) {
    s.x -= s.v * dt * s.d;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); ctx.stroke();
  }
  ctx.restore();
  FX.streaks = FX.streaks.filter((s) => s.d > 0 ? s.x + s.len > 0 : s.x < W);
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

// Pecho: las dos manos salen juntas adelante, abren hacia los costados y vuelven al pecho.
function pechoPose(ph, side) {
  let hx, hy;
  if (ph < 0.45) { const q = ph / 0.45; hx = 1.08 - q * 0.3; hy = 0.05 + q * 0.3; }       // abre
  else if (ph < 0.7) { const q = (ph - 0.45) / 0.25; hx = 0.78 - q * 0.18; hy = 0.35 - q * 0.27; } // junta al pecho
  else { const q = (ph - 0.7) / 0.3; hx = 0.6 + q * 0.48; hy = 0.08 - q * 0.03; }           // estira adelante
  const a = armPose(0, side, false);
  let dx = hx - a.S.x, dy = side * hy - a.S.y, d = Math.hypot(dx, dy);
  if (d > ARM * 2 * 0.99) { const f = ARM * 2 * 0.99 / d; dx *= f; dy *= f; d = ARM * 2 * 0.99; }
  const H = { x: a.S.x + dx, y: a.S.y + dy }, h = Math.sqrt(Math.max(0, ARM * ARM - (d / 2) * (d / 2)));
  let px = -dy / d, py = dx / d; if (py * side < 0) { px = -px; py = -py; }
  return { S: a.S, E: { x: a.S.x + dx / 2 + px * h, y: a.S.y + dy / 2 + py * h }, H, above: true };
}

function drawSwimmer(ctx, r, x, y, ppm, t) {
  const ch = r.ch, k = ppm * 1.4, skin = ch.skin;
  const back = r.plancha > 0, flying = flyingNow(r), still = r.stun > 0 || back || r.finished, pecho = pechoNow(r) && !still;
  const P = (px, py) => [px * k, py * k];
  ctx.save(); ctx.translate(x, y);
  if (r.dive) { ctx.globalAlpha = 0.45; ctx.filter = "brightness(0.55) saturate(0.6)"; }
  else if (r.immune > 0 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.6;
  // estela: más larga en mariposa
  if (r.v > 0.8) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.ellipse(-k * 1.05, 0, k * (flying ? 0.7 : 0.45) * Math.min(1.6, r.v / 2.4), k * (flying ? 0.24 : 0.16), 0, 0, 7); ctx.fill();
  }
  if (r.objT > 0 && r.objKind) {
    const good = ITEMS[r.objKind].good, pul = 0.75 + Math.sin(t * 12) * 0.25;
    const gl = ctx.createRadialGradient(k * 0.2, 0, k * 0.2, k * 0.2, 0, k * 1.2);
    gl.addColorStop(0, good ? `rgba(124,252,106,${(0.55 * pul).toFixed(2)})` : `rgba(255,80,60,${(0.5 * pul).toFixed(2)})`);
    gl.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(k * 0.2, 0, k * 1.25, k * 0.55, 0, 0, 7); ctx.fill();
  }
  if (r.v > 1 && !r.dive) { // la V que abre el agua detrás de la cabeza
    const sp = Math.min(1.4, r.v / 2.6), wob = Math.sin(t * 9) * k * 0.02;
    ctx.strokeStyle = `rgba(255,255,255,${(0.28 * sp).toFixed(2)})`; ctx.lineWidth = Math.max(1.5, k * 0.035); ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(k * 0.85, s * k * 0.1);
      ctx.quadraticCurveTo(k * 0.1, s * (k * 0.32 + wob), -k * 1.5 * sp, s * k * 0.62 * sp); ctx.stroke();
    }
  }
  // sombra en el fondo de la pileta
  ctx.fillStyle = "rgba(0,45,100,0.22)";
  ctx.beginPath(); ctx.ellipse(k * 0.12, k * 0.16, k * 0.95, k * 0.24, 0, 0, 7); ctx.fill();

  const wear = r.objT > 0 ? r.objKind : null;
  const board = wear === "tablita" || r.drill === "kick", buoy = r.drill === "pull"; // solo patada: con tabla · solo brazada: con pullbuoy
  if (wear === "paracaidas") { // va arrastrando el paracaídas atrás de los pies
    const [px, py] = P(-1.55, 0), bil = 1 + Math.sin(t * 9) * 0.07;
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5;
    for (const s of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(...P(-0.2, 0)); ctx.lineTo(px + k * 0.08, py + s * k * 0.3 * bil); ctx.stroke(); }
    ctx.fillStyle = "#E23B3B"; ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(px, py, k * 0.22, k * 0.36 * bil, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(px, py, k * 0.1, k * 0.36 * bil, 0, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  }
  const rate = (flying ? 1.25 : pecho ? 0.8 : 0.95) * (1 - 2.5 * tiredLoss(r));   // brazadas por segundo (cansado, bracea más lento)
  const base = still ? 0.15 : (t * rate + r.x * 0.07) % 1;
  const arms = [-1, 1].map((s) => pecho ? pechoPose(base, s) : armPose(still ? (back ? 0.15 : 0.05) : flying ? base : (base + (s > 0 ? 0.5 : 0)) % 1, s, flying));
  if (back) for (const a of arms) { a.E = { x: a.S.x - 0.05, y: a.S.y + Math.sign(a.S.y) * ARM }; a.H = { x: a.S.x - 0.12, y: a.S.y + Math.sign(a.S.y) * ARM * 1.95 }; a.above = true; }
  if (board) for (const a of arms) { // con la tablita: brazos estirados adelante, agarrándola
    const sd = Math.sign(a.S.y); a.H = { x: 1.08, y: sd * 0.12 }; a.E = { x: 0.8, y: sd * 0.17 }; a.above = true;
  }

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
    if (wear === "manoplas") { // manoplas naranjas en las manos
      ctx.save(); ctx.translate(hx + Math.cos(ang) * k * 0.07, hy + Math.sin(ang) * k * 0.07); ctx.rotate(ang);
      ctx.fillStyle = "#FF8A2A"; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-k * 0.11, -k * 0.08, k * 0.22, k * 0.16, k * 0.05); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
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
  const kickT = pecho ? 0 : t * (flying ? rate * 2 : 7) + r.x;
  for (const s of [-1, 1]) {
    const kk = still || buoy ? 0 : Math.sin(kickT + (flying || s < 0 ? 0 : Math.PI)); // con pullbuoy las piernas van quietas
    // pecho: patada de rana, las rodillas abren y las piernas se juntan con fuerza
    const frog = pecho && !buoy ? Math.max(0, Math.sin((base - 0.35) * Math.PI * 2)) : 0;
    const hip = P(-0.14, s * 0.085), knee = P(-0.45 + frog * 0.1, s * (0.085 + frog * 0.2)), ankle = P(-0.8 + kk * 0.03 + frog * 0.2, s * (0.07 + kk * 0.012 + frog * 0.14));
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(20,30,50,0.25)"; ctx.lineWidth = k * 0.17;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.lineTo(...ankle); ctx.stroke();
    ctx.strokeStyle = shade(skin, -0.04); ctx.lineWidth = k * 0.15;
    ctx.beginPath(); ctx.moveTo(...hip); ctx.lineTo(...knee); ctx.stroke();
    ctx.lineWidth = k * 0.11; ctx.beginPath(); ctx.moveTo(...knee); ctx.lineTo(...ankle); ctx.stroke();
    // pie estirado hacia atrás
    ctx.fillStyle = shade(skin, -0.08);
    ctx.beginPath(); ctx.ellipse(ankle[0] - k * 0.07, ankle[1], k * (0.085 + kk * 0.015), k * 0.04, 0, 0, 7); ctx.fill();
    if (wear === "patas") { // patas de rana amarillas que aletean
      const fx = ankle[0] - k * 0.05, fy = ankle[1], fl = k * (0.42 + kk * 0.05), fw = k * (0.13 + kk * 0.03);
      ctx.fillStyle = "#FFD23A"; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx + k * 0.04, fy - k * 0.04); ctx.lineTo(fx - fl, fy - fw + s * k * 0.03); ctx.lineTo(fx - fl * 0.9, fy + s * 0.01 * k); ctx.lineTo(fx - fl, fy + fw + s * k * 0.03); ctx.lineTo(fx + k * 0.04, fy + k * 0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  if (buoy) { // el pullbuoy entre los muslos
    const [bx, by] = P(-0.36, 0);
    ctx.fillStyle = "#FFD23A"; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.5;
    for (const dx of [-0.06, 0.06]) { ctx.beginPath(); ctx.ellipse(bx + dx * k, by, k * 0.08, k * 0.13, 0, 0, 7); ctx.fill(); ctx.stroke(); }
  }
  // las piernas van más hundidas: un velo de agua encima
  const gv = ctx.createLinearGradient(-k * 0.95, 0, -k * 0.2, 0);
  gv.addColorStop(0, "rgba(41,182,238,0.4)"); gv.addColorStop(1, "rgba(41,182,238,0)");
  ctx.fillStyle = gv; ctx.fillRect(-k * 0.98, -k * 0.2, k * 0.8, k * 0.4);

  // torso: hombros anchos que se afinan hasta la cintura
  const breathe = flying ? 1 + Math.max(0, Math.sin(base * Math.PI * 2)) * 0.06 : 1;
  ctx.save(); ctx.scale(breathe, breathe);
  const torso = () => {
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
  };
  torso();
  const g = ctx.createLinearGradient(0, -k * 0.24, 0, k * 0.24);
  g.addColorStop(0, shade(skin, 0.18)); g.addColorStop(0.45, skin); g.addColorStop(1, shade(skin, -0.22));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(20,30,50,0.4)"; ctx.lineWidth = Math.max(1.5, k * 0.02); ctx.stroke();
  // omóplatos y columna
  ctx.strokeStyle = shade(skin, -0.2); ctx.lineWidth = Math.max(1, k * 0.015);
  ctx.beginPath(); ctx.moveTo(...P(0.42, 0)); ctx.lineTo(...P(0.02, 0)); ctx.stroke();
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(...P(0.46, s * 0.06)); ctx.quadraticCurveTo(...P(0.36, s * 0.16), ...P(0.24, s * 0.1)); ctx.stroke(); }
  // malla: ellos, slip; ellas, enteriza con la espalda abierta en U y tiras cruzadas atrás
  const gs = ctx.createLinearGradient(0, -k * 0.24, 0, k * 0.24);
  gs.addColorStop(0, shade(ch.suit, 0.3)); gs.addColorStop(0.5, ch.suit); gs.addColorStop(1, shade(ch.suit, -0.3));
  if (ch.fem) {
    ctx.save(); torso(); ctx.clip();
    ctx.beginPath();
    ctx.moveTo(...P(-0.3, -0.3)); ctx.lineTo(...P(0.42, -0.3)); ctx.lineTo(...P(0.42, -0.19));
    ctx.bezierCurveTo(...P(0.3, -0.17), ...P(0.15, -0.1), ...P(0.15, 0)); // la U de la espalda
    ctx.bezierCurveTo(...P(0.15, 0.1), ...P(0.3, 0.17), ...P(0.42, 0.19));
    ctx.lineTo(...P(0.42, 0.3)); ctx.lineTo(...P(-0.3, 0.3)); ctx.closePath();
    ctx.fillStyle = gs; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(ch.suit, -0.1); ctx.lineWidth = k * 0.045; ctx.lineCap = "round";
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(...P(0.3, s * 0.2)); ctx.lineTo(...P(0.52, -s * 0.1)); ctx.stroke(); }
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(...P(0.0, -0.14)); ctx.bezierCurveTo(...P(-0.1, -0.15), ...P(-0.2, -0.15), ...P(-0.24, -0.1));
    ctx.lineTo(...P(-0.24, 0.1)); ctx.bezierCurveTo(...P(-0.2, 0.15), ...P(-0.1, 0.15), ...P(0.0, 0.14));
    ctx.closePath();
    ctx.fillStyle = gs; ctx.fill(); ctx.stroke();
  }

  // cabeza con gorra, antiparras y la ola que hace al avanzar
  const turn = r.breathing && !still ? 0.09 : !flying && !still ? Math.sin(base * Math.PI * 2) * 0.03 : 0; // gira la cabeza para respirar
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
    for (const s of [-1, 1]) { ctx.fillStyle = shade(skin, -0.12); ctx.beginPath(); ctx.ellipse(hx + k * 0.02, hy + s * k * 0.135, k * 0.035, k * 0.02, 0, 0, 7); ctx.fill(); } // las orejas
  }
  ctx.restore();

  if (board) { // la tablita adelante
    const [bx, by] = P(1.28, 0);
    ctx.fillStyle = "#3A6FE0"; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx - k * 0.2, by - k * 0.26, k * 0.4, k * 0.52, [k * 0.04, k * 0.2, k * 0.2, k * 0.04]); ctx.fill(); ctx.stroke();
  }
  if (wear === "latita" || wear === "dulce") { // rayitos de energía (o brillitos dorados) alrededor
    ctx.strokeStyle = wear === "latita" ? "#FFE14D" : "#FFB347"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      if ((Math.floor(t * 12) + i) % 3 === 0) continue;
      const a = i * 1.6 + Math.floor(t * 6), cx = Math.cos(a) * k * 0.8 + k * 0.2, cy = Math.sin(a) * k * 0.35;
      ctx.beginPath(); ctx.moveTo(cx, cy - k * 0.08); ctx.lineTo(cx + k * 0.04, cy); ctx.lineTo(cx - k * 0.03, cy + k * 0.01); ctx.lineTo(cx + k * 0.01, cy + k * 0.09); ctx.stroke();
    }
  }
  // brazos en el aire, por encima de todo
  for (const a of arms) if (a.above) drawArm(a);
  ctx.restore();
}

// Cara, nombre y avisos de cada nadador, siempre arriba de todo.
function drawTags(ctx, r, x, y, ppm, t, top) {
  const dr = r.dir || 1, L = ppm * 1.8, size = Math.round(clamp(ppm * 0.85, 24, 40));
  // la cara va arriba del nadador, o abajo si no entra
  const above = y - L * 0.3 - size - 4 > top;
  const fy = above ? y - L * 0.3 - size / 2 : y + L * 0.3 + size / 2;
  const fxp = x - L * 0.05;
  drawFaceBadge(ctx, r, fxp, fy, size, t);
  ctx.save(); ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const label = r.isPlayer ? "VOS" : r.ch.name, ly = above ? fy - size / 2 - 8 : fy + size / 2 + 8;
  ctx.fillStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.strokeStyle = "#0009"; ctx.lineWidth = 3;
  ctx.strokeText(label, fxp, ly); ctx.fillText(label, fxp, ly);
  if (r.stun) { ctx.fillStyle = "#FFD84A"; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(x + dr * L * 0.36 + Math.cos(a) * 12, y + Math.sin(a) * 8, 3, 0, 7); ctx.fill(); } }
  if (r.objT > 0) drawItem(ctx, r.objKind, fxp - size / 2 - 10, fy, 7);
  if (r.isPlayer && !r.finished && (r.breathing || r.air < 0.3)) {
    const hx = x + dr * ppm * 1.12, pulse = 1 + Math.sin(t * 16) * 0.06, R = ppm * 0.55 * pulse;
    ctx.fillStyle = r.breathing ? "rgba(143,227,255,0.25)" : "rgba(255,80,60,0.2)"; ctx.beginPath(); ctx.arc(hx, y, R, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, y, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = r.breathing ? "#8FE3FF" : "#FF6A4A"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(hx, y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, r.air)); ctx.stroke();
    if (!r.breathing) {
      ctx.save(); ctx.translate(hx + dr * (R + 8), y); ctx.scale(pulse, pulse);
      ctx.font = "bold 16px system-ui, sans-serif"; ctx.textAlign = dr > 0 ? "left" : "right"; ctx.lineWidth = 4; ctx.strokeStyle = "#0E4C7E";
      ctx.strokeText("¡RESPIRÁ!", 0, 0); ctx.fillStyle = "#fff"; ctx.fillText("¡RESPIRÁ!", 0, 0);
      ctx.restore();
    }
  }
  if (r.drop && r.drop.t !== undefined && r.objT <= 0) {
    const age = (r.isPlayer ? 1 : 0.6) - ((FX.partyFor ? FX.partyFor.t : 0) - r.drop.t);
    if (age > 0) {
      const it = ITEMS[r.drop.kind], q = 1 - age, sz = r.isPlayer ? 20 : 13;
      const py = y - ppm * 2.1 - q * 20;
      ctx.save(); ctx.globalAlpha = Math.min(1, age * 2); ctx.translate(x + ppm * 0.4, py < top + 20 ? y + ppm * 2 + q * 20 : py);
      ctx.font = `bold ${sz}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#0E4C7E";
      const s2 = it.good ? "CHAU " + it.name + " ▼" : "¡CHAU " + it.name + "! ▲";
      ctx.strokeText(s2, 0, 0); ctx.fillStyle = it.good ? "#FFB4A8" : "#7CFC6A"; ctx.fillText(s2, 0, 0);
      ctx.restore();
    }
  }
  // al agarrar un objeto, el nombre grande que sube
  if (r.objT > 0 && r.objKind && r.objT > ITEMS[r.objKind].secs - 1) {
    const it = ITEMS[r.objKind], q = 1 - (r.objT - (it.secs - 1)), sz = r.isPlayer ? 26 : 16;
    ctx.save(); ctx.globalAlpha = 1 - q * 0.8; const py = y - ppm * 2.1 - q * 25; ctx.translate(x + ppm * 0.4, py < top + 20 ? y + ppm * 2 + q * 25 : py); ctx.scale(1 + (1 - q) * 0.4, 1 + (1 - q) * 0.4);
    ctx.font = `bold ${sz}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.lineWidth = 5; ctx.strokeStyle = "#0E4C7E";
    const s2 = (it.good ? "¡" + it.name + "! ▲" : it.name + " ▼");
    ctx.strokeText(s2, 0, 0); ctx.fillStyle = it.good ? "#7CFC6A" : "#FF7A6A"; ctx.fillText(s2, 0, 0);
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
  g.addColorStop(0, "#082A4A"); g.addColorStop(1, "#0F4E82");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, POOL_TOP - 3);
  const gl = ctx.createLinearGradient(0, 0, W, 0);
  gl.addColorStop(0, "rgba(95,208,245,0)"); gl.addColorStop(0.5, "rgba(95,208,245,0.9)"); gl.addColorStop(1, "rgba(95,208,245,0)");
  ctx.fillStyle = gl; ctx.fillRect(0, POOL_TOP - 4, W, 2);
  // tu cara y tu puesto
  drawFaceBadge(ctx, p, 28, 29, 38, race.t);
  ctx.font = "bold 30px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.lineWidth = 5; ctx.strokeStyle = "#0008"; ctx.fillStyle = pos === 1 ? "#FFD84A" : "#fff";
  ctx.strokeText(pos + "º", 56, 22); ctx.fillText(pos + "º", 56, 22);
  ctx.font = "bold 11px system-ui, sans-serif"; ctx.fillStyle = "#CFE9FF";
  ctx.fillText(shownM(race, Math.min(race.len, Math.floor(p.x))) + " / " + shownLen(race) + " m", 56, 46);
  // barra de progreso con las caras de los 3
  const bx = 136, bw = W - bx - 210, by = 24;
  ctx.fillStyle = "#0005"; ctx.beginPath(); ctx.roundRect(bx, by - 4, bw, 8, 4); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw - 2, by - 10, 4, 20);
  for (let k = 1; k < race.laps; k++) { ctx.fillStyle = "#ffffff88"; ctx.fillRect(bx + bw * k / race.laps - 1, by - 7, 2, 14); } // cada pared
  if (race.laps > 1) {
    const lap = Math.min(race.laps, poolAt(race, p.x).lap + 1);
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "right"; ctx.fillStyle = "#CFE9FF"; ctx.lineWidth = 3; ctx.strokeStyle = "#0008";
    ctx.strokeText("LARGO " + lap + " DE " + race.laps, bx + bw, by + 20); ctx.fillText("LARGO " + lap + " DE " + race.laps, bx + bw, by + 20);
  }
  for (const r of race.racers.slice().reverse()) drawFaceBadge(ctx, r, bx + bw * clamp(r.x / race.len, 0, 1), by, r.isPlayer ? 22 : 18, race.t);
  // la pila de aire: grande, por segmentos, y abajo cuánto gasta o si recarga (en los primeros niveles no se gasta: no se muestra)
  if (race.air) {
  const bw2 = 150, bh2 = 26, ax = W - bw2 - 22, ay = 7, flying = flyingNow(p) && !p.finished && !p.breathing;
  ctx.fillStyle = "#0008"; ctx.beginPath(); ctx.roundRect(ax, ay, bw2, bh2, 6); ctx.fill();
  ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); ctx.roundRect(ax + bw2 + 2, ay + 7, 6, bh2 - 14, 2); ctx.fill();
  const col = p.air > 0.5 ? "#5FE36A" : p.air > 0.25 ? "#FFC83A" : (Math.floor(race.t * 6) % 2 ? "#FF4A3A" : "#C82A1A");
  const segs = 10, sw = (bw2 - 6) / segs;
  for (let i = 0; i < segs; i++) {
    const f = clamp(p.air * segs - i, 0, 1); if (f <= 0) break;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(ax + 3 + i * sw + 1, ay + 3, (sw - 2) * f, bh2 - 6, 3); ctx.fill();
  }
  if (p.breathing || p.walk > 0) { // recargando: un brillo que corre por la pila
    const gx = ax + ((race.t * 220) % bw2);
    const gg = ctx.createLinearGradient(gx - 30, 0, gx + 30, 0);
    gg.addColorStop(0, "rgba(255,255,255,0)"); gg.addColorStop(0.5, "rgba(255,255,255,0.7)"); gg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gg; ctx.fillRect(ax + 3, ay + 3, bw2 - 6, bh2 - 6);
  }
  ctx.strokeStyle = p.breathing ? "#8FE3FF" : flying ? "#FFD84A" : "#ffffff88"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(ax, ay, bw2, bh2, 6); ctx.stroke();
  ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 3; ctx.strokeStyle = "#000a";
  ctx.fillStyle = "#fff"; ctx.strokeText("AIRE " + Math.round(p.air * 100) + "%", ax + bw2 / 2, ay + bh2 / 2 + 1); ctx.fillText("AIRE " + Math.round(p.air * 100) + "%", ax + bw2 / 2, ay + bh2 / 2 + 1);
  const blink = Math.floor(race.t * 8) % 2;
  const [txt, tc] = p.finished ? ["", "#fff"] : p.noAir ? ["¡SIN AIRE! RESPIRÁ", blink ? "#FF6A5A" : "#fff"]
    : p.walk > 0 ? ["CAMINANDO: RECARGA ▲▲▲", "#8FE3FF"] : p.breathing ? ["RECARGANDO ▲▲▲", "#8FE3FF"] : p.plancha ? ["PLANCHA: RECARGA ▲", "#8FE3FF"]
    : flying ? ["MARIPOSA: GASTA ▼▼▼", blink ? "#FFD84A" : "#FFB020"] : pechoNow(p) ? ["PECHO: CASI NO GASTA", "#9CF0B0"] : ["CROL: GASTA ▼", "#CFE9FF"];
  ctx.font = "bold 12px system-ui, sans-serif"; ctx.fillStyle = tc;
  ctx.strokeText(txt, ax + bw2 / 2, ay + bh2 + 13); ctx.fillText(txt, ax + bw2 / 2, ay + bh2 + 13);
  }
  if (p.objT > 0) { // objeto activo, abajo de la barra de la carrera
    const it = ITEMS[p.objKind];
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = it.good ? "#7CFC6A" : "#FF8A7A";
    const s2 = it.name + " " + (it.good ? "▲" : "▼") + " " + p.objT.toFixed(1) + " s";
    ctx.strokeText(s2, bx, by + 20); ctx.fillText(s2, bx, by + 20);
  }
  if (race.curPlan && race.t - race.curPlan.at < 2.5 && !p.finished) { // la corriente cambió
    const a2 = race.t - race.curPlan.at;
    ctx.save(); ctx.globalAlpha = Math.min(1, (2.5 - a2) * 2); ctx.font = "bold 20px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 5; ctx.strokeStyle = "#0E4C7E"; ctx.fillStyle = race.curPlan.kind === "against" ? "#FF9A6A" : race.curPlan.kind === "calm" ? "#9CF0B0" : "#8FE3FF";
    ctx.strokeText("🌊 " + race.curPlan.say, W / 2, H * 0.3); ctx.fillText("🌊 " + race.curPlan.say, W / 2, H * 0.3); ctx.restore();
  }
  if (race.sign && race.t - race.sign.at < 2.5 && !p.finished) { // cambió el ejercicio (patada, brazada o completo)
    const a2 = race.t - race.sign.at;
    ctx.save(); ctx.globalAlpha = Math.min(1, (2.5 - a2) * 2); ctx.font = "bold 20px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 5; ctx.strokeStyle = "#0E4C7E"; ctx.fillStyle = "#FFD84A";
    ctx.strokeText(race.sign.say, W / 2, H * 0.38); ctx.fillText(race.sign.say, W / 2, H * 0.38); ctx.restore();
  }
  // largada: cada número aparece grande y se achica
  if (race.t < 0.6) {
    const n = race.t < 0 ? Math.ceil(-race.t) : 0, k = 1.5 - 0.5 * (race.t < 0 ? n + race.t : race.t / 0.6);
    ctx.save(); ctx.translate(W / 2, H * 0.4); ctx.scale(k * 0.8, k * 0.8); // más arriba, para que se vea la barra de la largada
    ctx.font = "bold 90px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 10; ctx.strokeStyle = "#0E4C7E"; ctx.fillStyle = n ? "#fff" : "#FFD84A";
    const s = n ? String(n) : "¡YA!";
    ctx.strokeText(s, 0, 0); ctx.fillText(s, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// La barra de la largada: grande en el centro, con una flecha que va y viene; hay que tocar
// (cualquier botón, la pantalla o cualquier tecla) cuando llega al verde.
// En cada vuelta americana la misma barra aparece chica, parada, al costado del nadador.
function drawPushBar(ctx, race, p, x, y, ppm, t, W, H) {
  const ready = p.onBlock && race.t < 0, wall = p.wallBar && p.turnQ === null && !p.finished;
  if (p.onBlock) {
    const v = ready ? 0 : barAt(0, race.t), hot = !ready && v > 0.88;
    const pc = document.body.classList.contains("pc");
    const bw = Math.min(W * 0.46, 380), bh = 24, bx = W / 2 - bw / 2, by = Math.min(H - 104, H * 0.7);
    ctx.save();
    ctx.fillStyle = "rgba(8,40,70,0.88)"; ctx.strokeStyle = hot ? "#7CFC6A" : "#FFD84A"; ctx.lineWidth = hot ? 4 : 2;
    ctx.beginPath(); ctx.roundRect(bx - 16, by - 42, bw + 32, bh + 76, 16); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 16px system-ui, sans-serif"; ctx.fillStyle = "#FFD84A";
    ctx.fillText(ready ? "EN EL ¡YA! SALE LA BARRA" : "LARGADA: ¡SALTÁ!", W / 2, by - 24);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, "#FF4A3A"); g.addColorStop(0.55, "#FFD23A"); g.addColorStop(0.86, "#9BE35A"); g.addColorStop(1, "#3FD35A");
    ctx.globalAlpha = ready ? 0.5 : 1; ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.globalAlpha = 1;
    const zx = bx + bw * 0.88;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(zx, by - 3, bw * 0.12, bh + 6, 6); ctx.stroke();
    ctx.font = "bold 11px system-ui, sans-serif"; ctx.fillStyle = hot ? "#7CFC6A" : "#fff"; ctx.fillText("¡AHORA!", zx + bw * 0.06, by - 10);
    const px = bx + bw * v, pk = hot ? 1.25 : 1;
    ctx.fillStyle = hot ? "#7CFC6A" : "#fff"; ctx.strokeStyle = "#0E4C7E"; ctx.lineWidth = 2;
    ctx.fillRect(px - 2.5, by - 4, 5, bh + 8);
    ctx.beginPath(); ctx.moveTo(px, by + bh + 4); ctx.lineTo(px - 9 * pk, by + bh + 16 * pk); ctx.lineTo(px + 9 * pk, by + bh + 16 * pk); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.fillStyle = "#fff";
    ctx.fillText(pc ? "CUALQUIER TECLA CUANDO LA FLECHA LLEGUE AL VERDE" : "TOCÁ LA PANTALLA CUANDO LA FLECHA LLEGUE AL VERDE", W / 2, by + bh + 27, bw + 20);
    ctx.restore();
  } else if (wall) {
    const v = barAt(p.barT0, race.t), hot = v > 0.88;
    const bh = Math.min(96, (H - POOL_TOP) * 0.38), bw = 22;
    const bx = clamp(x - p.dir * ppm * 2.2 - bw / 2, 8, W - bw - 8), by = clamp(y - bh / 2, POOL_TOP + 26, H - bh - 30);
    ctx.save();
    ctx.fillStyle = "rgba(8,40,70,0.85)"; ctx.strokeStyle = hot ? "#7CFC6A" : "#FFD84A"; ctx.lineWidth = hot ? 3 : 1.5;
    ctx.beginPath(); ctx.roundRect(bx - 5, by - 5, bw + 10, bh + 10, 8); ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(0, by + bh, 0, by);
    g.addColorStop(0, "#FF4A3A"); g.addColorStop(0.55, "#FFD23A"); g.addColorStop(1, "#3FD35A");
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by + bh * (1 - v), bw, bh * v, 5); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh * 0.12); // arriba: la zona perfecta
    ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.lineWidth = 4; ctx.strokeStyle = "#0E4C7E";
    ctx.strokeText("¡VUELTA!", bx + bw / 2, by - 9); ctx.fillStyle = hot ? "#7CFC6A" : "#fff"; ctx.fillText("¡VUELTA!", bx + bw / 2, by - 9);
    ctx.restore();
  }
  // turbo de la salida o la vuelta perfecta: estelas doradas detrás del nadador y un destello
  if (p.kick > 0 && !p.onBlock) {
    ctx.save(); ctx.strokeStyle = "#FFD84A"; ctx.lineCap = "round"; ctx.globalAlpha = Math.min(1, p.kick * 1.5);
    for (let i = 0; i < 5; i++) {
      const oy = (i - 2) * ppm * 0.16, len = ppm * (1.2 + ((t * 7 + i * 0.37) % 1) * 1.4), x0 = x - p.dir * ppm * 0.9;
      ctx.lineWidth = i === 2 ? 4 : 2.5; ctx.beginPath(); ctx.moveTo(x0, y + oy); ctx.lineTo(x0 - p.dir * len, y + oy); ctx.stroke();
    }
    ctx.restore();
  }
  if (p.push && p.push.q > 0.88 && race.t - p.push.t < 0.35) {
    ctx.save(); ctx.fillStyle = `rgba(255,236,150,${0.35 * (1 - (race.t - p.push.t) / 0.35)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // cómo te salió el salto o la vuelta
  if (p.push && race.t - p.push.t < 1.3) {
    const q = p.push.q, a = race.t - p.push.t, sal = p.push.kind === "SALIDA";
    const [txt, col] = q > 0.88 ? [sal ? "¡SALIDA PERFECTA! TURBO" : "¡VUELTA PERFECTA! TURBO", "#7CFC6A"] : q > 0.55 ? [sal ? "BUENA SALIDA" : "BUENA VUELTA", "#FFD84A"] : [sal ? "SALIDA FLOJA" : "VUELTA FLOJA", "#FF8A7A"];
    ctx.save(); ctx.globalAlpha = Math.min(1, (1.3 - a) * 3); ctx.translate(W / 2, POOL_TOP + 40 - a * 10); const k = (q > 0.88 ? 1.25 : 1) + Math.max(0, 0.4 - a);
    ctx.scale(k, k); ctx.font = "bold 26px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 6; ctx.strokeStyle = "#0E4C7E";
    ctx.strokeText(txt, 0, 0); ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
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

// Pablo caminando por la pileta: parado, dando pasos, con el agua a la cintura.
function drawWalker(ctx, r, x, y, ppm, t) {
  const k = ppm * 2, ch = r.ch, step = Math.sin(t * 9);
  ctx.save(); ctx.translate(x + ppm * 0.9, y);
  if (r.immune > 0 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(0,45,100,0.22)"; ctx.beginPath(); ctx.ellipse(k * 0.05, k * 0.1, k * 0.4, k * 0.32, 0, 0, 7); ctx.fill();
  // pies que avanzan uno y otro, abajo del agua
  ctx.fillStyle = shade(ch.skin, -0.15); ctx.globalAlpha *= 0.7;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * step * k * 0.18, s * k * 0.11, k * 0.13, k * 0.06, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha /= 0.7;
  // ola alrededor de la cintura
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(k * 0.02, 0, k * 0.34, k * 0.3, 0, 0, 7); ctx.stroke();
  // brazos que se balancean
  ctx.lineCap = "round";
  for (const s of [-1, 1]) {
    ctx.strokeStyle = shade(ch.skin, -0.06); ctx.lineWidth = k * 0.1;
    ctx.beginPath(); ctx.moveTo(0, s * k * 0.2); ctx.lineTo(-s * step * k * 0.2, s * k * 0.27); ctx.stroke();
  }
  // hombros y cabeza
  ctx.fillStyle = ch.skin; ctx.strokeStyle = "rgba(20,30,50,0.4)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, k * 0.15, k * 0.25, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = ch.cap; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.lineWidth = r.isPlayer ? 3 : 2;
  ctx.beginPath(); ctx.arc(k * 0.04, 0, k * 0.13, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#1B2A3A"; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(k * 0.14, s * k * 0.05, k * 0.03, k * 0.022, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// Tribunas con la hinchada, a cada punta. Cada uno tiene su color fijo (no cambia de un cuadro a otro).
const FAN_SHIRTS = ["#75AADB", "#FFFFFF", "#FFD23A", "#1A1A1A", "#E8413C", "#2F6FE0", "#7CFC6A", "#FF8A2A", "#B05FD0"];
const FAN_SKIN = ["#F2C6A0", "#E6B08A", "#C98F68", "#EDBB95", "#B27852"];
const FAN_HAIR = ["#2A1C14", "#3A2618", "#F0CC62", "#6E6E74", "#1A1410"];
const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
// Banderas: Argentina, Almirante Brown (aurinegro) y Huracán de San Justo.
// ❓ Los colores de Huracán de San Justo no se confirmaron: por ahora va blanca con el nombre.
const FLAGS = ["arg", "huracan", "arg", "huracan", "arg"];
function drawFlag(ctx, kind, x, y, w, h, t, seed) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = "#5A4636"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, h * 0.5); ctx.lineTo(0, -h * 0.7); ctx.stroke();
  const cols = 10, cw = w / cols;
  for (let i = 0; i < cols; i++) { // la tela flamea por tiras
    const off = Math.sin(t * 6 + i * 0.7 + seed) * h * 0.08 * (i / cols);
    const x0 = i * cw, y0 = -h * 0.7 + off;
    if (kind === "arg") {
      ctx.fillStyle = "#75AADB"; ctx.fillRect(x0, y0, cw + 0.5, h / 3);
      ctx.fillStyle = "#fff"; ctx.fillRect(x0, y0 + h / 3, cw + 0.5, h / 3);
      ctx.fillStyle = "#75AADB"; ctx.fillRect(x0, y0 + h * 2 / 3, cw + 0.5, h / 3);
    } else { // Huracán: blanca con una franja roja arriba y abajo
      ctx.fillStyle = "#fff"; ctx.fillRect(x0, y0, cw + 0.5, h);
      ctx.fillStyle = "#D7262E"; ctx.fillRect(x0, y0, cw + 0.5, h * 0.1); ctx.fillRect(x0, y0 + h * 0.9, cw + 0.5, h * 0.1);
    }
  }
  const mid = Math.sin(t * 6 + 5 * 0.7 + seed) * h * 0.04;
  if (kind === "arg") { ctx.fillStyle = "#F6B40E"; ctx.beginPath(); ctx.arc(w / 2, -h * 0.7 + h / 2 + mid, h * 0.1, 0, 7); ctx.fill(); }
  if (kind === "huracan" && HSJ_LOGO.complete && HSJ_LOGO.naturalWidth) { // el globo rojo de HSJ en el medio
    const lh = h * 0.74, lw = lh / HSJ_LOGO_H;
    ctx.drawImage(HSJ_LOGO, w / 2 - lw / 2, -h * 0.7 + h * 0.13 + mid, lw, lh);
  }
  ctx.restore();
}
function drawStands(ctx, x0, x1, top, ph, ppm, t, hype, seed) {
  if (x1 < 0 || x0 > ctx.canvas.width) return;
  const rowW = ppm * 0.95, rows = Math.max(1, Math.floor((x1 - x0) / rowW));
  for (let i = 0; i < rows; i++) { // escalones de cemento
    ctx.fillStyle = i % 2 ? "#C9CED6" : "#B7BDC7"; ctx.fillRect(x0 + i * rowW, top - 6, rowW, ph + 12);
  }
  const gap = ppm * 0.62;
  for (let i = 0; i < rows; i++) for (let j = 0, y = top + gap * 0.5; y < top + ph - gap * 0.3; j++, y += gap) {
    const n = seed * 1000 + i * 97 + j, h = hash(n);
    if (h < 0.12) continue; // algún lugar vacío
    const cx = x0 + (i + 0.5) * rowW + (hash(n + 1) - 0.5) * rowW * 0.3, cy = y + (hash(n + 2) - 0.5) * gap * 0.3, fd = seed === 2 ? -1 : 1; // hacia dónde está la pileta
    const jump = Math.max(0, Math.sin(t * (6 + h * 4) + n)) * hype;
    const s = ppm * 0.2 * (1 + jump * 0.15);
    const shirt = FAN_SHIRTS[Math.floor(hash(n + 3) * FAN_SHIRTS.length)];
    // brazos arriba cuando se entusiasman
    if (jump > 0.3) {
      ctx.strokeStyle = FAN_SKIN[Math.floor(hash(n + 4) * FAN_SKIN.length)]; ctx.lineWidth = s * 0.4; ctx.lineCap = "round";
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx, cy + d * s * 0.8); ctx.lineTo(cx + fd * s * 0.9, cy + d * s * (1.1 + jump * 0.4)); ctx.stroke(); }
    }
    ctx.fillStyle = shirt; ctx.beginPath(); ctx.ellipse(cx - fd * s * 0.2, cy, s * 0.8, s * 1.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = FAN_SKIN[Math.floor(hash(n + 4) * FAN_SKIN.length)]; ctx.beginPath(); ctx.arc(cx + fd * s * 0.25, cy, s * 0.55, 0, 7); ctx.fill();
    ctx.fillStyle = FAN_HAIR[Math.floor(hash(n + 5) * FAN_HAIR.length)]; ctx.beginPath();
    if (fd > 0) ctx.arc(cx + s * 0.05, cy, s * 0.5, Math.PI * 0.6, Math.PI * 1.4); else ctx.arc(cx - s * 0.05, cy, s * 0.5, -Math.PI * 0.4, Math.PI * 0.4);
    ctx.fill();
  }
  // banderas entre la gente
  const fw = Math.min(ppm * 1.7, (x1 - x0) * 0.45), fh = fw * 0.62, nf = Math.max(2, Math.floor(ph / (fh * 1.6)));
  for (let f = 0; f < nf; f++) {
    // del lado de la pileta, que es lo que se ve
    const fy = top + ph * (f + 0.6) / nf, spread = fw * (0.3 + 1.4 * hash(seed * 50 + f));
    const fx = seed === 1 ? x1 - fw - spread : x0 + spread;
    drawFlag(ctx, FLAGS[(f + seed) % FLAGS.length], fx, fy, fw, fh, t, f + seed);
  }
}
