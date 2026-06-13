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
  type FloorContext,
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

  // Apply jump velocity *early* (if we could jump at the start of this frame, i.e. we were on a
  // surface from the previous frame's resolves). This makes the positive velocityY affect *this
  // frame's* y update and the two resolveWalls + resolveFloors calls.
  //
  // Previously the jump set was at the very end (after y+= and both wall/floor resolves). On a
  // "jump off crate while sprinting" frame this meant:
  //   - horizontal sprint move off the edge
  //   - resolveWalls1 (eye still at landed y → pFeet near box.top → blocksHorizontal false, good)
  //   - vely -= gravity*dt (small negative dip)
  //   - eye.y += (small drop) → pFeet now < box.top - margin
  //   - resolveFloors
  //   - resolveWalls2 (now at lower y, still some XZ overlap → blocksHorizontal true → sudden
  //     penetration push in X or Z by the pen amount)
  //   - then (after resolves) if(jump) { vely = +JUMP; ... }
  //
  // The late resolveWalls2 push (or the timing of when "on top" vs "side" blocking flips) produced
  // the visible small "instance" X jitter in the eye (and thus the camera, in both FP and 3P).
  // It was most noticeable sprinting + jumping off because large per-frame horizontal deltas +
  // the exact moment the vertical state + overlap made blocking re-activate.
  //
  // By setting vely positive early we rise (or at least don't dip) on the jump-off frame, keep
  // pFeet high enough for blocksHorizontal to stay false during both wall resolves, and avoid the
  // spurious correction. The late jump check (after floors) is left in place so same-frame
  // "land this frame + jump" still works (using the canJump that floors just set).
  if (input.jump && state.canJump) {
    state.velocityY = JUMP_VELOCITY;
    state.canJump = false;
  }

  const horizontalMove = { x: 0, z: 0 };
  const moveLen = Math.hypot(input.strafe, input.forward);

  // --- Sprint target + exponential ramp (momentum) ---
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

    // Derive world-space horizontal directions from the current view quaternion (yaw primarily).
    // Matches the previous PointerLockControls.moveRight/moveForward behavior for FP.
    _moveForward.set(0, 0, -1).applyQuaternion(viewQuat).setY(0).normalize();
    _moveRight.set(1, 0, 0).applyQuaternion(viewQuat).setY(0).normalize();

    playerEye.x += _moveRight.x * horizontalMove.x + _moveForward.x * horizontalMove.z;
    playerEye.z += _moveRight.z * horizontalMove.x + _moveForward.z * horizontalMove.z;
  }

  resolveWalls(playerEye, world.collidables, horizontalMove);

  // Skip gravity while grounded at rest — applying it every frame then correcting in
  // terrain follow caused micro-bobbing/jitter on uneven ground. Still integrate when
  // airborne or when a jump impulse was applied this frame (velocityY > 0).
  const integrateVertical = !state.onSurface || state.velocityY !== 0;
  if (integrateVertical) {
    state.velocityY -= GRAVITY * delta;
    playerEye.y += state.velocityY * delta;
  }

  const floorCtx: FloorContext = {
    velocityY: state.velocityY,
    canJump: state.canJump,
    prevFeetY: state.prevFeetY,
    smoothedGroundY: state.smoothedGroundY,
    prevEyeX: state.prevEyeX,
    prevEyeZ: state.prevEyeZ,
    wasOnSurface: state.onSurface,
    isMoving: moveLen > 0,
  };

  const floor = resolveFloors(
    playerEye,
    floorCtx,
    world,
    raycaster,
    rayOrigin,
    delta,
  );
  state.velocityY = floor.velocityY;
  state.canJump = floor.canJump;
  state.onSurface = floor.onSurface;
  state.smoothedGroundY = floor.smoothedGroundY;

  resolveWalls(playerEye, world.collidables);

  if (input.jump && state.canJump) {
    state.velocityY = JUMP_VELOCITY;
    state.canJump = false;
  }

  // --- Stamina drain / regen (only drain while actually sprinting on the ground) ---
  const isMoving = moveLen > 0;
  const isSprintingNow = state.currentSpeed > WALK_SPEED * 1.05 && isMoving;

  if (isSprintingNow) {
    state.stamina = Math.max(0, state.stamina - STAMINA_DRAIN_RATE * delta);
  } else {
    const mult = !isMoving ? STAMINA_REGEN_STATIONARY_MULT : 1;
    state.stamina = Math.min(STAMINA_MAX, state.stamina + STAMINA_REGEN_RATE * mult * delta);
  }

  // Hysteresis: after depletion, stay forced to walk until stamina regens past the restore threshold.
  if (state.stamina <= 0) {
    state.sprintExhausted = true;
  } else if (state.sprintExhausted && state.stamina >= STAMINA_RESTORE_THRESHOLD) {
    state.sprintExhausted = false;
  }

  state.prevFeetY = playerEye.y - PLAYER_FEET_OFFSET;
  state.prevEyeX = playerEye.x;
  state.prevEyeZ = playerEye.z;
}
