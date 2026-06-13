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
import { disposeMeshes } from "./disposeMeshes.js";
import {
  createPlayerModel,
  stepThirdPersonTransition,
  updateThirdPersonView,
} from "./player/view.js";

export interface PlayerAPI {
  camera: THREE.PerspectiveCamera;
  controls: PointerLockControls;
  updateMovement: (delta: number) => void;
  dispose: () => void;
  getStamina: () => number;
  onResize: (width: number, height: number) => void;
}

export function initPlayerControls(
  domElement: HTMLElement,
  scene: THREE.Scene,
  collidables: THREE.Mesh[] = [],
  groundMesh?: THREE.Mesh,
  onExitToMenu?: () => void,
): PlayerAPI {
  const lookCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );
  lookCamera.position.set(0, 3, 2);
  lookCamera.lookAt(0, 2.5, -12);

  const renderCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500,
  );

  const controls = new PointerLockControls(lookCamera, domElement);

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

  const playerEyePos = new THREE.Vector3().copy(lookCamera.position);

  const spawnGroundY = placePlayerOnGround(
    playerEyePos,
    world,
    raycaster,
    rayOrigin,
  );
  movementState.prevFeetY = spawnGroundY;
  movementState.smoothedGroundY = spawnGroundY;
  movementState.onSurface = true;
  movementState.prevEyeX = playerEyePos.x;
  movementState.prevEyeZ = playerEyePos.z;

  const playerModel = createPlayerModel();
  scene.add(playerModel);
  let thirdPersonT = 0;

  function readInput(): MovementInput {
    return {
      forward: (keys["KeyW"] ? 1 : 0) - (keys["KeyS"] ? 1 : 0),
      strafe: (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0),
      jump: keys["Space"] ?? false,
      sprint: !!(keys["ShiftLeft"] || keys["ShiftRight"]),
    };
  }

  function updateMovement(delta: number) {
    const input = readInput();

    updatePlayerMovement(
      delta,
      playerEyePos,
      lookCamera.quaternion,
      input,
      movementState,
      world,
      raycaster,
      rayOrigin,
      controls.isLocked,
    );

    const holdingThirdPerson = !!keys["KeyC"];
    const targetT = holdingThirdPerson ? 1 : 0;
    thirdPersonT = stepThirdPersonTransition(thirdPersonT, targetT, delta);

    updateThirdPersonView(
      renderCamera,
      playerEyePos,
      lookCamera.quaternion,
      thirdPersonT,
      playerModel,
      delta,
    );
  }

  function onResize(width: number, height: number) {
    const aspect = width / height;
    lookCamera.aspect = aspect;
    lookCamera.updateProjectionMatrix();
    renderCamera.aspect = aspect;
    renderCamera.updateProjectionMatrix();
  }

  function dispose() {
    startOverlay.element.remove();
    controls.disconnect();
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    domElement.removeEventListener("contextmenu", handleContextMenu);

    scene.remove(playerModel);
    disposeMeshes(playerModel);
  }

  return {
    camera: renderCamera,
    controls,
    updateMovement,
    dispose,
    getStamina: () => movementState.stamina,
    onResize,
  };
}
