import * as THREE from "three";
import {
  GRAVITY,
  JUMP_VELOCITY,
  MIN_STAMINA_TO_SPRINT,
  PLAYER_FEET_OFFSET,
  SPRINT_DECEL_TAU,
  SPRINT_RAMP_TAU,
  SPRINT_SPEED,
  STAMINA_DRAIN_RATE,
  STAMINA_MAX,
  STAMINA_REGEN_RATE,
  STAMINA_REGEN_STATIONARY_MULT,
  STAMINA_RESTORE_THRESHOLD,
  WALK_SPEED,
} from "./constants.js";
import {
  type CollisionWorld,
  resolveFloors,
  resolveWalls,
} from "./collision.js";

export interface MovementState {
  velocityY: number;
  canJump: boolean;
  prevFeetY: number;
  /** True when the player was on a walkable surface last frame (terrain or box top). */
  onSurface: boolean;
  /** Low-pass filtered terrain feet height for smooth Y follow on uneven ground. */
  smoothedGroundY: number;
  prevEyeX: number;
  prevEyeZ: number;
  /** Current (ramped) horizontal speed actually used this frame. */
  currentSpeed: number;
  /** 0..STAMINA_MAX. Drains while sprinting on ground; regens otherwise. */
  stamina: number;
  /** True after stamina depletes; blocks sprint until STAMINA_RESTORE_THRESHOLD. */
  sprintExhausted: boolean;
}

export interface MovementInput {
  forward: number;
  strafe: number;
  jump: boolean;
  sprint: boolean;
}

export function createMovementState(): MovementState {
  return {
    velocityY: 0,
    canJump: true,
    prevFeetY: 0,
    onSurface: false,
    smoothedGroundY: 0,
    prevEyeX: 0,
    prevEyeZ: 0,
    currentSpeed: 0,
    stamina: STAMINA_MAX,
    sprintExhausted: false,
  };
}

/**
 * Consume a jump input if grounded. Used before and after floor resolve:
 * pre-resolve for sprint-jumping off ledges; post-resolve for grounded jumps.
 */
export function tryConsumeJump(state: MovementState, jumpPressed: boolean): boolean {
  if (!jumpPressed || !state.canJump) return false;
  state.velocityY = JUMP_VELOCITY;
  state.canJump = false;
  return true;
}

// Reusable temps for movement direction derivation (no per-frame allocations).
const _moveForward = new THREE.Vector3();
const _moveRight = new THREE.Vector3();

export function updatePlayerMovement(
  delta: number,
  playerEye: THREE.Vector3,
  viewQuat: THREE.Quaternion,
  input: MovementInput,
  state: MovementState,
  world: CollisionWorld,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
  isLocked: boolean = true,
): void {
  if (!isLocked) return;

  tryConsumeJump(state, input.jump);

  const horizontalMove = { x: 0, z: 0 };
  const moveLen = Math.hypot(input.strafe, input.forward);

  const tryingToSprint =
    input.sprint &&
    !state.sprintExhausted &&
    state.stamina > MIN_STAMINA_TO_SPRINT;
  const targetSpeed = tryingToSprint ? SPRINT_SPEED : WALK_SPEED;
  const tau = tryingToSprint ? SPRINT_RAMP_TAU : SPRINT_DECEL_TAU;
  const alpha = 1 - Math.exp(-delta / tau);
  state.currentSpeed = state.currentSpeed * (1 - alpha) + targetSpeed * alpha;

  if (moveLen > 0) {
    const inv = 1 / moveLen;
    horizontalMove.x = input.strafe * inv * state.currentSpeed * delta;
    horizontalMove.z = input.forward * inv * state.currentSpeed * delta;

    // Derive world-space horizontal directions from view yaw.
    _moveForward.set(0, 0, -1).applyQuaternion(viewQuat).setY(0).normalize();
    _moveRight.set(1, 0, 0).applyQuaternion(viewQuat).setY(0).normalize();

    playerEye.x += _moveRight.x * horizontalMove.x + _moveForward.x * horizontalMove.z;
    playerEye.z += _moveRight.z * horizontalMove.x + _moveForward.z * horizontalMove.z;
  }

  resolveWalls(playerEye, world.collidables, horizontalMove);

  // Skip gravity while grounded at rest to avoid micro-bob on uneven terrain.
  const integrateVertical = !state.onSurface || state.velocityY !== 0;
  if (integrateVertical) {
    state.velocityY -= GRAVITY * delta;
    playerEye.y += state.velocityY * delta;
  }

  const floor = resolveFloors(
    playerEye,
    state,
    world,
    raycaster,
    rayOrigin,
    moveLen > 0,
    delta,
  );
  state.velocityY = floor.velocityY;
  state.canJump = floor.canJump;
  state.onSurface = floor.onSurface;
  state.smoothedGroundY = floor.smoothedGroundY;

  resolveWalls(playerEye, world.collidables);

  tryConsumeJump(state, input.jump);

  const isMoving = moveLen > 0;
  const isSprintingNow = state.currentSpeed > WALK_SPEED * 1.05 && isMoving;

  if (isSprintingNow) {
    state.stamina = Math.max(0, state.stamina - STAMINA_DRAIN_RATE * delta);
  } else {
    const mult = !isMoving ? STAMINA_REGEN_STATIONARY_MULT : 1;
    state.stamina = Math.min(STAMINA_MAX, state.stamina + STAMINA_REGEN_RATE * mult * delta);
  }

  if (state.stamina <= 0) {
    state.sprintExhausted = true;
  } else if (state.sprintExhausted && state.stamina >= STAMINA_RESTORE_THRESHOLD) {
    state.sprintExhausted = false;
  }

  state.prevFeetY = playerEye.y - PLAYER_FEET_OFFSET;
  state.prevEyeX = playerEye.x;
  state.prevEyeZ = playerEye.z;
}
