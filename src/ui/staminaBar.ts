/**
 * In-game stamina bar (DOM overlay).
 */
export interface StaminaBar {
  element: HTMLDivElement;
  update(stamina: number, max: number): void;
  show(): void;
  hide(): void;
  remove(): void;
}

export function createStaminaBar(): StaminaBar {
  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:18px",
    "transform:translateX(-50%)",
    "width:220px",
    "height:8px",
    "background:rgba(0,0,0,0.45)",
    "border:1px solid #3a3a44",
    "border-radius:2px",
    "z-index:20",
    "pointer-events:none",
    "overflow:hidden",
  ].join(";");

  const fill = document.createElement("div");
  fill.style.cssText = [
    "height:100%",
    "width:100%",
    "background:#5a7a5a",
    "transition:width .06s linear, background .1s",
  ].join(";");

  container.appendChild(fill);

  function update(stamina: number, max: number) {
    const pct = Math.max(0, Math.min(1, stamina / max));
    fill.style.width = `${pct * 100}%`;
    if (pct < 0.3) {
      fill.style.background = "#a44";
    } else {
      fill.style.background = "#5a7a5a";
    }
  }

  function show() {
    container.style.display = "block";
  }
  function hide() {
    container.style.display = "none";
  }
  function remove() {
    container.remove();
  }

  return {
    element: container,
    update,
    show,
    hide,
    remove,
  };
}
