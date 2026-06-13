import { describe, expect, it } from "vitest";
import {
  buildGameModeOption,
  buildGameStartButton,
  buildMainMenu,
  setGameModeSelected,
  setStartButtonEnabled,
} from "./mainMenu.js";

describe("setGameModeSelected", () => {
  it("updates selection state and ARIA", () => {
    const { button, statusEl } = buildGameModeOption("open-world", "Open World", "");

    setGameModeSelected(button, statusEl, true);
    expect(button.classList.contains("selected")).toBe(true);
    expect(button.getAttribute("aria-checked")).toBe("true");
    expect(statusEl.textContent).toBe("Selected");

    setGameModeSelected(button, statusEl, false);
    expect(button.classList.contains("selected")).toBe(false);
    expect(button.getAttribute("aria-checked")).toBe("false");
    expect(statusEl.textContent).toBe("");
  });
});

describe("setStartButtonEnabled", () => {
  it("toggles disabled state and ARIA", () => {
    const button = buildGameStartButton();
    expect(button.disabled).toBe(true);

    setStartButtonEnabled(button, true);
    expect(button.disabled).toBe(false);
    expect(button.classList.contains("disabled")).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("false");

    setStartButtonEnabled(button, false);
    expect(button.disabled).toBe(true);
    expect(button.classList.contains("disabled")).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("buildMainMenu", () => {
  it("renders both game mode options", () => {
    const menu = buildMainMenu();

    expect(menu.gameModeOptions).toHaveLength(2);
    expect(menu.root.querySelector("#game-mode-open-world")?.textContent).toContain("Open World");
    expect(menu.root.querySelector("#game-mode-hunted")?.textContent).toContain("Hunted");
  });

  it("renders accessible menu shell with logo and title", () => {
    const menu = buildMainMenu();

    expect(menu.root.id).toBe("main-menu");
    expect(menu.root.getAttribute("role")).toBe("dialog");
    expect(menu.root.querySelector("#menu-title")?.textContent).toBe("Parkour Vibes");
    expect(menu.root.querySelector(".menu-logo")).toBeTruthy();
    expect(menu.startButton.disabled).toBe(true);
  });

  it("syncs volume slider display", () => {
    const menu = buildMainMenu();
    menu.updateVolumeDisplay(0.42);

    expect(menu.volumeSlider.value).toBe("0.42");
    expect(menu.volumeValue.textContent).toBe("42%");
    expect(menu.volumeSlider.getAttribute("aria-valuenow")).toBe("42");
    expect(menu.volumeSlider.getAttribute("aria-valuetext")).toBe("42 percent");
  });
});
