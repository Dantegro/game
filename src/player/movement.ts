import * as THREE from "three";
import type { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GRAVITY, JUMP_VELOCITY, MOVE_SPEED } from "./constants.js";
import {
  type CollisionWorld,
  resolveFloors,
  resolveWalls,
} from "./collision.js";

export interface MovementState {
  velocityY: number;
  canJump: boolean;
}

export interface MovementInput {
  forward: number;
  strafe: number;
  jump: boolean;
}

export function createMovementState(): MovementState {
  return { velocityY: 0, canJump: true };
}

export function updatePlayerMovement(
  delta: number,
  camera: THREE.PerspectiveCamera,
  controls: PointerLockControls,
  input: MovementInput,
  state: MovementState,
  world: CollisionWorld,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
): void {
  if (!controls.isLocked) return;

  const horizontalMove = { x: 0, z: 0 };
  const moveLen = Math.hypot(input.strafe, input.forward);

  if (moveLen > 0) {
    const inv = 1 / moveLen;
    horizontalMove.x = input.strafe * inv * MOVE_SPEED * delta;
    horizontalMove.z = input.forward * inv * MOVE_SPEED * delta;
    controls.moveRight(horizontalMove.x);
    controls.moveForward(horizontalMove.z);
  }

  resolveWalls(camera.position, world.collidables, horizontalMove);

  state.velocityY -= GRAVITY * delta;
  camera.position.y += state.velocityY * delta;

  const floor = resolveFloors(
    camera.position,
    state.velocityY,
    state.canJump,
    world,
    raycaster,
    rayOrigin,
  );
  state.velocityY = floor.velocityY;
  state.canJump = floor.canJump;

  // After vertical lift onto a platform, re-check walls so we are not pushed back out.
  resolveWalls(camera.position, world.collidables);

  if (input.jump && state.canJump) {
    state.velocityY = JUMP_VELOCITY;
    state.canJump = false;
  }
}
