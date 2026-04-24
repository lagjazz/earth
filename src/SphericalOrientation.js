import * as THREE from 'three';

// ─── Spherical Orientation Algorithm ───
// Computes stable orientation for any object moving along a path on a sphere.
//
// Key principles:
// 1. Up = surface normal at actual position (radial direction)
// 2. Forward = path tangent projected onto tangent plane (perpendicular to up)
// 3. Right = up × forward (right-handed orthonormal basis)
// 4. Orientation via quaternion slerp (no lookAt, no Euler gimbal lock)
// 5. Basis never flips — forward always follows the raw curve tangent
//    (direction reversal is handled by the object's local rotation)

/**
 * Compute the target orientation for an object at a given position
 * moving along a path on a sphere.
 *
 * @param {THREE.Vector3} position - Actual position (including height offset)
 * @param {THREE.Vector3} forward - Raw path tangent (NOT multiplied by direction)
 * @param {number} earthRadius - Radius of the sphere (for normalization)
 * @returns {{ quaternion: THREE.Quaternion, up: THREE.Vector3, right: THREE.Vector3, forward: THREE.Vector3 }}
 */
export function computeOrientation(position, forward, earthRadius = 1) {
  // 1. Up = Earth normal at actual position
  const upVec = position.clone().normalize();

  // 2. Project forward onto tangent plane (remove radial component)
  const forwardProjected = forward.clone()
    .sub(upVec.clone().multiplyScalar(forward.dot(upVec)))
    .normalize();

  // Guard: if forward is nearly parallel to up (takeoff/landing singularity)
  if (forwardProjected.lengthSq() < 1e-6) {
    // Return identity-like orientation — caller should handle this edge case
    return {
      quaternion: new THREE.Quaternion(),
      up: upVec,
      right: new THREE.Vector3(),
      forward: forwardProjected,
      valid: false
    };
  }

  // 3. Right = forward × up (right-handed basis for makeBasis)
  const right = new THREE.Vector3().crossVectors(forwardProjected, upVec).normalize();

  // 4. Re-orthogonalize up = forward × right
  const upFinal = new THREE.Vector3().crossVectors(forwardProjected, right).normalize();

  // 5. Build rotation matrix from orthonormal basis
  const m = new THREE.Matrix4();
  m.makeBasis(right, upFinal, forwardProjected);

  // 6. Convert to quaternion
  const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);

  return {
    quaternion: targetQuat,
    up: upFinal,
    right: right,
    forward: forwardProjected,
    valid: true
  };
}

/**
 * Smoothly interpolate a container's quaternion toward the target orientation.
 *
 * Critical: ensures shortest-path interpolation by checking quaternion sign.
 * `setFromRotationMatrix` can return q or -q (both represent the same rotation).
 * Without this check, slerp takes the long way around (180° wrong direction),
 * causing sudden visual flips.
 *
 * @param {THREE.Quaternion} current - Current quaternion (will be mutated)
 * @param {THREE.Quaternion} target - Target quaternion
 * @param {number} smoothing - Smoothing factor (0-1, higher = faster convergence)
 */
export function smoothOrientation(current, target, smoothing = 0.15) {
  // Ensure shortest-path slerp: if dot < 0, target is on the opposite hemisphere
  // (setFromRotationMatrix can return q or -q; both represent the same rotation)
  if (current.dot(target) < 0) {
    target.x = -target.x;
    target.y = -target.y;
    target.z = -target.z;
    target.w = -target.w;
  }
  current.slerp(target, smoothing);
}

/**
 * Compute the local Y-axis rotation for direction reversal.
 *
 * When the container basis always follows the raw curve tangent (never flips),
 * the object handles direction locally via Y-axis rotation:
 * - Outbound: rotate 180° (model faces -Z, container forward is +Z)
 * - Return: identity (model faces -Z = opposite of container forward)
 *
 * @param {number} direction - 1 (outbound) or -1 (return)
 * @param {number} modelOffset - Y-axis offset to align model's default face with container forward
 * @returns {THREE.Quaternion} Target quaternion for local Y rotation
 */
export function directionRotation(direction, modelOffset = Math.PI) {
  // modelOffset: the Y rotation needed for outbound (model faces container forward)
  // Return trip: subtract modelOffset (faces opposite direction)
  const targetY = direction === 1 ? modelOffset : 0;
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetY, 0));
}
