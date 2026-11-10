// Nadar por la gloria — lo que se guarda en la nube (Firebase), como en Nadamos por la milanga:
// récords del grupo por modo, cada carrera terminada (para las métricas), visitas y comentarios.
// Sin IP ni ubicación: solo un número al azar por dispositivo. Si no hay conexión, el juego sigue igual.
// Entrar con Google es opcional: el que entra guarda su avance en la cuenta (sirve en cualquier aparato)
// y su apodo queda reservado, para que nadie más aparezca con ese nombre en el ranking.

// Los datos del proyecto de Firebase están en config.js.

const Nube = (() => {
  const FB = "https://www.gstatic.com/firebasejs/10.12.2/";
  const st = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
  let fs = null, db = null, au = null, auth = null, user = null;
  function device() {
    let id = st("npg-uid");
    if (!id) { id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); st("npg-uid", id); }
    return id;
  }
  // con quién se guarda el avance y los récords: la cuenta de Google si entró, si no el dispositivo
  const who = () => user ? "g_" + user.uid : device();
  const nameKey = (a) => a.trim().toLowerCase();
  // las pruebas en la compu (localhost o un archivo abierto) no cuentan en las métricas
  const TEST = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(location.hostname);
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
      const fa = app.initializeApp(FIREBASE_CONFIG);
      db = fs.getFirestore(fa);
      try { au = await import(FB + "firebase-auth.js"); auth = au.getAuth(fa); await auth.authStateReady(); user = auth.currentUser; } catch (e) { auth = null; }
    } catch (e) { db = null; return false; }
    // una visita: una sola escritura por entrada, sin leer antes
    if (!TEST) try {
      const isNew = !st("npg-visto"), now = new Date().toISOString(), t = traffic();
      const v = { count: fs.increment(1), last: now, plat: t.plat, os: t.os, shares: +(st("npg-shares") || 0) };
      if (isNew) { v.first = now; v.src = t.src; if (t.ref) v.ref = t.ref; }
      // con el apodo y la cuenta, las métricas juntan los celus y compus de una misma persona
      const al = (st("npg-apodo") || "").trim().slice(0, 16);
      if (al) v.alias = al;
      if (user) v.acct = user.uid;
      await fs.setDoc(fs.doc(db, "visits", device()), v, { merge: true });
      st("npg-visto", "1");
    } catch (e) {}
    return true;
  })();

  // Una carrera terminada. run: { alias, char, mode, dist, place, time, cup, lvl, dive, turns } (lvl: el nivel del camino, 0 si es práctica o copa)
  async function saveRun(run) {
    if (!(await ready)) return;
    if (!TEST) try {
      const b = fs.writeBatch(db), dev = device(), at = new Date().toISOString();
      b.set(fs.doc(db, "lim", dev), { t: fs.serverTimestamp() });
      b.set(fs.doc(fs.collection(db, "runs")), { ...run, plat: traffic().plat, device: dev, at });
      await b.commit();
    } catch (e) {}
    // récord del grupo: solo en la práctica libre y la copa, si tiene apodo y mejoró su marca en ese modo
    if (run.lvl || !run.alias || run.time == null) return;
    const key = run.mode + "-" + run.dist, mine = +(st("npg-best-" + key) || 1e9);
    if (run.time >= mine) return;
    try {
      await fs.setDoc(fs.doc(db, "boards", key, "best", who()), { alias: run.alias, char: run.char, time: run.time, at: new Date().toISOString() });
      st("npg-best-" + key, run.time);
    } catch (e) {}
  }
  // Los 10 mejores tiempos de un modo, del más rápido al más lento.
  async function board(key) {
    if (!(await ready)) return null;
    try {
      const snap = await fs.getDocs(fs.query(fs.collection(db, "boards", key, "best"), fs.orderBy("time"), fs.limit(30)));
      return once(snap.docs.map((d) => ({ ...d.data(), me: d.id === who() || d.id === device() }))).slice(0, 10);
    } catch (e) { return null; }
  }
  // Una persona, una fila: si el mismo apodo aparece dos veces (el dispositivo de antes y la cuenta), queda la primera,
  // que es la mejor porque vienen ordenadas.
  function once(rows) {
    const seen = new Set();
    return rows.filter((x) => { const k = nameKey(x.alias || ""); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  // Cómo va cada uno en el camino: uno por dispositivo, o por cuenta si entró con Google.
  // p: { alias, lvl, stars, cups, char, map } (map: las estrellas de cada nivel, solo se guarda en la cuenta)
  // Devuelve "taken" si el apodo ya lo reservó otra persona.
  async function saveProgress(p) {
    if (!p.alias || !(await ready)) return;
    const { map, ...rest } = p, at = new Date().toISOString();
    try {
      if (!user) { await fs.setDoc(fs.doc(db, "players", device()), { ...rest, at }); return "ok"; }
      const key = nameKey(p.alias), b = fs.writeBatch(db), old = st("npg-nombre");
      if (old !== key) { // reservar el apodo nuevo y soltar el de antes
        b.set(fs.doc(db, "names", key), { uid: user.uid, alias: p.alias });
        if (old) b.delete(fs.doc(db, "names", old));
      }
      b.set(fs.doc(db, "players", who()), { ...rest, map: JSON.stringify(map || {}).slice(0, 3000), v: true, at });
      await b.commit(); st("npg-nombre", key); return "ok";
    } catch (e) { return (await aliasFree(p.alias)) ? "error" : "taken"; }
  }
  // Si el apodo está libre (o es tuyo).
  async function aliasFree(alias) {
    if (!alias || !(await ready)) return true;
    try { const d = await fs.getDoc(fs.doc(db, "names", nameKey(alias))); return !d.exists() || (user && d.data().uid === user.uid); } catch (e) { return true; }
  }
  // Entrar con Google: devuelve lo que la cuenta tenía guardado (o null si es la primera vez).
  async function signIn() {
    if (!(await ready) || !auth) return { ok: false };
    try { user = (await au.signInWithPopup(auth, new au.GoogleAuthProvider())).user; }
    catch (e) { return { ok: false, why: e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request" ? "cancel" : "error" }; }
    st("npg-nombre", "");
    try {
      const d = await fs.getDoc(fs.doc(db, "players", who()));
      if (!d.exists()) return { ok: true, saved: null };
      const x = d.data(); let map = {}; try { map = JSON.parse(x.map || "{}"); } catch (e) {}
      st("npg-nombre", nameKey(x.alias || ""));
      return { ok: true, saved: { ...x, map } };
    } catch (e) { return { ok: true, saved: null }; }
  }
  async function signOut() { if (auth) { try { await au.signOut(auth); } catch (e) {} } user = null; st("npg-nombre", ""); }
  const account = () => user ? { name: (user.displayName || user.email || "").split(" ")[0], email: user.email } : null;
  // Los que van más lejos en el camino.
  async function players() {
    if (!(await ready)) return null;
    try {
      const snap = await fs.getDocs(fs.query(fs.collection(db, "players"), fs.orderBy("lvl", "desc"), fs.limit(40)));
      const rows = snap.docs.map((d) => ({ ...d.data(), me: d.id === who() || (!user && d.id === device()) }));
      rows.sort((a, b) => b.lvl - a.lvl || b.stars - a.stars || (b.cups || 0) - (a.cups || 0) || (b.v ? 1 : 0) - (a.v ? 1 : 0));
      return once(rows);
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
    if (db && !TEST) fs.setDoc(fs.doc(db, "visits", device()), { shares: fs.increment(1) }, { merge: true }).catch(() => {});
    try { if (navigator.share) { await navigator.share({ title: "Nadar por la gloria", text, url }); return "ok"; } } catch (e) { return "no"; }
    try { await navigator.clipboard.writeText(text + " " + url); return "copiado"; } catch (e) { return "no"; }
  }
  return { ready, saveRun, board, saveProgress, players, feedback, share, signIn, signOut, account, aliasFree, online: () => !!db, canSignIn: () => !!auth };
})();
