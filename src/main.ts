import * as THREE from "three";
import { createWorld } from "./scene.js";
import { initPlayerControls } from "./controls.js";
import {
  initBackgroundMusic,
  playBackgroundMusic,
  toggleBackgroundMusic,
  disposeBackgroundMusic,
  setMusicVolume,
  getMusicVolume,
} from "./audio.js";
import {
  buildMainMenu,
  injectMainMenuStyles,
  setGameModeSelected,
  setStartButtonEnabled,
} from "./ui/mainMenu.js";

const canvas = document.querySelector("#game") as HTMLCanvasElement;
// Menu is the primary UI until the game starts; hide decorative canvas from AT.
canvas.setAttribute("aria-hidden", "true");

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

const PREVIEW_SIZE = 240;

let scene: THREE.Scene | undefined;
let cube: THREE.Mesh | undefined;
let camera: THREE.PerspectiveCamera | undefined;
let updateMovement: ((delta: number) => void) | undefined;
let disposeControls: (() => void) | undefined;

let gameStarted = false;

let selectedGameMode: string | null = null;

let previewRenderer: THREE.WebGLRenderer | undefined;
let currentWorld: ReturnType<typeof createWorld> | undefined;

let staminaBar: ReturnType<typeof import("./ui/staminaBar.js").createStaminaBar> | undefined;
let getStamina: (() => number) | undefined = undefined;

const menuStyles = injectMainMenuStyles();
const menuStyle = menuStyles.element;
const mainMenu = buildMainMenu();
document.body.appendChild(mainMenu.root);

const previewCanvas = mainMenu.mapPreviewCanvas;
previewCanvas.width = PREVIEW_SIZE;
previewCanvas.height = PREVIEW_SIZE;
previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: false });
previewRenderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE);

function startGame() {
  if (!selectedGameMode) {
    // Visually prompt the user to select a game mode first
    if (mainMenu.gameModeOption) {
      mainMenu.gameModeOption.classList.add('selecting');
      setTimeout(() => mainMenu.gameModeOption.classList.remove('selecting'), 380);
    }
    const gamesLabel = mainMenu.gamesLabel;
    if (gamesLabel) {
      const originalColor = gamesLabel.style.color;
      gamesLabel.style.color = '#cc9966';
      setTimeout(() => {
        gamesLabel.style.color = originalColor || '';
      }, 650);
    }
    return;
  }

  if (gameStarted || !mainMenu.root.parentNode) return;
  gameStarted = true;

  mainMenu.root.remove();

  // Use the last previewed world (if the player liked the layout and possibly regenerated)
  // so their choice is respected. Fall back to a fresh generation only if no preview existed.
  let worldToUse: ReturnType<typeof createWorld>;
  if (currentWorld) {
    worldToUse = currentWorld;
    // Clean up only the preview renderer (the world meshes stay alive for gameplay)
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer = undefined;
    }
  } else {
    worldToUse = createWorld();
  }

  scene = worldToUse.scene;
  cube = worldToUse.cube;

  const playerAPI = initPlayerControls(
    renderer.domElement,
    worldToUse.collidables,
    worldToUse.ground,
    exitToMenu
  );
  camera = playerAPI.camera;
  updateMovement = playerAPI.updateMovement;
  disposeControls = playerAPI.dispose;
  getStamina = playerAPI.getStamina || undefined;

  // Reveal the 3D canvas and kick off the game loop
  c.style.display = "block";
  c.removeAttribute("aria-hidden");
  prevTime = performance.now();
  animate();

  // Create and show the stamina bar for the sprinting system.
  // It is driven every frame from the same updateMovement call that the player feels.
  import("./ui/staminaBar.js").then(({ createStaminaBar }) => {
    staminaBar = createStaminaBar();
    document.body.appendChild(staminaBar.element);
    staminaBar.show();
  });

  // Immediately enter the game on first start from the menu (auto lock + fullscreen).
  // The pause/resume overlay is kept hidden initially so the player drops straight into gameplay.
  // The overlay will only appear later when the player presses ESC during play.
  (async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen denied — still attempt pointer lock.
    }
    playerAPI.controls.lock();
  })();
}

function exitToMenu() {
  if (!gameStarted) return;

  gameStarted = false;

  if (disposeControls) {
    disposeControls();
    disposeControls = undefined;
  }

  // Clean up game state so animate early-returns
  scene = undefined;
  cube = undefined;
  camera = undefined;
  updateMovement = undefined;

  // Hide the game canvas
  c.style.display = "none";
  c.setAttribute("aria-hidden", "true");

  // Re-show the main menu (its DOM state like selected mode and preview visibility is preserved)
  if (!mainMenu.root.parentNode) {
    document.body.appendChild(mainMenu.root);
  }

  // Re-prepare the preview renderer (was disposed on start) so that "REGENERATE LAYOUT"
  // works immediately after returning to the menu. The canvas bitmap from before
  // entering the game is still visible.
  if (mainMenu.mapPreviewCanvas) {
    const cvs = mainMenu.mapPreviewCanvas;
    if (!previewRenderer) {
      previewRenderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: false });
      previewRenderer.setSize(PREVIEW_SIZE, PREVIEW_SIZE);
    }
  }

  if (staminaBar) {
    staminaBar.remove();
    staminaBar = undefined;
  }
  getStamina = undefined;
}

function animate() {
  requestAnimationFrame(animate);

  if (!scene || !camera || !updateMovement || !cube) return;

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  updateMovement(delta);

  // Drive stamina UI (if present) from the same movement state the player is using.
  if (staminaBar && getStamina) {
    staminaBar.update(getStamina(), 100); // 100 = STAMINA_MAX (see player/constants.ts)
  }

  // Keep the red cube spinning so we can see rendering is alive
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

function disposeWorld(world: ReturnType<typeof createWorld>) {
  world.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const mat = child.material;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      mat.dispose();
    }
  });
}

function generatePreview(regenerate = false) {
  if (currentWorld && regenerate) {
    disposeWorld(currentWorld);
    currentWorld = undefined;
  }
  currentWorld = createWorld();

  // Frame an orthographic top-down camera on the actual placed boxes (not the whole ground)
  const bbox = new THREE.Box3();
  currentWorld.collidables.forEach((m) => bbox.expandByObject(m));

  let center = new THREE.Vector3(0, 0, 0);
  let viewSize = 140;
  if (!bbox.isEmpty()) {
    center = bbox.getCenter(new THREE.Vector3());
    const s = bbox.getSize(new THREE.Vector3());
    viewSize = Math.max(s.x, s.z) * 1.4;
    if (viewSize < 60) viewSize = 140;
  }

  const aspect = PREVIEW_SIZE / PREVIEW_SIZE;
  const halfH = viewSize / 2;
  const halfW = halfH * aspect;

  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, 300);
  cam.position.set(center.x, 90, center.z);
  cam.lookAt(center.x, 0, center.z);

  previewRenderer!.render(currentWorld.scene, cam);
}

// Wire regenerate (player can re-roll until the box layout looks good)
// Listener is attached early; the button itself is only visible after mode selection.
mainMenu.regenerateButton.addEventListener("click", () => {
  generatePreview(true);
});

initBackgroundMusic();
mainMenu.updateVolumeDisplay(getMusicVolume());

mainMenu.volumeSlider.addEventListener("input", () => {
  const vol = parseFloat(mainMenu.volumeSlider.value);
  setMusicVolume(vol);
  mainMenu.updateVolumeDisplay(vol);
});

mainMenu.gameModeOption.addEventListener("click", () => {
  selectedGameMode = "open-world";
  setGameModeSelected(mainMenu.gameModeOption, mainMenu.gameModeStatus, true);
  setStartButtonEnabled(mainMenu.startButton, true);
  playBackgroundMusic();

  // Only reveal the top-down map preview (and generate the layout) once the user selects the game mode.
  mainMenu.mapPreviewContainer.style.display = 'flex';
  if (!currentWorld) {
    generatePreview();
  }

  mainMenu.gameModeOption.classList.add("selecting");
  setTimeout(() => mainMenu.gameModeOption.classList.remove("selecting"), 380);
});

mainMenu.startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (mainMenu.root.parentNode && e.code === "Enter") {
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

// Simple in-game (and menu) volume control with keyboard
// [ / ] or - / + to adjust music volume (useful after starting the game when the slider is gone)
window.addEventListener("keydown", (e) => {
  if (e.key === "[" || e.key === "-") {
    e.preventDefault();
    const newVol = Math.max(0, getMusicVolume() - 0.05);
    setMusicVolume(newVol);
  } else if (e.key === "]" || e.key === "+" || e.key === "=") {
    e.preventDefault();
    const newVol = Math.min(1, getMusicVolume() + 0.05);
    setMusicVolume(newVol);
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (disposeControls) disposeControls();
    disposeBackgroundMusic();
    if (previewRenderer) {
      previewRenderer.dispose();
      previewRenderer = undefined;
    }
    if (currentWorld) {
      disposeWorld(currentWorld);
      currentWorld = undefined;
    }
    if (staminaBar) {
      staminaBar.remove();
      staminaBar = undefined;
    }
    getStamina = undefined;
    if (mainMenu.root.parentNode) mainMenu.root.remove();
    if (menuStyle.parentNode) menuStyle.remove();
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
