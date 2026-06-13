import { applyA11y, ensureSrOnlyStyles } from "./a11y.js";

export const GAME_MODES = [
  { id: "open-world", label: "Open World" },
  { id: "hunted", label: "Hunted" },
] as const;

export type GameModeId = (typeof GAME_MODES)[number]["id"];

export interface GameModeOption {
  id: GameModeId;
  button: HTMLButtonElement;
  statusEl: HTMLSpanElement;
}

export interface MainMenuElements {
  root: HTMLDivElement;
  gameModeOptions: GameModeOption[];
  startButton: HTMLButtonElement;
  gamesLabel: HTMLDivElement;
  volumeSlider: HTMLInputElement;
  volumeValue: HTMLSpanElement;
  updateVolumeDisplay: (volume: number) => void;
  mapPreviewCanvas: HTMLCanvasElement;
  regenerateButton: HTMLButtonElement;
  mapPreviewContainer: HTMLDivElement;
}

export interface MainMenuStyleHandle {
  element: HTMLStyleElement;
}

/** Injects menu CSS once. */
export function injectMainMenuStyles(): MainMenuStyleHandle {
  const element = document.createElement("style");
  element.textContent = `
  #main-menu {
    background: #141418;
    color: #d4d4dc;
    font-family: system-ui, -apple-system, sans-serif;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .menu-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: 100%;
    box-sizing: border-box;
    padding: 34px 29px 48px;
    justify-content: center;
  }
  #main-menu.menu-expanded .menu-content {
    justify-content: flex-start;
    padding-top: 43px;
  }
  .menu-logo {
    width: 86px;
    height: auto;
    margin: 0 0 17px;
    display: block;
    animation: menuLogoFloat 4.2s ease-in-out infinite;
  }
  @keyframes menuLogoFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .menu-logo {
      animation: none;
    }
  }
  .menu-title {
    font-size: 43px;
    font-weight: 600;
    margin: 0 0 32px;
    color: #eeeef2;
  }
  .menu-section-label {
    font-size: 14px;
    font-weight: 500;
    color: #888894;
    margin-bottom: 10px;
  }
  .menu-mode-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .menu-entry {
    width: 336px;
    padding: 14px 17px;
    border: 1px solid #3a3a44;
    border-radius: 7px;
    background: #1c1c22;
    color: #d4d4dc;
    font-size: 17px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    user-select: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .menu-entry:hover {
    background: #222228;
    border-color: #4a4a56;
  }
  .menu-entry.selected {
    border-color: #6a8ab8;
    background: #1e2430;
  }
  .menu-entry .mode-status {
    font-size: 14px;
    color: #888894;
    flex-shrink: 0;
  }
  .menu-entry.selected .mode-status {
    color: #8ab0d8;
  }
  .menu-preview-section {
    margin: 19px 0 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .menu-preview-label {
    font-size: 14px;
    font-weight: 500;
    color: #888894;
    margin-bottom: 7px;
  }
  #map-preview {
    width: 264px;
    height: 264px;
    border: 1px solid #3a3a44;
    border-radius: 4px;
    background: #0e0e12;
    display: block;
  }
  #menu-start-btn {
    margin-top: 29px;
    padding: 12px 34px;
    font-size: 17px;
    font-weight: 500;
    background: #2a4a7a;
    color: #f0f4fa;
    border: 1px solid #3a5a8a;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.12s ease, opacity 0.12s ease;
  }
  #menu-start-btn:hover:not(.disabled) {
    background: #345a8a;
  }
  #menu-start-btn:active:not(.disabled) {
    background: #24406a;
  }
  #menu-start-btn.disabled {
    opacity: 0.45;
    cursor: not-allowed;
    background: #2a2a32;
    border-color: #3a3a44;
    color: #888894;
  }
  #map-regen-btn {
    margin-top: 10px;
    font-size: 14px;
    padding: 6px 12px;
    background: transparent;
    color: #a0a0ac;
    border: 1px solid #3a3a44;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }
  #map-regen-btn:hover {
    background: #222228;
    color: #d4d4dc;
  }
  .menu-volume {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
  }
  .menu-volume-label {
    font-size: 14px;
    font-weight: 500;
    color: #888894;
  }
  .menu-volume-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #music-volume {
    width: 168px;
    accent-color: #5a7aaa;
    cursor: pointer;
  }
  #music-volume-value {
    font-size: 14px;
    color: #888894;
    width: 38px;
    text-align: right;
  }
  .menu-hint {
    margin: 19px 29px 0;
    max-width: 432px;
    font-size: 14px;
    line-height: 1.5;
    color: #686874;
  }
`;
  document.head.appendChild(element);
  return { element };
}

/**
 * Selectable game mode row. Mapped as button in accessibility-devtools.config.yml.
 */
export function buildGameModeOption(
  modeId: GameModeId,
  modeName: string,
  statusText: string,
): GameModeOption {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu-entry";
  button.id = `game-mode-${modeId}`;

  applyA11y(button, {
    role: "radio",
    "aria-checked": "false",
    "aria-label": `${modeName} game mode`,
  });

  const nameEl = document.createElement("span");
  nameEl.className = "mode-name";
  nameEl.textContent = modeName;

  const statusEl = document.createElement("span");
  statusEl.className = "mode-status";
  statusEl.textContent = statusText;
  statusEl.setAttribute("aria-hidden", "true");

  button.append(nameEl, statusEl);
  return { id: modeId, button, statusEl };
}

/**
 * Primary start control. Mapped as button in accessibility-devtools.config.yml.
 */
export function buildGameStartButton(): HTMLButtonElement {
  const startBtn = document.createElement("button");
  startBtn.id = "menu-start-btn";
  startBtn.type = "button";
  startBtn.textContent = "Start game";
  startBtn.disabled = true;
  startBtn.classList.add("disabled");

  applyA11y(startBtn, {
    "aria-disabled": "true",
    "aria-describedby": "menu-hint",
  });

  return startBtn;
}

/**
 * Music volume slider. Mapped as input in accessibility-devtools.config.yml.
 */
export function buildMusicVolumeControl(): {
  container: HTMLDivElement;
  slider: HTMLInputElement;
  valueEl: HTMLSpanElement;
} {
  const container = document.createElement("div");
  container.className = "menu-volume";

  const volumeLabel = document.createElement("label");
  volumeLabel.id = "music-volume-label";
  volumeLabel.className = "menu-volume-label";
  volumeLabel.htmlFor = "music-volume";
  volumeLabel.textContent = "Music volume";

  const volumeRow = document.createElement("div");
  volumeRow.className = "menu-volume-row";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = "music-volume";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.01";

  applyA11y(slider, {
    "aria-labelledby": "music-volume-label",
    "aria-valuemin": "0",
    "aria-valuemax": "100",
    "aria-valuenow": "0",
    "aria-valuetext": "0 percent",
  });

  const valueEl = document.createElement("span");
  valueEl.id = "music-volume-value";
  valueEl.setAttribute("aria-hidden", "true");

  volumeRow.append(slider, valueEl);
  container.append(volumeLabel, volumeRow);
  return { container, slider, valueEl };
}

/**
 * Home screen menu shell. Mapped as dialog in accessibility-devtools.config.yml.
 */
export function buildMainMenu(): MainMenuElements {
  ensureSrOnlyStyles();

  const root = document.createElement("div");
  root.id = "main-menu";
  root.style.cssText = "position:fixed;inset:0;z-index:100;";

  const content = document.createElement("div");
  content.className = "menu-content";

  applyA11y(root, {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "menu-title",
    "aria-describedby": "menu-hint",
  });

  const logo = document.createElement("img");
  logo.className = "menu-logo";
  logo.src = "/favicon.svg";
  logo.width = 86;
  logo.height = 83;
  logo.alt = "";
  logo.setAttribute("aria-hidden", "true");

  const title = document.createElement("h1");
  title.id = "menu-title";
  title.className = "menu-title";
  title.textContent = "Parkour Vibes";

  const gamesLabel = document.createElement("div");
  gamesLabel.id = "game-modes-label";
  gamesLabel.className = "menu-section-label";
  gamesLabel.textContent = "Game mode";

  const modeGroup = document.createElement("div");
  modeGroup.className = "menu-mode-group";
  applyA11y(modeGroup, {
    role: "radiogroup",
    "aria-labelledby": "game-modes-label",
  });

  const gameModeOptions = GAME_MODES.map((mode) =>
    buildGameModeOption(mode.id, mode.label, ""),
  );
  for (const option of gameModeOptions) {
    modeGroup.appendChild(option.button);
  }

  const previewSection = document.createElement("div");
  previewSection.className = "menu-preview-section";

  const previewLabel = document.createElement("div");
  previewLabel.className = "menu-preview-label";
  previewLabel.textContent = "Map preview";

  const canvas = document.createElement("canvas");
  canvas.id = "map-preview";

  const regenerateButton = document.createElement("button");
  regenerateButton.id = "map-regen-btn";
  regenerateButton.type = "button";
  regenerateButton.textContent = "Regenerate";
  applyA11y(regenerateButton, {
    "aria-label": "Regenerate the map layout preview",
  });

  previewSection.append(previewLabel, canvas, regenerateButton);
  previewSection.style.display = "none";

  const startButton = buildGameStartButton();
  const { container: volumeContainer, slider: volumeSlider, valueEl: volumeValue } =
    buildMusicVolumeControl();

  const hint = document.createElement("p");
  hint.id = "menu-hint";
  hint.className = "menu-hint";
  hint.textContent =
    "Select a game mode, then start. Shift to sprint, M toggles music, Enter also starts.";

  content.append(logo, title, gamesLabel, modeGroup, previewSection, startButton, volumeContainer, hint);
  root.appendChild(content);

  function updateVolumeDisplay(volume: number): void {
    volumeSlider.value = volume.toString();
    const pct = Math.round(volume * 100);
    volumeValue.textContent = `${pct}%`;
    volumeSlider.setAttribute("aria-valuenow", String(pct));
    volumeSlider.setAttribute("aria-valuetext", `${pct} percent`);
  }

  return {
    root,
    gameModeOptions,
    startButton,
    gamesLabel,
    volumeSlider,
    volumeValue,
    updateVolumeDisplay,
    mapPreviewCanvas: canvas,
    regenerateButton,
    mapPreviewContainer: previewSection,
  };
}

export function setGameModeSelected(
  option: HTMLButtonElement,
  statusEl: HTMLSpanElement,
  selected: boolean,
): void {
  option.classList.toggle("selected", selected);
  applyA11y(option, { "aria-checked": selected ? "true" : "false" });
  statusEl.textContent = selected ? "Selected" : "";
}

export function setMapPreviewVisible(root: HTMLDivElement, visible: boolean): void {
  root.classList.toggle("menu-expanded", visible);
}

export function setStartButtonEnabled(button: HTMLButtonElement, enabled: boolean): void {
  button.disabled = !enabled;
  button.classList.toggle("disabled", !enabled);
  applyA11y(button, { "aria-disabled": enabled ? "false" : "true" });
}
