#!/usr/bin/env node
// Test Three.js CatmullRomCurve3 tangent continuity exactly as used in PathFollower

import * as THREE from 'three';

function latLngToVec3(lat, lng) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  );
}

function slerp(a, b, t) {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const omega = Math.acos(Math.max(-1, Math.min(1, an.dot(bn))));
  if (omega < 1e-6) return an.clone();
  const so = Math.sin(omega);
  return an.clone().multiplyScalar(Math.sin((1-t)*omega)/so)
    .add(bn.clone().multiplyScalar(Math.sin(t*omega)/so));
}

const toronto = latLngToVec3(43.7, -79.4).normalize();
const beijing = latLngToVec3(39.9, 116.4).normalize();

// Build curve exactly as createGreatCircleCurve does
const points = [];
for (let i = 0; i <= 100; i++) {
  points.push(slerp(toronto, beijing, i/100).normalize().clone());
}
const curve = new THREE.CatmullRomCurve3(points);

// Cache exactly as PathFollower does
const curveCache = [];
const cacheSize = 1000;
for (let i = 0; i <= cacheSize; i++) {
  curveCache.push(curve.getPointAt(i / cacheSize));
}

function getCurvePoint(t) {
  const idx = t * cacheSize;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, cacheSize);
  const frac = idx - lo;
  return new THREE.Vector3().lerpVectors(curveCache[lo], curveCache[hi], frac);
}

function getCurveTangent(t) {
  const eps = 0.0001;
  const p1 = getCurvePoint(Math.max(0, t - eps));
  const p2 = getCurvePoint(Math.min(1, t + eps));
  return p2.clone().sub(p1).normalize();
}

// Analytical SLERP tangent for comparison
function slerpTangent(a, b, t) {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const omega = Math.acos(Math.max(-1, Math.min(1, an.dot(bn))));
  if (omega < 1e-6) return new THREE.Vector3();
  const denom = Math.sin(omega);
  const cA = -Math.cos((1-t)*omega) * omega / denom;
  const cB = Math.cos(t*omega) * omega / denom;
  return an.clone().multiplyScalar(cA).add(bn.clone().multiplyScalar(cB)).normalize();
}

// Check ALL 5001 points for tangent self-continuity
console.log('=== Three.js CatmullRom Cached Tangent Self-Continuity ===');
let numFlips = 0;
let prevTan = getCurveTangent(0);

for (let i = 1; i <= 5000; i++) {
  const t = i / 5000;
  const tan = getCurveTangent(t);
  const d = tan.dot(prevTan);
  if (d < 0) {
    const pos = getCurvePoint(t);
    const lat = Math.asin(pos.y) * 180 / Math.PI;
    numFlips++;
    console.log(`  FLIP at t=${t.toFixed(5)} lat=${lat.toFixed(2)}° dot=${d.toFixed(6)}`);
  }
  prevTan = tan;
}
console.log(`Total numerical tangent self-flips: ${numFlips}`);

// Compare numerical vs SLERP tangent
console.log('\n=== Numerical vs SLERP Tangent Comparison ===');
let mismatches = 0;
for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const numTan = getCurveTangent(t);
  const slerpTan = slerpTangent(toronto, beijing, t);
  const d = numTan.dot(slerpTan);
  if (d < 0.999) {
    const pos = getCurvePoint(t);
    const lat = Math.asin(pos.y) * 180 / Math.PI;
    mismatches++;
    if (mismatches <= 20 || d < 0.99) {
      console.log(`  t=${t.toFixed(5)} lat=${lat.toFixed(2)}° dot=${d.toFixed(6)}`);
    }
  }
}
console.log(`Total mismatches (dot < 0.999): ${mismatches}`);

// Compare numerical vs Three.js curve.getTangentAt
console.log('\n=== Numerical vs curve.getTangentAt Comparison ===');
let curveMismatches = 0;
for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const numTan = getCurveTangent(t);
  const curveTan = curve.getTangentAt(t);
  const d = numTan.dot(curveTan);
  if (d < 0.999) {
    const pos = getCurvePoint(t);
    const lat = Math.asin(pos.y) * 180 / Math.PI;
    curveMismatches++;
    if (curveMismatches <= 20 || d < 0.99) {
      console.log(`  t=${t.toFixed(5)} lat=${lat.toFixed(2)}° dot=${d.toFixed(6)}`);
    }
  }
}
console.log(`Total mismatches vs curve.getTangentAt: ${curveMismatches}`);

// Full basis check using numerical tangent (as in PathFollower)
console.log('\n=== Full Basis Check (Numerical Tangent, as in PathFollower) ===');
let basisFlips = 0;
let prevForward = null, prevUp = null;

for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const pos = getCurvePoint(t);
  const upVec = pos.clone().normalize();
  const rawTan = getCurveTangent(t);

  const forward = rawTan.clone()
    .sub(upVec.clone().multiplyScalar(rawTan.dot(upVec)))
    .normalize();

  const right = new THREE.Vector3().crossVectors(upVec, forward).normalize();
  const upFinal = new THREE.Vector3().crossVectors(right, forward).normalize();

  if (prevForward !== null) {
    const fDot = forward.dot(prevForward);
    const uDot = upFinal.dot(prevUp);
    if (fDot < 0 || uDot < 0) {
      const lat = Math.asin(pos.y) * 180 / Math.PI;
      basisFlips++;
      console.log(`  BASIS FLIP at t=${t.toFixed(5)} lat=${lat.toFixed(2)}° fwd·=${fDot.toFixed(6)} up·=${uDot.toFixed(6)}`);
    }
  }
  prevForward = forward.clone();
  prevUp = upFinal.clone();
}
console.log(`Total basis flips: ${basisFlips}`);

// Check: what does the quaternion look like at key points?
console.log('\n=== Quaternion Continuity Check ===');
let quatFlips = 0;
let prevQuat = null;

for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const pos = getCurvePoint(t);
  const upVec = pos.clone().normalize();
  const rawTan = getCurveTangent(t);

  const forward = rawTan.clone()
    .sub(upVec.clone().multiplyScalar(rawTan.dot(upVec)))
    .normalize();

  const right = new THREE.Vector3().crossVectors(upVec, forward).normalize();
  const upFinal = new THREE.Vector3().crossVectors(right, forward).normalize();

  const m = new THREE.Matrix4().makeBasis(right, upFinal, forward);
  const quat = new THREE.Quaternion().setFromRotationMatrix(m);

  if (prevQuat !== null) {
    const d = Math.abs(prevQuat.dot(quat));
    if (d < 0.999) {
      const lat = Math.asin(pos.y) * 180 / Math.PI;
      quatFlips++;
      if (quatFlips <= 30) {
        console.log(`  QUAT DISCONTINUITY at t=${t.toFixed(5)} lat=${lat.toFixed(2)}° dot=${d.toFixed(6)} | fwd·=${forward.dot(prevForward).toFixed(6)} up·=${upFinal.dot(prevUp).toFixed(6)}`);
      }
    }
  }
  prevQuat = quat;
  prevForward = forward.clone();
  prevUp = upFinal.clone();
}
console.log(`Total quaternion discontinuities: ${quatFlips}`);
