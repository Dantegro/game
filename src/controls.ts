import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
  createMovementState,
  updatePlayerMovement,
  type MovementInput,
} from "./player/movement.js";
import type { CollisionWorld } from "./player/collision.js";

export interface PlayerAPI {
  camera: THREE.PerspectiveCamera;
  controls: PointerLockControls;
  updateMovement: (delta: number) => void;
  dispose: () => void;
}

export function initPlayerControls(
  domElement: HTMLElement,
  collidables: THREE.Mesh[] = [],
  groundMesh?: THREE.Mesh,
): PlayerAPI {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );
  camera.position.set(0, 3, 2);
  camera.lookAt(0, 2.5, -12);
  const initialCameraQuaternion = camera.quaternion.clone();

  const controls = new PointerLockControls(camera, domElement);

  const instructions = document.createElement("div");
  instructions.style.cssText =
    "position:fixed;inset:0;display:grid;place-items:center;color:#ccc;font-family:sans-serif;text-align:center;z-index:10;background:linear-gradient(rgba(0,0,0,0.12),rgba(0,0,0,0.2));user-select:none;cursor:pointer;";
  instructions.innerHTML =
    "Click to start<br><small>WASD to move • Space to jump • Mouse to look</small><br><small>(enters fullscreen for immersion)</small>";
  document.body.appendChild(instructions);

  instructions.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen denied — still attempt pointer lock.
    }

    controls.lock();
  });

  controls.addEventListener("lock", () => {
    instructions.style.display = "none";
    controls.enabled = true;
    controls.pointerSpeed = 1;
    camera.quaternion.copy(initialCameraQuaternion);
  });

  controls.addEventListener("unlock", () => {
    instructions.style.display = "grid";
    controls.enabled = true;
    controls.pointerSpeed = 1;
  });

  const keys: Record<string, boolean> = {};

  const handleKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;

    if (controls.isLocked) {
      e.preventDefault();
      e.stopImmediatePropagation();

      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.stopImmediatePropagation();
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;

    if (controls.isLocked) {
      e.preventDefault();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  const handleContextMenu = (e: MouseEvent) => {
    if (controls.isLocked) {
      e.preventDefault();
    }
  };
  domElement.addEventListener("contextmenu", handleContextMenu);

  const movementState = createMovementState();
  const raycaster = new THREE.Raycaster();
  const rayOrigin = new THREE.Vector3();

  const world: CollisionWorld = { collidables, groundMesh };

  function readInput(): MovementInput {
    return {
      forward: (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0),
      strafe: (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0),
      jump: keys["Space"] ?? false,
    };
  }

  function updateMovement(delta: number) {
    updatePlayerMovement(
      delta,
      camera,
      controls,
      readInput(),
      movementState,
      world,
      raycaster,
      rayOrigin,
    );
  }

  function dispose() {
    instructions.remove();
    controls.disconnect();
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    domElement.removeEventListener("contextmenu", handleContextMenu);
  }

  return {
    camera,
    controls,
    updateMovement,
    dispose,
  };
}
