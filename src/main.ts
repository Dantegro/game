import * as THREE from "three";
import { createGameSession } from "./gameSession.js";
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
  type GameModeId,
  setGameModeSelected,
  setMapPreviewVisible,
  setStartButtonEnabled,
} from "./ui/mainMenu.js";
import { createMapPreview } from "./ui/mapPreview.js";

const canvas = document.querySelector("#game") as HTMLCanvasElement;
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

const PREVIEW_SIZE = 288;

let selectedGameMode: GameModeId | null = null;

const menuStyles = injectMainMenuStyles();
const menuStyle = menuStyles.element;
const mainMenu = buildMainMenu();
document.body.appendChild(mainMenu.root);

const mapPreview = createMapPreview(mainMenu.mapPreviewCanvas, PREVIEW_SIZE);
const gameSession = createGameSession(renderer);

function startGame() {
  if (!selectedGameMode) {
    mainMenu.gameModeOptions[0]?.button.focus();
    return;
  }

  if (gameSession.isActive() || !mainMenu.root.parentNode) return;

  mainMenu.root.remove();

  const world = mapPreview.takeWorldForPlay();
  if (!world) return;

  const playerAPI = gameSession.start(world, renderer.domElement, exitToMenu);

  c.style.display = "block";
  c.removeAttribute("aria-hidden");
  prevTime = performance.now();
  animate();

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
  if (!gameSession.isActive()) return;

  const world = gameSession.exit();

  c.style.display = "none";
  c.setAttribute("aria-hidden", "true");

  if (!mainMenu.root.parentNode) {
    document.body.appendChild(mainMenu.root);
  }

  mapPreview.restoreAfterPlay();
  if (world && selectedGameMode) {
    mapPreview.setWorld(world, selectedGameMode);
  } else if (selectedGameMode) {
    mapPreview.generate(selectedGameMode);
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (!gameSession.isActive()) return;

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  gameSession.tick(delta);
}

mainMenu.regenerateButton.addEventListener("click", () => {
  if (selectedGameMode) {
    mapPreview.generate(selectedGameMode, true);
  }
});

initBackgroundMusic();
mainMenu.updateVolumeDisplay(getMusicVolume());

mainMenu.volumeSlider.addEventListener("input", () => {
  const vol = parseFloat(mainMenu.volumeSlider.value);
  setMusicVolume(vol);
  mainMenu.updateVolumeDisplay(vol);
});

function selectGameMode(modeId: GameModeId): void {
  selectedGameMode = modeId;
  for (const option of mainMenu.gameModeOptions) {
    setGameModeSelected(option.button, option.statusEl, option.id === modeId);
  }
  setStartButtonEnabled(mainMenu.startButton, true);
  playBackgroundMusic();

  mainMenu.mapPreviewContainer.style.display = "flex";
  setMapPreviewVisible(mainMenu.root, true);
  mapPreview.generate(modeId);
}

for (const option of mainMenu.gameModeOptions) {
  option.button.addEventListener("click", () => {
    selectGameMode(option.id);
  });
}

mainMenu.startButton.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (mainMenu.root.parentNode && e.code === "Enter") {
    e.preventDefault();
    startGame();
    return;
  }
  if (e.code === "KeyM") {
    e.preventDefault();
    toggleBackgroundMusic();
    return;
  }
  if (e.key === "[" || e.key === "-") {
    e.preventDefault();
    setMusicVolume(Math.max(0, getMusicVolume() - 0.05));
  } else if (e.key === "]" || e.key === "+" || e.key === "=") {
    e.preventDefault();
    setMusicVolume(Math.min(1, getMusicVolume() + 0.05));
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    gameSession.dispose();
    mapPreview.dispose();
    disposeBackgroundMusic();
    if (mainMenu.root.parentNode) mainMenu.root.remove();
    if (menuStyle.parentNode) menuStyle.remove();
    renderer.dispose();
  });
}

window.addEventListener("resize", () => {
  if (!gameSession.isActive()) return;
  gameSession.onResize(window.innerWidth, window.innerHeight);
});
