// Nadar por la gloria — todo lo que se dibuja en la pileta: agua, nadadores, objetos, tablero.
// La pileta se ve desde arriba y la carrera avanza hacia la derecha.

const POOL_TOP = 62; // alto del tablero de arriba

function render(ctx, race, W, H) {
  const top = POOL_TOP, ph = H - top - 8;
  const ppm = Math.max(26, W / 22);                 // píxeles por metro
  const p = race ? race.racers[0] : { x: 0 };
  const camX = p.x - (W * 0.32) / ppm;
  const sx = (x) => (x - camX) * ppm, sy = (u) => top + u * ph;
  const t = race ? race.t : performance.now() / 1000;

  // borde y agua
  ctx.fillStyle = "#D9CDB4"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, top, 0, top + ph);
  g.addColorStop(0, "#2A8FD0"); g.addColorStop(0.5, "#3AA8E4"); g.addColorStop(1, "#2A8FD0");
  ctx.fillStyle = g; ctx.fillRect(Math.max(0, sx(-1)), top, W, ph);
  // reflejos que se mueven
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    const wx = Math.floor(camX) + ((i * 7.3) % 24), wu = (i * 0.137) % 1;
    const x = sx(wx) + Math.sin(t * 1.3 + i) * 6, y = sy(wu);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 12, y - 4, x + 24, y); ctx.stroke();
  }
  // líneas del fondo y corcheras (decorativas: se nada libre, como en un circuito)
  const x0 = Math.max(0, sx(-1));
  for (const u of [1 / 6, 0.5, 5 / 6]) { ctx.fillStyle = "rgba(10,30,60,0.35)"; ctx.fillRect(x0, sy(u) - 3, W, 6); }
  for (const u of [1 / 3, 2 / 3]) {
    for (let m = Math.max(-0.5, Math.floor(camX)); m < camX + W / ppm + 1; m += 0.5) {
      ctx.fillStyle = Math.floor(m * 2) % 2 ? "#E8E8E8" : "#D23B3B";
      ctx.beginPath(); ctx.arc(sx(m), sy(u), 4, 0, 7); ctx.fill();
    }
  }
  // marcas cada 10 m, salida y llegada
  ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let m = 10; m < RACE_M; m += 10) {
    const x = sx(m); if (x < -20 || x > W + 20) continue;
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x - 1, top, 2, ph);
    ctx.fillStyle = "#10324F"; ctx.fillText(m + " m", x, top - 15);
  }
  const fx = sx(RACE_M);
  if (fx < W + 20) for (let i = 0; i < ph / 10; i++) for (let j = 0; j < 2; j++) {
    ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff"; ctx.fillRect(fx + j * 10, top + i * 10, 10, 10);
  }
  ctx.fillStyle = "#9C8E80"; ctx.fillRect(sx(-1) - 10, top, 10, ph);

  if (!race) return;
  for (const o of race.objs) {
    if (o.gone) continue;
    const x = sx(o.x), y = sy(o.u); if (x < -40 || x > W + 40) continue;
    drawItem(ctx, o.kind, x, y + Math.sin(t * 3 + o.x) * 2, ppm * 0.5);
  }
  for (const r of race.racers) drawSwimmer(ctx, r, sx(r.x), sy(r.u), ppm, t, H);
  for (const r of race.racers) if (r.bubble) drawBubble(ctx, sx(r.x), sy(r.u) - ppm * 0.7, r.bubble.text);
}

function drawSwimmer(ctx, r, x, y, ppm, t, H) {
  const L = ppm * 1.7, ch = r.ch;
  ctx.save(); ctx.translate(x, y);
  if (r.dive) ctx.globalAlpha = 0.35;
  else if (r.immune > 0 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.6;
  // estela
  if (r.v > 1) { ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-L * 0.75, 0, L * 0.35 * r.v / 3, L * 0.14, 0, 0, 7); ctx.fill(); }
  const back = r.plancha > 0;
  // piernas y cuerpo
  const kick = Math.sin(t * 14 + r.x) * L * 0.05;
  ctx.strokeStyle = ch.skin; ctx.lineWidth = L * 0.09; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-L * 0.3, -L * 0.06); ctx.lineTo(-L * 0.62, -L * 0.07 + kick); ctx.moveTo(-L * 0.3, L * 0.06); ctx.lineTo(-L * 0.62, L * 0.07 - kick); ctx.stroke();
  ctx.fillStyle = ch.suit; ctx.beginPath(); ctx.ellipse(-L * 0.05, 0, L * 0.3, L * 0.15, 0, 0, 7); ctx.fill();
  ctx.fillStyle = ch.skin; ctx.beginPath(); ctx.ellipse(L * 0.12, 0, L * 0.14, L * 0.16, 0, 0, 7); ctx.fill();
  // brazos: crol alternado, mariposa los dos juntos
  const flying = r.fly && r.air > 0 && !back;
  const ph = r.stun || back ? 0 : t * (flying ? 9 : 6) + r.x;
  for (const s of [-1, 1]) {
    const a = ph + (s > 0 && !flying ? Math.PI : 0), reach = Math.cos(a);
    ctx.strokeStyle = ch.skin; ctx.lineWidth = L * 0.08;
    ctx.beginPath(); ctx.moveTo(L * 0.15, s * L * 0.13); ctx.lineTo(L * 0.15 + reach * L * 0.38, s * L * (0.18 + 0.08 * Math.sin(a))); ctx.stroke();
  }
  // cabeza con gorra
  ctx.fillStyle = ch.cap; ctx.beginPath(); ctx.arc(L * 0.36, 0, L * 0.13, 0, 7); ctx.fill();
  ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  // nombre y estados
  ctx.save(); ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.strokeStyle = "#0008"; ctx.lineWidth = 3;
  const label = r.isPlayer ? "VOS" : ch.name;
  const ly = y + L * 0.42 > H - 6 ? y - L * 0.3 : y + L * 0.42;
  ctx.strokeText(label, x - L * 0.1, ly); ctx.fillText(label, x - L * 0.1, ly);
  if (r.stun) { ctx.fillStyle = "#FFD84A"; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(x + L * 0.36 + Math.cos(a) * 12, y + Math.sin(a) * 8, 3, 0, 7); ctx.fill(); } }
  if (r.objT > 0) drawItem(ctx, r.objKind, x - L * 0.25, y - L * 0.32, L * 0.1);
  if (r.isPlayer && r.bOpen) { ctx.fillStyle = "#8FE3FF"; ctx.strokeText("¡RESPIRÁ!", x, y - L * 0.5); ctx.fillText("¡RESPIRÁ!", x, y - L * 0.5); }
  ctx.restore();
}

function drawHud(ctx, race, W, H) {
  const p = race.racers[0], st = standings(race), pos = st.indexOf(p) + 1;
  ctx.save();
  // posición
  ctx.font = "bold 34px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.lineWidth = 5; ctx.strokeStyle = "#0008"; ctx.fillStyle = pos === 1 ? "#FFD84A" : "#fff";
  ctx.strokeText(pos + "º", 12, 8); ctx.fillText(pos + "º", 12, 8);
  ctx.font = "bold 13px system-ui, sans-serif"; ctx.fillStyle = "#fff";
  const m = Math.min(RACE_M, Math.floor(p.x)) + " / " + RACE_M + " m";
  ctx.strokeText(m, 12, 46); ctx.fillText(m, 12, 46);
  // barra de progreso con los 3
  const bx = 80, bw = W - 80 - 200, by = 18;
  ctx.fillStyle = "#0006"; ctx.fillRect(bx, by - 3, bw, 6);
  ctx.fillStyle = "#fff"; ctx.fillRect(bx + bw - 2, by - 8, 4, 16);
  for (const r of race.racers) {
    const x = bx + bw * clamp(r.x / RACE_M, 0, 1);
    ctx.beginPath(); ctx.arc(x, by, r.isPlayer ? 8 : 6, 0, 7); ctx.fillStyle = r.ch.cap; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = r.isPlayer ? "#FFD84A" : "#fff"; ctx.stroke();
  }
  // aire, estilo y objeto activo
  const ax = W - 140, aw = 128;
  ctx.fillStyle = "#0006"; ctx.fillRect(ax, 10, aw, 14);
  ctx.fillStyle = p.noAir ? "#E84A4A" : p.air < 0.3 ? "#F0A030" : "#7FE0FF"; ctx.fillRect(ax + 2, 12, (aw - 4) * p.air, 10);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "right";
  ctx.fillText("AIRE", ax - 4, 11);
  const flying = p.fly && p.air > 0;
  ctx.textAlign = "left"; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3; ctx.fillStyle = flying ? "#FFD84A" : "#fff";
  ctx.strokeText(flying ? "MARIPOSA" : "CROL", ax, 30); ctx.fillText(flying ? "MARIPOSA" : "CROL", ax, 30);
  if (p.objT > 0) {
    const it = ITEMS[p.objKind];
    ctx.fillStyle = it.good ? "#7CFC6A" : "#FF8A7A";
    const s = it.name + " " + (it.good ? "▲" : "▼") + " " + p.objT.toFixed(1);
    ctx.strokeText(s, ax, 46); ctx.fillText(s, ax, 46);
  }
  // largada
  if (race.t < 0.6) {
    const n = race.t < 0 ? Math.ceil(-race.t) : 0;
    ctx.font = "bold 90px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 8; ctx.strokeStyle = "#0009"; ctx.fillStyle = n ? "#fff" : "#7CFC6A";
    const s = n ? String(n) : "¡YA!";
    ctx.strokeText(s, W / 2, H / 2); ctx.fillText(s, W / 2, H / 2);
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
  ctx.fillStyle = good ? "rgba(124,252,106,0.35)" : "rgba(255,90,70,0.35)";
  ctx.beginPath(); ctx.arc(0, 0, s * 1.25, 0, 7); ctx.fill();
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
  ctx.restore();
}
function itemIcon(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 40;
  drawItem(c.getContext("2d"), kind, 20, 20, 14);
  return `<img src="${c.toDataURL()}" width="20" height="20" alt="">`;
}
