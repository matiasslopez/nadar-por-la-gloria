// Nadar por la gloria — lo que se guarda en la nube (Firebase), como en Nadamos por la milanga:
// récords del grupo por modo, cada carrera terminada (para las métricas), visitas y comentarios.
// Sin IP ni ubicación: solo un número al azar por dispositivo. Si no hay conexión, el juego sigue igual.

// Los datos del proyecto de Firebase están en config.js.

const Nube = (() => {
  const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
  const st = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  let fs = null, db = null;
  function device() {
    let id = st("npg-uid");
    if (!id) { id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); st("npg-uid", id); }
    return id;
  }
  function traffic() {
    const ua = navigator.userAgent || "", q = new URLSearchParams(location.search);
    let src = (q.get("s") || "").slice(0, 20);
    if (!src) { try { src = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "").slice(0, 30) : ""; } catch (e) {} }
    if (!src || src === location.hostname) src = "directo";
    const os = /android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : /windows/i.test(ua) ? "windows" : /mac/i.test(ua) ? "mac" : /linux/i.test(ua) ? "linux" : "otro";
    const plat = /mobi|android|iphone|ipad/i.test(ua) || matchMedia("(pointer:coarse)").matches ? "celu" : "compu";
    return { src, ref: (q.get("r") || "").replace(/[^a-z0-9]/gi, "").slice(0, 8), os, plat };
  }
  const ready = (async () => {
    if (!FIREBASE_CONFIG) return false;
    try {
      const app = await import(FB + "firebase-app.js");
      fs = await import(FB + "firebase-firestore.js");
      db = fs.getFirestore(app.initializeApp(FIREBASE_CONFIG));
    } catch (e) { db = null; return false; }
    // una visita: una sola escritura por entrada, sin leer antes
    try {
      const isNew = !st("npg-visto"), now = new Date().toISOString(), t = traffic();
      const v = { count: fs.increment(1), last: now, plat: t.plat, os: t.os, shares: +(st("npg-shares") || 0) };
      if (isNew) { v.first = now; v.src = t.src; if (t.ref) v.ref = t.ref; }
      await fs.setDoc(fs.doc(db, "visits", device()), v, { merge: true });
      st("npg-visto", "1");
    } catch (e) {}
    return true;
  })();

  // Una carrera terminada. run: { alias, char, mode, dist, place, time, cup, dive, turns }
  async function saveRun(run) {
    if (!(await ready)) return;
    try {
      const b = fs.writeBatch(db), dev = device(), at = new Date().toISOString();
      b.set(fs.doc(db, "lim", dev), { t: fs.serverTimestamp() });
      b.set(fs.doc(fs.collection(db, "runs")), { ...run, plat: traffic().plat, device: dev, at });
      await b.commit();
    } catch (e) {}
    // récord del grupo: solo si tiene apodo y mejoró su marca en ese modo
    if (!run.alias || run.time == null) return;
    const key = run.mode + "-" + run.dist, mine = +(st("npg-best-" + key) || 1e9);
    if (run.time >= mine) return;
    try {
      await fs.setDoc(fs.doc(db, "boards", key, "best", device()), { alias: run.alias, char: run.char, time: run.time, at: new Date().toISOString() });
      st("npg-best-" + key, run.time);
    } catch (e) {}
  }
  // Los 10 mejores tiempos de un modo, del más rápido al más lento.
  async function board(key) {
    if (!(await ready)) return null;
    try {
      const snap = await fs.getDocs(fs.query(fs.collection(db, "boards", key, "best"), fs.orderBy("time"), fs.limit(10)));
      return snap.docs.map((d) => ({ ...d.data(), me: d.id === device() }));
    } catch (e) { return null; }
  }
  async function feedback(rating, comment, extra) {
    if (!(await ready)) return false;
    try {
      const b = fs.writeBatch(db), dev = device();
      b.set(fs.doc(db, "limf", dev), { t: fs.serverTimestamp() });
      b.set(fs.doc(fs.collection(db, "feedback")), { rating, comment: comment.slice(0, 500), ...extra, device: dev, at: new Date().toISOString() });
      await b.commit(); return true;
    } catch (e) { return false; }
  }
  // Compartir: el menú del celu si hay, si no se copia el texto con el link.
  async function share(text) {
    const url = location.origin + location.pathname + "?s=compartido&r=" + device().slice(-5);
    st("npg-shares", +(st("npg-shares") || 0) + 1);
    if (db) fs.setDoc(fs.doc(db, "visits", device()), { shares: fs.increment(1) }, { merge: true }).catch(() => {});
    try { if (navigator.share) { await navigator.share({ title: "Nadar por la gloria", text, url }); return "ok"; } } catch (e) { return "no"; }
    try { await navigator.clipboard.writeText(text + " " + url); return "copiado"; } catch (e) { return "no"; }
  }
  return { ready, saveRun, board, feedback, share, online: () => !!db };
})();
