import * as THREE from "three";
import { createWorld } from "./scene.js";
import { initPlayerControls } from "./controls.js";
import {
  initBackgroundMusic,
  playBackgroundMusic,
  toggleBackgroundMusic,
  disposeBackgroundMusic,
} from "./audio.js";

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
c.style.display = "none";

let prevTime = 0;

let scene: THREE.Scene | undefined;
let cube: THREE.Mesh | undefined;
let camera: THREE.PerspectiveCamera | undefined;
let updateMovement: ((delta: number) => void) | undefined;
let disposeControls: (() => void) | undefined;

let menu: HTMLDivElement | undefined;
let menuStyle: HTMLStyleElement | undefined;
let gameStarted = false;

let selectedGameMode: string | null = null;
let gameEntryEl: HTMLDivElement | undefined;
let startBtnEl: HTMLButtonElement | undefined;
let gamesLabelEl: HTMLDivElement | undefined;

function startGame() {
  if (!selectedGameMode) {
    // Visually prompt the user to select a game mode first
    if (gameEntryEl) {
      gameEntryEl.classList.add('selecting');
      setTimeout(() => gameEntryEl?.classList.remove('selecting'), 380);
    }
    if (gamesLabelEl) {
      const originalColor = gamesLabelEl.style.color;
      gamesLabelEl.style.color = '#cc9966';
      setTimeout(() => {
        if (gamesLabelEl) gamesLabelEl.style.color = originalColor || '';
      }, 650);
    }
    return;
  }

  if (gameStarted || !menu || !menu.parentNode) return;
  gameStarted = true;

  menu.remove();

  // Lazily create the world and player controls when leaving the menu
  const world = createWorld();
  scene = world.scene;
  cube = world.cube;

  const playerAPI = initPlayerControls(
    renderer.domElement,
    world.collidables,
    world.ground
  );
  camera = playerAPI.camera;
  updateMovement = playerAPI.updateMovement;
  disposeControls = playerAPI.dispose;

  // Reveal the 3D canvas and kick off the game loop
  c.style.display = "block";
  prevTime = performance.now();
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  if (!scene || !camera || !updateMovement || !cube) return;

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  updateMovement(delta);

  // Keep the red cube spinning so we can see rendering is alive
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

// --- Home screen menu (shown first) ---
menuStyle = document.createElement("style");
menuStyle.textContent = `
  .menu-entry {
    width: 320px;
    padding: 14px 18px;
    border: 1px solid #3a3a44;
    background: #16161c;
    color: #c0c0c8;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform 0.1s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .menu-entry::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 0;
    background: linear-gradient(to bottom, #5a7a5a, #3a5a3a);
    transition: width 0.22s ease;
    z-index: 1;
  }
  .menu-entry.selecting {
    animation: selectPop 0.38s cubic-bezier(0.2, 0.85, 0.25, 1);
  }
  @keyframes selectPop {
    0%   { transform: scale(0.96); }
    32%  { transform: scale(1.035); }
    100% { transform: scale(1); }
  }
  .menu-entry:hover {
    background: #1f1f28;
    border-color: #5a5a66;
  }
  .menu-entry.selected {
    border-color: #4a6a4a;
    background: #1a221a;
    color: #d8e0d8;
    box-shadow: 0 0 0 1px rgba(70, 100, 70, 0.28) inset;
  }
  .menu-entry.selected::before {
    width: 4px;
  }
  .menu-entry .mode-name {
    position: relative;
    z-index: 2;
  }
  .menu-entry .mode-status {
    position: relative;
    z-index: 2;
    font-size: 10px;
    letter-spacing: 0.5px;
    opacity: 0.55;
    transition: color 0.2s ease, opacity 0.2s ease;
  }
  .menu-entry.selected .mode-status {
    opacity: 0.95;
  }
  #menu-start-btn {
    margin-top: 32px;
    padding: 13px 52px;
    font-size: 14px;
    letter-spacing: 2px;
    background: #1a1a22;
    color: #d0d0d8;
    border: 1px solid #464652;
    cursor: pointer;
    transition: background .08s, border-color .08s, color .08s, opacity .1s;
  }
  #menu-start-btn:hover {
    background: #24242e;
    border-color: #5f5f6e;
    color: #f0f0f8;
  }
  #menu-start-btn:active {
    transform: translateY(1px);
  }
  #menu-start-btn.disabled {
    opacity: 0.38;
    cursor: not-allowed;
    border-color: #333338;
    color: #888;
    background: #16161c;
  }
  #menu-start-btn.disabled:hover {
    background: #16161c;
    border-color: #333338;
    color: #888;
  }
`;
document.head.appendChild(menuStyle);

menu = document.createElement("div");
menu.style.cssText =
  "position:fixed;inset:0;z-index:100;background:#0a0a10;color:#c8c8d0;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;";

const title = document.createElement("div");
title.style.cssText = "font-size:48px;letter-spacing:5px;margin-bottom:2px;color:#d8d8e2;";
title.textContent = "VIBE WORLD";

const tagline = document.createElement("div");
tagline.style.cssText = "font-size:12px;letter-spacing:2.5px;opacity:0.4;margin-bottom:64px;";
tagline.textContent = "PROTOTYPE";

const gamesLabel = document.createElement("div");
gamesLabel.style.cssText = "font-size:10px;letter-spacing:2px;opacity:0.45;margin-bottom:6px;";
gamesLabel.textContent = "GAME MODES";
gamesLabelEl = gamesLabel;

const gameEntry = document.createElement("div");
gameEntry.className = "menu-entry";

const modeName = document.createElement("span");
modeName.className = "mode-name";
modeName.textContent = "Open World";

const modeStatus = document.createElement("span");
modeStatus.className = "mode-status";
modeStatus.textContent = "SELECT";

gameEntry.append(modeName, modeStatus);
gameEntryEl = gameEntry;

const startBtn = document.createElement("button");
startBtn.id = "menu-start-btn";
startBtn.textContent = "START GAME";
startBtn.disabled = true;
startBtn.classList.add('disabled');
startBtnEl = startBtn;

const hint = document.createElement("div");
hint.style.cssText = "margin-top:14px;font-size:10px;opacity:0.35;";
hint.textContent = "Press START GAME (or Enter) to begin • M to toggle lofi music • WASD + mouse after lock";

menu.append(title, tagline, gamesLabel, gameEntry, startBtn, hint);
document.body.appendChild(menu);

// Preload lofi music early (no sound until user gesture)
initBackgroundMusic();

// Selection on the game mode entry:
// - Plays a pop/scale animation
// - Slides in a left accent bar
// - Updates status to "✓ SELECTED" with color shift
// - Enables the START GAME button
// - Starts the lofi background music (triggered by user gesture)
gameEntry.addEventListener("click", () => {
  selectedGameMode = 'open-world';
  gameEntry.classList.add('selected');

  const statusEl = gameEntry.querySelector('.mode-status') as HTMLSpanElement | null;
  if (statusEl) {
    statusEl.textContent = '✓ SELECTED';
    statusEl.style.color = '#7a9a7a';
  }

  if (startBtnEl) {
    startBtnEl.disabled = false;
    startBtnEl.classList.remove('disabled');
  }

  // Start the chill lofi track
  playBackgroundMusic();

  // Trigger the actual selection animation
  gameEntry.classList.add('selecting');
  setTimeout(() => gameEntry.classList.remove('selecting'), 380);
});

// Only the START GAME button actually launches the game (after a mode has been selected).
startBtn.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (menu && menu.parentNode && e.code === "Enter") {
    e.preventDefault();
    startGame();
  }
});

// Global music toggle (works on the menu and after entering the game world)
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM") {
    e.preventDefault();
    toggleBackgroundMusic();
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (disposeControls) disposeControls();
    disposeBackgroundMusic();
    if (menu && menu.parentNode) menu.remove();
    if (menuStyle && menuStyle.parentNode) menuStyle.remove();
    renderer.dispose();
  });
}

window.addEventListener("resize", () => {
  if (!camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
});
