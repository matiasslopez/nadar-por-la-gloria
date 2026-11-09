// Nadar por la gloria — la intro: 7 segundos de planos cortados, como las intros de los juegos de fútbol.
// La salida de costado, bajo el agua de cerca, la carrera desde arriba, la llegada, el festejo mirando al público
// y el podio atrás de la pileta, donde cae el título. Los cortes van con el pulso de la música (138 por minuto).
// La escena es 3D (intro3d.js, con three.js) en look de PS1; acá va lo de encima: bandas de cine, flashes, carteles y el título.
// Primero "tocá para empezar" (ese toque destraba el sonido); se salta tocando o con Enter / espacio. Una vez por sesión.
// Los nadadores son de mentira por ahora: después van a ser los avatares de Nadamos por la milanga.

const Intro = (() => {
  const DUR = 7, SEEN = "npg-intro";
  const BEAT = 60 / 138, DROP = 13 * BEAT; // el título cae con el golpe fuerte de la música
  // dónde empieza cada plano (el último termina en DUR)
  const CUTS = [0, 3 * BEAT, 6 * BEAT, 7.5 * BEAT, 9 * BEAT, 11 * BEAT];
  const CAPTIONS = ["LA SALIDA", "BAJO EL AGUA", "EL RITMO", "LA LLEGADA", "EL FESTEJO", ""];
  // La pata de rana (A de NADAR) y la manopla (D), dibujadas en un cuadro de 100 de alto.
  const PATA = "M22 2 h16 l2 30 C52 40 58 62 56 84 C48 90 36 88 30 80 C24 88 12 90 4 84 C2 62 8 40 20 32 Z";
  const MANO = "M6 10 C6 4 10 2 16 2 H36 C50 2 56 12 56 40 C56 66 46 78 32 78 H16 C10 78 6 74 6 68 Z";
  const icon = (d, vb, cls) => `<svg class="ico ${cls}" viewBox="${vb}" aria-hidden="true"><path d="${d}"/></svg>`;
  const TITLE = `<span class="vis" aria-hidden="true">N${icon(PATA, "0 0 60 92", "pata")}${icon(MANO, "0 0 62 80", "mano")}AR POR LA GLORIA</span><span class="sr">NADAR POR LA GLORIA</span>`;
  const out3 = (t) => 1 - Math.pow(1 - t, 3);
  const c01 = (v) => Math.max(0, Math.min(1, v));
  let box, ov, ctx, scene = null;

  // Lo de encima de la escena: viñeta, flash en cada corte, bandas de cine, el cartel del plano y el 1º de la llegada.
  function overlay(t, i, lt) {
    const w = ov.width, h = ov.height;
    ctx.clearRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    const fl = Math.max(0, 1 - lt / 0.13) * (i ? 1 : 0) + (i === 5 && t > DROP ? Math.max(0, 1 - (t - DROP) / 0.3) : 0);
    if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, fl) * 0.9})`; ctx.fillRect(0, 0, w, h); }
    const bar = h * 0.075; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, bar); ctx.fillRect(0, h - bar, w, bar);
    const u = Math.min(w, h * 1.8) / 960;
    if (i === 3 && lt > 0.3) { // el 1º cuando toca la placa
      const a = c01((lt - 0.3) * 6), s = 1.15 - 0.15 * a;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(w * 0.42, h * 0.34); ctx.scale(s, s); ctx.rotate(-0.04);
      ctx.font = `900 ${90 * u}px system-ui, sans-serif`; ctx.textAlign = "center";
      ctx.fillStyle = "#C0561E"; ctx.fillText("1º", 0, 6 * u); ctx.fillStyle = "#FFD84A"; ctx.fillText("1º", 0, 0); ctx.restore();
    }
    const cap = CAPTIONS[i];
    if (cap) { // el cartel inclinado que entra deslizando
      const k = out3(c01((lt - 0.05) / 0.2)), x = -260 * u + k * 290 * u, y = h - bar - 70 * u;
      ctx.save(); ctx.translate(x, y); ctx.transform(1, 0, -0.25, 1, 0, 0);
      ctx.fillStyle = "#FFD84A"; ctx.fillRect(0, 0, 260 * u, 44 * u); ctx.fillStyle = "#C0561E"; ctx.fillRect(0, 44 * u, 260 * u, 5 * u);
      ctx.fillStyle = "#10324F"; ctx.font = `italic 900 ${26 * u}px system-ui, sans-serif`; ctx.fillText(cap, 30 * u, 32 * u); ctx.restore();
    }
  }
  function frame(t) {
    let i = 0; while (i < CUTS.length - 1 && t >= CUTS[i + 1]) i++;
    const lt = t - CUTS[i], d = (CUTS[i + 1] || DUR) - CUTS[i];
    if (scene) scene.render(i, lt, d, DROP - CUTS[5]);
    overlay(t, i, lt);
    box.classList.toggle("titled", t >= DROP);
  }

  // ---------- armar, correr y cerrar ----------
  function play(onDone, force) {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch (e) {}
    if (seen && !force) { onDone && onDone(); return; }
    box = document.createElement("div"); box.id = "intro";
    box.innerHTML = `<canvas class="g3"></canvas><canvas class="ov"></canvas><h1 class="ititle">${TITLE}</h1>
      <div class="istart"><h1 class="ititle on">${TITLE}</h1><button class="go" id="iGo" disabled>CARGANDO…</button></div>
      <button id="iSkip">SALTAR ⏭</button>`;
    document.body.appendChild(box);
    ov = box.querySelector(".ov"); ctx = ov.getContext("2d");
    const fit = () => { const d = Math.min(2, window.devicePixelRatio || 1); ov.width = innerWidth * d; ov.height = innerHeight * d; };
    fit(); window.addEventListener("resize", fit);
    let state = "loading", t0 = 0, raf = 0, music = null;
    const go = box.querySelector("#iGo");
    const ready = (ok) => { if (state !== "loading") return; state = ok ? "start" : "broken"; go.disabled = false; go.textContent = "▶ TOCÁ PARA EMPEZAR"; };
    // la escena 3D se carga mientras se ve "tocá para empezar"; si no se puede (sin WebGL, sin internet), el toque pasa directo al juego
    import("./intro3d.js?v=31").then((m) => m.create(box.querySelector(".g3"))).then((s) => { scene = s; ready(true); }).catch(() => ready(false));
    setTimeout(() => ready(false), 20000);
    const finish = (skipped) => {
      if (state === "done") return; state = "done";
      cancelAnimationFrame(raf); window.removeEventListener("resize", fit); window.removeEventListener("keydown", key, true);
      if (music && skipped) music.fade(); // si terminó sola, la música termina sola
      try { sessionStorage.setItem(SEEN, "1"); } catch (e) {}
      box.classList.add("out"); setTimeout(() => box.remove(), 350);
      onDone && onDone();
    };
    const loop = (now) => {
      const t = (now - t0) / 1000;
      frame(Math.min(t, DUR));
      if (t < DUR + 0.3) raf = requestAnimationFrame(loop); else finish(false);
    };
    const start = () => {
      if (state === "broken") { finish(false); return; }
      if (state !== "start") return; state = "run";
      Sound.unlock(); music = Sound.intro();
      box.classList.add("running"); t0 = performance.now(); raf = requestAnimationFrame(loop);
    };
    const tap = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (e.target.closest("#iSkip")) finish(true); else if (state === "start" || state === "broken") start(); else if (state === "run") finish(true);
    };
    const key = (e) => {
      if (state === "done") return;
      e.stopImmediatePropagation();
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (state === "start" || state === "broken") start(); else if (state === "run") finish(true); }
    };
    box.addEventListener("pointerdown", tap);
    window.addEventListener("keydown", key, true);
  }
  // Para la página de muestra: deja la intro quieta en el segundo t (sin música); devuelve una promesa cuando la escena está lista.
  function still(t) {
    if (!box || !box.isConnected) play(null, true);
    box.classList.add("running");
    return new Promise((ok) => { const wait = () => scene ? (frame(t), ok()) : setTimeout(wait, 100); wait(); });
  }
  return { play, still, CUTS, DUR };
})();
