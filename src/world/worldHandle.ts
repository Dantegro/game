import type { createWorld } from "../scene.js";
import { disposeObject3D } from "../disposeMeshes.js";
import { disposeCloudGeometry, getCloudPuffGeometry } from "./clouds.js";

export type WorldData = ReturnType<typeof createWorld>;

/** Dispose a procedural world, preserving shared cloud puff geometry until the last world is gone. */
export function disposeWorld(world: WorldData): void {
  const sharedCloudGeo = getCloudPuffGeometry();
  const skipGeometries = sharedCloudGeo
    ? new Set([sharedCloudGeo])
    : undefined;
  disposeObject3D(world.scene, { skipGeometries });
  disposeCloudGeometry();
}
