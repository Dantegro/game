# Parkour Vibes

A browser-based **parkour / vibe** game — chill movement, lofi ambience, and procedural obstacles to climb. Built with **Three.js**, **TypeScript**, and **Vite**.

Early prototype. Game modes and scope are still evolving. Developed by me and my AI coding agents ツ.

## Play

**Requirements:** A modern desktop browser (Chrome, Firefox, Edge, Safari). Pointer lock and WebGL required.

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Controls

| Input | Action |
|--------|--------|
| **Click** (in-game overlay) | Lock pointer + enter fullscreen (best-effort) |
| **W A S D** | Move |
| **Space** | Jump |
| **Mouse** | Look (while pointer is locked) |
| **M** | Toggle music |
| **[** / **]** or **-** / **+** | Lower / raise music volume |
| **Enter** | Start game (from menu) |

From the menu: select a game mode, then press **Start** or **Enter**.

### What’s in the prototype

- Main menu with music volume slider
- Open-world mode — explore procedural terrain, jump onto crates and buildings
- First-person movement with custom collision (no physics engine yet)
- Background music (place `lofi-ambient.mp3` in `public/sounds/` if the track is missing locally)

### Planned for v1

- **Open world** — free exploration (partially playable today)
- **Timed run** — reach the goal landmark before time runs out
- **Hunted** — same parkour, with an AI pursuer

## Develop

```bash
pnpm install      # install dependencies
pnpm dev          # dev server + HMR
pnpm build        # typecheck + production bundle
pnpm preview      # serve dist/
```

### Stack

- [Three.js](https://threejs.org/) — rendering
- [Vite](https://vite.dev/) — bundling
- [TypeScript](https://www.typescriptlang.org/) — language
- [pnpm](https://pnpm.io/) — package manager

### Layout

```
src/
  main.ts, scene.ts, controls.ts, audio.ts
  player/     # movement + collision
  ui/         # menu, overlays, accessibility helpers
public/       # static assets (sounds, icons)
```

## Status

Active work-in-progress. Expect some rough gameplay mechanics and UI for now.

## License

No license file yet.
