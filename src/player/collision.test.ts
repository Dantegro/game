import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { PLAYER_EYE_HEIGHT } from "./constants.js";
import { resolveWalls, type CollisionWorld } from "./collision.js";
import { createMovementState } from "./movement.js";

function makeBoxCollidable(
  x: number,
  baseY: number,
  z: number,
  width: number,
  height: number,
  depth: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth));
  mesh.position.set(x, baseY + height / 2, z);
  mesh.updateMatrixWorld(true);
  return mesh;
}

function floorState(overrides: Partial<ReturnType<typeof createMovementState>> = {}) {
  return { ...createMovementState(), ...overrides };
}

describe("resolveWalls", () => {
  it("returns false when there are no collidables", () => {
    const eyePos = new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0);
    expect(resolveWalls(eyePos, [])).toBe(false);
    expect(eyePos.x).toBe(0);
    expect(eyePos.z).toBe(0);
  });

  it("pushes the player out when inside a wall footprint", () => {
    const wall = makeBoxCollidable(0, 0, 2, 4, 4, 1);
    const eyePos = new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 2.2);
    const move = { x: 0, z: 1 };
    const startZ = eyePos.z;

    const hit = resolveWalls(eyePos, [wall], move);

    expect(hit).toBe(true);
    expect(eyePos.z).not.toBe(startZ);
    expect(move.z).toBeLessThan(1);
  });

  it("does not block movement when the player has cleared the wall lip", () => {
    const wall = makeBoxCollidable(0, 0, 0, 4, 2, 4);
    const eyePos = new THREE.Vector3(0, 5, 0);
    const startX = eyePos.x;
    const startZ = eyePos.z;

    const hit = resolveWalls(eyePos, [wall]);

    expect(hit).toBe(false);
    expect(eyePos.x).toBe(startX);
    expect(eyePos.z).toBe(startZ);
  });
});

describe("resolveFloors", () => {
  it("snaps the player onto a box top when falling onto it", async () => {
    const { resolveFloors } = await import("./collision.js");
    const crate = makeBoxCollidable(0, 0, 0, 2, 2, 2);
    const world: CollisionWorld = { collidables: [crate] };
    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const eyePos = new THREE.Vector3(0, 3.2, 0);

    const result = resolveFloors(
      eyePos,
      floorState({
        velocityY: -5,
        canJump: false,
        prevFeetY: 3.5,
      }),
      world,
      raycaster,
      rayOrigin,
      false,
    );

    expect(result.onSurface).toBe(true);
    expect(result.canJump).toBe(true);
    expect(result.velocityY).toBe(0);
    expect(eyePos.y).toBeCloseTo(2 + 2.85, 2);
  });

  it("snaps onto a box top when falling slightly past the lip", async () => {
    const { resolveFloors } = await import("./collision.js");
    const crate = makeBoxCollidable(0, 0, 0, 2, 2, 2);
    const world: CollisionWorld = { collidables: [crate] };
    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const eyePos = new THREE.Vector3(1.42, 5.0, 0);

    const result = resolveFloors(
      eyePos,
      floorState({
        velocityY: -8,
        canJump: false,
        prevFeetY: 2.55,
        prevEyeX: 1.42,
      }),
      world,
      raycaster,
      rayOrigin,
      false,
    );

    expect(result.onSurface).toBe(true);
    expect(eyePos.y).toBeCloseTo(2 + 2.85, 2);
  });

  it("smoothly follows uneven terrain instead of snapping eye Y each frame", async () => {
    const { resolveFloors, sampleGroundHeight } = await import("./collision.js");
    const groundGeo = new THREE.PlaneGeometry(10, 10, 4, 4);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setY(i, pos.getY(i) + x * 0.35);
    }
    pos.needsUpdate = true;
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo);
    ground.updateMatrixWorld(true);

    const world: CollisionWorld = { collidables: [], groundMesh: ground };
    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const delta = 1 / 60;
    const startX = -2;
    const endX = 2;
    const z = 0;

    const startGround = sampleGroundHeight(ground, startX, z, raycaster, rayOrigin);
    const endGround = sampleGroundHeight(ground, endX, z, raycaster, rayOrigin);
    expect(endGround).toBeGreaterThan(startGround + 0.2);

    const eyePos = new THREE.Vector3(startX, startGround + PLAYER_EYE_HEIGHT, z);
    const first = resolveFloors(
      eyePos,
      floorState({
        prevFeetY: startGround,
        smoothedGroundY: startGround,
        prevEyeX: startX,
        prevEyeZ: z,
        onSurface: true,
      }),
      world,
      raycaster,
      rayOrigin,
      true,
      delta,
    );
    expect(first.onSurface).toBe(true);

    eyePos.x = endX;
    const beforeY = eyePos.y;
    const second = resolveFloors(
      eyePos,
      floorState({
        prevFeetY: first.feetY,
        smoothedGroundY: first.smoothedGroundY,
        prevEyeX: startX,
        prevEyeZ: z,
        onSurface: true,
      }),
      world,
      raycaster,
      rayOrigin,
      true,
      delta,
    );

    expect(second.onSurface).toBe(true);
    const rawTargetY = endGround + PLAYER_EYE_HEIGHT;
    const actualRise = eyePos.y - beforeY;
    const rawRise = rawTargetY - beforeY;
    expect(actualRise).toBeGreaterThan(0);
    expect(actualRise).toBeLessThan(rawRise);
    expect(second.smoothedGroundY).toBeGreaterThan(startGround);
    expect(second.smoothedGroundY).toBeLessThan(endGround);
  });

  it("snaps to ground when idle so post-landing height does not keep easing", async () => {
    const { resolveFloors } = await import("./collision.js");
    const groundGeo = new THREE.PlaneGeometry(10, 10, 2, 2);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(groundGeo);
    ground.updateMatrixWorld(true);

    const world: CollisionWorld = { collidables: [], groundMesh: ground };
    const raycaster = new THREE.Raycaster();
    const rayOrigin = new THREE.Vector3();
    const delta = 1 / 60;
    const staleSmoothedY = 0.35;
    const eyePos = new THREE.Vector3(0, staleSmoothedY + PLAYER_EYE_HEIGHT, 0);

    const idle = resolveFloors(
      eyePos,
      floorState({
        prevFeetY: staleSmoothedY,
        smoothedGroundY: staleSmoothedY,
        onSurface: true,
      }),
      world,
      raycaster,
      rayOrigin,
      false,
      delta,
    );

    expect(idle.onSurface).toBe(true);
    expect(eyePos.y).toBeCloseTo(PLAYER_EYE_HEIGHT, 4);
    expect(idle.smoothedGroundY).toBeCloseTo(0, 4);

    const yAfterSnap = eyePos.y;
    const idleAgain = resolveFloors(
      eyePos,
      floorState({
        prevFeetY: idle.feetY,
        smoothedGroundY: idle.smoothedGroundY,
        onSurface: true,
      }),
      world,
      raycaster,
      rayOrigin,
      false,
      delta,
    );

    expect(idleAgain.onSurface).toBe(true);
    expect(eyePos.y).toBeCloseTo(yAfterSnap, 4);
  });
});
