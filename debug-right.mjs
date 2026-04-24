#!/usr/bin/env node
// Check right vector continuity specifically

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

// Check ALL basis vectors at every point
console.log('=== Per-frame basis vector continuity ===');
let rightFlips = 0;
let prevRight = null;

for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const pos = getCurvePoint(t);
  const upVec = pos.clone().normalize();
  const rawTan = getCurveTangent(t);
  const forward = rawTan.clone().sub(upVec.clone().multiplyScalar(rawTan.dot(upVec))).normalize();
  const right = new THREE.Vector3().crossVectors(upVec, forward).normalize();
  const upFinal = new THREE.Vector3().crossVectors(right, forward).normalize();

  if (prevRight !== null) {
    const rDot = right.dot(prevRight);
    if (rDot < 0.999) {
      const lat = Math.asin(pos.y) * 180 / Math.PI;
      rightFlips++;
      if (rightFlips <= 5 || rightFlips > 4995) {
        console.log(`t=${t.toFixed(5)} lat=${lat.toFixed(2)}° right·=${rDot.toFixed(8)} | right=(${right.x.toFixed(4)},${right.y.toFixed(4)},${right.z.toFixed(4)}) prev=(${prevRight.x.toFixed(4)},${prevRight.y.toFixed(4)},${prevRight.z.toFixed(4)})`);
      }
    }
  }
  prevRight = right.clone();
}
console.log(`\nTotal right vector discontinuities (dot < 0.999): ${rightFlips}`);

// Now check: what does setFromRotationMatrix produce?
console.log('\n=== Matrix -> Quaternion sign check ===');
let quatSignFlips = 0;
let prevQuat = null;

for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const pos = getCurvePoint(t);
  const upVec = pos.clone().normalize();
  const rawTan = getCurveTangent(t);
  const forward = rawTan.clone().sub(upVec.clone().multiplyScalar(rawTan.dot(upVec))).normalize();
  const right = new THREE.Vector3().crossVectors(upVec, forward).normalize();
  const upFinal = new THREE.Vector3().crossVectors(right, forward).normalize();

  const m = new THREE.Matrix4().makeBasis(right, upFinal, forward);
  const quat = new THREE.Quaternion().setFromRotationMatrix(m);

  if (prevQuat !== null) {
    const d = prevQuat.dot(quat);  // NOT abs - check actual sign
    if (d < 0) {
      quatSignFlips++;
      if (quatSignFlips <= 5) {
        const lat = Math.asin(pos.y) * 180 / Math.PI;
        console.log(`t=${t.toFixed(5)} lat=${lat.toFixed(2)}° quat dot=${d.toFixed(8)} | prev=(${prevQuat.x.toFixed(4)},${prevQuat.y.toFixed(4)},${prevQuat.z.toFixed(4)},${prevQuat.w.toFixed(4)}) curr=(${quat.x.toFixed(4)},${quat.y.toFixed(4)},${quat.z.toFixed(4)},${quat.w.toFixed(4)})`);
      }
    }
  }
  prevQuat = quat;
}
console.log(`\nTotal quaternion sign flips (dot < 0): ${quatSignFlips}`);

// Check: what's the actual dot distribution?
console.log('\n=== Quaternion dot distribution ===');
const bins = { pos: 0, neg: 0, nearZero: 0 };
prevQuat = null;
for (let i = 0; i <= 5000; i++) {
  const t = i / 5000;
  const pos = getCurvePoint(t);
  const upVec = pos.clone().normalize();
  const rawTan = getCurveTangent(t);
  const forward = rawTan.clone().sub(upVec.clone().multiplyScalar(rawTan.dot(upVec))).normalize();
  const right = new THREE.Vector3().crossVectors(upVec, forward).normalize();
  const upFinal = new THREE.Vector3().crossVectors(right, forward).normalize();
  const m = new THREE.Matrix4().makeBasis(right, upFinal, forward);
  const quat = new THREE.Quaternion().setFromRotationMatrix(m);

  if (prevQuat !== null) {
    const d = prevQuat.dot(quat);
    if (d > 0.9) bins.pos++;
    else if (d < -0.9) bins.neg++;
    else bins.nearZero++;
  }
  prevQuat = quat;
}
console.log(`Positive dot (>0.9): ${bins.pos}`);
console.log(`Negative dot (<-0.9): ${bins.neg}`);
console.log(`Near-zero dot (-0.9 to 0.9): ${bins.nearZero}`);
