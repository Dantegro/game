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

// Reusable temps — no per-frame allocations.
const _offset = new THREE.Vector3();
const _fpPos = new THREE.Vector3();
const _tpPos = new THREE.Vector3();
const _fpQuat = new THREE.Quaternion();
const _tpQuat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _bodyQuat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

const _idealPos = new THREE.Vector3();
const _idealQuat = new THREE.Quaternion();

/** Minimal visible player mesh (shown in third-person). */
export function createPlayerModel(): THREE.Group {
  const group = new THREE.Group();

  // Torso
  const torsoRadius = PLAYER_RADIUS * 0.82;
  const torsoHeight = PLAYER_HEIGHT * 0.72;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoRadius, torsoRadius * 0.92, torsoHeight, 12),
    new THREE.MeshLambertMaterial({ color: 0x4a6fa5 }),
  );
  torso.position.y = torsoHeight / 2 + 0.05;
  group.add(torso);

  // Head
  const headRadius = PLAYER_RADIUS * 0.62;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(headRadius, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0x3f5f8f }),
  );
  head.position.y = torsoHeight + headRadius * 0.75;
  group.add(head);

  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(torsoRadius * 1.1, torsoHeight * 0.45, torsoRadius * 0.7),
    new THREE.MeshLambertMaterial({ color: 0x2f485f }),
  );
  pack.position.set(0, torsoHeight * 0.55, -torsoRadius * 0.85);
  group.add(pack);

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
 * Blend render camera between first- and third-person poses.
 * thirdPersonT: 0 = eye-level FP, 1 = full trailing third-person.
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

  _fpPos.copy(playerEye);
  _fpQuat.copy(viewQuat);

  _euler.setFromQuaternion(viewQuat, "YXZ");
  const yaw = _euler.y;
  _offset.set(Math.sin(yaw) * THIRD_PERSON_DISTANCE, THIRD_PERSON_HEIGHT, Math.cos(yaw) * THIRD_PERSON_DISTANCE);
  _tpPos.copy(playerEye).add(_offset);
  _tpQuat.copy(viewQuat);

  const blend = t;
  _idealPos.lerpVectors(_fpPos, _tpPos, blend);
  _idealQuat.copy(_fpQuat).slerp(_tpQuat, blend);

  if (t < 0.03 || t > 0.97) {
    renderCamera.position.copy(_idealPos);
    renderCamera.quaternion.copy(_idealQuat);
  } else {
    const smoothAlpha = 1 - Math.exp(-(delta || 0.016) / THIRD_PERSON_POSITION_SMOOTH_TAU);
    renderCamera.position.lerp(_idealPos, smoothAlpha);
    renderCamera.quaternion.slerp(_idealQuat, smoothAlpha);
  }

  const feetY = playerEye.y - PLAYER_FEET_OFFSET;
  playerModel.position.set(playerEye.x, feetY + 0.02, playerEye.z);
  _bodyQuat.setFromAxisAngle(_up, yaw);
  playerModel.quaternion.copy(_bodyQuat);
  playerModel.visible = t > 0.04;
}

/** Exponential smoothing for third-person blend scalar. */
export function stepThirdPersonTransition(currentT: number, targetT: number, delta: number): number {
  const tau = THIRD_PERSON_TRANSITION_TAU;
  const alpha = 1 - Math.exp(-delta / tau);
  return currentT * (1 - alpha) + targetT * alpha;
}
