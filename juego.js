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
  // espacio (mantener) respirar, Z (mantener) pecho. Enter sirve para los botones de las pantallas.
  const PC = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.body.classList.toggle("pc", PC);
  const say2 = (touch, pc) => (PC ? pc : touch);
  const input = { up: false, down: false, fly: false, pecho: false, breathe: false, tap: false };
  // en la largada y llegando a la pared, cualquier tecla o toque en la pantalla sirve para saltar o girar
  const pushOpen = () => race && !race.over && !paused && scr.style.display === "none" && ((player.onBlock && race.t >= 0) || (player.wallBar && player.turnQ === null));
  const keys = { ArrowUp: "up", ArrowDown: "down", ArrowRight: "fly", w: "up", W: "up", s: "down", S: "down", d: "fly", D: "fly", z: "pecho", Z: "pecho", " ": "breathe" };
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
    const hold = el.dataset.hold;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); Sound.unlock(); capture(el, e); el.classList.add("on");
      if (hold) input[hold] = true;
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
  pauseEl.addEventListener("pointerdown", (e) => {
    e.preventDefault(); setPaused(false);
    if (e.target.closest("#quit")) { race = null; homeScreen(); } // abandona la carrera (no cuenta)
  });
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

  // ---------- guía de la carrera ----------
  // En los niveles que enseñan (1 a 10) los avisos salen siempre; en la práctica y la copa, solo la primera vez.
  const guide = { on: false, seen: new Set(), cur: null };
  function startGuide() { guide.on = mode === "level" ? level.n <= 10 : store.get("npg-guia") !== "vista"; guide.seen.clear(); guide.cur = null; }
  function tip(id, text, secs, force) {
    if (!guide.on || guide.seen.has(id) || (guide.cur && !force)) return;
    guide.seen.add(id); guide.cur = { id, text, t: secs };
  }
  function guideStep(dt) {
    if (!guide.on || race.t < 0) return;
    const p = player;
    if (guide.cur) { guide.cur.t -= dt; if (guide.cur.t <= 0 || (guide.cur.id === "breath" && p.breathing)) guide.cur = null; }
    if (p.onBlock || p.wallBar) return;
    if (race.air && p.air < 0.45) tip("breath", say2("SE TE VA EL AIRE: MANTENÉ RESPIRAR PARA RECARGAR LA PILA", "SE TE VA EL AIRE: MANTENÉ ESPACIO PARA RECARGAR LA PILA"), 4, true);
    tip("move", say2("TOCÁ ARRIBA O ABAJO DE LA IZQUIERDA PARA MOVERTE", "USÁ LAS FLECHAS ↑ Y ↓ PARA MOVERTE"), 3.5);
    if (race.objs.some((o) => !o.gone && o.x - p.x > 0 && o.x - p.x < 7)) tip("items", race.objs.some((o) => !ITEMS[o.kind].good) ? "LO VERDE TE ACELERA, LO ROJO TE FRENA" : "AGARRÁ LO VERDE: TE ACELERA", 3);
    if (race.fly && race.t > (race.air ? 6 : 2)) tip("fly", say2("MANTENÉ MARIPOSA: VAS MÁS RÁPIDO, PERO LA PILA BAJA MÁS RÁPIDO", "MANTENÉ →: MARIPOSA VA MÁS RÁPIDO, PERO LA PILA BAJA MÁS RÁPIDO"), 4);
    if (race.pecho && race.air && p.air < 0.25 && race.len - p.x < 25) tip("pecho", say2("MANTENÉ PECHO: CASI NO GASTA AIRE Y LLEGÁS SIN PARAR", "MANTENÉ Z: PECHO CASI NO GASTA AIRE Y LLEGÁS SIN PARAR"), 4, true);
  }

  // ---------- el progreso (en este celu) ----------
  const myLevel = () => Math.max(1, +store.get("npg-lvl") || 1);
  function starsMap() { try { return JSON.parse(store.get("npg-stars") || "{}"); } catch (e) { return {}; } }
  const totalStars = () => Object.values(starsMap()).reduce((a, b) => a + b, 0);
  const cupsWon = () => +store.get("npg-copas") || 0;
  const starStr = (n, of = 3) => "★".repeat(n) + `<i>${"★".repeat(of - n)}</i>`;
  // tu nivel en la comunidad: solo si tenés apodo
  async function pushProgress() {
    if (!alias()) return;
    const r = await Nube.saveProgress({ alias: alias().slice(0, 16), lvl: myLevel(), stars: totalStars(), cups: cupsWon(), char: store.get("npg-char") || "facu", map: starsMap() });
    if (r === "taken") aliasTaken();
  }
  function aliasTaken() {
    const e = document.getElementById("aliasErr");
    if (e) { e.textContent = `«${alias()}» ya es de alguien que entró con Google. Elegí otro apodo.`; e.hidden = false; }
  }
  // Entrar con Google: se junta lo de este celu con lo que la cuenta tenía guardado (queda lo mejor de cada nivel).
  function mergeSaved(x) {
    if (!x) return;
    if (x.lvl > myLevel()) store.set("npg-lvl", x.lvl);
    const sm = starsMap(); for (const [n, v] of Object.entries(x.map || {})) if (v > (sm[n] || 0)) sm[n] = v;
    store.set("npg-stars", JSON.stringify(sm));
    if ((x.cups || 0) > cupsWon()) store.set("npg-copas", x.cups);
    if (x.alias) store.set("npg-apodo", x.alias);
    if (!store.get("npg-char") && x.char) { store.set("npg-char", x.char); chosen = CHARS.find((c) => c.id === x.char) || null; }
  }
  // Entrar con Google y juntar lo de este aparato con lo que la cuenta tenía guardado.
  async function googleIn() {
    const r = await Nube.signIn();
    if (!r.ok) return r;
    mergeSaved(r.saved);
    if (!alias()) store.set("npg-apodo", (Nube.account().name || "").slice(0, 16));
    await pushProgress();
    return r;
  }
  // Al pasar de nivel: si no entró con Google, un recordatorio para no perder el avance.
  // Sale la primera vez que pasa de nivel (al llegar al 2) y después cada 3 niveles, para no cansar.
  const googleNudge = (now) => Nube.canSignIn() && !Nube.account() && (now - 2) % 3 === 0
    ? `<div id="nudge"><div class="row"><button id="gNudge">🔐 ENTRAR CON GOOGLE</button></div>
      <p class="sub">Tu avance está guardado solo en este aparato. Entrá con Google para no perderlo y seguir desde cualquier celu o compu.</p></div>` : "";
  function nudgeBtn() {
    const b = document.getElementById("gNudge"); if (!b) return;
    b.onclick = async () => {
      b.disabled = true; b.textContent = "Entrando…";
      const r = await googleIn(), box = document.getElementById("nudge");
      if (r.ok) box.innerHTML = `<p class="sub">✓ ¡Listo, ${esc(alias())}! Tu avance queda guardado en tu cuenta: entrá con Google en cualquier aparato y seguís desde acá.</p>`;
      else { b.disabled = false; b.textContent = r.why === "cancel" ? "🔐 ENTRAR CON GOOGLE" : "NO SE PUDO · PROBÁ DE NUEVO"; }
    };
  }
  const CHEERS = ["¡Bien ahí", "¡Qué nivel", "¡Vamos", "¡Sos una máquina", "¡Tremendo", "¡Así se nada"];
  async function fillAccount() {
    await Nube.ready;
    const el = document.getElementById("acct"); if (!el) return;
    if (!Nube.canSignIn()) { el.innerHTML = ""; return; }
    const a = Nube.account();
    el.innerHTML = a ? `<small>✓ Entraste con Google como <b>${esc(a.name)}</b>: tu avance y tu apodo quedan guardados.</small> <button class="link" id="gOut">Salir</button>`
      : `<button class="link" id="gIn">🔐 Entrar con Google</button><small> Opcional: guardás tu avance en cualquier celu y nadie más puede usar tu apodo.</small>`;
    const gin = document.getElementById("gIn"), gout = document.getElementById("gOut");
    if (gin) gin.onclick = async () => {
      gin.disabled = true; gin.textContent = "Entrando…";
      const r = await googleIn();
      if (!r.ok) { if (r.why !== "cancel") { const e = document.getElementById("aliasErr"); if (e) { e.textContent = "No se pudo entrar con Google. Probá de nuevo."; e.hidden = false; } } fillAccount(); return; }
      homeScreen();
    };
    if (gout) gout.onclick = async () => { await Nube.signOut(); homeScreen(); };
  }

  // ---------- pantallas ----------
  // Inicio → camino (nivel → carrera → estrellas) · copa (desde Pre nadador) · práctica libre (no suma).
  // La copa son 3 carreras con los mismos rivales.
  let race = null, player = null, chosen = null, lastCount = 99, endShown = false, level = null, after = null;
  let mode = "level", cup = null, quickCirc = store.get("npg-circ") || "sprint";
  if (!CIRCUITS[quickCirc]) quickCirc = "sprint";
  chosen = CHARS.find((c) => c.id === store.get("npg-char")) || null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const alias = () => (store.get("npg-apodo") || "").trim();

  const split = (a, b) => `<div class="split"><div class="pane">${a}</div><div class="pane">${b}</div></div>`;
  const homeBtn = `<button id="home">🏠 MENÚ</button>`;
  function show(html) { scr.innerHTML = html; scr.style.display = "flex"; pad.style.display = "none"; keepAwake(false); scr.scrollTop = 0; }
  function aliasField(id) {
    const inp = document.getElementById(id); if (!inp) return;
    inp.oninput = () => { inp.value = inp.value.replace(/[\/]/g, ""); store.set("npg-apodo", inp.value.trim()); inp.classList.remove("need");
      for (const k of ["aliasErr", "aliasNeed"]) { const e = document.getElementById(k); if (e) e.hidden = true; } };
    inp.onchange = async () => { if (await Nube.aliasFree(alias())) pushProgress(); else aliasTaken(); };
  }

  // El camino: unas burbujas con los niveles alrededor del tuyo y sus estrellas.
  function pathHtml() {
    const lv = myLevel(), sm = starsMap();
    let h = "";
    for (let n = 1; n <= lv + 4; n++) { // todos los niveles hasta el tuyo (y algunos que vienen): se puede volver a cualquiera
      const st = STAGES.find((s) => s.from === n && n > 1);
      if (st) h += `<span class="flag" title="${st.name}">${st.icon}</span>`;
      if (n === CUP_LEVEL) h += `<span class="flag">🏆</span>`;
      const cls = n < lv ? "done" : n === lv ? "now" : "locked";
      h += `<button class="lv ${cls}" data-n="${n}" title="${n > lv ? "" : esc(levelDef(n).learn)}" ${n > lv ? "disabled" : ""}><b>${n > lv ? "🔒" : n}</b><small>${n < lv ? starStr(sm[n] || 0) : n === lv ? "JUGÁ" : ""}</small></button>`;
    }
    return `<div class="path">${h}</div>`;
  }
  function stageBox() {
    const lv = myLevel(), st = stageOf(lv), nx = nextStage(lv);
    const pct = nx ? Math.round(100 * (lv - st.from) / (nx.from - st.from)) : 100;
    return `<div class="stage"><span class="ic">${st.icon}</span><div><b>${st.name}</b> · NIVEL ${lv} · ★ ${totalStars()}${cupsWon() ? ` · 🏆 ${cupsWon()}` : ""}
      <div class="prog"><i style="width:${pct}%"></i></div><small>${nx ? `Te ${nx.from - lv === 1 ? "falta 1 nivel" : "faltan " + (nx.from - lv) + " niveles"} para ${nx.icon} ${nx.name}` : "Llegaste a lo más alto"}</small></div></div>`;
  }

  function homeScreen() {
    race = null; cup = null; level = null;
    const lv = myLevel(), L = levelDef(lv), cupOpen = lv >= CUP_LEVEL;
    show(split(`<h1>NADAR POR LA GLORIA</h1><p class="sub">Locos por la natación</p>
      ${stageBox()}${pathHtml()}
      <button class="go big" id="play">▶ NIVEL ${lv}<small>${L.learn}</small></button>
      <div class="modes">
        <button class="mode ${cupOpen ? "cupon" : "alt locked"}" id="mCup">${cupOpen ? "🏆 COPA<small>3 carreras seguidas contra los mismos rivales</small>" : `🔒 COPA<small>Se abre en el nivel ${CUP_LEVEL}, cuando seas Pre nadador</small>`}</button>
        ${cupOpen ? `<button class="mode alt" id="mQuick">PRÁCTICA LIBRE<small>Elegís el modo · no suma nivel</small></button>` : ""}
      </div>
      <p class="err" id="aliasErr" hidden></p>`, `
      <label class="alias">TU APODO <input id="alias" maxlength="16" autocomplete="off" value="${esc(alias())}" placeholder="Obligatorio: así salís en el ranking"></label>
      <p class="err" id="aliasNeed" hidden></p>
      <p class="acct" id="acct"></p>
      <div class="cols"><div class="side"><div class="rank"><b>EL GRUPO: QUIÉN VA MÁS LEJOS</b><div id="players"><small>Cargando…</small></div></div></div>
      <div class="side"><div class="rank"><b>RÉCORDS DEL GRUPO</b><div class="circs boards">${BOARDS.map(([k, n]) => `<button class="circ ${k === boardKey ? "on" : ""}" data-b="${k}">${n}</button>`).join("")}</div><div id="board"><small>Cargando…</small></div></div></div></div>
      ${cupOpen ? "" : `<button class="link" id="mQuick">Práctica libre (no suma nivel)</button>`}
      <button class="link" id="shareHome">📣 ¿Te gustó el juego? Compartilo con tus amigos</button>
      <button class="link" id="opinar">💬 Contanos qué te parece el juego</button>`));
    aliasField("alias");
    // sin apodo no se nada: así cada uno aparece en el ranking y se sabe quién juega
    const noAlias = (what) => {
      if (alias()) return false;
      const err = document.getElementById("aliasNeed"), inp = document.getElementById("alias");
      err.textContent = `Antes de ${what}, poné tu apodo: así salís en el ranking del grupo.`; err.hidden = false;
      inp.classList.add("need"); inp.focus(); inp.scrollIntoView({ block: "center" });
      return true;
    };
    const nowB = scr.querySelector(".lv.now"), path = scr.querySelector(".path"); // el camino arranca mostrando tu nivel
    if (nowB && path) path.scrollLeft = nowB.offsetLeft - path.clientWidth / 2 + nowB.offsetWidth / 2;
    document.getElementById("play").onclick = () => { if (noAlias("nadar")) return; Sound.unlock(); goFull(); levelScreen(lv); };
    scr.querySelectorAll(".lv[data-n]").forEach((b) => b.onclick = () => { if (noAlias("nadar")) return; Sound.unlock(); goFull(); levelScreen(+b.dataset.n); });
    document.getElementById("mCup").onclick = () => {
      const err = document.getElementById("aliasErr");
      if (!cupOpen) { err.textContent = `La copa se abre en el nivel ${CUP_LEVEL}. Te ${CUP_LEVEL - lv === 1 ? "falta 1 nivel" : "faltan " + (CUP_LEVEL - lv) + " niveles"}: ¡dale que llegás!`; err.hidden = false; return; }
      if (noAlias("jugar la copa")) return;
      Sound.unlock(); goFull(); mode = "cup"; selectScreen();
    };
    document.getElementById("mQuick").onclick = () => { if (noAlias("nadar")) return; Sound.unlock(); goFull(); mode = "quick"; selectScreen(); };
    document.getElementById("opinar").onclick = () => feedbackScreen(homeScreen);
    const lvNow = myLevel();
    shareBtn(`Estoy jugando Nadar por la gloria, el juego de los locos por la natación${lvNow > 1 ? ` (voy por el nivel ${lvNow}, ${stageOf(lvNow).name} ${stageOf(lvNow).icon})` : ""}. ¿Te sumás?`, "shareHome");
    scr.querySelectorAll("[data-b]").forEach((b) => b.onclick = () => {
      boardKey = b.dataset.b; scr.querySelectorAll("[data-b]").forEach((x) => x.classList.toggle("on", x === b)); fillBoard();
    });
    fillBoard(); fillPlayers(); fillAccount();
  }

  // Quién va más lejos en el camino (en la nube): nivel, etapa, estrellas y copas ganadas.
  async function fillPlayers() {
    const rows = await Nube.players(), el = document.getElementById("players");
    if (!el) return;
    if (!rows) { el.innerHTML = `<small>Aparece cuando el juego está conectado a internet.</small>`; return; }
    rows.sort((a, b) => b.lvl - a.lvl || b.stars - a.stars || b.cups - a.cups);
    const me = rows.findIndex((x) => x.me);
    if (!rows.length) { el.innerHTML = `<small>Todavía no hay nadie. Poné tu apodo y pasá un nivel para ser el primero.</small>`; return; }
    el.innerHTML = `<table><tr><th></th><th>Apodo</th><th>Etapa</th><th>Nivel</th><th>★</th><th>🏆</th></tr>${rows.slice(0, 10).map((x, i) => { const c = CHARS.find((k) => k.id === x.char), st = stageOf(x.lvl);
      return `<tr class="${x.me ? "me" : ""}"><td>${i + 1}º</td><td>${c ? faceImg(c, 20) + " " : ""}${esc(x.alias)}${x.v ? ' <span class="ok" title="Entró con Google">✓</span>' : ""}</td><td>${st.icon} ${st.name}</td><td>${x.lvl}</td><td>${x.stars}</td><td>${x.cups || ""}</td></tr>`; }).join("")}</table>
      ${me >= 10 ? `<small>Vos vas ${me + 1}º.</small>` : me < 0 ? `<small>${alias() ? "Pasá un nivel para aparecer." : "Poné tu apodo para aparecer."}</small>` : ""}`;
  }

  // Los récords del grupo (en la nube): los 10 mejores tiempos de cada modo, de la práctica libre y la copa.
  const BOARDS = [["sprint-100", "SPRINT 100 m"], ["idavuelta-200", "IDA Y VUELTA 200 m"], ["abiertas-150", "AGUAS ABIERTAS 500 m"]];
  let boardKey = "sprint-100";
  async function fillBoard() {
    const key = boardKey, rows = await Nube.board(key), el = document.getElementById("board");
    if (!el || key !== boardKey) return;
    if (!rows) { el.innerHTML = `<small>Los récords del grupo aparecen cuando el juego está conectado a internet.</small>`; return; }
    if (!rows.length) { el.innerHTML = `<small>Todavía nadie marcó tiempo acá. Se juegan en la práctica libre y en la copa.</small>`; return; }
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
      const ok = await Nube.feedback(rating, text, { alias: alias().slice(0, 16), char: chosen ? chosen.id : "", mode: level ? level.c : quickCirc });
      send.disabled = false;
      if (ok) { msg.textContent = "¡Gracias! Lo vamos a leer."; send.remove(); document.getElementById("fbBack").textContent = "LISTO"; }
      else msg.textContent = "No se pudo enviar ahora. Esperá un minuto y probá de nuevo.";
    };
  }
  // Compartir el resultado con el link al juego.
  function shareBtn(text, id = "share") {
    const b = document.getElementById(id); if (!b) return;
    b.onclick = async () => { const r = await Nube.share(text); if (r === "copiado") b.textContent = "✔ LINK COPIADO"; };
  }

  // Elegir nadador. En el camino se elige una vez y queda guardado; después se cambia desde el nivel.
  function selectScreen() {
    race = null;
    const circs = mode === "quick" ? `<div class="circs">${Object.values(CIRCUITS).map((c) => `<button class="circ ${c.id === quickCirc ? "on" : ""}" data-c="${c.id}">${c.name}<small>${c.open ? c.show + " m en el río" : c.len > c.pool ? c.len + " m, ida y vuelta" : c.len + " m, sin vueltas"}</small></button>`).join("")}</div>` : "";
    const head = mode === "cup" ? "🏆 COPA · " + esc(alias()) : mode === "quick" ? "PRÁCTICA LIBRE · NO SUMA NIVEL" : "NIVEL " + after;
    show(`<p class="sub">${head}</p><h1 class="small">Elegí tu nadador</h1>${circs}
      <div class="grid">${CHARS.map((c) => `<button class="ch ${chosen === c ? "on" : ""}" data-id="${c.id}">${faceImg(c, 56)}<b>${c.name}</b><small>${c.tag}</small>${statBars(c)}<small class="qk">${c.quirk}</small></button>`).join("")}</div>
      <button class="link" id="back">← Volver</button>`);
    scr.querySelectorAll(".circ[data-c]").forEach((b) => b.onclick = () => { quickCirc = b.dataset.c; store.set("npg-circ", quickCirc); selectScreen(); });
    scr.querySelectorAll(".ch").forEach((b) => b.onclick = () => {
      Sound.unlock(); chosen = CHARS.find((c) => c.id === b.dataset.id); store.set("npg-char", chosen.id); pushProgress();
      if (mode === "level") { levelScreen(after); return; }
      if (mode === "cup") cup = { rivals: drawRivals(chosen), i: 0, pts: {}, done: false };
      drawScreen();
    });
    document.getElementById("back").onclick = mode === "level" && chosen ? () => levelScreen(after) : homeScreen; // si todavía no eligió, vuelve al inicio
  }

  const legendHtml = (goodOnly, air = true) => `<div class="legend">${Object.keys(ITEMS).filter((k) => !goodOnly || ITEMS[k].good).map((k) => `<span class="it">${itemIcon(k)} ${ITEMS[k].name} ${ITEMS[k].good ? "▲" : "▼"}${ITEMS[k].air && air ? " +AIRE" : ""}</span>`).join("")}</div>`;
  function controlsHelp(r) {
    const t = [say2("tocá arriba o abajo de la izquierda para moverte", "↑ ↓ moverte")];
    if (r.fly) t.push(say2("MARIPOSA va más rápido y gasta más pila", "→ mariposa"));
    if (r.pecho) t.push(say2("PECHO va lento y casi no gasta", "Z pecho"));
    if (r.air) t.push(say2("mantené RESPIRAR para recargar", "ESPACIO respirar (mantener)"));
    if (PC) t.push("P pausa");
    return `<p class="help">${say2("Nadás crol solo. ", "")}${t.join(" · ")}</p>`;
  }
  const cardHtml = (r, i, extra = "") => `<div class="card ${i ? "" : "me"}">${faceImg(r.ch, 52, i ? "normal" : "happy")}<b>${r.ch.name}${i ? "" : " (vos)"}</b>${extra}<small>${r.ch.tag}</small>${statBars(r.ch)}<small>${r.ch.quirk}</small></div>`;

  // Un nivel del camino: qué enseña, el objetivo y las estrellas, y contra quién nadás.
  function levelScreen(n) {
    mode = "level"; cup = null; race = null; after = n;
    if (!chosen) { selectScreen(); return; }
    level = levelDef(n);
    const L = level, circ = CIRCUITS[L.c], st = stageOf(n), done = starsMap()[n] || 0;
    const draft = levelRace(chosen, L);
    const where = circ.open ? `${shownLen(draft)} m en el río, ${RIVER_TXT[L.river || "mix"]}` : `${shownLen(draft)} m` + (draft.laps > 1 ? `, ${draft.laps - 1 === 1 ? "1 vuelta americana" : draft.laps - 1 + " vueltas americanas"}` : ", sin vueltas");
    show(split(`<p class="sub">${st.icon} ${st.name} · NIVEL ${n}${done ? ` · tu mejor: <span class="st">${starStr(done)}</span>` : ""}</p>
      <h1 class="small">${L.learn}</h1><p class="help">${circ.name} · ${where}</p>
      ${L.tip ? `<div class="tipbox">💡 ${L.tip}</div>` : ""}
      <div class="goals"><span><b class="st">${starStr(1)}</b> Terminá la carrera</span><span><b class="st">${starStr(2)}</b> ${goalText(L.two)} <em>para pasar</em></span><span><b class="st">${starStr(3)}</b> Además: ${goalText(L.three).toLowerCase()}</span></div>
      <button class="go" id="goRace">¡AL AGUA!</button>
      <div class="row"><button class="link" id="chg">Cambiar nadador (${chosen.name})</button><button class="link" id="back">← Inicio</button></div>`, `
      <div class="vs">${draft.racers.map((r, i) => cardHtml(r, i)).join("")}${L.r ? "" : `<div class="card solo"><b>Nadás solo</b><small>Sin apuro: es para aprender.</small></div>`}</div>
      ${controlsHelp(draft)}${L.items === "none" ? "" : legendHtml(L.items === "good", L.air)}`));
    document.getElementById("goRace").onclick = () => startRace(draft);
    document.getElementById("chg").onclick = selectScreen;
    document.getElementById("back").onclick = homeScreen;
  }

  // La práctica libre y la copa: el sorteo y el circuito.
  function drawScreen() {
    const circ = cup ? CIRCUITS[CUP[cup.i]] : CIRCUITS[quickCirc], can = cup ? { fly: true, pecho: true } : learned(myLevel());
    const draft = newRace(chosen, circ, cup ? cup.rivals : undefined, circ.len, can);
    const head = cup ? `🏆 COPA · CARRERA ${cup.i + 1} DE ${CUP.length}` : "PRÁCTICA LIBRE · NO SUMA NIVEL";
    const pts = (r) => cup && cup.i ? `<small class="pts">${cup.pts[r.ch.id] || 0} puntos</small>` : "";
    show(split(`<p class="sub">${head}</p><h1 class="small">${circ.name} · ${shownLen(draft)} m</h1><p class="help">${circ.info}${draft.laps > 1 ? ` Son ${draft.laps} largos: ${draft.laps - 1 === 1 ? "1 vuelta americana" : draft.laps - 1 + " vueltas americanas"}.` : ""}</p>
      ${cup ? "" : !can.pecho ? `<p class="help">El pecho se aprende en el nivel 7 y la mariposa en el 8.</p>` : !can.fly ? `<p class="help">La mariposa se aprende en el nivel 8.</p>` : ""}
      <button class="go">¡AL AGUA!</button><button class="link" id="back">${cup ? "← Dejar la copa (volver al inicio)" : "← Volver"}</button>`, `
      <div class="vs">${draft.racers.map((r, i) => cardHtml(r, i, pts(r))).join("")}</div>
      ${controlsHelp(draft)}${legendHtml(false)}`));
    scr.querySelector(".go").onclick = () => startRace(draft);
    document.getElementById("back").onclick = cup ? homeScreen : selectScreen;
  }
  function startRace(draft) {
    race = draft; player = race.racers[0]; lastCount = 99; endShown = false;
    startGuide(); setPaused(false);
    pad.querySelector(".fly").style.display = race.fly ? "" : "none";
    pad.querySelector(".pe").style.display = race.pecho ? "" : "none";
    scr.style.display = "none"; pad.style.display = "block"; keepAwake(true);
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
    const bits = won ? confetti() : "";
    return `<div class="podium">${bits}${col(items[1], 1)}${col(items[0], 0)}${col(items[2], 2)}</div>`;
  }
  const confetti = () => Array.from({ length: 36 }, (_, i) => `<i class="bit" style="left:${(i * 37) % 100}%;background:${["#FFD84A", "#FF6FB0", "#7CFC6A", "#5FD0F5", "#FF8A2A"][i % 5]};animation-delay:${1.1 + (i % 9) * 0.12}s;--dx:${((i * 53) % 80) - 40}px"></i>`).join("");
  const timeOf = (r) => r.finished ? r.finishT.toFixed(1) + " s" : shownM(race, r.x) + " m";
  const placeTitle = (pos) => `<h1 class="${pos === 1 ? "win" : "lose"}">${pos === 1 ? "¡GANASTE!" : "SALISTE " + pos + "º"}</h1>`;

  function endScreen() {
    const st = standings(race), pos = st.indexOf(player) + 1, win = pos === 1;
    if (guide.on && mode !== "level") store.set("npg-guia", "vista");
    const qs = player.qs || [], key = race.circ.id + "-" + race.len, myTime = player.finished ? Math.round(player.finishT * 100) / 100 : null;
    Nube.saveRun({ alias: alias().slice(0, 16), char: player.ch.id, mode: race.circ.id, dist: race.len, place: pos, time: myTime, cup: !!cup, lvl: mode === "level" ? level.n : 0,
      dive: Math.round((qs[0] || 0) * 100) / 100, turns: qs.length > 1 ? Math.round(qs.slice(1).reduce((a, b) => a + b, 0) / (qs.length - 1) * 100) / 100 : null });
    if (mode === "level") { levelEndScreen(pos); return; }
    const prevBest = +(store.get("npg-pb-" + key) || 0); // tu mejor marca en este celu
    if (myTime && (!prevBest || myTime < prevBest)) store.set("npg-pb-" + key, myTime);
    const record = myTime && (!prevBest || myTime < prevBest) ? `<p class="sub rec">⏱️ ¡Tu mejor marca en ${race.circ.name} ${shownLen(race)} m! ${!Nube.online() ? "" : alias() ? "Va a los récords del grupo." : "Poné tu apodo en el inicio para entrar a los récords del grupo."}</p>` : "";
    const shareText = `Nadé ${shownLen(race)} m de ${race.circ.name} con ${player.ch.name} en ${myTime ? myTime.toFixed(1) + " s" : "—"} y salí ${pos}º en Nadar por la gloria. ¿Me ganás?`;
    if (!cup) {
      show(split(`<p class="sub">PRÁCTICA LIBRE</p>${placeTitle(pos)}<p class="sub">${win ? "La gloria es tuya." : "Sin gloria esta vez. ¿La revancha?"}</p>
        ${record}<div class="row"><button class="go" id="again">OTRA VEZ</button><button id="change">CAMBIAR</button>${homeBtn}</div>`,
        `${podium(st.map((r) => ({ ch: r.ch, isPlayer: r.isPlayer, sub: timeOf(r) })))}
        <div class="row"><button id="share">📣 COMPARTIR</button><button id="fb">💬 OPINAR</button></div>`));
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
    show(split(`<p class="sub">🏆 COPA · CARRERA ${cup.i} DE ${CUP.length} · ${race.circ.name}</p>${placeTitle(pos)}
      ${record}${cupTable()}
      <div class="row"><button class="go" id="next">${last ? "VER QUIÉN GANÓ LA COPA" : "SIGUIENTE: " + CIRCUITS[CUP[cup.i]].name}</button>${homeBtn}</div>`,
      podium(pts.map((x) => ({ ch: x.r.ch, isPlayer: x.r.isPlayer, sub: timeOf(x.r), extra: `<span class="plus">+${x.total}</span>${extras(x) ? `<small class="ex">${extras(x)}</small>` : ""}` })))));
    document.getElementById("next").onclick = last ? cupEndScreen : drawScreen;
    document.getElementById("home").onclick = homeScreen;
  }

  // Fin de un nivel: las estrellas, qué se cumplió, y si pasaste, lo que viene (otra etapa, la copa).
  function levelEndScreen(pos) {
    const L = level, res = levelStars(L, race), passed = res.n >= 2, before = myLevel(), sm = starsMap();
    if (res.n > (sm[L.n] || 0)) { sm[L.n] = res.n; store.set("npg-stars", JSON.stringify(sm)); }
    const up = passed && L.n === before;
    if (up) store.set("npg-lvl", before + 1);
    const now = myLevel(), newStage = up && stageOf(now) !== stageOf(before) ? stageOf(now) : null, cupNow = up && now === CUP_LEVEL;
    if (passed) pushProgress();
    const checks = [["Terminaste la carrera", true], [goalText(L.two), res.checks[1]], [goalText(L.three), res.checks[2]]];
    const st = standings(race);
    show(split(`<p class="sub">${stageOf(L.n).icon} NIVEL ${L.n} · ${L.learn}</p>
      <div class="bigstars">${[1, 2, 3].map((k) => `<span class="${k <= res.n ? "on" : ""}" style="animation-delay:${0.2 + k * 0.35}s">★</span>`).join("")}</div>
      <h1 class="${passed ? "win" : "lose"}">${passed ? (res.n === 3 ? "¡PERFECTO!" : "¡NIVEL SUPERADO!") : "¡CASI!"}</h1>
      ${up ? `<p class="cheer">${CHEERS[Math.floor(Math.random() * CHEERS.length)]}${alias() ? ", " + esc(alias()) : ""}! Ya estás en el nivel ${now}.</p>` : ""}
      <div class="checks">${checks.map(([t, ok], i) => `<span class="${ok ? "ok" : "no"}">${ok ? "✔" : "✘"} ${t}${i === 1 && !passed ? " <em>(para pasar)</em>" : ""}</span>`).join("")}</div>
      ${newStage ? `<div class="levelup">${confetti()}<b>${newStage.icon} ¡AHORA SOS ${newStage.name}!</b>${cupNow ? `<span>🏆 Se abrió la COPA: jugala desde el inicio.</span>` : ""}</div>` : ""}
      <div class="row">${passed ? `<button class="go" id="next">SIGUIENTE: NIVEL ${L.n + 1}</button><button id="change">REPETIR</button>` : `<button class="go" id="again">OTRA VEZ</button>`}${homeBtn}</div>`, `
      ${now < CUP_LEVEL ? `<p class="sub teaser">🏆 Te ${CUP_LEVEL - now === 1 ? "falta 1 nivel" : "faltan " + (CUP_LEVEL - now) + " niveles"} para que se abra la copa</p>` : ""}
      ${L.r ? podium(st.slice(0, 3).map((r) => ({ ch: r.ch, isPlayer: r.isPlayer, sub: timeOf(r) }))) : `<p class="sub">Tu tiempo: ${timeOf(player)}</p>`}
      ${passed && !alias() ? `<label class="alias">TU APODO <input id="alias2" maxlength="16" autocomplete="off" placeholder="Para aparecer en el ranking"></label>` : ""}
      ${up ? googleNudge(now) : ""}
      <div class="row"><button id="share">📣 COMPARTIR</button><button id="fb">💬 OPINAR</button></div>`));
    aliasField("alias2"); nudgeBtn();
    const st2 = stageOf(now);
    shareBtn(passed ? `Pasé el nivel ${L.n} de Nadar por la gloria con ${res.n} estrella${res.n > 1 ? "s" : ""}: ya soy ${st2.name} ${st2.icon}. ¿Me alcanzás?` : `Estoy en el nivel ${now} de Nadar por la gloria (${st2.name} ${st2.icon}). ¿Me alcanzás?`);
    document.getElementById("fb").onclick = () => feedbackScreen(homeScreen);
    const nx = document.getElementById("next"); if (nx) nx.onclick = () => levelScreen(L.n + 1);
    const ag = document.getElementById("again") || document.getElementById("change"); ag.onclick = () => levelScreen(L.n);
    document.getElementById("home").onclick = homeScreen;
  }
  function cupOrder() { return [chosen, ...cup.rivals].sort((a, b) => (cup.pts[b.id] || 0) - (cup.pts[a.id] || 0)); }
  function cupTable() {
    return `<div class="rank"><b>TABLA DE LA COPA</b><table>${cupOrder().map((c, i) => `<tr class="${c === chosen ? "me" : ""}"><td>${i + 1}º</td><td>${faceImg(c, 24)} ${c.name}</td><td>${cup.pts[c.id] || 0} puntos</td></tr>`).join("")}</table></div>`;
  }
  function cupEndScreen() {
    const order = cupOrder(), champ = order[0] === chosen, mine = cup.pts[chosen.id] || 0;
    if (!cup.done) { // se cuenta una sola vez por copa
      cup.done = true;
      if (champ) { store.set("npg-copas", cupsWon() + 1); pushProgress(); }
      Sound.play(champ ? "win" : "lose");
    }
    show(split(`<p class="sub">🏆 FIN DE LA COPA</p>
      <h1 class="${champ ? "win" : "lose"}">${champ ? "¡GANASTE LA COPA!" : "GANÓ " + order[0].name}</h1>
      <p class="sub">Sumaste <b>${mine}</b> puntos. ${cupsWon() ? `Llevás <b>${cupsWon()}</b> copa${cupsWon() > 1 ? "s" : ""} ganada${cupsWon() > 1 ? "s" : ""}.` : ""}</p>
      <div class="row"><button class="go" id="again">OTRA COPA</button>${homeBtn}</div>`,
      `${podium(order.map((c) => ({ ch: c, isPlayer: c === chosen, sub: (cup.pts[c.id] || 0) + " puntos" })))}
      <div class="row"><button id="share">📣 COMPARTIR</button><button id="fb">💬 OPINAR</button></div>`));
    shareBtn(`${champ ? "¡Gané la copa" : "Jugué la copa"} de Nadar por la gloria con ${chosen.name}: ${mine} puntos. ¿Me ganás?`);
    document.getElementById("fb").onclick = () => feedbackScreen(homeScreen);
    document.getElementById("again").onclick = () => { mode = "cup"; selectScreen(); };
    document.getElementById("home").onclick = homeScreen;
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
  const bbr = document.getElementById("bbr");
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    if (race) {
      if (!paused) {
        stepRace(race, dt, input);
        const events = race.events; race.events = [];
        input.tap = false;
        playEvents(events); guideStep(dt, events);
        const n = race.t < 0 ? Math.ceil(-race.t) : 0;
        if (n !== lastCount) { Sound.play(n ? "count" : "go"); lastCount = n; }
      }
      render(ctx, race, W, H);
      drawHud(ctx, race, W, H);
      if (guide.cur) drawTip(ctx, W, guide.cur.text, Math.min(1, guide.cur.t * 3));
      const bar = (player.onBlock && race.t >= 0) || (player.wallBar && player.turnQ === null);
      bbr.style.display = race.air || bar ? "" : "none"; // sin aire que gastar, el botón aparece solo para la salida y las vueltas
      if (bar) setBtn("bbr", true, player.onBlock ? barAt(0, race.t) : barAt(player.barT0, race.t), "¡TOCÁ!");
      else setBtn("bbr", player.air < 0.3 && !player.breathing, player.air, player.breathing ? "RECARGANDO" : "RESPIRAR");
      if (race.over && !endShown && race.t - race.overT > 1.4) {
        endShown = true; Sound.play(standings(race)[0] === player ? "win" : "lose"); endScreen();
      }
    } else render(ctx, null, W, H);
    requestAnimationFrame(frame);
  }
  homeScreen();
  if (typeof Intro !== "undefined") Intro.play(); // la intro, una vez por sesión, encima del inicio
  requestAnimationFrame(frame);
})();

function statBars(ch) {
  return `<span class="stats">${STATS.map(([k, label]) => `<span>${label}</span><span class="bar">${"●".repeat(ch[k])}<i>${"●".repeat(5 - ch[k])}</i></span>`).join("")}</span>`;
}
