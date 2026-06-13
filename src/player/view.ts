import * as THREE from "three";
import {
  PLAYER_FEET_OFFSET,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  THIRD_PERSON_DISTANCE,
  THIRD_PERSON_HEIGHT,
  THIRD_PERSON_POSITION_SMOOTH_TAU,
  THIRD_PERSON_TRANSITION_TAU,
} from "./constants.js";

// Reusable temps — zero per-frame allocations (matches project discipline in collision.ts and PointerLockControls).
const _offset = new THREE.Vector3();
const _fpPos = new THREE.Vector3();
const _tpPos = new THREE.Vector3();
const _fpQuat = new THREE.Quaternion();
const _tpQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _bodyQuat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

// Temps for ideal blended camera position/quat during the transition (used for the light
// smoothing filter that only applies while the third-person transition is active).
const _idealPos = new THREE.Vector3();
const _idealQuat = new THREE.Quaternion();

/** Create a minimal visible player representation (shown in third-person). */
export function createPlayerModel(): THREE.Group {
  const group = new THREE.Group();

  // Torso (capsule-like using cylinder + slight scale for parkour feel)
  const torsoRadius = PLAYER_RADIUS * 0.82;
  const torsoHeight = PLAYER_HEIGHT * 0.72;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoRadius, torsoRadius * 0.92, torsoHeight, 12),
    new THREE.MeshLambertMaterial({ color: 0x4a6fa5 }),
  );
  torso.position.y = torsoHeight / 2 + 0.05;
  group.add(torso);

  // Head (sphere)
  const headRadius = PLAYER_RADIUS * 0.62;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x3f5f8f }),
  );
  head.position.y = torsoHeight + headRadius * 0.75;
  group.add(head);

  // Simple "pack" accent on back for a bit of silhouette (small box)
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(torsoRadius * 1.1, torsoHeight * 0.45, torsoRadius * 0.7),
    new THREE.MeshLambertMaterial({ color: 0x2f485f }),
  );
  pack.position.set(0, torsoHeight * 0.55, -torsoRadius * 0.85);
  group.add(pack);

  // Arms (thin cylinders) for a tiny bit of human shape without complexity
  const armRadius = 0.09;
  const armLen = torsoHeight * 0.7;
  const armMat = new THREE.MeshLambertMaterial({ color: 0x3a5a7a });
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(armRadius, armRadius, armLen, 6), armMat);
  leftArm.position.set(-torsoRadius * 1.05, torsoHeight * 0.55, 0);
  leftArm.rotation.z = 0.35;
  group.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = -leftArm.position.x;
  rightArm.rotation.z = -0.35;
  group.add(rightArm);

  group.userData.isPlayerModel = true;
  return group;
}

/**
 * Smoothly update the render camera and player model for the third-person feature.
 * thirdPersonT: 0 = normal first-person (camera at eye, model hidden), 1 = full third-person.
 * In third-person the camera is displaced behind the player (based on current look yaw + height).
 * The camera orientation uses the free mouse look direction (same viewQuat as first-person),
 * so you continue to control the view direction with the mouse while the camera trails behind
 * and your character is visible running in the direction you're looking. This produces a proper
 * trailing third-person camera (no forced "stare at my own back" look-behind).
 *
 * The scalar T is driven with exponential smoothing via stepThirdPersonTransition().
 *
 * delta is used for the light position+quat low-pass filter that is active only while the
 * third-person transition is in progress (0.03 < t < 0.97). This damps L/R and other jitter
 * from high-speed sprint + jumping/landing eye corrections while the blend amount is still
 * changing (including the final asymptotic steps of the transition). Direct exact placement
 * is used at the extremes for zero-lag steady first-person or full third-person.
 */
export function updateThirdPersonView(
  renderCamera: THREE.PerspectiveCamera,
  playerEye: THREE.Vector3,
  viewQuat: THREE.Quaternion,
  thirdPersonT: number,
  playerModel: THREE.Object3D,
  delta: number = 0,
): void {
  const t = THREE.MathUtils.clamp(thirdPersonT, 0, 1);

  // FP pose (normal view)
  _fpPos.copy(playerEye);
  _fpQuat.copy(viewQuat);

  // Third-person pose: camera displaced behind using the current yaw (from mouse look).
  // Orientation in third-person is the free view direction (same as first-person) — the camera
  // simply trails behind while pointing the same way you are looking with the mouse.
  _euler.setFromQuaternion(viewQuat, "YXZ");
  const yaw = _euler.y;

  // Back direction in XZ (standard three -Z forward when yaw=0)
  _offset.set(Math.sin(yaw) * THIRD_PERSON_DISTANCE, THIRD_PERSON_HEIGHT, Math.cos(yaw) * THIRD_PERSON_DISTANCE);
  _tpPos.copy(playerEye).add(_offset);

  // TP quat is the free look direction (no forced look-at at the player).
  _tpQuat.copy(viewQuat);

  // Blend position + orientation. T is already smoothed by the caller.
  const blend = t;

  // Compute the "mathematical" ideal camera position and orientation for the current blend.
  // We do *not* assign directly while the transition is active (including the tails): we apply
  // a light low-pass (THIRD_PERSON_POSITION_SMOOTH_TAU) to both. This damps the L/R jitter that
  // appears toward the *end* of enter/exit animations at full sprint + jumping/landing (irregular
  // last steps of the t ramp + eye corrections from high-speed motion). The core math of the
  // feature (ideal eye + t*offset pos, same view quat) is still evaluated every frame; we simply
  // don't instantly teleport the camera to the ideal while t is still moving.
  // Direct exact placement is used at the extremes for responsive steady-state first-person
  // or full third-person.
  _idealPos.lerpVectors(_fpPos, _tpPos, blend);
  _idealQuat.copy(_fpQuat).slerp(_tpQuat, blend);

  if (t < 0.03 || t > 0.97) {
    // Direct / settled mode: exact follow for crisp response.
    renderCamera.position.copy(_idealPos);
    renderCamera.quaternion.copy(_idealQuat);
  } else {
    // Active transition (including the problematic tail ends): smooth the camera position
    // and orientation toward this frame's ideal.
    const smoothAlpha = 1 - Math.exp(-(delta || 0.016) / THIRD_PERSON_POSITION_SMOOTH_TAU);
    renderCamera.position.lerp(_idealPos, smoothAlpha);
    renderCamera.quaternion.slerp(_idealQuat, smoothAlpha);
  }

  // Player model (avatar) is shown in third-person so you can see your own character.
  // Positioned at feet level; rotated only on yaw (body faces the look/movement direction).
  const feetY = playerEye.y - PLAYER_FEET_OFFSET;
  playerModel.position.set(playerEye.x, feetY + 0.02, playerEye.z);
  _bodyQuat.setFromAxisAngle(_up, yaw);
  playerModel.quaternion.copy(_bodyQuat);
  playerModel.visible = t > 0.04;
}

/**
 * Drive the third-person scalar (0..1) toward a target with exponential smoothing.
 * Call every frame with real delta (seconds). Produces the smooth camera pull-back animation.
 */
export function stepThirdPersonTransition(currentT: number, targetT: number, delta: number): number {
  const tau = THIRD_PERSON_TRANSITION_TAU;
  const alpha = 1 - Math.exp(-delta / tau);
  return currentT * (1 - alpha) + targetT * alpha;
}
