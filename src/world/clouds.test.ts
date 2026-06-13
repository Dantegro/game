import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createClouds, disposeCloudGeometry, updateClouds } from "./clouds.js";

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

describe("updateClouds", () => {
  it("drifts clouds horizontally and wraps when past the play boundary", () => {
    const scene = new THREE.Scene();
    const clouds = createClouds(scene, 1);
    const cloud = clouds[0];
    cloud.position.x = 260;
    const startZ = cloud.position.z;

    updateClouds(clouds, 0.5);

    expect(cloud.position.x).toBeLessThan(0);
    expect(cloud.position.z).not.toBe(startZ);

    disposeCloudGeometry();
  });
});
