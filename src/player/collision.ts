import * as THREE from "three";
import {
  BOX_REST_FEET_MARGIN,
  BOX_REST_STEP_MAX,
  BOX_REST_STEP_MIN,
  BOX_TOP_EDGE_GRACE,
  BOX_TOP_LAND_MARGIN,
  FEET_ON_BOX_MARGIN,
  FEET_RESTING_STEP_MAX,
  FEET_RESTING_STEP_MIN,
  LAND_SNAP_TOLERANCE,
  ON_TERRAIN_FEET_ABOVE,
  PLAYER_EYE_HEIGHT,
  PLAYER_FEET_OFFSET,
  PLAYER_HEAD_OFFSET,
  PLAYER_RADIUS,
  RISING_VELOCITY_THRESHOLD,
  TERRAIN_GROUND_SMOOTH_TAU_DOWN,
  TERRAIN_GROUND_SMOOTH_TAU_UP,
  TERRAIN_MAX_SINK,
  TERRAIN_PENETRATION_TOLERANCE,
  TERRAIN_SAMPLE_MIDPOINT_WEIGHT,
  TERRAIN_SAMPLE_MOVE_THRESHOLD,
  TERRAIN_SAMPLE_PRIMARY_WEIGHT,
  TERRAIN_STICK_BELOW,
  TERRAIN_STICK_FEET,
  TERRAIN_STICK_LEAVE,
  WALL_FRICTION,
} from "./constants.js";
import type { MovementState } from "./movement.js";

const _down = new THREE.Vector3(0, -1, 0);
const _box = new THREE.Box3();

export interface CollisionWorld {
  collidables: THREE.Mesh[];
  groundMesh?: THREE.Mesh;
}

export function sampleGroundHeight(
  groundMesh: THREE.Mesh,
  x: number,
  z: number,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
): number {
  rayOrigin.set(x, 150, z);
  raycaster.set(rayOrigin, _down);
  const hits = raycaster.intersectObject(groundMesh, false);
  return hits.length > 0 ? hits[0].point.y : 0;
}

/**
 * Sample terrain height with light spatial averaging between the current XZ and the
 * midpoint from the previous frame. Reduces pops when sprinting across triangle edges.
 */
function sampleTerrainHeight(
  groundMesh: THREE.Mesh,
  x: number,
  z: number,
  prevX: number,
  prevZ: number,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
): number {
  const h = sampleGroundHeight(groundMesh, x, z, raycaster, rayOrigin);
  const moved = Math.hypot(x - prevX, z - prevZ);
  if (moved < TERRAIN_SAMPLE_MOVE_THRESHOLD) return h;

  const mx = (x + prevX) * 0.5;
  const mz = (z + prevZ) * 0.5;
  const hm = sampleGroundHeight(groundMesh, mx, mz, raycaster, rayOrigin);
  return (
    h * TERRAIN_SAMPLE_PRIMARY_WEIGHT + hm * TERRAIN_SAMPLE_MIDPOINT_WEIGHT
  );
}

function smoothGroundHeight(
  smoothed: number,
  target: number,
  delta: number,
): number {
  const rising = target > smoothed;
  const tau = rising ? TERRAIN_GROUND_SMOOTH_TAU_UP : TERRAIN_GROUND_SMOOTH_TAU_DOWN;
  const alpha = delta > 0 ? 1 - Math.exp(-delta / tau) : 0.25;
  let next = smoothed + (target - smoothed) * alpha;
  if (rising) {
    next = Math.max(next, target - TERRAIN_MAX_SINK);
  }
  return next;
}

/** Place the camera at standing height over sampled terrain at its current XZ. */
export function placePlayerOnGround(
  eyePos: THREE.Vector3,
  world: CollisionWorld,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
): number {
  const groundHeight = world.groundMesh
    ? sampleGroundHeight(world.groundMesh, eyePos.x, eyePos.z, raycaster, rayOrigin)
    : 0;
  eyePos.y = groundHeight + PLAYER_EYE_HEIGHT;
  return groundHeight;
}

/**
 * Hard recovery when feet have penetrated the terrain mesh (e.g. bad spawn or
 * missed frame). Prevents falling through the world.
 */
function recoverFromTerrainPenetration(
  eyePos: THREE.Vector3,
  groundHeight: number,
  feetOnBox: boolean,
): FloorResolveResult | null {
  if (feetOnBox) return null;

  const pFeet = feetY(eyePos.y);
  if (pFeet >= groundHeight - TERRAIN_PENETRATION_TOLERANCE) return null;

  eyePos.y = groundHeight + PLAYER_EYE_HEIGHT;
  return {
    velocityY: 0,
    canJump: true,
    onSurface: true,
    feetY: groundHeight,
    smoothedGroundY: groundHeight,
  };
}

function feetY(eyeY: number): number {
  return eyeY - PLAYER_FEET_OFFSET;
}

function headY(eyeY: number): number {
  return eyeY + PLAYER_HEAD_OFFSET;
}

/** XZ circle overlaps the box footprint (player radius). */
function overlapsXZ(px: number, pz: number, box: THREE.Box3): boolean {
  return overlapsXZExpanded(px, pz, box, 0);
}

/** XZ circle overlaps the box footprint expanded by `expand` (lip / corner landings). */
function overlapsXZExpanded(
  px: number,
  pz: number,
  box: THREE.Box3,
  expand: number,
): boolean {
  const nearestX = THREE.MathUtils.clamp(px, box.min.x - expand, box.max.x + expand);
  const nearestZ = THREE.MathUtils.clamp(pz, box.min.z - expand, box.max.z + expand);
  const dx = px - nearestX;
  const dz = pz - nearestZ;
  return dx * dx + dz * dz <= PLAYER_RADIUS * PLAYER_RADIUS;
}

/**
 * Block horizontal movement when the capsule intersects the box volume and
 * the feet have not cleared the top lip. No step-height bypass — that caused
 * passing through box sides mid-jump and erratic floor snaps.
 */
function blocksHorizontal(eyeY: number, box: THREE.Box3): boolean {
  const pFeet = feetY(eyeY);
  const pHead = headY(eyeY);

  if (pFeet >= box.max.y - BOX_TOP_LAND_MARGIN) return false;
  if (pHead <= box.min.y || pFeet >= box.max.y) return false;

  return true;
}

export function resolveWalls(
  eyePos: THREE.Vector3,
  collidables: THREE.Mesh[],
  horizontalMove?: { x: number; z: number },
): boolean {
  if (collidables.length === 0) return false;

  let hitWall = false;

  for (let iter = 0; iter < 3; iter++) {
    let anyHit = false;

    for (const mesh of collidables) {
      const box = _box.setFromObject(mesh);

      if (!blocksHorizontal(eyePos.y, box)) continue;

      const minX = box.min.x - PLAYER_RADIUS;
      const maxX = box.max.x + PLAYER_RADIUS;
      const minZ = box.min.z - PLAYER_RADIUS;
      const maxZ = box.max.z + PLAYER_RADIUS;

      const x = eyePos.x;
      const z = eyePos.z;

      if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;

      anyHit = true;
      hitWall = true;

      const penX1 = x - minX;
      const penX2 = maxX - x;
      const penZ1 = z - minZ;
      const penZ2 = maxZ - z;

      if (penX1 < penX2 && penX1 < penZ1 && penX1 < penZ2) {
        eyePos.x -= penX1;
      } else if (penX2 < penX1 && penX2 < penZ1 && penX2 < penZ2) {
        eyePos.x += penX2;
      } else if (penZ1 < penX1 && penZ1 < penX2 && penZ1 < penZ2) {
        eyePos.z -= penZ1;
      } else {
        eyePos.z += penZ2;
      }
    }

    if (!anyHit) break;
  }

  if (hitWall && horizontalMove) {
    horizontalMove.x *= WALL_FRICTION;
    horizontalMove.z *= WALL_FRICTION;
  }

  return hitWall;
}

export interface FloorResolveResult {
  velocityY: number;
  canJump: boolean;
  onSurface: boolean;
  feetY: number;
  smoothedGroundY: number;
}

interface BoxLandingCandidate {
  topY: number;
  priority: number;
}

/**
 * Decide whether the player should snap onto a box top this frame.
 */
function evaluateBoxLanding(
  eyeY: number,
  px: number,
  pz: number,
  box: THREE.Box3,
  state: MovementState,
  groundHeight: number,
): BoxLandingCandidate | null {
  const falling = state.velocityY < 0;
  const xzOverlap = falling
    ? overlapsXZExpanded(px, pz, box, BOX_TOP_EDGE_GRACE)
    : overlapsXZ(px, pz, box);
  if (!xzOverlap) return null;

  const pFeet = feetY(eyeY);
  const stepDown = pFeet - box.max.y;

  // Already resting on this surface (feet at or barely below the top plane).
  if (
    stepDown >= BOX_REST_STEP_MIN &&
    stepDown <= BOX_REST_STEP_MAX &&
    state.velocityY <= 0 &&
    pFeet >= box.max.y - BOX_REST_FEET_MARGIN
  ) {
    return { topY: box.max.y, priority: box.max.y };
  }

  // Feet must be at or below the top plane to land (not jumping up through it).
  if (stepDown > LAND_SNAP_TOLERANCE) return null;

  const onTerrain = pFeet <= groundHeight + ON_TERRAIN_FEET_ABOVE;
  const crossedTopPlane =
    falling &&
    state.prevFeetY >= box.max.y - BOX_TOP_LAND_MARGIN &&
    pFeet <= box.max.y + BOX_TOP_LAND_MARGIN;

  // Mid-air only — require feet at/above top plane unless swept across it this frame.
  if (!onTerrain && falling) {
    if (
      crossedTopPlane ||
      (stepDown >= 0 && stepDown <= LAND_SNAP_TOLERANCE)
    ) {
      return { topY: box.max.y, priority: box.max.y };
    }
  }

  return null;
}

function resolveBoxFloors(
  eyePos: THREE.Vector3,
  state: MovementState,
  collidables: THREE.Mesh[],
  groundHeight: number,
): FloorResolveResult {
  const pFeet = feetY(eyePos.y);
  let best: BoxLandingCandidate | null = null;

  for (const mesh of collidables) {
    const box = _box.setFromObject(mesh);
    const candidate = evaluateBoxLanding(
      eyePos.y,
      eyePos.x,
      eyePos.z,
      box,
      state,
      groundHeight,
    );
    if (candidate && (!best || candidate.priority > best.priority)) {
      best = candidate;
    }
  }

  if (!best) {
    return {
      velocityY: state.velocityY,
      canJump: state.canJump,
      onSurface: false,
      feetY: pFeet,
      smoothedGroundY: state.smoothedGroundY,
    };
  }

  eyePos.y = best.topY + PLAYER_FEET_OFFSET;
  return {
    velocityY: 0,
    canJump: true,
    onSurface: true,
    feetY: best.topY,
    smoothedGroundY: best.topY,
  };
}

function applyTerrainFollow(
  eyePos: THREE.Vector3,
  velocityY: number,
  canJump: boolean,
  groundHeight: number,
  feetOnBox: boolean,
  delta: number,
  smoothedGroundY: number,
  wasOnSurface: boolean,
  isMoving: boolean,
): FloorResolveResult {
  const pFeet = feetY(eyePos.y);
  const feetAboveGround = pFeet - groundHeight;
  const rising = !canJump && velocityY > RISING_VELOCITY_THRESHOLD;
  const stickCeiling = wasOnSurface ? TERRAIN_STICK_LEAVE : TERRAIN_STICK_FEET;

  if (
    !feetOnBox &&
    feetAboveGround <= stickCeiling &&
    feetAboveGround >= TERRAIN_STICK_BELOW &&
    velocityY <= 0 &&
    !rising
  ) {
    const justLanded = !wasOnSurface;
    const nextGroundY =
      justLanded || (!isMoving && wasOnSurface)
        ? groundHeight
        : smoothGroundHeight(smoothedGroundY, groundHeight, delta);
    eyePos.y = nextGroundY + PLAYER_EYE_HEIGHT;
    return {
      velocityY: 0,
      canJump: true,
      onSurface: true,
      feetY: nextGroundY,
      smoothedGroundY: nextGroundY,
    };
  }

  return {
    velocityY,
    canJump,
    onSurface: false,
    feetY: pFeet,
    smoothedGroundY,
  };
}

/** Highest box top under the player that the feet are resting on. */
function getBoxSupportAtFeet(
  px: number,
  pz: number,
  pFeet: number,
  collidables: THREE.Mesh[],
): number | null {
  let top: number | null = null;

  for (const mesh of collidables) {
    const box = _box.setFromObject(mesh);
    if (!overlapsXZ(px, pz, box)) continue;

    const stepDown = pFeet - box.max.y;
    if (stepDown >= FEET_RESTING_STEP_MIN && stepDown <= FEET_RESTING_STEP_MAX) {
      if (top === null || box.max.y > top) top = box.max.y;
    }
  }

  return top;
}

function isFeetOnBox(boxSupport: number | null, pFeet: number): boolean {
  return boxSupport !== null && pFeet >= boxSupport - FEET_ON_BOX_MARGIN;
}

export function resolveFloors(
  eyePos: THREE.Vector3,
  state: MovementState,
  world: CollisionWorld,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
  isMoving: boolean,
  delta: number = 0,
): FloorResolveResult {
  const groundHeight = world.groundMesh
    ? sampleTerrainHeight(
        world.groundMesh,
        eyePos.x,
        eyePos.z,
        state.prevEyeX,
        state.prevEyeZ,
        raycaster,
        rayOrigin,
      )
    : 0;

  const pFeet = feetY(eyePos.y);
  const feetOnBox = isFeetOnBox(
    getBoxSupportAtFeet(eyePos.x, eyePos.z, pFeet, world.collidables),
    pFeet,
  );

  const recovery = recoverFromTerrainPenetration(eyePos, groundHeight, feetOnBox);
  if (recovery) return recovery;

  const boxResult = resolveBoxFloors(eyePos, state, world.collidables, groundHeight);

  if (boxResult.onSurface) {
    return boxResult;
  }

  // Re-sample after box resolve may have moved eye Y (terrain follow must not treat box tops as terrain).
  const pFeetAfter = feetY(eyePos.y);
  const feetOnBoxAfter = isFeetOnBox(
    getBoxSupportAtFeet(eyePos.x, eyePos.z, pFeetAfter, world.collidables),
    pFeetAfter,
  );

  if (world.groundMesh) {
    return applyTerrainFollow(
      eyePos,
      boxResult.velocityY,
      boxResult.canJump,
      groundHeight,
      feetOnBoxAfter,
      delta,
      state.smoothedGroundY,
      state.onSurface,
      isMoving,
    );
  }

  if (eyePos.y < PLAYER_EYE_HEIGHT) {
    eyePos.y = PLAYER_EYE_HEIGHT;
    return {
      velocityY: 0,
      canJump: true,
      onSurface: true,
      feetY: 0,
      smoothedGroundY: 0,
    };
  }

  return boxResult;
}
