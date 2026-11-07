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
  return {
    unlock,
    play(name) { if (sounds[name]) sounds[name](); },
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem("npg-mute", muted ? "1" : "0"); } catch (e) {} return muted; }
  };
})();
