// Nadar por la gloria — la intro en 3D: la pileta, la tribuna, el podio y tres nadadores con movimientos grabados.
// Se dibuja en una pantalla chiquita (240 de alto) con colores de 15 bits y tramado, y se agranda sin suavizar: el look de la PS1.
// intro.js la carga cuando abre la intro; acá solo se arma la escena y se pone cada plano en el segundo que toca.
// Personajes y movimientos: Quaternius (CC0), ver modelos/LICENCIA.txt.
import * as THREE from "./lib/three.module.min.js";
import { GLTFLoader } from "./lib/GLTFLoader.js";
import { clone as cloneRig } from "./lib/SkeletonUtils.js";

const LOW = 240;
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const c01 = (v) => Math.max(0, Math.min(1, v));
const out3 = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, k) => a + (b - a) * k;

export async function create(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "low-power" });
  r.setPixelRatio(1);
  const rt = new THREE.WebGLRenderTarget(16, 16, { magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter });
  // la pasada de "consola vieja": colores de 15 bits con tramado y gamma
  const postMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: rt.texture }, res: { value: new THREE.Vector2(16, 16) } },
    vertexShader: "varying vec2 u; void main(){ u = uv; gl_Position = vec4(position.xy, 0., 1.); }",
    fragmentShader: `uniform sampler2D t; uniform vec2 res; varying vec2 u;
      float bayer(vec2 p){ int i = int(mod(p.x,4.)) + int(mod(p.y,4.))*4;
        float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.); return m[i]/16. - .5; }
      void main(){ vec2 px = floor(u*res); vec3 c = pow(max(texture2D(t, (px+.5)/res).rgb, 0.), vec3(1./2.2));
        c = floor(clamp(c + bayer(px)/32., 0., 1.)*31.+.5)/31.; gl_FragColor = vec4(c, 1.); }`
  });
  const post = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 200);
  sc.fog = new THREE.Fog(0x0a2340, 20, 70);
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5068, 2.4); sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 3); sun.position.set(10, 20, 14); sc.add(sun);
  const rim = new THREE.DirectionalLight(0x88ccff, 1.4); rim.position.set(-8, 6, -12); sc.add(rim);
  const lam = (color) => new THREE.MeshLambertMaterial({ color });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); sc.add(m); return m; };

  // ---------- la pileta: 50 m a lo largo de x, el agua en y = 0, tres andariveles ----------
  const tex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const caustic = tex(64, 64, (g, w, h) => { g.fillStyle = "#2a9fdc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#55bdea"; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) { g.beginPath(); let x = hash(i) * w, y = hash(i + 9) * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (hash(i * 7 + k) - 0.5) * 30; y += (hash(i * 5 + k) - 0.5) * 30; g.lineTo(x, y); } g.stroke(); } });
  caustic.repeat.set(60, 14);
  const waterMat = new THREE.MeshPhongMaterial({ map: caustic, color: 0xffffff, transparent: true, opacity: 0.78, shininess: 90, specular: 0x99ddff, side: THREE.DoubleSide, depthWrite: false });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(64, 14, 64, 8), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(25, 0, 0); water.renderOrder = 2; sc.add(water);
  const tiles = tex(32, 32, (g) => { g.fillStyle = "#4fb3e0"; g.fillRect(0, 0, 32, 32); g.fillStyle = "#3a9fd0"; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32); });
  tiles.repeat.set(60, 14);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 14), new THREE.MeshLambertMaterial({ map: tiles })); floor.rotation.x = -Math.PI / 2; floor.position.set(25, -2.2, 0); sc.add(floor);
  for (const z of [-2.5, 0, 2.5]) box(48, 0.02, 0.3, lam(0x10324f), 25, -2.19, z); // la línea negra de cada andarivel
  box(64, 2.6, 0.3, new THREE.MeshLambertMaterial({ map: tiles }), 25, -1.0, -5.2); box(64, 2.6, 0.3, new THREE.MeshLambertMaterial({ map: tiles }), 25, -1.0, 5.2);
  const wallMat = lam(0xede7d6);
  box(0.4, 2.8, 10.4, wallMat, -0.2, -0.9, 0); box(0.4, 2.8, 10.4, wallMat, 50.2, -0.9, 0); // las paredes de las puntas
  box(0.06, 0.9, 2.2, lam(0xffd84a), 49.98, -0.2, 0); // la placa de llegada
  const deckMat = lam(0xd8d2c0);
  box(10, 0.3, 30, deckMat, -5.4, 0.15, 0); box(10, 0.3, 30, deckMat, 55.4, 0.15, 0); // los bordes de las puntas
  box(70, 0.3, 4, deckMat, 25, 0.15, -7.2); box(70, 0.3, 4, deckMat, 25, 0.15, 7.2); // los bordes de los costados
  // los poyos de salida
  const blockMat = lam(0xf1ecdd);
  for (const z of [-2.5, 0, 2.5]) { box(0.6, 0.5, 0.55, blockMat, -0.35, 0.55, z); box(0.62, 0.05, 0.57, lam(0x3a7bd5), -0.35, 0.82, z); }
  // las corcheras: bolitas rojas y blancas
  const ropes = [-3.75, -1.25, 1.25, 3.75], perRope = 200, rope = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4), new THREE.MeshLambertMaterial(), ropes.length * perRope);
  { const m = new THREE.Matrix4(), col = new THREE.Color(); let k = 0; for (const z of ropes) for (let i = 0; i < perRope; i++, k++) { m.setPosition(i * 0.25, 0.02, z); rope.setMatrixAt(k, m); rope.setColorAt(k, col.set(Math.floor(i / 2) % 2 ? 0xe84a3c : 0xffffff)); } }
  sc.add(rope);

  // ---------- la tribuna: gradas detrás del costado lejano, llena de gente que salta ----------
  const standMat = lam(0x1f4e8c);
  for (let k = 0; k < 9; k++) box(64, 0.5, 1.1, standMat, 25, 0.6 + k * 0.55, -10 - k * 1.05);
  box(64, 0.9, 0.2, lam(0x10324f), 25, 0.75, -9.35); // la baranda con carteles
  const ROWS = 9, PER = 70, N = ROWS * PER;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.16, 0.26, 3, 8).scale(1.25, 1, 0.85), new THREE.MeshLambertMaterial(), N);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 10, 7), new THREE.MeshLambertMaterial(), N);
  const SHIRTS = [0xe84a3c, 0xffd84a, 0x2fb4ea, 0xffffff, 0x7ce896, 0xff8a2a, 0x8e5ce8, 0x1f4e8c], SKINS = [0xe8b48a, 0xd9a077, 0xf2c7a0, 0xc98d63, 0x8d5a3b];
  { const col = new THREE.Color(); for (let i = 0; i < N; i++) { bodies.setColorAt(i, col.set(SHIRTS[Math.floor(hash(i) * 8)])); heads.setColorAt(i, col.set(SKINS[Math.floor(hash(i + 3) * 5)])); } }
  sc.add(bodies, heads);
  const crowdM = new THREE.Matrix4();
  function crowd(t, energy) {
    for (let i = 0; i < N; i++) {
      const row = Math.floor(i / PER), col = i % PER, x = -8 + col * 0.95 + (row % 2) * 0.45 + hash(i + 7) * 0.2, hop = Math.abs(Math.sin(t * 9 + i * 1.3)) * 0.18 * energy * (0.5 + hash(i + 11));
      const y = 1.15 + row * 0.55 + hop, z = -10 - row * 1.05;
      crowdM.makeTranslation(x, y, z); bodies.setMatrixAt(i, crowdM); crowdM.makeTranslation(x, y + 0.4, z); heads.setMatrixAt(i, crowdM);
    }
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  }
  // los flashes de las cámaras en la tribuna
  const FL = 60, flashGeo = new THREE.BufferGeometry(), flashPos = new Float32Array(FL * 3), flashCol = new Float32Array(FL * 3);
  flashGeo.setAttribute("position", new THREE.BufferAttribute(flashPos, 3)); flashGeo.setAttribute("color", new THREE.BufferAttribute(flashCol, 3));
  const flashes = new THREE.Points(flashGeo, new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); sc.add(flashes);
  function cameraFlashes(t, rate) {
    for (let k = 0; k < FL; k++) {
      const ph = (t * 2.2 + hash(k) * 7) % 1, on = k < FL * rate && ph < 0.12, seed = k + Math.floor(t * 2.2 + hash(k) * 7) * 31, a = on ? 1 - ph / 0.12 : 0;
      flashPos.set([-6 + hash(seed) * 62, 1.6 + hash(seed + 1) * 5, -10.3 - hash(seed + 1) * 9], k * 3); flashCol.set([a, a, a], k * 3);
    }
    flashGeo.attributes.position.needsUpdate = flashGeo.attributes.color.needsUpdate = true;
  }
  // los reflectores: conos de luz que barren
  const beams = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.ConeGeometry(2.2, 16, 12, 1, true); g.translate(0, -8, 0);
    const b = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfff0be, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    b.position.set(8 + k * 12, 12, -6); sc.add(b); beams.push(b);
  }
  function sweep(t, fan, aim) { beams.forEach((b, k) => { b.rotation.z = Math.sin(t * 1.6 + k * 1.9) * fan + (aim ? (aim.x - b.position.x) * 0.03 : 0); b.rotation.x = 0.35 + Math.cos(t * 1.3 + k) * fan * 0.5; }); }

  // ---------- el podio, en el borde del costado de la tribuna ----------
  const PODIUM = { x: 25, z: -7.4, tops: [0.85, 0.65, 0.5] }; // alto del 1º, 2º y 3º sobre el borde
  const podMats = [lam(0xffc21a), lam(0xd7e0e8), lam(0xd9864a)];
  [[0, 0], [1, -1.1], [2, 1.1]].forEach(([i, dx]) => box(1.05, PODIUM.tops[i], 1, podMats[i], PODIUM.x + dx, 0.3 + PODIUM.tops[i] / 2, PODIUM.z));

  // ---------- partículas: salpicadura, burbujas, papelitos y la estela dorada ----------
  const SP = 160, spGeo = new THREE.BufferGeometry(), spPos = new Float32Array(SP * 3); spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const spray = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.95 })); sc.add(spray);
  function splash(cx, cy, cz, p, size = 1, dir = 0) { // p de 0 a 1; dir: hacia dónde sale (en x)
    spray.visible = p > 0 && p < 1; if (!spray.visible) return;
    for (let i = 0; i < SP; i++) {
      const a = hash(i) * Math.PI * 2, sp = (0.6 + hash(i + 1) * 1.6) * size, up = (1.5 + hash(i + 2) * 3) * size;
      spPos.set([cx + Math.cos(a) * sp * p + dir * p * size, cy + up * p - 6 * p * p * size, cz + Math.sin(a) * sp * p * 0.7], i * 3);
    }
    spray.material.opacity = 0.95 * (1 - p); spGeo.attributes.position.needsUpdate = true;
  }
  const BU = 70, buGeo = new THREE.BufferGeometry(), buPos = new Float32Array(BU * 3); buGeo.setAttribute("position", new THREE.BufferAttribute(buPos, 3));
  const bubbles = new THREE.Points(buGeo, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.05, transparent: true, opacity: 0.7 })); sc.add(bubbles);
  function bubbleTrail(x, y, z, t) { bubbles.visible = true; for (let i = 0; i < BU; i++) { const k = (t * 0.9 + hash(i)) % 1; buPos.set([x - hash(i + 1) * 2.2 - k * 0.4, y + k * 1.4, z + (hash(i + 2) - 0.5) * 0.5], i * 3); } buGeo.attributes.position.needsUpdate = true; }
  const CF = 220, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.14), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false }), CF);
  { const col = new THREE.Color(), CC = [0xffd84a, 0xff6fb0, 0x7cfc6a, 0x5fd0f5, 0xff8a2a, 0xffffff]; for (let i = 0; i < CF; i++) conf.setColorAt(i, col.set(CC[i % 6])); }
  sc.add(conf);
  const cfM = new THREE.Matrix4(), cfQ = new THREE.Quaternion(), cfE = new THREE.Euler(), cfS = new THREE.Vector3(1, 1, 1), cfP = new THREE.Vector3();
  function confetti(t, x0, z0) { // t: segundos desde que explotó
    conf.visible = t > 0; if (!conf.visible) return;
    for (let i = 0; i < CF; i++) {
      const side = i % 2 ? 1 : -1, vx = side * (1 + hash(i) * 3.5), vy = 5 + hash(i + 1) * 4, vz = (hash(i + 2) - 0.2) * 3;
      cfP.set(x0 - side * 3.5 + vx * t, 0.5 + vy * t - 3.2 * t * t + Math.sin(t * 4 + i) * 0.1, z0 + 1.5 + vz * t);
      cfQ.setFromEuler(cfE.set(t * 6 + i, t * 4 + i * 0.7, 0)); cfM.compose(cfP, cfQ, cfS); conf.setMatrixAt(i, cfM);
    }
    conf.instanceMatrix.needsUpdate = true;
  }
  const trailTex = tex(64, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,216,74,0)"); gr.addColorStop(1, "rgba(255,216,74,1)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  trailTex.wrapS = trailTex.wrapT = THREE.ClampToEdgeWrapping;
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.9), new THREE.MeshBasicMaterial({ map: trailTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  trail.rotation.x = -Math.PI / 2; trail.renderOrder = 3; sc.add(trail);

  // ---------- los nadadores ----------
  const ld = new GLTFLoader();
  const [gm, gf, anims] = await Promise.all([ld.loadAsync("modelos/hombre.glb"), ld.loadAsync("modelos/mujer.glb"), fetch("modelos/movimientos.json").then((x) => x.json())]);
  const CLIPS = {};
  for (const [k, c] of Object.entries(anims)) CLIPS[k] = new THREE.AnimationClip(k, c.duration, c.tracks.map((t) => t.n.endsWith(".quaternion") ? new THREE.QuaternionKeyframeTrack(t.n, t.t, t.v) : new THREE.VectorKeyframeTrack(t.n, t.t, t.v)));
  // El cuerpo gratis es de "superhéroe": se afina de brazos, piernas y pecho (de ancho, no de largo).
  const SLIM = [["upperarm", 0.82, 0.82], ["lowerarm", 0.93, 0.93], ["thigh", 0.9, 0.9], ["calf", 0.95, 0.95], ["spine_03", 0.9, 0.95], ["spine_02", 0.92, 0.95]];
  function swimmer(src, cap, fem) {
    const root = new THREE.Group(), m = cloneRig(src.scene); m.rotation.y = Math.PI / 2; root.add(m); sc.add(root); // mirando hacia +x
    const bone = {};
    m.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
      if (o.isBone) { bone[o.name] = o; const s = SLIM.find(([k]) => o.name.startsWith(k)); if (s) o.userData.slim = [s[1], s[2]]; }
    });
    const head = bone.Head || bone.head;
    // la gorra: ceñida al cráneo, baja hasta las antiparras adelante y hasta la nuca atrás; mate, como la silicona. A ellas les marca el rodete
    const capMat = new THREE.MeshStandardMaterial({ color: cap, roughness: 0.5, metalness: 0.05 });
    const capMesh = new THREE.Mesh(new THREE.SphereGeometry(0.112, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), capMat);
    capMesh.scale.set(0.98, 0.93, 1.1); capMesh.rotation.x = 0.15; capMesh.position.set(0, 0.104, -0.004); head.add(capMesh);
    if (fem) { const bun = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), capMat); bun.scale.set(1.1, 0.9, 0.85); bun.position.set(0, 0.16, -0.085); head.add(bun); }
    // las antiparras: la tira oscura pegada a la gorra y los dos vidrios espejados
    const gogMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.4 });
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.007, 6, 28), gogMat); strap.rotation.x = Math.PI / 2 + 0.1; strap.scale.set(0.9, 0.97, 0.9); strap.position.set(0, 0.085, 0.004); head.add(strap);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x1d3550, roughness: 0.05, metalness: 0.4 });
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 6), lensMat); l.scale.set(1.35, 0.85, 0.6); l.position.set(sx * 0.034, 0.09, 0.096); head.add(l); }
    const mixer = new THREE.AnimationMixer(m);
    const p = { root, m, bone, mixer, cur: null };
    // pone el cuerpo en el movimiento `name`, en el segundo `time` (loop: da la vuelta; si no, queda en el último cuadro)
    p.pose = (name, time, loop = true) => {
      const clip = CLIPS[name];
      if (p.cur !== name) { mixer.stopAllAction(); p.act = mixer.clipAction(clip); p.act.play(); p.cur = name; }
      p.act.time = loop ? ((time % clip.duration) + clip.duration) % clip.duration : Math.max(0, Math.min(clip.duration - 0.001, time));
      mixer.update(0);
      m.traverse((b) => { if (!b.isBone) return; const o = b.userData.slim || [1, 1], q = (b.parent && b.parent.userData.slim) || [1, 1]; b.scale.set(o[0] / q[0], 1, o[1] / q[1]); });
    };
    // gira un hueso desde la pose del movimiento (en grados, sobre sus ejes)
    const e = new THREE.Euler(), q = new THREE.Quaternion();
    p.turn = (name, x, y, z) => { const b = bone[name]; if (b) b.quaternion.multiply(q.setFromEuler(e.set(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180))); };
    const v = new THREE.Vector3(), v2 = new THREE.Vector3(), dq = new THREE.Quaternion(), wq = new THREE.Quaternion(), pq = new THREE.Quaternion();
    // apunta un hueso (de él hacia `child`) en la dirección `dir` del mundo; k: cuánto (0 a 1)
    p.aim = (name, child, dir, k) => {
      const b = bone[name]; root.updateMatrixWorld(true);
      b.getWorldPosition(v); bone[child].getWorldPosition(v2); dq.setFromUnitVectors(v2.sub(v).normalize(), dir);
      b.getWorldQuaternion(wq).premultiply(dq); b.parent.getWorldQuaternion(pq);
      b.quaternion.slerp(pq.invert().multiply(wq), k);
    };
    p.pelvisY = () => { root.updateMatrixWorld(true); bone.pelvis.getWorldPosition(v); return v.y; };
    p.headAt = (out) => { root.updateMatrixWorld(true); return head.getWorldPosition(out); };
    return p;
  }
  const hero = swimmer(gm, 0x1e2026), rivalA = swimmer(gf, 0xffd84a, true), rivalB = swimmer(gm, 0x2fb4ea);
  // los brazos suben de a poco y quedan arriba, con un vaivén lento (k: de 0 a 1, cuánto subieron)
  const rise = (t, dur = 0.35) => { const k = Math.max(0, Math.min(1, t / dur)); return k * k * (3 - 2 * k); };
  const ALL = [hero, rivalA, rivalB];
  // apoya la cadera a la altura y (para que el cuerpo quede en la superficie o arriba de algo)
  const putPelvis = (p, y) => { p.root.position.y += y - p.pelvisY(); };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function look(px, py, pz, tx, ty, tz, fov = 40, roll = 0) { cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); cam.rotateZ(roll); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
  function reset() {
    for (const p of ALL) { p.root.visible = false; p.root.position.set(0, 0, 0); p.root.rotation.set(0, 0, 0); }
    spray.visible = bubbles.visible = conf.visible = trail.visible = false;
    sc.fog.color.set(0x0a2340); sc.fog.near = 20; sc.fog.far = 70; sc.background = new THREE.Color(0x0a2340);
    hemi.intensity = 2.4; sun.intensity = 3; waterMat.opacity = 0.78; beams.forEach((b) => (b.visible = true)); flashes.visible = true;
  }

  // ---------- los planos (lt: segundos desde que empezó el plano; d: cuánto dura) ----------
  const SHOTS = [
    function dive(lt, d) { // 1 · la salida, de costado: agachado en el poyo, salta, cámara lenta en el aire y entra al agua
      crowd(lt, 0.5); cameraFlashes(lt, 0.4); sweep(lt, 0.3);
      const go = 0.42, q = c01((lt - go) / (d - go)), freeze = Math.exp(-Math.pow((q - 0.3) / 0.12, 2));
      hero.root.visible = true;
      if (lt < go) { // agachado, a punto de saltar
        hero.pose("Crouch_Idle_Loop", 0.2 + lt * 0.5); hero.root.position.set(-0.45, 0, 0); hero.root.rotation.z = -0.45; putPelvis(hero, 1.35);
      } else { // el vuelo en arco, de cabeza; se frena un toque en el medio (cámara lenta)
        const f = q < 0.3 ? q : 0.3 + (q - 0.3) * (1 - 0.65 * freeze);
        hero.pose("Swim_Fwd_Loop", 0.05); hero.root.rotation.z = lerp(0.15, -0.75, out3(f));
        const k = rise(lt - go, 0.18); // los brazos estirados por delante de la cabeza, bien derechos
        hero.headAt(tmp); hero.root.updateMatrixWorld(true); const ax = tmp.sub(hero.bone.pelvis.getWorldPosition(tmp2)).normalize();
        for (const sd of ["l", "r"]) { hero.aim("upperarm_" + sd, "lowerarm_" + sd, ax, k); hero.aim("lowerarm_" + sd, "hand_" + sd, ax, k); }
        hero.root.position.set(lerp(-0.2, 3.4, f), 0, 0); putPelvis(hero, lerp(1.45, -0.15, f * f) + Math.sin(f * Math.PI) * 0.55);
        splash(3.6, 0, 0, c01((f - 0.78) / 0.35), 0.8, 0.6);
      }
      const z = 1 + 0.25 * freeze, fx = lt < go ? -0.2 : lerp(-0.2, 2.2, q);
      look(fx + 0.6, 1.35, 3.9 / z, fx + 0.5, 1.25, 0, 54);
    },
    function under(lt) { // 2 · bajo el agua, de cerca: la brazada y la patada, con burbujas y rayos de luz
      sc.background = new THREE.Color(0x0b4f82); sc.fog.color.set(0x0b4f82); sc.fog.near = 1.5; sc.fog.far = 11;
      beams.forEach((b) => (b.visible = false)); flashes.visible = false; hemi.intensity = 3;
      hero.root.visible = true; const x = 12 + lt * 1.6;
      hero.pose("Swim_Fwd_Loop", lt * 1.15); hero.root.position.set(x, 0, 0); putPelvis(hero, -0.75); hero.root.rotation.z = 0.05;
      bubbleTrail(x - 0.3, -0.8, 0, lt);
      look(x + 0.9 + lt * 0.2, -0.8, 2.1, x + 0.2, -0.75, 0, 46, Math.sin(lt * 2) * 0.03);
    },
    function top(lt) { // 3 · desde arriba: tres andariveles; el nuestro se escapa con la estela dorada
      crowd(lt, 0.6); cameraFlashes(lt, 0.3);
      const x = 20 + lt * 2.4;
      [[hero, 0, 0, 0], [rivalA, -2.5, -1.2, 0.4], [rivalB, 2.5, -1.7, 0.8]].forEach(([p, z, dx, ph]) => {
        p.root.visible = true; p.pose("Swim_Fwd_Loop", lt * 1.15 + ph); p.root.position.set(x + dx - lt * (dx ? 0.5 : 0), 0, z); putPelvis(p, 0.02);
      });
      trail.visible = true; trail.position.set(x - 3.6, 0.04, 0);
      waterMat.opacity = 0.5;
      look(x - 0.6, 6.4 - lt * 0.8, 0.5, x - 0.6, 0, 0, 52, 0.06);
    },
    function touch(lt, d) { // 4 · la llegada: toca la placa, salpica, aparece el 1º (el 1º lo dibuja intro.js)
      crowd(lt, 0.8); cameraFlashes(lt, 0.5); sweep(lt, 0.2);
      const hit = 0.3, k = c01((lt - hit) / (d - hit));
      hero.root.visible = true;
      hero.pose("Swim_Fwd_Loop", Math.min(lt, hit) * 1.15 + 0.3); hero.root.position.set(lerp(46.8, 48.6, out3(c01(lt / hit))), 0, 0); putPelvis(hero, -0.1);
      if (lt > hit) splash(49.9, 0, 0, c01(k * 1.6), 0.7, -0.5);
      const shake = lt > hit && lt < hit + 0.15 ? Math.sin(lt * 80) * 0.03 : 0;
      look(47.4 + shake, 0.55, 1.05, 49.2, 0.05, -0.1, 44);
    },
    function cheer(lt) { // 5 · el festejo: de espaldas, metido en el agua, el puño arriba mirando a la tribuna que explota
      crowd(lt, 1); cameraFlashes(lt, 1); sweep(lt, 0.4);
      hero.root.visible = true; hero.pose("Idle_Loop", lt); hero.root.position.set(25, 0, -2.8); hero.root.rotation.y = Math.PI / 2; // de espaldas a la cámara
      putPelvis(hero, -0.12);
      const k = rise(lt - 0.05), sway = Math.sin(lt * 3) * 4;
      hero.turn("upperarm_r", 0, 0, (-140 + sway) * k); hero.turn("lowerarm_r", 0, 0, -20 * k); // el puño arriba
      hero.turn("upperarm_l", 0, 0, (30 - sway * 0.5) * k);
      hero.headAt(tmp);
      look(25.25 + Math.sin(lt) * 0.12, 0.72 + lt * 0.12, -0.95 - lt * 0.2, 25, 1.05, -12, 52);
    },
    function podium(lt, d, at) { // 6 · el podio atrás de la pileta: camina, salta al 1º, levanta los brazos y cae el título
      crowd(lt, lt > at ? 1 : 0.4); cameraFlashes(lt, lt > at ? 1 : 0.3); sweep(lt * (lt > at ? 0.4 : 1), lt > at ? 0.08 : 0.4);
      const deck = 0.3, X = PODIUM.x, Z = PODIUM.z;
      [[rivalA, X - 1.1, PODIUM.tops[1]], [rivalB, X + 1.1, PODIUM.tops[2]]].forEach(([p, x, h], i) => {
        p.root.visible = true; p.pose("Idle_Loop", lt + i * 0.6); p.root.position.set(x, 0, Z); p.root.rotation.y = -Math.PI / 2; // de frente a la cámara
        p.root.position.y = deck + h; // los pies arriba del escalón
        const k = rise(lt - at - 0.05 - i * 0.08), sw = Math.sin(lt * 2.6 + i) * 4; // cuando cae el título, levantan los brazos
        p.turn("upperarm_l", 0, 0, (120 + sw) * k); p.turn("upperarm_r", 0, 0, (-120 - sw) * k); p.turn("lowerarm_l", 0, 0, 15 * k); p.turn("lowerarm_r", 0, 0, -15 * k);
      });
      hero.root.visible = true; hero.root.rotation.y = -Math.PI / 2;
      const walkEnd = at - 0.5;
      if (lt < walkEnd) { hero.pose("Walk_Loop", lt); hero.root.rotation.y = 0; hero.root.position.set(lerp(X - 4.2, X - 0.55, lt / walkEnd), deck, Z + 0.9); }
      else if (lt < at) { const j = (lt - walkEnd) / 0.5; hero.pose("Jump_Loop", j * 0.4); hero.root.position.set(lerp(X - 0.55, X, j), deck + PODIUM.tops[0] * j + Math.sin(j * Math.PI) * 0.5, lerp(Z + 0.9, Z, j)); }
      else { hero.pose("Idle_Loop", lt); hero.root.position.set(X, deck + PODIUM.tops[0], Z); const k = rise(lt - at), w = Math.sin(lt * 3) * 4; hero.turn("upperarm_l", 0, 0, (140 + w) * k); hero.turn("upperarm_r", 0, 0, (-140 - w) * k); hero.turn("lowerarm_l", 0, 0, 10 * k); hero.turn("lowerarm_r", 0, 0, -10 * k); } // los dos brazos arriba
      confetti(lt - at, X, Z);
      const hitK = lt > at ? Math.exp(-(lt - at) * 8) : 0;
      look(X + Math.sin(lt * 80) * 0.05 * hitK, 1.5 + lt * 0.08, -1.2 - lt * 0.12, X, 1.55, Z - 2, 46);
    }
  ];

  let w0 = 0, h0 = 0;
  return {
    // dibuja el plano i en el segundo lt; at: cuándo cae el título dentro del último plano
    render(i, lt, d, at) {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w !== w0 || h !== h0) { w0 = w; h0 = h; r.setSize(w, h, false); rt.setSize(Math.round(LOW * w / h), LOW); postMat.uniforms.res.value.set(rt.width, rt.height); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      reset(); SHOTS[i](lt, d, at);
      caustic.offset.set(lt * 0.15, lt * 0.05);
      r.setRenderTarget(rt); r.render(sc, cam); r.setRenderTarget(null); r.render(post, postCam);
    },
    debug: { THREE, hero, rivalA, rivalB, cam, sc }
  };
}
