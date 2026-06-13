import * as THREE from "three";

export type CloudGroup = THREE.Group & { userData: { speed: number } };

let puffGeometry: THREE.SphereGeometry | undefined;

function getPuffGeometry(): THREE.SphereGeometry {
  if (!puffGeometry) {
    puffGeometry = new THREE.SphereGeometry(1, 14, 12);
  }
  return puffGeometry;
}

function createPuffMaterial(opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0xf4f6fa,
    transparent: true,
    opacity,
    depthWrite: false,
    fog: true,
  });
}

interface PuffSpec {
  radius: number;
  x: number;
  y: number;
  z: number;
  opacity: number;
}

function buildPuffLayout(): PuffSpec[] {
  const puffs: PuffSpec[] = [];
  const puffCount = 7 + Math.floor(Math.random() * 4);

  puffs.push({
    radius: 9 + Math.random() * 3.5,
    x: 0,
    y: 0,
    z: 0,
    opacity: 0.74 + Math.random() * 0.1,
  });

  for (let i = 1; i < puffCount; i++) {
    const radius = 4.5 + Math.random() * 5.5;
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.45 + Math.random() * 0.55);
    puffs.push({
      radius,
      x: Math.cos(angle) * dist,
      y: (Math.random() - 0.5) * 2.8,
      z: Math.sin(angle) * dist,
      opacity: 0.52 + Math.random() * 0.22,
    });
  }

  // Smaller crown puffs for a fuller cumulus silhouette.
  const crownCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < crownCount; i++) {
    puffs.push({
      radius: 3.5 + Math.random() * 3,
      x: (Math.random() - 0.5) * 10,
      y: 2.5 + Math.random() * 2.5,
      z: (Math.random() - 0.5) * 10,
      opacity: 0.58 + Math.random() * 0.18,
    });
  }

  return puffs;
}

function createCloudCluster(): CloudGroup {
  const group = new THREE.Group() as CloudGroup;
  group.userData = { speed: 1.2 + Math.random() * 2.1 };

  const geometry = getPuffGeometry();
  for (const spec of buildPuffLayout()) {
    const puff = new THREE.Mesh(geometry, createPuffMaterial(spec.opacity));
    puff.position.set(spec.x, spec.y, spec.z);
    puff.scale.set(
      spec.radius,
      spec.radius * (0.82 + Math.random() * 0.1),
      spec.radius * (0.9 + Math.random() * 0.12),
    );
    group.add(puff);
  }

  return group;
}

/** Shared puff geometry used by all cloud meshes. */
export function getCloudPuffGeometry(): THREE.SphereGeometry | undefined {
  return puffGeometry;
}

export function disposeCloudGeometry(): void {
  puffGeometry?.dispose();
  puffGeometry = undefined;
}

/** Adds drifting volumetric cloud clusters high above the terrain. */
export function createClouds(scene: THREE.Scene, count = 14): CloudGroup[] {
  const clouds: CloudGroup[] = [];

  for (let i = 0; i < count; i++) {
    const group = createCloudCluster();
    group.position.set(
      (Math.random() - 0.5) * 380,
      82 + Math.random() * 55,
      (Math.random() - 0.5) * 380,
    );
    scene.add(group);
    clouds.push(group);
  }

  return clouds;
}
