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
  const input = { up: false, down: false, fly: false, pecho: false, breathe: false, specialPressed: false, tap: false };
  // en la largada y llegando a la pared, cualquier tecla o toque en la pantalla sirve para saltar o girar
  const pushOpen = () => race && !race.over && !paused && scr.style.display === "none" && ((player.onBlock && race.t >= 0) || (player.wallBar && player.turnQ === null));
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowRight: "fly", w: "up", W: "up", s: "down", S: "down", d: "fly", D: "fly", z: "pecho", Z: "pecho", " ": "breathe" };
  const presses = { ArrowLeft: "specialPressed", a: "specialPressed", A: "specialPressed" };
  window.addEventListener("keydown", (e) => {
    Sound.unlock();
    if (scr.style.display !== "none") { // en las pantallas, Enter o espacio aprietan el botón amarillo
      const go = scr.querySelector("button.go"), typing = e.target.tagName === "INPUT";
      if ((e.key === "Enter" || (e.key === " " && !typing)) && go) { e.preventDefault(); go.click(); }
      return;
    }
    const push = pushOpen() && !e.repeat && !"pP".includes(e.key) && e.key !== "Escape";
    if (push) { input.tap = true; e.preventDefault(); }
    if (keys[e.key]) { input[keys[e.key]] = true; e.preventDefault(); }
    if (presses[e.key] && !e.repeat && !push) { input[presses[e.key]] = true; e.preventDefault(); }
    if ((e.key === "p" || e.key === "P" || e.key === "Escape") && race && !race.over) setPaused(!paused);
    else if (paused && !e.repeat) setPaused(false);
  });
  window.addEventListener("keyup", (e) => { if (keys[e.key]) input[keys[e.key]] = false; });

  window.addEventListener("pointerdown", (e) => { if (pushOpen() && !e.target.closest("#pauseBtn, #mute")) input.tap = true; }, true);
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
    if (p.onBlock || p.wallBar) return;
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
  let mode = "quick", cup = null, quickCirc = store.get("npg-circ") || "sprint";
  // largo de la carrera rápida en cada pileta (100, 200 o 400 m en la olímpica)
  if (!CIRCUITS[quickCirc]) quickCirc = "sprint";
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
        <span>🏁 Tres modos: SPRINT (100 m sin vueltas), IDA Y VUELTA (200 m con vueltas americanas) y AGUAS ABIERTAS (500 m con corriente que cambia).</span>
        <span>🏊 Nadás crol solo. ${say2("Tocá arriba o abajo de la izquierda", "Con ↑ y ↓")} te movés.</span>
        <span>🔋 El aire es tu pila. En crol baja despacio; ${say2("manteniendo MARIPOSA", "manteniendo →")} vas mucho más rápido, pero baja rápido.</span>
        <span>🐸 ${say2("Manteniendo PECHO", "Manteniendo Z")} vas más lento que en crol, pero casi no gastás aire: sirve para llegar al final sin parar.</span>
        <span>💨 ${say2("Mantené RESPIRAR", "Mantené ESPACIO")} para recargarla: mientras respirás vas más lento. Sin aire, casi no avanzás.</span>
        <span>🚀 En la salida y en cada vuelta americana aparece una barra que va y viene: ${say2("tocá la pantalla", "apretá cualquier tecla")} cuando llega al verde y salís disparado, con turbo.</span>
        <span>🟢 Lo verde te acelera, 🔴 lo rojo te frena. El especial ${say2("", "(←) ")}se carga solo.</span>
        <span>🏅 En la copa: 1º suma 10, 2º suma 6, 3º suma 3. Extra: +2 si agarrás dulce de leche y +2 si nunca te quedás sin aire.</span>
      </div>
      <div class="side"><div class="rank"><b>RÉCORDS DEL GRUPO</b><div class="circs boards">${BOARDS.map(([k, n]) => `<button class="circ ${k === boardKey ? "on" : ""}" data-b="${k}">${n}</button>`).join("")}</div><div id="board"><small>Cargando…</small></div></div>
      <div class="rank"><b>RANKING DE COPAS (este ${say2("celu", "navegador")})</b>${rows.length ? `<table><tr><th></th><th>Apodo</th><th>Puntos</th><th>Copas ganadas</th></tr>${rows.slice(0, 10).map(([n, v], i) => `<tr class="${n === alias() ? "me" : ""}"><td>${i + 1}º</td><td>${esc(n)}</td><td>${v.pts}</td><td>${v.won} de ${v.played}</td></tr>`).join("")}</table>` : `<small>Todavía no se jugó ninguna copa en este ${say2("celu", "navegador")}.</small>`}</div></div></div>
      <button class="link" id="opinar">💬 Contanos qué te parece el juego</button>
      ${store.get("npg-guia") === "vista" ? `<button class="link" id="reguide">Ver la guía otra vez en la próxima carrera</button>` : ""}`);
    const inp = document.getElementById("alias");
    inp.oninput = () => { store.set("npg-apodo", inp.value.trim()); document.getElementById("aliasErr").hidden = true; };
    document.getElementById("mCup").onclick = () => {
      if (!alias()) { document.getElementById("aliasErr").hidden = false; inp.focus(); return; }
      Sound.unlock(); goFull(); mode = "cup"; selectScreen();
    };
    document.getElementById("mQuick").onclick = () => { Sound.unlock(); goFull(); mode = "quick"; selectScreen(); };
    document.getElementById("opinar").onclick = () => feedbackScreen(homeScreen);
    scr.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => {
      boardKey = b.dataset.b; scr.querySelectorAll("[data-b]").forEach((x) => x.classList.toggle("on", x === b)); fillBoard();
    });
    fillBoard();
    const rg = document.getElementById("reguide");
    if (rg) rg.onclick = () => { store.set("npg-guia", ""); rg.textContent = "Listo: la próxima carrera viene con guía"; };
  }

  // Los récords del grupo (en la nube): los 10 mejores tiempos de cada modo.
  const BOARDS = [["sprint-100", "SPRINT 100 m"], ["idavuelta-200", "IDA Y VUELTA 200 m"], ["abiertas-150", "AGUAS ABIERTAS 500 m"]];
  let boardKey = "sprint-100";
  async function fillBoard() {
    const key = boardKey, rows = await Nube.board(key), el = document.getElementById("board");
    if (!el || key !== boardKey) return;
    if (!rows) { el.innerHTML = `<small>Los récords del grupo aparecen cuando el juego está conectado a internet.</small>`; return; }
    if (!rows.length) { el.innerHTML = `<small>Todavía nadie marcó tiempo acá. ¡Sé el primero!</small>`; return; }
    el.innerHTML = `<table>${rows.map((x, i) => { const c = CHARS.find((k) => k.id === x.char);
      return `<tr class="${x.me ? "me" : ""}"><td>${i + 1}º</td><td>${esc(x.alias)}</td><td>${c ? faceImg(c, 20) + " " + c.name : ""}</td><td>${x.time.toFixed(2)} s</td></tr>`; }).join("")}</table>`;
  }

  // Opinar: de 1 a 5 estrellas y un comentario; va a la nube y solo lo lee Matias.
  function feedbackScreen(back) {
    let rating = 0;
    show(`<h1 class="small">¿Qué te parece el juego?</h1><p class="sub">Lo lee Matias. Contá qué te gustó, qué no se entiende o qué le sumarías.</p>
      <div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button class="star" data-n="${n}">★</button>`).join("")}</div>
      <textarea id="fbText" maxlength="500" rows="3" placeholder="Tu comentario (opcional)"></textarea>
      <p class="sub" id="fbMsg"></p>
      <div class="row"><button class="go" id="fbSend">ENVIAR</button><button id="fbBack">VOLVER</button></div>`);
    const paint = () => scr.querySelectorAll(".star").forEach((b) => b.classList.toggle("on", +b.dataset.n <= rating));
    scr.querySelectorAll(".star").forEach((b) => b.onclick = () => { rating = +b.dataset.n; paint(); });
    document.getElementById("fbBack").onclick = back;
    const msg = document.getElementById("fbMsg"), send = document.getElementById("fbSend");
    send.onclick = async () => {
      const text = document.getElementById("fbText").value.trim();
      if (!rating) { msg.textContent = "Elegí de 1 a 5 estrellas."; return; }
      if (/http|www\.|\.com\b/i.test(text)) { msg.textContent = "Sin links, porfa."; return; }
      send.disabled = true; msg.textContent = "Enviando…";
      const ok = await Nube.feedback(rating, text, { alias: alias().slice(0, 16), char: chosen ? chosen.id : "", mode: quickCirc });
      send.disabled = false;
      if (ok) { msg.textContent = "¡Gracias! Lo vamos a leer."; send.remove(); document.getElementById("fbBack").textContent = "LISTO"; }
      else msg.textContent = "No se pudo enviar ahora. Esperá un minuto y probá de nuevo.";
    };
  }
  // Compartir el resultado con el link al juego.
  function shareBtn(text) {
    const b = document.getElementById("share"); if (!b) return;
    b.onclick = async () => { const r = await Nube.share(text); if (r === "copiado") b.textContent = "✔ LINK COPIADO"; };
  }

  function selectScreen() {
    race = null;
    const qc = CIRCUITS[quickCirc];
    const circs = mode === "quick" ? `<div class="circs">${Object.values(CIRCUITS).map((c) => `<button class="circ ${c.id === quickCirc ? "on" : ""}" data-c="${c.id}">${c.name}<small>${c.open ? c.show + " m en el río" : c.len > c.pool ? c.len + " m, ida y vuelta" : c.len + " m, sin vueltas"}</small></button>`).join("")}</div>` : "";
    show(`<p class="sub">${mode === "cup" ? "🏆 COPA · " + esc(alias()) : "CARRERA RÁPIDA"}</p><h1 class="small">Elegí tu nadador</h1>${circs}
      <div class="grid">${CHARS.map((c) => `<button class="ch" data-id="${c.id}">${faceImg(c, 56)}<b>${c.name}</b><small>${c.tag}</small>${statBars(c)}</button>`).join("")}</div>
      <button class="link" id="back">← Volver al inicio</button>`);
    scr.querySelectorAll(".circ[data-c]").forEach((b) => b.onclick = () => { quickCirc = b.dataset.c; store.set("npg-circ", quickCirc); selectScreen(); });
    scr.querySelectorAll(".ch").forEach((b) => b.onclick = () => {
      Sound.unlock(); chosen = CHARS.find((c) => c.id === b.dataset.id);
      if (mode === "cup") cup = { rivals: drawRivals(chosen), i: 0, pts: {}, done: false };
      drawScreen();
    });
    document.getElementById("back").onclick = homeScreen;
  }

  function drawScreen() {
    const circ = cup ? CIRCUITS[CUP[cup.i]] : CIRCUITS[quickCirc];
    const draft = newRace(chosen, circ, cup ? cup.rivals : undefined, circ.len);
    const [p, a, b] = draft.racers;
    const legend = Object.keys(ITEMS).map((k) => `<span class="it">${itemIcon(k)} ${ITEMS[k].name} ${ITEMS[k].good ? "▲" : "▼"}${ITEMS[k].air ? " +AIRE" : ""}</span>`).join("");
    const head = cup ? `🏆 COPA · CARRERA ${cup.i + 1} DE ${CUP.length}` : "CARRERA RÁPIDA";
    const pts = (r) => cup && cup.i ? `<small class="pts">${cup.pts[r.ch.id] || 0} puntos</small>` : "";
    show(`<p class="sub">${head}</p><h1 class="small">${circ.name} · ${shownLen(draft)} m</h1><p class="help">${circ.info}${draft.laps > 1 ? ` Son ${draft.laps} largos: ${draft.laps - 1 === 1 ? "1 vuelta americana" : draft.laps - 1 + " vueltas americanas"}.` : ""}</p>
      <div class="vs">${[p, a, b].map((r, i) => `<div class="card ${i ? "" : "me"}">${faceImg(r.ch, 52, i ? "normal" : "happy")}<b>${r.ch.name}${i ? "" : " (vos)"}</b>${pts(r)}<small>${r.ch.tag}</small>${statBars(r.ch)}<small>${r.ch.quirk}</small><small class="sp">${r.ch.special}: ${r.ch.specialInfo}</small></div>`).join("")}</div>
      <p class="help">${say2("Nadás crol solo. MARIPOSA va más rápido y gasta más pila; PECHO va lento y casi no gasta. Mantené RESPIRAR para recargar.", "↑ ↓ moverte · → mariposa · Z pecho · ESPACIO respirar (mantener) · ← especial · P pausa")}</p>
      <div class="legend">${legend}</div><button class="go">¡AL AGUA!</button>`);
    scr.querySelector(".go").onclick = () => {
      race = draft; player = race.racers[0]; lastCount = 99; endShown = false;
      startGuide(); setPaused(false);
      scr.style.display = "none"; pad.style.display = "block"; keepAwake(true);
    };
  }

  // El podio: el 1º en el medio y más alto, el 2º a la izquierda y el 3º a la derecha.
  // items: [{ ch, isPlayer, sub, extra }] ya ordenados del 1º al 3º.
  function podium(items) {
    const MEDAL = ["🥇", "🥈", "🥉"];
    const col = (x, i) => !x ? "" : `<div class="step s${i + 1} ${x.isPlayer ? "me" : ""}">
      <div class="who">${i ? "" : `<span class="rays"></span><i class="cup">🏆</i>`}
        <span class="pic">${faceImg(x.ch, i ? 46 : 60, i ? (x.isPlayer ? "hurt" : "normal") : "happy")}</span>
        <b>${MEDAL[i]} ${x.ch.name}${x.isPlayer ? ` <em>VOS</em>` : ""}</b><small>${x.sub}</small>${x.extra || ""}</div>
      <div class="block"><span>${i + 1}</span></div></div>`;
    const won = items[0] && items[0].isPlayer;
    const bits = won ? Array.from({ length: 36 }, (_, i) => `<i class="bit" style="left:${(i * 37) % 100}%;background:${["#FFD84A", "#FF6FB0", "#7CFC6A", "#5FD0F5", "#FF8A2A"][i % 5]};animation-delay:${1.1 + (i % 9) * 0.12}s;--dx:${((i * 53) % 80) - 40}px"></i>`).join("") : "";
    return `<div class="podium">${bits}${col(items[1], 1)}${col(items[0], 0)}${col(items[2], 2)}</div>`;
  }
  function endScreen() {
    const st = standings(race), pos = st.indexOf(player) + 1, win = pos === 1;
    if (guide.on) store.set("npg-guia", "vista");
    const time = (r) => r.finished ? r.finishT.toFixed(1) + " s" : shownM(race, r.x) + " m";
    const title = `<h1 class="${win ? "win" : "lose"}">${win ? "¡GANASTE!" : pos === 2 ? "SALISTE 2º" : "SALISTE 3º"}</h1>`;
    const qs = player.qs || [], key = race.circ.id + "-" + race.len, myTime = player.finished ? Math.round(player.finishT * 100) / 100 : null;
    const prevBest = +(store.get("npg-pb-" + key) || 0); // tu mejor marca en este celu
    if (myTime && (!prevBest || myTime < prevBest)) store.set("npg-pb-" + key, myTime);
    Nube.saveRun({ alias: alias().slice(0, 16), char: player.ch.id, mode: race.circ.id, dist: race.len, place: pos, time: myTime, cup: !!cup,
      dive: Math.round((qs[0] || 0) * 100) / 100, turns: qs.length > 1 ? Math.round(qs.slice(1).reduce((a, b) => a + b, 0) / (qs.length - 1) * 100) / 100 : null });
    const record = myTime && (!prevBest || myTime < prevBest) ? `<p class="sub rec">⏱️ ¡Tu mejor marca en ${race.circ.name} ${shownLen(race)} m! ${!Nube.online() ? "" : alias() ? "Va a los récords del grupo." : "Poné tu apodo en el inicio para entrar a los récords del grupo."}</p>` : "";
    const shareText = `Nadé ${shownLen(race)} m de ${race.circ.name} con ${player.ch.name} en ${myTime ? myTime.toFixed(1) + " s" : "—"} y salí ${pos}º en Nadar por la gloria. ¿Me ganás?`;
    if (!cup) {
      show(`${title}<p class="sub">${win ? "La gloria es tuya." : "Sin gloria esta vez. ¿La revancha?"}</p>
        ${podium(st.map((r) => ({ ch: r.ch, isPlayer: r.isPlayer, sub: time(r) })))}${record}
        <div class="row"><button class="go" id="again">OTRA VEZ</button><button id="change">CAMBIAR NADADOR</button></div>
        <div class="row"><button id="share">📣 COMPARTIR</button><button id="fb">💬 OPINAR</button></div>
        <button class="link" id="home">← Volver al inicio</button>`);
      shareBtn(shareText); document.getElementById("fb").onclick = () => feedbackScreen(homeScreen);
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
      ${podium(pts.map((x) => ({ ch: x.r.ch, isPlayer: x.r.isPlayer, sub: time(x.r), extra: `<span class="plus">+${x.total}</span>${extras(x) ? `<small class="ex">${extras(x)}</small>` : ""}` })))}
      ${record}${cupTable()}
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
      ${podium(order.map((c) => ({ ch: c, isPlayer: c === chosen, sub: (cup.pts[c.id] || 0) + " puntos" })))}
      <p class="sub">Sumaste <b>${mine}</b> puntos para ${esc(alias())}. Vas <b>${place}º</b> en el ranking.</p>
      <div class="row"><button class="go" id="again">OTRA COPA</button><button id="change">AL INICIO</button></div>
      <div class="row"><button id="share">📣 COMPARTIR</button><button id="fb">💬 OPINAR</button></div>`);
    shareBtn(`${champ ? "¡Gané la copa" : "Jugué la copa"} de Nadar por la gloria con ${chosen.name}: ${mine} puntos. ¿Me ganás?`);
    document.getElementById("fb").onclick = () => feedbackScreen(homeScreen);
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
        input.specialPressed = false; input.tap = false;
        playEvents(events); guideStep(dt, events);
        const n = race.t < 0 ? Math.ceil(-race.t) : 0;
        if (n !== lastCount) { Sound.play(n ? "count" : "go"); lastCount = n; }
      }
      render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      if (guide.cur) drawTip(ctx, W, guide.cur.text, Math.min(1, guide.cur.t * 3));
      const bar = (player.onBlock && race.t >= 0) || (player.wallBar && player.turnQ === null);
      if (bar) setBtn("bbr", true, player.onBlock ? barAt(0, race.t) : barAt(player.barT0, race.t), "¡TOCÁ!");
      else setBtn("bbr", player.air < 0.3 && !player.breathing, player.air, player.breathing ? "RECARGANDO" : "RESPIRAR");
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
