import * as THREE from "three";
import {
  BOX_TOP_EDGE_GRACE,
  BOX_TOP_LAND_MARGIN,
  LAND_SNAP_TOLERANCE,
  PLAYER_EYE_HEIGHT,
  PLAYER_FEET_OFFSET,
  PLAYER_HEAD_OFFSET,
  PLAYER_RADIUS,
  TERRAIN_STICK_FEET,
  WALL_FRICTION,
} from "./constants.js";

const _down = new THREE.Vector3(0, -1, 0);
const _box = new THREE.Box3();

export interface CollisionWorld {
  collidables: THREE.Mesh[];
  groundMesh?: THREE.Mesh;
}

export interface FloorContext {
  velocityY: number;
  canJump: boolean;
  /** Feet Y from the previous frame (for swept top-plane landing). */
  prevFeetY: number;
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
  if (pFeet >= groundHeight - 0.05) return null;

  eyePos.y = groundHeight + PLAYER_EYE_HEIGHT;
  return {
    velocityY: 0,
    canJump: true,
    onSurface: true,
    feetY: groundHeight,
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
  const nearestX = THREE.MathUtils.clamp(px, box.min.x, box.max.x);
  const nearestZ = THREE.MathUtils.clamp(pz, box.min.z, box.max.z);
  const dx = px - nearestX;
  const dz = pz - nearestZ;
  return dx * dx + dz * dz <= PLAYER_RADIUS * PLAYER_RADIUS;
}

/** Eye XZ over the box top face, with a small edge grace for lip landings. */
function isNearBoxTop(px: number, pz: number, box: THREE.Box3): boolean {
  const g = BOX_TOP_EDGE_GRACE;
  return (
    px >= box.min.x - g &&
    px <= box.max.x + g &&
    pz >= box.min.z - g &&
    pz <= box.max.z + g
  );
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
  ctx: FloorContext,
  groundHeight: number,
): BoxLandingCandidate | null {
  if (!overlapsXZ(px, pz, box)) return null;

  const pFeet = feetY(eyeY);
  const stepDown = pFeet - box.max.y;

  // Already resting on this surface (feet at or barely below the top plane).
  if (
    stepDown >= -0.03 &&
    stepDown <= 0.08 &&
    ctx.velocityY <= 0 &&
    pFeet >= box.max.y - 0.05
  ) {
    return { topY: box.max.y, priority: box.max.y };
  }

  // Feet must be at or below the top plane to land (not jumping up through it).
  if (stepDown > LAND_SNAP_TOLERANCE) return null;

  const onTerrain = pFeet <= groundHeight + 0.2;
  const falling = ctx.velocityY < 0;
  const crossedTopPlane =
    falling &&
    ctx.prevFeetY >= box.max.y - BOX_TOP_LAND_MARGIN &&
    pFeet <= box.max.y + BOX_TOP_LAND_MARGIN;

  // Mid-air only — collidable tops never auto-step from grounded walk (prevents
  // slope exploits where feet are already near box.max.y on elevated terrain).
  if (!onTerrain && falling && isNearBoxTop(px, pz, box)) {
    if (
      crossedTopPlane ||
      (stepDown > -BOX_TOP_LAND_MARGIN && stepDown <= LAND_SNAP_TOLERANCE)
    ) {
      return { topY: box.max.y, priority: box.max.y };
    }
  }

  return null;
}

function resolveBoxFloors(
  eyePos: THREE.Vector3,
  ctx: FloorContext,
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
      ctx,
      groundHeight,
    );
    if (candidate && (!best || candidate.priority > best.priority)) {
      best = candidate;
    }
  }

  if (!best) {
    return {
      velocityY: ctx.velocityY,
      canJump: ctx.canJump,
      onSurface: false,
      feetY: pFeet,
    };
  }

  eyePos.y = best.topY + PLAYER_FEET_OFFSET;
  return {
    velocityY: 0,
    canJump: true,
    onSurface: true,
    feetY: best.topY,
  };
}

function applyTerrainFollow(
  eyePos: THREE.Vector3,
  velocityY: number,
  canJump: boolean,
  groundHeight: number,
  feetOnBox: boolean,
): FloorResolveResult {
  const pFeet = feetY(eyePos.y);
  const feetAboveGround = pFeet - groundHeight;
  const rising = !canJump && velocityY > 0.1;

  if (
    !feetOnBox &&
    feetAboveGround <= TERRAIN_STICK_FEET &&
    feetAboveGround >= -0.15 &&
    velocityY <= 0 &&
    !rising
  ) {
    const targetY = groundHeight + PLAYER_EYE_HEIGHT;
    eyePos.y = THREE.MathUtils.lerp(eyePos.y, targetY, 0.25);
    return {
      velocityY: 0,
      canJump: true,
      onSurface: true,
      feetY: groundHeight,
    };
  }

  return { velocityY, canJump, onSurface: false, feetY: pFeet };
}

/** Highest box top under the player that the feet are resting on. */
function feetRestingOnBox(
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
    if (stepDown >= -0.08 && stepDown <= 0.2) {
      if (top === null || box.max.y > top) top = box.max.y;
    }
  }

  return top;
}

export function resolveFloors(
  eyePos: THREE.Vector3,
  ctx: FloorContext,
  world: CollisionWorld,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
): FloorResolveResult {
  const groundHeight = world.groundMesh
    ? sampleGroundHeight(world.groundMesh, eyePos.x, eyePos.z, raycaster, rayOrigin)
    : 0;

  const pFeet = feetY(eyePos.y);
  const boxSupport = feetRestingOnBox(
    eyePos.x,
    eyePos.z,
    pFeet,
    world.collidables,
  );
  const feetOnBox = boxSupport !== null && pFeet >= boxSupport - 0.1;

  const recovery = recoverFromTerrainPenetration(eyePos, groundHeight, feetOnBox);
  if (recovery) return recovery;

  const boxResult = resolveBoxFloors(eyePos, ctx, world.collidables, groundHeight);

  if (boxResult.onSurface) {
    return boxResult;
  }

  const pFeetAfter = feetY(eyePos.y);
  const boxSupportAfter = feetRestingOnBox(
    eyePos.x,
    eyePos.z,
    pFeetAfter,
    world.collidables,
  );
  const feetOnBoxAfter = boxSupportAfter !== null && pFeetAfter >= boxSupportAfter - 0.1;

  if (world.groundMesh) {
    return applyTerrainFollow(
      eyePos,
      boxResult.velocityY,
      boxResult.canJump,
      groundHeight,
      feetOnBoxAfter,
    );
  }

  if (eyePos.y < PLAYER_EYE_HEIGHT) {
    eyePos.y = PLAYER_EYE_HEIGHT;
    return { velocityY: 0, canJump: true, onSurface: true, feetY: 0 };
  }

  return boxResult;
}
