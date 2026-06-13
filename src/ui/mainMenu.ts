import { applyA11y, ensureSrOnlyStyles } from "./a11y.js";
import { GAME_MODES, type GameModeId } from "../gameModes.js";
import { MAIN_MENU_CSS } from "./mainMenuStyles.js";

export { GAME_MODES, type GameModeId };

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
  element.textContent = MAIN_MENU_CSS;
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
