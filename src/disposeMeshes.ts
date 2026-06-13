import * as THREE from "three";

export interface DisposeObject3DOptions {
  skipGeometries?: Set<THREE.BufferGeometry>;
}

/** Dispose geometries and materials on all meshes under `root`. */
export function disposeObject3D(
  root: THREE.Object3D,
  options?: DisposeObject3DOptions,
): void {
  const skip = options?.skipGeometries;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (skip?.has(child.geometry)) return;
    child.geometry.dispose();
    const mat = child.material;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      mat.dispose();
    }
  });
}

/** Dispose all geometries and materials under `root` (no shared-geometry skip). */
export function disposeMeshes(root: THREE.Object3D): void {
  disposeObject3D(root);
}
