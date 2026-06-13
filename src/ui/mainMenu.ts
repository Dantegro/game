import { applyA11y, ensureSrOnlyStyles } from "./a11y.js";

export interface MainMenuElements {
  root: HTMLDivElement;
  gameModeOption: HTMLButtonElement;
  gameModeStatus: HTMLSpanElement;
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
    font-family: inherit;
    text-align: left;
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
  #map-regen-btn {
    margin-top: 6px;
    font-size: 9px;
    padding: 3px 8px;
    letter-spacing: 1px;
    background: #1a1a22;
    color: #aaa;
    border: 1px solid #464652;
    cursor: pointer;
    transition: background .08s, color .08s;
  }
  #map-regen-btn:hover {
    background: #24242e;
    color: #ccc;
  }
`;
  document.head.appendChild(element);
  return { element };
}

/**
 * Selectable game mode row. Mapped as button in accessibility-devtools.config.yml.
 */
export function buildGameModeOption(
  modeName: string,
  statusText: string,
): { button: HTMLButtonElement; statusEl: HTMLSpanElement } {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu-entry";
  button.id = "game-mode-open-world";

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
  return { button, statusEl };
}

/**
 * Primary start control. Mapped as button in accessibility-devtools.config.yml.
 */
export function buildGameStartButton(): HTMLButtonElement {
  const startBtn = document.createElement("button");
  startBtn.id = "menu-start-btn";
  startBtn.type = "button";
  startBtn.textContent = "START GAME";
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
  container.style.cssText =
    "margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:3px;";

  const volumeLabel = document.createElement("label");
  volumeLabel.id = "music-volume-label";
  volumeLabel.htmlFor = "music-volume";
  volumeLabel.style.cssText = "font-size:9px;letter-spacing:1.5px;opacity:0.45;";
  volumeLabel.textContent = "MUSIC VOLUME";

  const volumeRow = document.createElement("div");
  volumeRow.style.cssText = "display:flex;align-items:center;gap:6px;";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.id = "music-volume";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.01";
  slider.style.cssText = "width:120px;accent-color:#4a6a4a;cursor:pointer;";

  applyA11y(slider, {
    "aria-labelledby": "music-volume-label",
    "aria-valuemin": "0",
    "aria-valuemax": "100",
    "aria-valuenow": "0",
    "aria-valuetext": "0 percent",
  });

  const valueEl = document.createElement("span");
  valueEl.id = "music-volume-value";
  valueEl.style.cssText = "font-size:10px;opacity:0.6;width:26px;text-align:right;";
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
  root.style.cssText =
    "position:fixed;inset:0;z-index:100;background:#0a0a10;color:#c8c8d0;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;";

  applyA11y(root, {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "menu-title",
    "aria-describedby": "menu-hint",
  });

  const title = document.createElement("h1");
  title.id = "menu-title";
  title.style.cssText =
    "font-size:48px;letter-spacing:5px;margin:0 0 2px;font-weight:normal;color:#d8d8e2;";
  title.textContent = "VIBE PARKOUR";

  const tagline = document.createElement("p");
  tagline.style.cssText =
    "font-size:12px;letter-spacing:2.5px;opacity:0.4;margin:0 0 64px;";
  tagline.textContent = "PROTOTYPE";

  const gamesLabel = document.createElement("div");
  gamesLabel.id = "game-modes-label";
  gamesLabel.style.cssText =
    "font-size:10px;letter-spacing:2px;opacity:0.45;margin-bottom:6px;";
  gamesLabel.textContent = "GAME MODES";

  const modeGroup = document.createElement("div");
  applyA11y(modeGroup, {
    role: "radiogroup",
    "aria-labelledby": "game-modes-label",
  });

  const { button: gameModeOption, statusEl: gameModeStatus } = buildGameModeOption(
    "Open World",
    "SELECT",
  );
  modeGroup.appendChild(gameModeOption);

  // Map preview (top-down orthographic view of the generated boxes) + regenerate control.
  // Placed right after the mode selector so players can inspect layout before starting.
  const previewSection = document.createElement("div");
  previewSection.style.cssText =
    "margin:10px 0 4px;display:flex;flex-direction:column;align-items:center;";

  const previewLabel = document.createElement("div");
  previewLabel.style.cssText =
    "font-size:9px;letter-spacing:1.5px;opacity:0.45;margin-bottom:4px;";
  previewLabel.textContent = "MAP LAYOUT PREVIEW (TOP DOWN)";

  const canvas = document.createElement("canvas");
  canvas.id = "map-preview";
  canvas.style.cssText =
    "width:240px;height:240px;border:1px solid #3a3a44;border-radius:2px;background:#111;display:block;";

  const regenerateButton = document.createElement("button");
  regenerateButton.id = "map-regen-btn";
  regenerateButton.type = "button";
  regenerateButton.textContent = "REGENERATE LAYOUT";
  applyA11y(regenerateButton, {
    "aria-label": "Regenerate the map layout preview",
  });

  previewSection.append(previewLabel, canvas, regenerateButton);
  previewSection.style.display = 'none';  // only show after user selects a game mode

  const startButton = buildGameStartButton();
  const { container: volumeContainer, slider: volumeSlider, valueEl: volumeValue } =
    buildMusicVolumeControl();

  const hint = document.createElement("p");
  hint.id = "menu-hint";
  hint.style.cssText = "margin:14px 0 0;font-size:10px;opacity:0.35;";
  hint.textContent =
    "Select a game mode, then press START GAME or Enter to begin. M toggles music. WASD and mouse after lock. Regenerate if the preview layout looks bad.";

  root.append(title, tagline, gamesLabel, modeGroup, previewSection, startButton, volumeContainer, hint);

  function updateVolumeDisplay(volume: number): void {
    volumeSlider.value = volume.toString();
    const pct = Math.round(volume * 100);
    volumeValue.textContent = `${pct}%`;
    volumeSlider.setAttribute("aria-valuenow", String(pct));
    volumeSlider.setAttribute("aria-valuetext", `${pct} percent`);
  }

  return {
    root,
    gameModeOption,
    gameModeStatus,
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
  statusEl.textContent = selected ? "✓ SELECTED" : "SELECT";
  statusEl.style.color = selected ? "#7a9a7a" : "";
}

export function setStartButtonEnabled(button: HTMLButtonElement, enabled: boolean): void {
  button.disabled = !enabled;
  button.classList.toggle("disabled", !enabled);
  applyA11y(button, { "aria-disabled": enabled ? "false" : "true" });
}
