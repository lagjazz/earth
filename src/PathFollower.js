import * as THREE from 'three';
import { computeOrientation, smoothOrientation, directionRotation } from './SphericalOrientation.js';

// ─── Path Follower ───
// Generic path-following algorithm for objects moving along a curve on a sphere.
//
// Features:
// - Follows any THREE.Curve3 path
// - Height profile with takeoff/cruise/landing
// - Round-trip animation with configurable turnaround delay
// - Stable spherical orientation (via SphericalOrientation)
// - Contrail support
// - Exposes state for consumer to apply to any object

/**
 * Create a path follower that tracks position and orientation along a curve.
 *
 * @param {Object} config
 * @param {THREE.Curve3} config.curve - The path curve
 * @param {number} config.speed - Travel speed (0-1 per second)
 * @param {number} config.heightMultiplier - Max height above surface (0-1 range)
 * @param {number} config.earthRadius - Sphere radius
 * @param {number} config.turnaroundDelay - Seconds to pause at destination
 * @param {number} config.smoothing - Quaternion slerp smoothing factor (0-1)
 * @param {number} config.contrailMinHeight - Minimum height to draw contrail
 * @param {number} config.modelOffsetY - Y-axis offset for outbound direction alignment
 * @returns {PathFollower}
 */
export function createPathFollower(config = {}) {
  const {
    curve,
    speed = 0.015,
    heightMultiplier = 0.1,
    earthRadius = 1,
    turnaroundDelay = 3,
    smoothing = 0.15,
    contrailMinHeight = 0.005,
    modelOffsetY = Math.PI
  } = config;

  let t = 0;
  let direction = 1; // 1 = outbound, -1 = return
  let stateTimer = 0;

  // Pre-compute curve points for tangent calculation
  const curveCache = [];
  const cacheSize = 1000;
  for (let i = 0; i <= cacheSize; i++) {
    curveCache.push(curve.getPointAt(i / cacheSize));
  }

  /**
   * Get cached position on curve
   */
  function getCurvePoint(t) {
    const idx = t * cacheSize;
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, cacheSize);
    const frac = idx - lo;
    const a = curveCache[lo];
    const b = curveCache[hi];
    return new THREE.Vector3().lerpVectors(a, b, frac);
  }

  /**
   * Get analytical tangent from cached curve points
   * Uses central difference for accuracy
   */
  function getCurveTangent(t) {
    const eps = 0.0001;
    const p1 = getCurvePoint(Math.max(0, t - eps));
    const p2 = getCurvePoint(Math.min(1, t + eps));
    return p2.clone().sub(p1).normalize();
  }

  /**
   * Update the follower state. Call this every frame.
   *
   * @param {number} delta - Delta time in seconds
   * @returns {Object} State object with position, orientation, direction, etc.
   */
  function update(delta) {
    // Height profile: takeoff → cruise → landing
    const height = Math.sin(Math.PI * t) * heightMultiplier;

    // Scale factor: 0.4 at ground (takeoff/landing), 1.0 at cruise altitude
    // Creates depth effect — aircraft appear small when close to ground, larger when high up
    const heightFactor = Math.sin(Math.PI * t); // 0 at ground, 1 at cruise
    const scaleFactor = 0.2 + heightFactor * 0.8; // 0.2 at ground → 1.0 at cruise

    // Position on curve
    const curvePos = getCurvePoint(t);
    const radialDir = curvePos.clone().normalize();
    const position = radialDir.multiplyScalar(earthRadius + height);

    // Raw tangent (never multiplied by direction — basis stays stable)
    const rawTangent = getCurveTangent(t);

    // Compute orientation
    const orientation = computeOrientation(position, rawTangent, earthRadius);

    // Direction rotation for local model alignment
    const dirQuat = directionRotation(direction, modelOffsetY);

    // Contrail state
    const shouldContrail = height > contrailMinHeight;

    // Turnaround check
    const atDestination = (direction === 1 && t >= 0.99) ||
                          (direction === -1 && t <= 0.01);

    let turning = false;
    if (atDestination) {
      stateTimer += delta;
      turning = true;
      if (stateTimer > turnaroundDelay) {
        direction *= -1;
        t = direction === 1 ? 0 : 1;
        stateTimer = 0;
      }
    } else {
      stateTimer = 0;
      // Advance along path
      t += speed * delta * direction;
      t = Math.max(0, Math.min(1, t));
    }

    return {
      position,
      curvePosition: curvePos,
      height,
      scaleFactor,
      orientation,
      directionQuat: dirQuat,
      smoothing,
      direction,
      t,
      turning,
      shouldContrail,
      radialDir: radialDir.clone()
    };
  }

  /**
   * Apply the follower state to a container object and a model object.
   *
   * @param {THREE.Object3D} container - Container group (handles position + Earth-normal orientation)
   * @param {THREE.Object3D} model - Model object (handles local direction rotation)
   * @param {Object} state - State from update()
   */
  function applyState(container, model, state) {
    // Position
    container.position.copy(state.position);

    // Container orientation (Earth-normal alignment)
    if (state.orientation.valid) {
      smoothOrientation(
        container.quaternion,
        state.orientation.quaternion,
        state.smoothing
      );
    }

    // Model local direction rotation
    model.quaternion.slerp(state.directionQuat, state.smoothing);
  }

  /**
   * Reset the follower to the start
   */
  function reset() {
    t = 0;
    direction = 1;
    stateTimer = 0;
  }

  /**
   * Get current state without advancing
   */
  function getState() {
    const height = Math.sin(Math.PI * t) * heightMultiplier;
    const curvePos = getCurvePoint(t);
    const radialDir = curvePos.clone().normalize();
    const position = radialDir.multiplyScalar(earthRadius + height);
    const rawTangent = getCurveTangent(t);
    const orientation = computeOrientation(position, rawTangent, earthRadius);
    const dirQuat = directionRotation(direction, modelOffsetY);

    return {
      position,
      curvePosition: curvePos,
      height,
      orientation,
      directionQuat: dirQuat,
      smoothing,
      direction,
      t,
      turning: false,
      shouldContrail: height > contrailMinHeight,
      radialDir: radialDir.clone()
    };
  }

  return {
    update,
    applyState,
    reset,
    getState,
    get speed() { return speed; },
    set speed(v) { /* speed is captured in closure, use update directly */ },
  };
}

// ─── Utility: Create great-circle curve between two lat/lng points ───

/**
 * Convert lat/lng to 3D vector on unit sphere
 */
export function latLngToVector3(lat, lng, radius = 1) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Spherical linear interpolation
 */
export function slerp(a, b, t) {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const omega = Math.acos(Math.min(Math.max(an.dot(bn), -1), 1));
  if (omega < 1e-6) return an.clone();
  const so = Math.sin(omega);
  const sa = Math.sin((1 - t) * omega) / so;
  const sb = Math.sin(t * omega) / so;
  return an.clone().multiplyScalar(sa).add(bn.clone().multiplyScalar(sb));
}

/**
 * Analytical tangent of slerp
 */
export function slerpTangent(a, b, t) {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const omega = Math.acos(Math.min(Math.max(an.dot(bn), -1), 1));
  if (omega < 1e-6) return new THREE.Vector3();
  const denom = Math.sin(omega);
  const cA = -Math.cos((1 - t) * omega) * omega / denom;
  const cB = Math.cos(t * omega) * omega / denom;
  return an.clone().multiplyScalar(cA).add(bn.clone().multiplyScalar(cB)).normalize();
}

/**
 * Create a great-circle curve between two lat/lng points
 */
export function createGreatCircleCurve(lat1, lng1, lat2, lng2, segments = 100, radius = 1) {
  const a = latLngToVector3(lat1, lng1, 1).normalize();
  const b = latLngToVector3(lat2, lng2, 1).normalize();

  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const dir = slerp(a, b, t).normalize();
    points.push(dir.clone().multiplyScalar(radius));
  }

  return new THREE.CatmullRomCurve3(points);
}

// ─── Utility: Create flight path visualization ───

/**
 * Create a line visualization of a flight path
 */
export function createFlightPathLine(points, color = 0x4488ff, opacity = 0.15) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color, transparent: true, opacity, depthWrite: false
  });
  return new THREE.Line(geometry, material);
}

// ─── Utility: Create contrail ───

/**
 * Create a contrail effect
 */
export function createContrail(maxPoints = 200) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxPoints * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false
  });

  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;

  return {
    line,
    geometry,
    points: [],
    maxPoints,
    addPoint(pos) {
      this.points.push(pos.clone());
      if (this.points.length > this.maxPoints) this.points.shift();
      const posAttr = this.geometry.getAttribute('position');
      for (let i = 0; i < this.maxPoints; i++) {
        posAttr.setXYZ(i,
          i < this.points.length ? this.points[i].x : 0,
          i < this.points.length ? this.points[i].y : 0,
          i < this.points.length ? this.points[i].z : 0
        );
      }
      posAttr.needsUpdate = true;
      this.geometry.setDrawRange(0, this.points.length);
    },
    clear() {
      this.points = [];
      this.geometry.getAttribute('position').needsUpdate = true;
      this.geometry.setDrawRange(0, 0);
    }
  };
}
