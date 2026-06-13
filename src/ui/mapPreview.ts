import * as THREE from "three";
import type { GameModeId } from "../gameModes.js";
import { createWorld } from "../scene.js";
import { disposeWorld, type WorldData } from "../world/worldHandle.js";

const DEFAULT_VIEW_SIZE = 140;
const MIN_VIEW_SIZE = 60;

export interface MapPreview {
  generate(mode: GameModeId, regenerate?: boolean): WorldData;
  takeWorldForPlay(): WorldData | undefined;
  setWorld(world: WorldData, mode: GameModeId): void;
  restoreAfterPlay(): void;
  dispose(): void;
}

export function createMapPreview(
  canvas: HTMLCanvasElement,
  size: number,
): MapPreview {
  canvas.width = size;
  canvas.height = size;

  let renderer: THREE.WebGLRenderer | undefined = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
  });
  renderer.setSize(size, size);

  let world: WorldData | undefined;
  let lastMode: GameModeId = "open-world";

  function renderPreview(target: WorldData): void {
    if (!renderer) return;

    const bbox = new THREE.Box3();
    for (const mesh of target.collidables) {
      bbox.expandByObject(mesh);
    }

    let center = new THREE.Vector3(0, 0, 0);
    let viewSize = DEFAULT_VIEW_SIZE;
    if (!bbox.isEmpty()) {
      center = bbox.getCenter(new THREE.Vector3());
      const s = bbox.getSize(new THREE.Vector3());
      viewSize = Math.max(s.x, s.z) * 1.4;
      if (viewSize < MIN_VIEW_SIZE) viewSize = DEFAULT_VIEW_SIZE;
    }

    const half = viewSize / 2;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 1, 300);
    cam.position.set(center.x, 90, center.z);
    cam.lookAt(center.x, 0, center.z);

    const clouds = target.clouds;
    for (const cloud of clouds) {
      cloud.visible = false;
    }
    renderer.render(target.scene, cam);
    for (const cloud of clouds) {
      cloud.visible = true;
    }
  }

  return {
    generate(mode, regenerate = false) {
      if (world && (regenerate || mode !== lastMode)) {
        disposeWorld(world);
        world = undefined;
      }
      lastMode = mode;
      if (!world) {
        world = createWorld(mode);
        renderPreview(world);
      }
      return world;
    },

    takeWorldForPlay() {
      if (!world) {
        world = createWorld(lastMode);
      }
      if (renderer) {
        renderer.dispose();
        renderer = undefined;
      }
      const taken = world;
      world = undefined;
      return taken;
    },

    restoreAfterPlay() {
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        renderer.setSize(size, size);
      }
    },

    setWorld(worldData, mode) {
      world = worldData;
      lastMode = mode;
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        renderer.setSize(size, size);
      }
      renderPreview(world);
    },

    dispose() {
      if (world) {
        disposeWorld(world);
        world = undefined;
      }
      if (renderer) {
        renderer.dispose();
        renderer = undefined;
      }
    },
  };
}
