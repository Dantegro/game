import * as THREE from "three";
import {
  AIRBORNE_FEET_CLEARANCE,
  FLOOR_MARGIN,
  LAND_SNAP_TOLERANCE,
  MAX_STEP_HEIGHT,
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

function feetY(eyeY: number): number {
  return eyeY - PLAYER_FEET_OFFSET;
}

function headY(eyeY: number): number {
  return eyeY + PLAYER_HEAD_OFFSET;
}

function isCenterOverBox(px: number, pz: number, box: THREE.Box3): boolean {
  return px >= box.min.x && px <= box.max.x && pz >= box.min.z && pz <= box.max.z;
}

function isOverFloor(px: number, pz: number, box: THREE.Box3): boolean {
  return (
    px >= box.min.x - FLOOR_MARGIN &&
    px <= box.max.x + FLOOR_MARGIN &&
    pz >= box.min.z - FLOOR_MARGIN &&
    pz <= box.max.z + FLOOR_MARGIN
  );
}

/**
 * Treat a box as a solid side wall when the capsule overlaps its vertical span
 * and the top is too high to step onto without vertical clearance.
 */
function isSolidWall(eyeY: number, box: THREE.Box3): boolean {
  const pFeet = feetY(eyeY);
  const pHead = headY(eyeY);
  const stepToTop = box.max.y - pFeet;
  return pHead > box.min.y && pFeet < box.max.y && stepToTop > MAX_STEP_HEIGHT;
}

/**
 * Push the eye position out of collidable side walls. Returns whether any wall was hit.
 */
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
      if (!isSolidWall(eyePos.y, box)) continue;

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
}

/**
 * Land on box tops. No ceiling / head-bonk handling (no roofs in the game yet).
 */
export function resolveBoxFloors(
  eyePos: THREE.Vector3,
  velocityY: number,
  canJump: boolean,
  collidables: THREE.Mesh[],
  groundHeight: number,
): FloorResolveResult {
  if (collidables.length === 0) {
    return { velocityY, canJump, onSurface: false };
  }

  const px = eyePos.x;
  const pz = eyePos.z;
  const pFeet = feetY(eyePos.y);
  const airborne = !canJump && pFeet > groundHeight + AIRBORNE_FEET_CLEARANCE;

  let landed = false;

  for (const mesh of collidables) {
    const box = _box.setFromObject(mesh);
    const centerOver = isCenterOverBox(px, pz, box);
    const overFloor = isOverFloor(px, pz, box);

    if (!centerOver && !overFloor) continue;

    const stepToTop = box.max.y - pFeet;
    if (stepToTop <= 0) continue;

    let shouldLand = false;
    if (airborne) {
      shouldLand =
        velocityY < 0 &&
        stepToTop <= LAND_SNAP_TOLERANCE &&
        centerOver;
    } else if (velocityY <= 0) {
      shouldLand = stepToTop <= MAX_STEP_HEIGHT && overFloor;
    }

    if (shouldLand) {
      eyePos.y = box.max.y + PLAYER_FEET_OFFSET;
      velocityY = 0;
      canJump = true;
      landed = true;
    }
  }

  return { velocityY, canJump, onSurface: landed };
}

/**
 * Follow uneven terrain when feet are at or near the ground surface.
 * Uses feet-relative height so mid-jump arcs are not pulled down.
 */
export function applyTerrainFollow(
  eyePos: THREE.Vector3,
  velocityY: number,
  canJump: boolean,
  groundHeight: number,
): FloorResolveResult {
  const pFeet = feetY(eyePos.y);
  const feetAboveGround = pFeet - groundHeight;
  const rising = !canJump && velocityY > 0.1;

  if (feetAboveGround <= TERRAIN_STICK_FEET && velocityY <= 0 && !rising) {
    const targetY = groundHeight + PLAYER_EYE_HEIGHT;
    eyePos.y = THREE.MathUtils.lerp(eyePos.y, targetY, 0.25);
    return { velocityY: 0, canJump: true, onSurface: true };
  }

  return { velocityY, canJump, onSurface: false };
}

/**
 * Full vertical pass: box floors first, then terrain (only if not on a box).
 */
export function resolveFloors(
  eyePos: THREE.Vector3,
  velocityY: number,
  canJump: boolean,
  world: CollisionWorld,
  raycaster: THREE.Raycaster,
  rayOrigin: THREE.Vector3,
): FloorResolveResult {
  const groundHeight = world.groundMesh
    ? sampleGroundHeight(world.groundMesh, eyePos.x, eyePos.z, raycaster, rayOrigin)
    : 0;

  const boxResult = resolveBoxFloors(
    eyePos,
    velocityY,
    canJump,
    world.collidables,
    groundHeight,
  );

  if (boxResult.onSurface) {
    return boxResult;
  }

  if (world.groundMesh) {
    return applyTerrainFollow(eyePos, boxResult.velocityY, boxResult.canJump, groundHeight);
  }

  if (eyePos.y < PLAYER_EYE_HEIGHT) {
    eyePos.y = PLAYER_EYE_HEIGHT;
    return { velocityY: 0, canJump: true, onSurface: true };
  }

  return boxResult;
}
