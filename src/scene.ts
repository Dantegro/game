import * as THREE from "three";
import { createClouds } from "./world/clouds.js";

export function createWorld() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.0018);

  const hemi = new THREE.HemisphereLight(0xddddff, 0x666688, 1.5);
  scene.add(hemi);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
  dirLight.position.set(50, 100, 40);
  scene.add(dirLight);

  const groundGeo = new THREE.PlaneGeometry(400, 400, 50, 50);
  groundGeo.rotateX(-Math.PI / 2);
  const gpos = groundGeo.attributes.position;
  for (let i = 0; i < gpos.count; i++) {
    // Lower amplitude and higher resolution for more consistent/smoother uneven ground.
    // Still a bit of natural variation (rolling hills), but less extreme and smoother.
    gpos.setY(i, gpos.getY(i) + (Math.random() - 0.5) * 1.8);
  }
  gpos.needsUpdate = true;
  groundGeo.computeVertexNormals();

  // Add vertex colors based on height for "color depth".
  // More vibrant, saturated pure greens (less yellow/earthy tones that read as sand/dirt).
  // Low areas: deep lush green. High areas: bright vibrant grass. Feels more natural and appealing.
  const colors: number[] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < gpos.count; i++) {
    const y = gpos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const lowColor = new THREE.Color(0x2e6b3e);   // deep rich vibrant green (lush, not sandy)
  const highColor = new THREE.Color(0x5fc85f);  // bright fresh vibrant grass green
  for (let i = 0; i < gpos.count; i++) {
    const y = gpos.getY(i);
    const t = (y - minY) / (maxY - minY || 1);
    // Bias a bit toward the vibrant high end for lively feel overall
    const c = lowColor.clone().lerp(highColor, t * 0.75 + 0.25);
    colors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  scene.add(ground);

  const clouds = createClouds(scene);

  const collidables: THREE.Mesh[] = [];

  // Raycaster to place boxes on the actual uneven ground
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  function getGroundHeightAt(wx: number, wz: number) {
    raycaster.set(new THREE.Vector3(wx, 100, wz), down);
    const hits = raycaster.intersectObject(ground, false);
    return hits.length > 0 ? hits[0].point.y : 0;
  }

  function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  function wouldOverlap(candidate: THREE.Mesh): boolean {
    const cBox = new THREE.Box3().setFromObject(candidate);
    const margin = 0.25;
    for (const ex of collidables) {
      const eBox = new THREE.Box3().setFromObject(ex);
      eBox.min.addScalar(-margin);
      eBox.max.addScalar(margin);
      if (eBox.intersectsBox(cBox)) {
        return true;
      }
    }
    return false;
  }

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(9, 9, 9),
    new THREE.MeshLambertMaterial({ color: 0xff2222 }),
  );
  const ghRed = getGroundHeightAt(3, -12);
  cube.position.set(3, ghRed + 4.5 + 0.1, -12); // bottom just above local ground
  scene.add(cube);
  collidables.push(cube);

  // Tall buildings (main obstacles). Varied size; tops sit above normal jump reach.
  for (let i = 0; i < 18; i++) {
    for (let attempt = 0; attempt < 25; attempt++) {
      const width = randomInRange(2.8, 5.2);
      const depth = randomInRange(2.8, 5.2);
      const height = randomInRange(4.6, 6.4);
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshLambertMaterial({ color: 0x777799 }),
      );
      const angle = Math.random() * Math.PI * 2;
      const r = 10 + Math.random() * 50;
      const bx = Math.cos(angle) * r * (0.75 + Math.random() * 0.9);
      const bz = Math.sin(angle) * r;
      const gh = getGroundHeightAt(bx, bz);
      b.position.set(bx, gh + height / 2 + 0.1, bz);
      if (Math.random() < 0.35) {
        b.material.color.setHex(0xaaaa66 + ((Math.random() * 0x555555) | 0));
      }
      if (!wouldOverlap(b)) {
        scene.add(b);
        collidables.push(b);
        break;
      }
    }
  }

  // Shorter boxes / low platforms the player can jump onto — varied footprint and height.
  for (let i = 0; i < 10; i++) {
    for (let attempt = 0; attempt < 25; attempt++) {
      const width = randomInRange(2.0, 4.4);
      const depth = randomInRange(2.0, 4.4);
      const height = randomInRange(1.5, 2.85);
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshLambertMaterial({ color: 0x8B7355 }),
      );
      const angle = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 48;
      const bx = Math.cos(angle) * r * (0.7 + Math.random() * 0.85);
      const bz = Math.sin(angle) * r;
      const gh = getGroundHeightAt(bx, bz);
      b.position.set(bx, gh + height / 2 + 0.1, bz);
      if (Math.random() < 0.4) {
        // slight variation toward woodier tones
        b.material.color.setHex(0xA0522D + ((Math.random() * 0x333333) | 0));
      }
      if (!wouldOverlap(b)) {
        scene.add(b);
        collidables.push(b);
        break;
      }
    }
  }

  return { scene, cube, collidables, ground, clouds };
}
