import { applyA11y } from "./a11y.js";

export interface GameStartOverlay {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
}

/**
 * Full-screen overlay used for initial entry and in-game pause/resume.
 * When onExitToMenu is provided, shows a pause menu with explicit "Back to Menu" option.
 */
export function buildGameStartOverlay(onExitToMenu?: () => void): GameStartOverlay {
  const overlay = document.createElement("div");
  overlay.className = "game-start-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;place-items:center;color:#ccc;font-family:sans-serif;text-align:center;z-index:10;background:linear-gradient(rgba(0,0,0,0.12),rgba(0,0,0,0.2));user-select:none;cursor:pointer;border:none;padding:0;margin:0;width:100%;";
  overlay.style.display = "none";

  const content = document.createElement("div");

  if (onExitToMenu) {
    const title = document.createElement("div");
    title.style.cssText = "font-size:28px;margin-bottom:12px;";
    title.textContent = "Paused";

    const info = document.createElement("div");
    info.innerHTML = "Click anywhere to resume<br><small>ESC also resumes • Shift to sprint (stamina) • Hold C for third person</small>";

    const backBtn = document.createElement("button");
    backBtn.textContent = "Back to Menu";
    backBtn.style.cssText =
      "margin-top:32px;padding:10px 24px;font-size:14px;background:#222;color:#ddd;border:1px solid #555;cursor:pointer;";
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onExitToMenu();
    });

    content.append(title, info, backBtn);

    applyA11y(overlay, {
      "aria-label": "Game paused. Click anywhere (or ESC) to resume, or Back to Menu.",
    });
  } else {
    content.innerHTML =
      '<span aria-hidden="true">Click to start<br><small>WASD to move • Space to jump • Mouse to look • Hold C for third person</small><br><small>(enters fullscreen for immersion)</small></span>';

    applyA11y(overlay, {
      "aria-label":
        "Start playing. Captures mouse and enters fullscreen. WASD to move, Space to jump, mouse to look.",
    });
  }

  overlay.appendChild(content);

  return {
    element: overlay,
    show: () => {
      overlay.style.display = "grid";
    },
    hide: () => {
      overlay.style.display = "none";
    },
  };
}
