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
  // espacio (mantener) respirar, Z (mantener) pecho, ← especial. Enter sirve para los botones de las pantallas.
  const PC = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.body.classList.toggle("pc", PC);
  const say2 = (touch, pc) => (PC ? pc : touch);
  const input = { up: false, down: false, fly: false, pecho: false, breathe: false, specialPressed: false };
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowRight: "fly", w: "up", W: "up", s: "down", S: "down", d: "fly", D: "fly", z: "pecho", Z: "pecho", " ": "breathe" };
  const presses = { ArrowLeft: "specialPressed", a: "specialPressed", A: "specialPressed" };
  window.addEventListener("keydown", (e) => {
    Sound.unlock();
    if (scr.style.display !== "none") { // en las pantallas, Enter o espacio aprietan el botón amarillo
      const go = scr.querySelector("button.go"), typing = e.target.tagName === "INPUT";
      if ((e.key === "Enter" || (e.key === " " && !typing)) && go) { e.preventDefault(); go.click(); }
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
    if (guide.cur) { guide.cur.t -= dt; if (guide.cur.t <= 0 || (guide.cur.id === "breath" && p.breathing)) guide.cur = null; }
    if (p.air < 0.45) tip("breath", say2("SE TE VA EL AIRE: MANTENÉ RESPIRAR PARA RECARGAR LA PILA", "SE TE VA EL AIRE: MANTENÉ ESPACIO PARA RECARGAR LA PILA"), 4, true);
    tip("move", say2("TOCÁ ARRIBA O ABAJO DE LA IZQUIERDA PARA MOVERTE", "USÁ LAS FLECHAS ↑ Y ↓ PARA MOVERTE"), 3.5);
    if (race.objs.some((o) => !o.gone && o.x - p.x > 0 && o.x - p.x < 7)) tip("items", "LO VERDE TE ACELERA, LO ROJO TE FRENA", 3);
    if (guide.seen.has("breath") && race.t > 8) tip("fly", say2("MANTENÉ MARIPOSA: VAS MÁS RÁPIDO, PERO LA PILA BAJA MÁS RÁPIDO", "MANTENÉ →: MARIPOSA VA MÁS RÁPIDO, PERO LA PILA BAJA MÁS RÁPIDO"), 4);
    if (specialReady(p)) tip("special", say2("¡TU ESPECIAL ESTÁ LISTO! TOCÁ " + p.ch.special, "¡TU ESPECIAL ESTÁ LISTO! APRETÁ ← PARA " + p.ch.special), 3);
  }

  // ---------- pantallas ----------
  // Inicio → (copa o carrera rápida) → elegir nadador → sorteo y circuito → carrera → resultado.
  // La copa son 3 carreras con los mismos rivales; lo que sumás va al ranking guardado en este celu.
  let race = null, player = null, chosen = null, lastCount = 99, endShown = false;
  let mode = "quick", cup = null, quickCirc = store.get("npg-circ") || "olimpica";
  if (!CIRCUITS[quickCirc]) quickCirc = "olimpica";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const alias = () => (store.get("npg-apodo") || "").trim();
  function ranking() { try { return JSON.parse(store.get("npg-ranking") || "{}"); } catch (e) { return {}; } }
  const rankRows = () => Object.entries(ranking()).sort((a, b) => b[1].pts - a[1].pts);

  function show(html) { scr.innerHTML = html; scr.style.display = "flex"; pad.style.display = "none"; keepAwake(false); scr.scrollTop = 0; }

  function homeScreen() {
    race = null; cup = null;
    const rows = rankRows();
    show(`<h1>NADAR POR LA GLORIA</h1><p class="sub">Las carreras del grupo de natación</p>
      <label class="alias">TU APODO <input id="alias" maxlength="16" autocomplete="off" value="${esc(alias())}" placeholder="Para el ranking"></label>
      <p class="err" id="aliasErr" hidden>Poné tu apodo para jugar la copa.</p>
      <div class="modes">
        <button class="go mode" id="mCup">🏆 COPA<small>3 carreras seguidas: sumás puntos para el ranking</small></button>
        <button class="mode alt" id="mQuick">CARRERA RÁPIDA<small>Una carrera suelta para practicar</small></button>
      </div>
      <div class="cols"><div class="how"><b>Cómo se juega</b>
        <span>🏊 Nadás crol solo. ${say2("Tocá arriba o abajo de la izquierda", "Con ↑ y ↓")} te movés.</span>
        <span>🔋 El aire es tu pila. En crol baja despacio; ${say2("manteniendo MARIPOSA", "manteniendo →")} vas mucho más rápido, pero baja rápido.</span>
        <span>🐸 ${say2("Manteniendo PECHO", "Manteniendo Z")} vas más lento que en crol, pero casi no gastás aire: sirve para llegar al final sin parar.</span>
        <span>💨 ${say2("Mantené RESPIRAR", "Mantené ESPACIO")} para recargarla: mientras respirás vas más lento. Sin aire, casi no avanzás.</span>
        <span>🟢 Lo verde te acelera, 🔴 lo rojo te frena. El especial ${say2("", "(←) ")}se carga solo.</span>
        <span>🏅 En la copa: 1º suma 10, 2º suma 6, 3º suma 3. Extra: +2 si agarrás dulce de leche y +2 si nunca te quedás sin aire.</span>
      </div>
      <div class="rank"><b>RANKING</b>${rows.length ? `<table><tr><th></th><th>Apodo</th><th>Puntos</th><th>Copas ganadas</th></tr>${rows.slice(0, 10).map(([n, v], i) => `<tr class="${n === alias() ? "me" : ""}"><td>${i + 1}º</td><td>${esc(n)}</td><td>${v.pts}</td><td>${v.won} de ${v.played}</td></tr>`).join("")}</table>` : `<small>Todavía no se jugó ninguna copa en este ${say2("celu", "navegador")}.</small>`}</div></div>
      ${store.get("npg-guia") === "vista" ? `<button class="link" id="reguide">Ver la guía otra vez en la próxima carrera</button>` : ""}`);
    const inp = document.getElementById("alias");
    inp.oninput = () => { store.set("npg-apodo", inp.value.trim()); document.getElementById("aliasErr").hidden = true; };
    document.getElementById("mCup").onclick = () => {
      if (!alias()) { document.getElementById("aliasErr").hidden = false; inp.focus(); return; }
      Sound.unlock(); goFull(); mode = "cup"; selectScreen();
    };
    document.getElementById("mQuick").onclick = () => { Sound.unlock(); goFull(); mode = "quick"; selectScreen(); };
    const rg = document.getElementById("reguide");
    if (rg) rg.onclick = () => { store.set("npg-guia", ""); rg.textContent = "Listo: la próxima carrera viene con guía"; };
  }

  function selectScreen() {
    race = null;
    const circs = mode === "quick" ? `<div class="circs">${Object.values(CIRCUITS).map((c) => `<button class="circ ${c.id === quickCirc ? "on" : ""}" data-c="${c.id}">${c.name}<small>${c.len} m</small></button>`).join("")}</div>` : "";
    show(`<p class="sub">${mode === "cup" ? "🏆 COPA · " + esc(alias()) : "CARRERA RÁPIDA"}</p><h1 class="small">Elegí tu nadador</h1>${circs}
      <div class="grid">${CHARS.map((c) => `<button class="ch" data-id="${c.id}">${faceImg(c, 56)}<b>${c.name}</b><small>${c.tag}</small>${statBars(c)}</button>`).join("")}</div>
      <button class="link" id="back">← Volver al inicio</button>`);
    scr.querySelectorAll(".circ").forEach((b) => b.onclick = () => {
      quickCirc = b.dataset.c; store.set("npg-circ", quickCirc);
      scr.querySelectorAll(".circ").forEach((x) => x.classList.toggle("on", x === b));
    });
    scr.querySelectorAll(".ch").forEach((b) => b.onclick = () => {
      Sound.unlock(); chosen = CHARS.find((c) => c.id === b.dataset.id);
      if (mode === "cup") cup = { rivals: drawRivals(chosen), i: 0, pts: {}, done: false };
      drawScreen();
    });
    document.getElementById("back").onclick = homeScreen;
  }

  function drawScreen() {
    const circ = cup ? CIRCUITS[CUP[cup.i]] : CIRCUITS[quickCirc];
    const draft = newRace(chosen, circ, cup ? cup.rivals : undefined);
    const [p, a, b] = draft.racers;
    const legend = Object.keys(ITEMS).map((k) => `<span class="it">${itemIcon(k)} ${ITEMS[k].name} ${ITEMS[k].good ? "▲" : "▼"}${ITEMS[k].air ? " +AIRE" : ""}</span>`).join("");
    const head = cup ? `🏆 COPA · CARRERA ${cup.i + 1} DE ${CUP.length}` : "CARRERA RÁPIDA";
    const pts = (r) => cup && cup.i ? `<small class="pts">${cup.pts[r.ch.id] || 0} puntos</small>` : "";
    show(`<p class="sub">${head}</p><h1 class="small">${circ.name}</h1><p class="help">${circ.info}</p>
      <div class="vs">${[p, a, b].map((r, i) => `<div class="card ${i ? "" : "me"}">${faceImg(r.ch, 52, i ? "normal" : "happy")}<b>${r.ch.name}${i ? "" : " (vos)"}</b>${pts(r)}<small>${r.ch.tag}</small>${statBars(r.ch)}<small>${r.ch.quirk}</small><small class="sp">${r.ch.special}: ${r.ch.specialInfo}</small></div>`).join("")}</div>
      <p class="help">${say2("Nadás crol solo. MARIPOSA va más rápido y gasta más pila; PECHO va lento y casi no gasta. Mantené RESPIRAR para recargar.", "↑ ↓ moverte · → mariposa · Z pecho · ESPACIO respirar (mantener) · ← especial · P pausa")}</p>
      <div class="legend">${legend}</div><button class="go">¡AL AGUA!</button>`);
    scr.querySelector(".go").onclick = () => {
      race = draft; player = race.racers[0]; lastCount = 99; endShown = false;
      startGuide(); setPaused(false);
      scr.style.display = "none"; pad.style.display = "block"; keepAwake(true);
    };
  }

  function endScreen() {
    const st = standings(race), pos = st.indexOf(player) + 1, win = pos === 1;
    if (guide.on) store.set("npg-guia", "vista");
    const time = (r) => r.finished ? r.finishT.toFixed(1) + " s" : Math.floor(r.x) + " m";
    const face = (r) => faceImg(r.ch, 38, r === st[0] ? "happy" : r.isPlayer ? "hurt" : "normal");
    const title = `<h1 class="${win ? "win" : "lose"}">${win ? "¡GANASTE!" : pos === 2 ? "SALISTE 2º" : "SALISTE 3º"}</h1>`;
    if (!cup) {
      show(`${title}<p class="sub">${win ? "La gloria es tuya." : "Sin gloria esta vez. ¿La revancha?"}</p>
        <ol class="podio">${st.map((r, i) => `<li>${i + 1}º ${face(r)} ${r.ch.name}${r.isPlayer ? " (vos)" : ""} <small>${time(r)}</small></li>`).join("")}</ol>
        <div class="row"><button class="go" id="again">OTRA VEZ</button><button id="change">CAMBIAR NADADOR</button></div>
        <button class="link" id="home">← Volver al inicio</button>`);
      document.getElementById("again").onclick = drawScreen;
      document.getElementById("change").onclick = selectScreen;
      document.getElementById("home").onclick = homeScreen;
      return;
    }
    // copa: los puntos de esta carrera y cómo va la tabla
    const pts = racePoints(race);
    for (const x of pts) cup.pts[x.r.ch.id] = (cup.pts[x.r.ch.id] || 0) + x.total;
    cup.i++;
    const last = cup.i >= CUP.length;
    const extras = (x) => [x.r.gotDulce ? "dulce +" + BONUS.dulce : "", !x.r.ranOut ? "aire +" + BONUS.air : ""].filter(Boolean).join(" · ");
    show(`<p class="sub">🏆 COPA · CARRERA ${cup.i} DE ${CUP.length} · ${race.circ.name}</p>${title}
      <ol class="podio">${pts.map((x) => `<li>${x.place}º ${face(x.r)} ${x.r.ch.name}${x.r.isPlayer ? " (vos)" : ""} <small>${time(x.r)}</small> <span class="plus">+${x.total}</span>${extras(x) ? `<small class="ex">${extras(x)}</small>` : ""}</li>`).join("")}</ol>
      ${cupTable()}
      <button class="go" id="next">${last ? "VER QUIÉN GANÓ LA COPA" : "SIGUIENTE: " + CIRCUITS[CUP[cup.i]].name}</button>`);
    document.getElementById("next").onclick = last ? cupEndScreen : drawScreen;
  }
  function cupOrder() { return [chosen, ...cup.rivals].sort((a, b) => (cup.pts[b.id] || 0) - (cup.pts[a.id] || 0)); }
  function cupTable() {
    return `<div class="rank"><b>TABLA DE LA COPA</b><table>${cupOrder().map((c, i) => `<tr class="${c === chosen ? "me" : ""}"><td>${i + 1}º</td><td>${faceImg(c, 24)} ${c.name}</td><td>${cup.pts[c.id] || 0} puntos</td></tr>`).join("")}</table></div>`;
  }
  function cupEndScreen() {
    const order = cupOrder(), champ = order[0] === chosen, mine = cup.pts[chosen.id] || 0;
    if (!cup.done) { // al ranking, una sola vez por copa
      cup.done = true;
      const rk = ranking(), me = rk[alias()] || { pts: 0, won: 0, played: 0 };
      me.pts += mine; me.played++; if (champ) me.won++;
      rk[alias()] = me; store.set("npg-ranking", JSON.stringify(rk));
      Sound.play(champ ? "win" : "lose");
    }
    const place = rankRows().findIndex(([n]) => n === alias()) + 1;
    show(`<p class="sub">🏆 FIN DE LA COPA</p>
      <h1 class="${champ ? "win" : "lose"}">${champ ? "¡GANASTE LA COPA!" : "GANÓ " + order[0].name}</h1>
      <div class="trophy">${faceImg(order[0], 72, "happy")}<span>🏆</span></div>
      ${cupTable()}
      <p class="sub">Sumaste <b>${mine}</b> puntos para ${esc(alias())}. Vas <b>${place}º</b> en el ranking.</p>
      <div class="row"><button class="go" id="again">OTRA COPA</button><button id="change">AL INICIO</button></div>`);
    document.getElementById("again").onclick = () => { mode = "cup"; selectScreen(); };
    document.getElementById("change").onclick = homeScreen;
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
        input.specialPressed = false;
        playEvents(events); guideStep(dt, events);
        const n = race.t < 0 ? Math.ceil(-race.t) : 0;
        if (n !== lastCount) { Sound.play(n ? "count" : "go"); lastCount = n; }
      }
      render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      if (guide.cur) drawTip(ctx, W, guide.cur.text, Math.min(1, guide.cur.t * 3));
      setBtn("bbr", player.air < 0.3 && !player.breathing, player.air, player.breathing ? "RECARGANDO" : "RESPIRAR");
      setBtn("bsp", specialReady(player), player.charge, player.ch.special);
      if (race.over && !endShown && race.t - race.overT > 1.4) {
        endShown = true; Sound.play(standings(race)[0] === player ? "win" : "lose"); endScreen();
      }
    } else render(ctx, null, W, H);
    requestAnimationFrame(frame);
  }
  homeScreen();
  requestAnimationFrame(frame);
})();

function statBars(ch) {
  return `<span class="stats">${STATS.map(([k, label]) => `<span>${label}</span><span class="bar">${"●".repeat(ch[k])}<i>${"●".repeat(5 - ch[k])}</i></span>`).join("")}</span>`;
}
