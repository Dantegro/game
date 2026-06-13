import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createClouds, disposeCloudGeometry } from "./clouds.js";

describe("createClouds", () => {
  it("builds volumetric sphere clusters with drift metadata", () => {
    const scene = new THREE.Scene();
    const clouds = createClouds(scene, 2);

    expect(clouds).toHaveLength(2);
    expect(scene.children).toHaveLength(2);

    for (const cloud of clouds) {
      expect(cloud.userData.speed).toBeGreaterThan(0);
      expect(cloud.children.length).toBeGreaterThanOrEqual(7);

      for (const child of cloud.children) {
        expect(child).toBeInstanceOf(THREE.Mesh);
        const mesh = child as THREE.Mesh;
        expect(mesh.geometry.type).toBe("SphereGeometry");
        expect((mesh.material as THREE.MeshBasicMaterial).transparent).toBe(true);
      }
    }

    disposeCloudGeometry();
  });
});
