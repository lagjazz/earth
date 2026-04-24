#!/usr/bin/env node
// Diagnostic: trace tangent direction continuity along Toronto→Beijing great circle

function latLngToVec(lat, lng) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return {
    x: -Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.sin(theta)
  };
}

function dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
function normalize(v) {
  const len = Math.sqrt(dot(v, v));
  return { x: v.x/len, y: v.y/len, z: v.z/len };
}
function sub(a, b) { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
function scale(v, s) { return { x: v.x*s, y: v.y*s, z: v.z*s }; }
function add(a, b) { return { x: a.x+b.x, y: a.y+b.y, z: a.z+b.z }; }
function cross(a, b) {
  return {
    x: a.y*b.z - a.z*b.y,
    y: a.z*b.x - a.x*b.z,
    z: a.x*b.y - a.y*b.x
  };
}
function len(v) { return Math.sqrt(dot(v, v)); }

const toronto = normalize(latLngToVec(43.7, -79.4));
const beijing = normalize(latLngToVec(39.9, 116.4));

function slerp(a, b, t) {
  const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  if (omega < 1e-6) return { ...a };
  const so = Math.sin(omega);
  return normalize(add(scale(a, Math.sin((1-t)*omega)/so), scale(b, Math.sin(t*omega)/so)));
}

function slerpTangentRaw(a, b, t) {
  const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  if (omega < 1e-6) return { tan: {x:0,y:0,z:0}, rawLen: 0 };
  const denom = Math.sin(omega);
  const cA = -Math.cos((1-t)*omega) * omega / denom;
  const cB = Math.cos(t*omega) * omega / denom;
  const raw = add(scale(a, cA), scale(b, cB));
  return { tan: normalize(raw), rawLen: len(raw) };
}

// Build CatmullRom-like curve and numerical tangent
const N = 100;
const pts = [];
for (let i = 0; i <= N; i++) pts.push(slerp(toronto, beijing, i/N));

// CatmullRom interpolation (simplified - use Three.js curve evaluation)
// For diagnostic, just use dense SLERP sampling as proxy
const DENSE = 5000;
const densePts = [];
for (let i = 0; i <= DENSE; i++) densePts.push(slerp(toronto, beijing, i/DENSE));

function numericalTangent(t) {
  const eps = 0.0001;
  const idx1 = Math.max(0, Math.floor((t - eps) * DENSE));
  const idx2 = Math.min(DENSE, Math.floor((t + eps) * DENSE));
  const p1 = densePts[idx1];
  const p2 = densePts[idx2];
  return normalize(sub(p2, p1));
}

// Check tangent continuity
console.log('=== SLERP Analytical Tangent Continuity ===');
let slerpFlips = 0;
let prevSTan = null;
const arcticEntries = [];
const arcticExits = [];
let inArctic = false;
let prevLat = 0;

for (let i = 0; i <= 2000; i++) {
  const t = i / 2000;
  const result = slerpTangentRaw(toronto, beijing, t);
  const tan = result.tan;
  const pos = slerp(toronto, beijing, t);
  const lat = Math.asin(pos.y) * 180 / Math.PI;

  // Check tangent self-continuity
  if (prevSTan !== null) {
    const d = dot(tan, prevSTan);
    if (d < 0) {
      slerpFlips++;
      console.log(`  SLERP TANGENT FLIP at t=${t.toFixed(4)} lat=${lat.toFixed(1)}° dot=${d.toFixed(4)} rawLen=${result.rawLen.toFixed(4)}`);
    }
    // Also flag near-zero dot (gradual flip)
    if (d < 0.1 && d >= 0) {
      console.log(`  SLERP TANGENT NEAR-ZERO at t=${t.toFixed(4)} lat=${lat.toFixed(1)}° dot=${d.toFixed(4)} rawLen=${result.rawLen.toFixed(4)}`);
    }
  }
  prevSTan = tan;

  // Track Arctic Circle crossings
  const isArctic = lat > 66.5;
  if (isArctic && !inArctic) { arcticEntries.push(t); inArctic = true; }
  if (!isArctic && inArctic) { arcticExits.push(t); inArctic = false; }

  prevLat = lat;
}

console.log(`\nSLERP tangent flips: ${slerpFlips}`);
console.log(`Arctic entries at t: ${arcticEntries.map(t=>t.toFixed(3)).join(', ')}`);
console.log(`Arctic exits at t: ${arcticExits.map(t=>t.toFixed(3)).join(', ')}`);

// Now check: at each point, compute the full basis and check for flips
console.log('\n=== Full Basis Continuity (SLERP tangent) ===');
let basisFlips = 0;
let prevForward = null, prevUp = null, prevRight = null;

for (let i = 0; i <= 2000; i++) {
  const t = i / 2000;
  const pos = slerp(toronto, beijing, t);
  const upVec = normalize(pos);
  const result = slerpTangentRaw(toronto, beijing, t);
  const rawTan = result.tan;

  // Project tangent onto tangent plane
  const proj = sub(rawTan, scale(upVec, dot(rawTan, upVec)));
  const projLen = len(proj);
  let forward;
  if (projLen < 1e-6) {
    forward = { x: 0, y: 0, z: 0 };
  } else {
    forward = normalize(proj);
  }

  const right = normalize(cross(upVec, forward));
  const upFinal = normalize(cross(right, forward));

  // Check continuity
  if (prevForward !== null) {
    const fDot = dot(forward, prevForward);
    const uDot = dot(upFinal, prevUp);
    const rDot = dot(right, prevRight);

    if (fDot < 0 || uDot < 0) {
      const lat = Math.asin(pos.y) * 180 / Math.PI;
      console.log(`  BASIS FLIP at t=${t.toFixed(4)} lat=${lat.toFixed(1)}° fwd·=${fDot.toFixed(4)} up·=${uDot.toFixed(4)} right·=${rDot.toFixed(4)} projLen=${projLen.toFixed(6)}`);
      basisFlips++;
    }
  }

  prevForward = forward;
  prevUp = upFinal;
  prevRight = right;
}

console.log(`\nBasis flips (SLERP): ${basisFlips}`);

// Now check with CatmullRom numerical tangent
console.log('\n=== Full Basis Continuity (Numerical tangent from dense SLERP) ===');
let numBasisFlips = 0;
prevForward = null; prevUp = null; prevRight = null;

for (let i = 0; i <= 2000; i++) {
  const t = i / 2000;
  const pos = slerp(toronto, beijing, t);
  const upVec = normalize(pos);
  const rawTan = numericalTangent(t);

  const proj = sub(rawTan, scale(upVec, dot(rawTan, upVec)));
  const projLen = len(proj);
  let forward;
  if (projLen < 1e-6) {
    forward = { x: 0, y: 0, z: 0 };
  } else {
    forward = normalize(proj);
  }

  const right = normalize(cross(upVec, forward));
  const upFinal = normalize(cross(right, forward));

  if (prevForward !== null) {
    const fDot = dot(forward, prevForward);
    const uDot = dot(upFinal, prevUp);
    const rDot = dot(right, prevRight);

    if (fDot < 0 || uDot < 0) {
      const lat = Math.asin(pos.y) * 180 / Math.PI;
      console.log(`  BASIS FLIP at t=${t.toFixed(4)} lat=${lat.toFixed(1)}° fwd·=${fDot.toFixed(4)} up·=${uDot.toFixed(4)} right·=${rDot.toFixed(4)} projLen=${projLen.toFixed(6)}`);
      numBasisFlips++;
    }
  }

  prevForward = forward;
  prevUp = upFinal;
  prevRight = right;
}

console.log(`\nBasis flips (Numerical): ${numBasisFlips}`);

// Key detail: check tangent direction at Arctic Circle crossings specifically
console.log('\n=== Tangent at Arctic Circle crossings ===');
for (const at of [...arcticEntries, ...arcticExits]) {
  const result = slerpTangentRaw(toronto, beijing, at);
  const numTan = numericalTangent(at);
  const pos = slerp(toronto, beijing, at);
  const lat = Math.asin(pos.y) * 180 / Math.PI;
  const dotVal = dot(result.tan, numTan);
  console.log(`t=${at.toFixed(4)} lat=${lat.toFixed(1)}° | SLERP·Num=${dotVal.toFixed(6)} | SLERP rawLen=${result.rawLen.toFixed(4)}`);

  // Check 10 points around the crossing
  for (let j = -5; j <= 5; j++) {
    const t2 = at + j * 0.002;
    if (t2 < 0 || t2 > 1) continue;
    const r2 = slerpTangentRaw(toronto, beijing, t2);
    const d = dot(result.tan, r2.tan);
    if (d < 0.999) {
      const lat2 = Math.asin(slerp(toronto, beijing, t2).y) * 180 / Math.PI;
      console.log(`  nearby t=${t2.toFixed(4)} lat=${lat2.toFixed(1)}° dot=${d.toFixed(6)} rawLen=${r2.rawLen.toFixed(4)}`);
    }
  }
}

// Check near endpoints (where the "front/back AND up/down" flip happens)
console.log('\n=== Near endpoints (t=0.95-1.0 and t=0-0.05) ===');
for (let i = 950; i <= 1000; i++) {
  const t = i / 2000;
  const result = slerpTangentRaw(toronto, beijing, t);
  const numTan = numericalTangent(t);
  const pos = slerp(toronto, beijing, t);
  const lat = Math.asin(pos.y) * 180 / Math.PI;
  const dotVal = dot(result.tan, numTan);

  // Check basis
  const upVec = normalize(pos);
  const proj = sub(result.tan, scale(upVec, dot(result.tan, upVec)));
  const projLen = len(proj);

  if (i % 10 === 0 || dotVal < 0.999 || projLen < 0.5) {
    console.log(`t=${t.toFixed(4)} lat=${lat.toFixed(1)}° | SLERP·Num=${dotVal.toFixed(6)} projLen=${projLen.toFixed(6)} rawLen=${result.rawLen.toFixed(4)}`);
  }
}
