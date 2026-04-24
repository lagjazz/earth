#!/usr/bin/env node
// Full basis + quaternion diagnostic using exact same math as SphericalOrientation.js

import * as THREE from 'three';
import { computeOrientation } from './src/SphericalOrientation.js';

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

// Build curve exactly as PathFollower does
const points = [];
for (let i = 0; i <= 100; i++) points.push(slerp(toronto, beijing, i/100).normalize().clone());
const curve = new THREE.CatmullRomCurve3(points);

const curveCache = [];
const cacheSize = 1000;
for (let i = 0; i <= cacheSize; i++) curveCache.push(curve.getPointAt(i / cacheSize));

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

// ── Full diagnostic: basis + quaternion continuity ──
console.log('=== Full basis + quaternion continuity (exact SphericalOrientation math) ===\n');

let fwdFlips = 0, upFlips = 0, rightFlips = 0, quatFlips = 0;
let prevFwd = null, prevUp = null, prevRight = null, prevQuat = null;

const THRESHOLD = 0.999;

for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const curvePos = getCurvePoint(t);
  const radialDir = curvePos.clone().normalize();
  const position = radialDir.multiplyScalar(1 + Math.sin(Math.PI * t) * 0.1);
  const rawTangent = getCurveTangent(t);

  const result = computeOrientation(position, rawTangent, 1);
  if (!result.valid) continue;

  if (prevFwd !== null) {
    const fDot = result.forward.dot(prevFwd);
    const uDot = result.up.dot(prevUp);
    const rDot = result.right.dot(prevRight);
    const qDot = result.quaternion.dot(prevQuat);

    if (fDot < THRESHOLD) {
      fwdFlips++;
      if (fwdFlips <= 3) {
        const lat = Math.asin(position.y / position.length()) * 180 / Math.PI;
        console.log(`FWD  t=${t.toFixed(4)} lat=${lat.toFixed(2)}° dot=${fDot.toFixed(6)}`);
      }
    }
    if (uDot < THRESHOLD) {
      upFlips++;
      if (upFlips <= 3) {
        const lat = Math.asin(position.y / position.length()) * 180 / Math.PI;
        console.log(`UP   t=${t.toFixed(4)} lat=${lat.toFixed(2)}° dot=${uDot.toFixed(6)}`);
      }
    }
    if (rDot < THRESHOLD) {
      rightFlips++;
      if (rightFlips <= 3) {
        const lat = Math.asin(position.y / position.length()) * 180 / Math.PI;
        console.log(`RIGHT t=${t.toFixed(4)} lat=${lat.toFixed(2)}° dot=${rDot.toFixed(6)}`);
      }
    }
    if (Math.abs(qDot) < THRESHOLD) {
      quatFlips++;
      if (quatFlips <= 10) {
        const lat = Math.asin(position.y / position.length()) * 180 / Math.PI;
        console.log(`QUAT t=${t.toFixed(4)} lat=${lat.toFixed(2)}° dot=${qDot.toFixed(6)} | prev=(${prevQuat.x.toFixed(4)},${prevQuat.y.toFixed(4)},${prevQuat.z.toFixed(4)},${prevQuat.w.toFixed(4)}) curr=(${result.quaternion.x.toFixed(4)},${result.quaternion.y.toFixed(4)},${result.quaternion.z.toFixed(4)},${result.quaternion.w.toFixed(4)})`);
      }
    }
  }

  prevFwd = result.forward.clone();
  prevUp = result.up.clone();
  prevRight = result.right.clone();
  prevQuat = result.quaternion.clone();
}

console.log(`\n--- Summary (threshold < ${THRESHOLD}) ---`);
console.log(`Forward discontinuities:  ${fwdFlips}`);
console.log(`Up discontinuities:       ${upFlips}`);
console.log(`Right discontinuities:    ${rightFlips}`);
console.log(`Quaternion discontinuities: ${quatFlips}`);

// ── Test the fix: sign-consistent slerp ──
console.log('\n=== Testing fix: sign-consistent slerp ===\n');

let fixQuatFlips = 0;
let simQuat = new THREE.Quaternion();

for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const curvePos = getCurvePoint(t);
  const radialDir = curvePos.clone().normalize();
  const position = radialDir.multiplyScalar(1 + Math.sin(Math.PI * t) * 0.1);
  const rawTangent = getCurveTangent(t);

  const result = computeOrientation(position, rawTangent, 1);
  if (!result.valid) continue;

  // FIX: Ensure shortest path (same as smoothOrientation)
  const target = result.quaternion;
  if (simQuat.dot(target) < 0) {
    target.x = -target.x;
    target.y = -target.y;
    target.z = -target.z;
    target.w = -target.w;
  }

  if (i > 0) {
    const qDotRaw = simQuat.dot(result.quaternion); // raw dot (before fix)
    if (Math.abs(qDotRaw) < THRESHOLD) {
      fixQuatFlips++;
    }
  }

  simQuat.slerp(target, 0.15);
}

console.log(`Without fix: ${quatFlips} quaternion discontinuities`);
console.log(`With fix (sign-consistent slerp): would still see ${fixQuatFlips} raw discontinuities, but slerp would handle them correctly`);
