// Nadar por la gloria — sonidos hechos con el navegador, sin archivos.
// El audio arranca recién con el primer toque (los celulares lo exigen).

const Sound = (() => {
  let ac = null, muted = false;
  try { muted = localStorage.getItem("npg-mute") === "1"; } catch (e) {}

  function unlock() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
  }
  // un tono que va de f1 a f2 en `dur` segundos
  function tone(f1, f2, dur, type = "square", vol = 0.12, delay = 0) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, freq, vol = 0.15, delay = 0) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t0);
  }
  const sounds = {
    count: () => tone(440, 440, 0.15, "square", 0.08),
    go: () => tone(880, 880, 0.35, "square", 0.1),
    good: () => { tone(523, 523, 0.08, "square", 0.08); tone(659, 659, 0.08, "square", 0.08, 0.07); tone(784, 1046, 0.14, "square", 0.08, 0.14); },
    bad: () => tone(400, 120, 0.35, "sawtooth", 0.09),
    itemEnd: () => { tone(660, 330, 0.18, "triangle", 0.1); tone(330, 220, 0.2, "triangle", 0.08, 0.12); },
    breathOpen: () => tone(1320, 1320, 0.07, "sine", 0.09),
    breath: () => noise(0.22, 900, 0.2),
    gulp: () => { for (let i = 0; i < 3; i++) tone(260 - i * 40, 120, 0.07, "sine", 0.18, i * 0.08); },
    noAir: () => tone(160, 90, 0.5, "triangle", 0.15),
    dive: () => noise(0.3, 700, 0.22),
    perfect: () => { noise(0.3, 700, 0.22); [784, 988, 1318].forEach((f, i) => tone(f, f, 0.09, "square", 0.08, 0.05 + i * 0.06)); },
    turn: () => { noise(0.2, 500, 0.2); tone(300, 600, 0.15, "triangle", 0.07); },
    special: () => tone(300, 1500, 0.25, "sawtooth", 0.07),
    hit: () => tone(200, 60, 0.25, "square", 0.1),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, i === 3 ? 0.5 : 0.14, "square", 0.09, i * 0.14)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.97, i === 2 ? 0.5 : 0.2, "triangle", 0.12, i * 0.2))
  };
  // La música de la intro: 7 segundos originales de electrónica de estadio, a 138 por minuto.
  // Bombo en negras, platillos a contratiempo, bajo que galopa, acordes cortados en 3-3-2 que se van abriendo,
  // un arpegio que sube, redoble y barrido antes del golpe fuerte (cuando cae el título) y un acorde grande al final.
  function intro() {
    const none = { fade() {} };
    if (!ac || muted) return none;
    const T = ac.currentTime + 0.05, B = 60 / 138, S = B / 4, out = ac.createGain();
    out.gain.value = 0.5; out.connect(ac.destination);
    const echo = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain(); // un eco a tiempo para que suene grande
    echo.delayTime.value = B * 0.75; fb.gain.value = 0.32; wet.gain.value = 0.3;
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(out);
    const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const env = (g, t, vol, a, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const noiseHit = (t, type, freq, dur, vol, q = 1) => {
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = nb; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, T + t, vol, 0.002, dur);
      src.connect(f); f.connect(g); g.connect(out); src.start(T + t); src.stop(T + t + dur + 0.05);
    };
    const kick = (t, vol = 0.9) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(160, T + t); o.frequency.exponentialRampToValueAtTime(42, T + t + 0.12);
      env(g, T + t, vol, 0.002, 0.28); o.connect(g); g.connect(out); o.start(T + t); o.stop(T + t + 0.35);
    };
    // un sinte de serruchos desafinados con filtro (cut: hasta dónde se abre)
    const saw = (t, freq, dur, vol, cut, n = 3, send = 0) => {
      const f = ac.createBiquadFilter(), g = ac.createGain(), t0 = T + t;
      f.type = "lowpass"; f.Q.value = 4; f.frequency.setValueAtTime(cut * 1.8, t0); f.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.5), t0 + dur);
      env(g, t0, vol, 0.004, dur); f.connect(g); g.connect(out);
      if (send) { const sg = ac.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(echo); }
      for (let k = 0; k < n; k++) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = (k - (n - 1) / 2) * 14; o.connect(f); o.start(t0); o.stop(t0 + dur + 0.05); }
    };
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12); // nota MIDI a hercios
    // la vuelta de acordes (una por compás): Lam, Fa, Do, Sol, y el golpe final en La
    const CH = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]], ROOT = [45, 41, 48, 43];
    const STAB = [0, 3, 6, 8, 11, 14]; // dónde caen los acordes cortados dentro del compás (en semicorcheas)
    for (let bar = 0; bar < 3; bar++) {
      const b0 = bar * 4 * B, open = 700 + bar * 900;
      for (let beat = 0; beat < 4; beat++) {
        const t = b0 + beat * B;
        if (bar > 0 || beat > 0) kick(t, bar === 0 ? 0.6 : 0.9);
        noiseHit(t + B / 2, "highpass", 7000, 0.09, 0.12 + bar * 0.03); // el platillo abierto a contratiempo
        for (let k = 0; k < 4; k++) if (k !== 2) noiseHit(t + k * S, "highpass", 9000, 0.025, 0.04);
        if (beat % 2 && bar > 0) noiseHit(t, "bandpass", 1900, 0.14, 0.32, 0.8); // el aplauso/redoblante en 2 y 4
      }
      STAB.forEach((st) => CH[bar].forEach((m) => saw(b0 + st * S, hz(m + 12), S * 1.6, 0.05, open, 3, 0.5)));
      // el bajo que galopa: dos semicorcheas de cada tres, una octava abajo
      if (bar > 0) for (let k = 0; k < 16; k++) if (k % 4) saw(b0 + k * S, hz(ROOT[bar] - 12), S * 0.8, 0.11, 500, 2);
      // el arpegio que sube
      if (bar > 0) for (let k = 0; k < 16; k++) saw(b0 + k * S, hz(CH[bar][k % 3] + 24 + (k > 11 ? 12 : 0)), S * 0.7, 0.025, 2400 + bar * 600, 1, 0.6);
    }
    // el compás 4 (de 12 a 13 tiempos): redoble que se acelera y barrido de ruido que sube
    const b3 = 12 * B;
    for (let k = 0; k < 8; k++) noiseHit(b3 - B * 2 + k * (B / 4), "bandpass", 1900, 0.08, 0.12 + k * 0.03, 0.8);
    for (let k = 0; k < 8; k++) noiseHit(b3 + k * (B / 8), "bandpass", 2200, 0.05, 0.2 + k * 0.03, 0.8);
    { const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = T + b3 - B * 2;
      src.buffer = nb; src.loop = true; f.type = "bandpass"; f.Q.value = 3; f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(9000, t0 + B * 3);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + B * 3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + B * 3 + 0.05);
      src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + B * 3 + 0.1); }
    // el golpe fuerte (13 tiempos): bombo, platillo largo y acorde grande de 7 serruchos, con el bajo abajo
    const D = 13 * B;
    kick(D, 1); kick(D + B, 0.8); kick(D + 2 * B, 0.7); kick(D + 3 * B, 0.6);
    noiseHit(D, "highpass", 4500, 1.6, 0.32);
    [57, 64, 69, 72, 76].forEach((m) => saw(D, hz(m), 1.5, 0.05, 3200, 5, 0.4));
    saw(D, hz(33), 1.2, 0.18, 400, 2);
    for (let k = 0; k < 8; k++) saw(D + 0.4 + k * S, hz([69, 72, 76, 81][k % 4] + 12), S * 0.8, 0.03, 3000, 1, 0.7); // un brillo arriba
    return { fade() { const t = ac.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.4); setTimeout(() => out.disconnect(), 600); } };
  }
  return {
    unlock, intro,
    play(name) { if (sounds[name]) sounds[name](); },
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem("npg-mute", muted ? "1" : "0"); } catch (e) {} return muted; }
  };
})();
