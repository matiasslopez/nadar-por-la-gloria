// Nadar por la gloria — pantallas, controles, guía de los primeros segundos y sonidos.
// Las reglas de la carrera están en carrera.js y los dibujos en dibujo.js.

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

(function main() {
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize); resize();
  // nada de menús ni zoom por tocar de más
  for (const ev of ["contextmenu", "gesturestart", "dblclick"]) document.addEventListener(ev, (e) => e.preventDefault());

  const scr = document.getElementById("scr");

  // ---------- controles ----------
  // En la compu se juega con las flechas y el espacio: ↑↓ moverse, → (mantener) mariposa,
  // espacio respirar, ← especial. Enter sirve para los botones de las pantallas.
  const PC = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.body.classList.toggle("pc", PC);
  const say2 = (touch, pc) => (PC ? pc : touch);
  const input = { up: false, down: false, fly: false, breathePressed: false, specialPressed: false };
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowRight: "fly", w: "up", W: "up", s: "down", S: "down", d: "fly", D: "fly" };
  const presses = { " ": "breathePressed", ArrowLeft: "specialPressed", a: "specialPressed", A: "specialPressed" };
  window.addEventListener("keydown", (e) => {
    Sound.unlock();
    if (scr.style.display !== "none") { // en las pantallas, Enter o espacio aprietan el botón amarillo
      const go = scr.querySelector("button.go");
      if ((e.key === "Enter" || e.key === " ") && go) { e.preventDefault(); go.click(); }
      return;
    }
    if (keys[e.key]) { input[keys[e.key]] = true; e.preventDefault(); }
    if (presses[e.key] && !e.repeat) { input[presses[e.key]] = true; e.preventDefault(); }
    if ((e.key === "p" || e.key === "P" || e.key === "Escape") && race && !race.over) setPaused(!paused);
    else if (paused && !e.repeat) setPaused(false);
  });
  window.addEventListener("keyup", (e) => { if (keys[e.key]) input[keys[e.key]] = false; });

  const pad = document.getElementById("pad");
  const capture = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) {} };
  // zona izquierda: tocar en la mitad de arriba sube, en la de abajo baja (se puede deslizar)
  const steer = document.getElementById("steer"), fingers = new Map();
  function steerUpdate() {
    const r = steer.getBoundingClientRect(), mid = r.top + r.height / 2;
    input.up = [...fingers.values()].some((y) => y < mid - 6);
    input.down = [...fingers.values()].some((y) => y > mid + 6);
    steer.classList.toggle("up", input.up); steer.classList.toggle("down", input.down);
  }
  steer.addEventListener("pointerdown", (e) => { e.preventDefault(); Sound.unlock(); capture(steer, e); fingers.set(e.pointerId, e.clientY); steerUpdate(); });
  steer.addEventListener("pointermove", (e) => { if (fingers.has(e.pointerId)) { fingers.set(e.pointerId, e.clientY); steerUpdate(); } });
  for (const ev of ["pointerup", "pointercancel"]) steer.addEventListener(ev, (e) => { fingers.delete(e.pointerId); steerUpdate(); });

  // botones de la derecha: el dedo puede moverse un poco sin soltar el botón
  for (const el of pad.querySelectorAll(".btn")) {
    const hold = el.dataset.hold, press = el.dataset.press;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); Sound.unlock(); capture(el, e); el.classList.add("on");
      if (hold) input[hold] = true; if (press) input[press] = true;
    });
    const off = () => { el.classList.remove("on"); if (hold) input[hold] = false; };
    el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off);
  }

  // ---------- pausa, silencio y pantalla encendida ----------
  const pauseEl = document.getElementById("pause"), muteBtn = document.getElementById("mute");
  let paused = false, wake = null;
  function setPaused(v) {
    paused = v; pauseEl.style.display = v ? "flex" : "none";
    for (const k in input) input[k] = false; fingers.clear(); steerUpdate();
  }
  document.getElementById("pauseBtn").addEventListener("pointerdown", (e) => { e.preventDefault(); setPaused(true); });
  pauseEl.addEventListener("pointerdown", (e) => { e.preventDefault(); setPaused(false); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && race && !race.over) setPaused(true); });
  const paintMute = () => { muteBtn.textContent = Sound.muted ? "🔇" : "🔊"; };
  muteBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); Sound.unlock(); Sound.toggle(); paintMute(); });
  paintMute();
  async function keepAwake(on) {
    try {
      if (on && !wake && navigator.wakeLock) wake = await navigator.wakeLock.request("screen");
      if (!on && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  }
  function goFull() {
    try {
      const d = document.documentElement;
      if (d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {})).catch(() => {});
    } catch (e) {}
  }

  // ---------- guía de los primeros segundos (solo la primera carrera) ----------
  const guide = { on: false, seen: new Set(), cur: null };
  function startGuide() { guide.on = store.get("npg-guia") !== "vista"; guide.seen.clear(); guide.cur = null; }
  function tip(id, text, secs, force) {
    if (!guide.on || guide.seen.has(id) || (guide.cur && !force)) return;
    guide.seen.add(id); guide.cur = { id, text, t: secs };
  }
  function guideStep(dt, events) {
    if (!guide.on || race.t < 0) return;
    const p = player;
    if (guide.cur) { guide.cur.t -= dt; if (guide.cur.t <= 0 || (guide.cur.id === "breath" && !p.bOpen)) guide.cur = null; }
    if (events.some((e) => e.r === p && e.kind === "breathOpen")) tip("breath", say2("¡SE ILUMINÓ! TOCÁ RESPIRAR ANTES DE QUE SE APAGUE", "¡RESPIRÁ! APRETÁ ESPACIO ANTES DE QUE SE APAGUE"), p.bLen, true);
    tip("move", say2("TOCÁ ARRIBA O ABAJO DE LA IZQUIERDA PARA MOVERTE", "USÁ LAS FLECHAS ↑ Y ↓ PARA MOVERTE"), 3.5);
    if (race.objs.some((o) => !o.gone && o.x - p.x > 0 && o.x - p.x < 7)) tip("items", "LO VERDE TE ACELERA, LO ROJO TE FRENA", 3);
    if (guide.seen.has("breath") && race.t > 13) tip("fly", say2("MANTENÉ MARIPOSA PARA IR MÁS RÁPIDO: GASTA MUCHO AIRE", "MANTENÉ → PARA NADAR MARIPOSA: MÁS RÁPIDO, PERO GASTA AIRE"), 4);
    if (specialReady(p)) tip("special", say2("¡TU ESPECIAL ESTÁ LISTO! TOCÁ " + p.ch.special, "¡TU ESPECIAL ESTÁ LISTO! APRETÁ ← PARA " + p.ch.special), 3);
  }

  // ---------- pantallas ----------
  let race = null, player = null, chosen = null, lastCount = 99, endShown = false;

  function show(html) { scr.innerHTML = html; scr.style.display = "flex"; pad.style.display = "none"; keepAwake(false); }
  function selectScreen() {
    race = null;
    show(`<h1>NADAR POR LA GLORIA</h1><p>Elegí tu nadador</p>
      <div class="grid">${CHARS.map((c) => `<button class="ch" data-id="${c.id}">${faceImg(c, 56)}<b>${c.name}</b><small>${c.tag}</small>${statBars(c)}</button>`).join("")}</div>
      ${store.get("npg-guia") === "vista" ? `<button class="link" id="reguide">Ver la guía otra vez en la próxima carrera</button>` : ""}`);
    scr.querySelectorAll(".ch").forEach((b) => b.onclick = () => { Sound.unlock(); goFull(); chosen = CHARS.find((c) => c.id === b.dataset.id); drawScreen(); });
    const rg = document.getElementById("reguide");
    if (rg) rg.onclick = () => { store.set("npg-guia", ""); rg.textContent = "Listo: la próxima carrera viene con guía"; };
  }
  function drawScreen() {
    const draft = newRace(chosen);
    const [p, a, b] = draft.racers;
    const legend = Object.keys(ITEMS).map((k) => `<span class="it">${itemIcon(k)} ${ITEMS[k].name} ${ITEMS[k].good ? "▲" : "▼"}</span>`).join("");
    show(`<p class="sub">Sorteo de rivales</p>
      <div class="vs">${[p, a, b].map((r, i) => `<div class="card ${i ? "" : "me"}">${faceImg(r.ch, 52, i ? "normal" : "happy")}<b>${r.ch.name}${i ? "" : " (vos)"}</b><small>${r.ch.tag}</small>${statBars(r.ch)}<small>${r.ch.quirk}</small><small class="sp">${r.ch.special}: ${r.ch.specialInfo}</small></div>`).join("")}</div>
      <p class="help">${say2("Nadás crol solo. MARIPOSA acelera pero gasta aire. Tocá RESPIRAR cuando se ilumina.", "↑ ↓ moverte · → (mantener) mariposa · ESPACIO respirar · ← especial · P pausa")}</p>
      <div class="legend">${legend}</div><button class="go">¡A LA PILETA!</button>`);
    scr.querySelector(".go").onclick = () => {
      race = draft; player = race.racers[0]; lastCount = 99; endShown = false;
      startGuide(); setPaused(false);
      scr.style.display = "none"; pad.style.display = "block"; keepAwake(true);
    };
  }
  function endScreen() {
    const st = standings(race), pos = st.indexOf(player) + 1, win = pos === 1;
    if (guide.on) store.set("npg-guia", "vista");
    show(`<h1 class="${win ? "win" : "lose"}">${win ? "¡GANASTE!" : pos === 2 ? "SALISTE 2º" : "SALISTE 3º"}</h1>
      <p class="sub">${win ? "La gloria es tuya." : "Sin gloria esta vez. ¿La revancha?"}</p>
      <ol class="podio">${st.map((r, i) => `<li>${i + 1}º ${faceImg(r.ch, 38, r === st[0] ? "happy" : r.isPlayer ? "hurt" : "normal")} ${r.ch.name}${r.isPlayer ? " (vos)" : ""} <small>${r.finished ? r.finishT.toFixed(1) + " s" : Math.floor(r.x) + " m"}</small></li>`).join("")}</ol>
      <div class="row"><button class="go" id="again">OTRA VEZ</button><button id="change">CAMBIAR NADADOR</button></div>`);
    document.getElementById("again").onclick = drawScreen;
    document.getElementById("change").onclick = selectScreen;
  }

  // ---------- sonidos de lo que pasa ----------
  function playEvents(events) {
    // solo lo que le pasa al jugador; el final suena con el resultado
    for (const e of events) if (e.r === player && e.kind !== "finish") Sound.play(e.kind);
  }

  const setBtn = (id, ready, fill, label) => {
    const el = document.getElementById(id);
    el.classList.toggle("ready", ready); el.querySelector(".fill").style.width = (fill * 100) + "%";
    if (label) el.querySelector("span").textContent = label;
  };
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    if (race) {
      if (!paused) {
        stepRace(race, dt, input);
        const events = race.events; race.events = [];
        input.breathePressed = false; input.specialPressed = false;
        playEvents(events); guideStep(dt, events);
        const n = race.t < 0 ? Math.ceil(-race.t) : 0;
        if (n !== lastCount) { Sound.play(n ? "count" : "go"); lastCount = n; }
      }
      render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      if (guide.cur) drawTip(ctx, W, guide.cur.text, Math.min(1, guide.cur.t * 3));
      setBtn("bbr", player.bOpen, player.bOpen ? player.bT / player.bLen : 0, player.bOpen ? "¡RESPIRÁ!" : "RESPIRAR");
      setBtn("bsp", specialReady(player), player.charge, player.ch.special);
      if (race.over && !endShown && race.t - race.overT > 1.4) {
        endShown = true; Sound.play(standings(race)[0] === player ? "win" : "lose"); endScreen();
      }
    } else render(ctx, null, W, H);
    requestAnimationFrame(frame);
  }
  selectScreen();
  requestAnimationFrame(frame);
})();

function statBars(ch) {
  return `<span class="stats">${STATS.map(([k, label]) => `<span>${label}</span><span class="bar">${"●".repeat(ch[k])}<i>${"●".repeat(5 - ch[k])}</i></span>`).join("")}</span>`;
}
