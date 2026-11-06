// Nadar por la gloria — pantallas, controles y dibujos compartidos por A y B (descartable).
// Las reglas de la carrera están en carrera.js.

// ---------- Pantallas y controles ----------
function startApp(cfg) {
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize); resize();

  const input = { up: false, down: false, left: false, right: false, fly: false, breathePressed: false, specialPressed: false, slapPressed: false };
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", c: "fly", C: "fly", Shift: "fly" };
  const presses = { " ": "breathePressed", x: "specialPressed", X: "specialPressed", z: "slapPressed", Z: "slapPressed" };
  window.addEventListener("keydown", (e) => {
    if (keys[e.key]) { input[keys[e.key]] = true; e.preventDefault(); }
    if (presses[e.key] && !e.repeat) { input[presses[e.key]] = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => { if (keys[e.key]) input[keys[e.key]] = false; });

  // botones táctiles
  const pad = document.getElementById("pad");
  for (const b of cfg.buttons) {
    const el = document.createElement("div");
    el.className = "btn " + b.cls; el.innerHTML = `<i class="fill"></i><span>${b.label}</span>`;
    const on = (e) => { e.preventDefault(); el.classList.add("on"); if (b.hold) input[b.hold] = true; if (b.press) input[b.press] = true; };
    const off = (e) => { e.preventDefault(); el.classList.remove("on"); if (b.hold) input[b.hold] = false; };
    el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off); el.addEventListener("pointerleave", off);
    pad.appendChild(el);
    if (b.id) el.id = b.id;
  }

  const scr = document.getElementById("scr");
  let race = null, player = null, chosen = null;

  function show(html) { scr.innerHTML = html; scr.style.display = "flex"; pad.style.display = "none"; }
  function face(ch, size) {
    return `<span class="face" style="width:${size}px;height:${size}px;background:${ch.skin};border-color:${ch.cap};box-shadow:inset 0 ${size * 0.38}px 0 ${ch.cap}"></span>`;
  }
  function goFull() {
    try { const d = document.documentElement; if (d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {})).catch(() => {}); } catch (e) {}
  }

  function selectScreen() {
    race = null;
    show(`<h1>${cfg.title}</h1><p class="sub">${cfg.subtitle}</p><p>Elegí tu nadador</p>
      <div class="grid">${CHARS.map((c) => `<button class="ch" data-id="${c.id}">${face(c, 34)}<b>${c.name}</b><small>${c.tag}</small>${statBars(c)}</button>`).join("")}</div>`);
    scr.querySelectorAll(".ch").forEach((b) => b.onclick = () => { goFull(); chosen = CHARS.find((c) => c.id === b.dataset.id); drawScreen(); });
  }
  function drawScreen() {
    const draft = newRace(chosen, cfg);
    const [p, a, b] = draft.racers;
    const legend = Object.keys(ITEMS).map((k) => `<span class="it">${itemIcon(k)} ${ITEMS[k].name} ${ITEMS[k].good ? "▲" : "▼"}</span>`).join("");
    show(`<p class="sub">Sorteo de rivales</p>
      <div class="vs">${[p, a, b].map((r, i) => `<div class="card ${i ? "" : "me"}">${face(r.ch, 32)}<b>${r.ch.name}${i ? "" : " (vos)"}</b><small>${r.ch.tag}</small>${statBars(r.ch)}<small>${r.ch.quirk}</small><small class="sp">${r.ch.special}: ${r.ch.specialInfo}</small></div>`).join("")}</div>
      <p class="help">${cfg.help}</p><div class="legend">${legend}</div><button class="go">¡A LA PILETA!</button>`);
    scr.querySelector(".go").onclick = () => {
      race = draft; player = race.racers[0]; scr.style.display = "none"; pad.style.display = "block";
    };
  }
  function endScreen() {
    const st = standings(race), pos = st.indexOf(player) + 1;
    const win = pos === 1;
    show(`<h1 class="${win ? "win" : "lose"}">${win ? "¡GANASTE!" : pos === 2 ? "SALISTE 2º" : "SALISTE 3º"}</h1>
      <p class="sub">${win ? "La gloria es tuya. Se desbloquearía el próximo circuito." : "Sin gloria esta vez: hay que repetir el circuito."}</p>
      <ol class="podio">${st.map((r) => `<li>${face(r.ch, 22)} ${r.ch.name}${r.isPlayer ? " (vos)" : ""} <small>${r.finished ? r.finishT.toFixed(1) + " s" : Math.floor(r.x) + " m"}</small></li>`).join("")}</ol>
      <div class="row"><button class="go" id="again">OTRA VEZ</button><button id="change">CAMBIAR NADADOR</button></div>`);
    document.getElementById("again").onclick = drawScreen;
    document.getElementById("change").onclick = selectScreen;
  }

  const setBtn = (id, ready, fill, label) => {
    const el = document.getElementById(id); if (!el) return;
    el.classList.toggle("ready", ready); el.querySelector(".fill").style.width = (fill * 100) + "%";
    if (label) el.querySelector("span").textContent = label;
  };
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    if (race) {
      stepRace(race, dt, input);
      input.breathePressed = false; input.specialPressed = false; input.slapPressed = false;
      cfg.render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      setBtn("bbr", player.bOpen, player.bOpen ? player.bT / player.bLen : 0, player.bOpen ? "¡RESPIRÁ!" : "RESPIRAR");
      setBtn("bsp", specialReady(player), player.charge, player.ch.special);
      if (race.over && race.t - race.overT > 1.4 && scr.style.display === "none") endScreen();
    } else cfg.render(ctx, null, W, H);
    requestAnimationFrame(frame);
  }
  selectScreen();
  requestAnimationFrame(frame);
}

function statBars(ch) {
  return `<span class="stats">${STATS.map(([k, label]) => `<span>${label}</span><span class="bar">${"●".repeat(ch[k])}<i>${"●".repeat(5 - ch[k])}</i></span>`).join("")}</span>`;
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
  // aire y estilo
  const ax = W - 140, aw = 128;
  ctx.fillStyle = "#0006"; ctx.fillRect(ax, 10, aw, 14);
  ctx.fillStyle = p.noAir ? "#E84A4A" : p.air < 0.3 ? "#F0A030" : "#7FE0FF"; ctx.fillRect(ax + 2, 12, (aw - 4) * p.air, 10);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "right";
  ctx.fillText("AIRE", ax - 4, 11);
  ctx.textAlign = "left"; ctx.strokeStyle = "#000a"; ctx.lineWidth = 3; ctx.fillStyle = p.fly && p.air > 0 ? "#FFD84A" : "#fff";
  ctx.strokeText(p.fly && p.air > 0 ? "MARIPOSA" : "CROL", ax, 30); ctx.fillText(p.fly && p.air > 0 ? "MARIPOSA" : "CROL", ax, 30);
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
