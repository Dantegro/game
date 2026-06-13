import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import {
  createMovementState,
  updatePlayerMovement,
  type MovementInput,
} from "./player/movement.js";
import type { CollisionWorld } from "./player/collision.js";
import { placePlayerOnGround } from "./player/collision.js";
import { buildGameStartOverlay } from "./ui/gameOverlay.js";

export interface PlayerAPI {
  camera: THREE.PerspectiveCamera;
  controls: PointerLockControls;
  updateMovement: (delta: number) => void;
  dispose: () => void;
  getStamina: () => number;
}

export function initPlayerControls(
  domElement: HTMLElement,
  collidables: THREE.Mesh[] = [],
  groundMesh?: THREE.Mesh,
  onExitToMenu?: () => void,
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

  const startOverlay = buildGameStartOverlay(onExitToMenu);
  document.body.appendChild(startOverlay.element);

  startOverlay.element.addEventListener("click", async (event) => {
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
    startOverlay.hide();
    controls.enabled = true;
    controls.pointerSpeed = 1;
    camera.quaternion.copy(initialCameraQuaternion);
  });

  controls.addEventListener("unlock", () => {
    startOverlay.show();
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

  const spawnGroundY = placePlayerOnGround(
    camera.position,
    world,
    raycaster,
    rayOrigin,
  );
  movementState.prevFeetY = spawnGroundY;

  function readInput(): MovementInput {
    return {
      forward: (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0),
      strafe: (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0),
      jump: keys["Space"] ?? false,
      sprint: !!(keys["ShiftLeft"] || keys["ShiftRight"]),
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
    startOverlay.element.remove();
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
    getStamina: () => movementState.stamina,
  };
}
