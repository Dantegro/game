import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

// #region agent log
function agentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  const entry = {
    sessionId: "94dacd",
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId,
  };
  const key = "debug-94dacd";
  const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
  prev.push(entry);
  localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
  fetch("http://127.0.0.1:7339/ingest/c28d5406-c153-4730-ac73-09623cb09216", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "94dacd",
    },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
// #endregion

const canvas = document.querySelector("#game") as HTMLCanvasElement;

document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.documentElement.style.height = "100%";

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x87ceeb);

const c = renderer.domElement;
c.style.position = "fixed";
c.style.left = "0";
c.style.top = "0";
c.style.width = "100%";
c.style.height = "100%";
c.style.zIndex = "1";
c.style.display = "block";

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

const hemi = new THREE.HemisphereLight(0xddddff, 0x666688, 1.5);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
dirLight.position.set(50, 100, 40);
scene.add(dirLight);

const groundGeo = new THREE.PlaneGeometry(400, 400, 30, 30);
groundGeo.rotateX(-Math.PI / 2);
const gpos = groundGeo.attributes.position;
for (let i = 0; i < gpos.count; i++) {
  gpos.setY(i, gpos.getY(i) + (Math.random() - 0.5) * 1.8);
}
gpos.needsUpdate = true;
groundGeo.computeVertexNormals();

const ground = new THREE.Mesh(
  groundGeo,
  new THREE.MeshLambertMaterial({ color: 0x3a8a3a }),
);
scene.add(ground);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(6, 6, 6),
  new THREE.MeshLambertMaterial({ color: 0xff2222 }),
);
cube.position.set(3, 4, -12);
scene.add(cube);

for (let i = 0; i < 25; i++) {
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 4, 3.5),
    new THREE.MeshLambertMaterial({ color: 0x777799 }),
  );
  const angle = Math.random() * Math.PI * 2;
  const r = 6 + Math.random() * 32;
  b.position.set(
    Math.cos(angle) * r * (0.6 + Math.random() * 0.8),
    2.2,
    Math.sin(angle) * r
  );
  if (Math.random() < 0.3) {
    b.material.color.setHex(0xaaaa66 + ((Math.random() * 0x555555) | 0));
  }
  scene.add(b);
}

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);
camera.position.set(0, 3, 2);
camera.lookAt(0, 2.5, -12);
const initialCameraQuaternion = camera.quaternion.clone();

const controls = new PointerLockControls(camera, renderer.domElement);

const instructions = document.createElement("div");
instructions.style.cssText =
  "position:fixed;inset:0;display:grid;place-items:center;color:#ccc;font-family:sans-serif;text-align:center;z-index:10;background:linear-gradient(rgba(0,0,0,0.12),rgba(0,0,0,0.2));user-select:none;cursor:pointer;";
instructions.innerHTML =
  "Click to start<br><small>WASD to move • Mouse to look</small>";
document.body.appendChild(instructions);

instructions.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  controls.lock();
});

controls.addEventListener("lock", () => {
  instructions.style.display = "none";
  controls.enabled = true;
  controls.pointerSpeed = 1;
  camera.quaternion.copy(initialCameraQuaternion);
});

controls.addEventListener("unlock", () => {
  instructions.style.display = "grid";
  controls.enabled = true;
  controls.pointerSpeed = 1;
});

const keys: Record<string, boolean> = {};
window.addEventListener("keydown", (e) => (keys[e.code] = true));
window.addEventListener("keyup", (e) => (keys[e.code] = false));

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let prevTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  if (controls.isLocked) {
    // Get movement direction from keys
    direction.z = (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0);
    direction.x = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
    direction.y = 0;

    if (direction.lengthSq() > 0) {
      direction.normalize();

      // Time-based movement (smoother and more reliable)
      const speed = 25; // adjust this value if movement feels too fast/slow
      velocity.x = direction.x * speed * delta;
      velocity.z = direction.z * speed * delta;

      controls.moveRight(velocity.x);
      controls.moveForward(velocity.z);
    }
  }

  // Keep the red cube spinning so we can see rendering is alive
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}
animate();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    controls.disconnect();
    renderer.dispose();
    instructions.remove();
  });
}

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
});
