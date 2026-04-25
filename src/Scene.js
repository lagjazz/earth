import * as THREE from 'three';
import { createEarth } from './Earth.js';
import { createAurora } from './Aurora.js';
import { createLabels } from './Labels.js';
import { createFleet } from './Fleet.js';

// ─── Scene Module ───
// Assembles all systems into a single scene group

export function createScene() {
  const group = new THREE.Group();
  
  // ─── Starfield Background ───
  const stars = createStarfield();
  group.add(stars);
  
  // ─── Earth ───
  const earth = createEarth();
  group.add(earth.group);
  
  // ─── Aurora (child of Earth) ───
  const aurora = createAurora();
  earth.group.add(aurora.group);
  
  // ─── Labels (child of Earth) ───
  const labels = createLabels();
  earth.group.add(labels.group);
  
  // ─── Fleet (child of Earth) ──
  const fleet = createFleet(earth);
  
  // ─── Lighting ───
  // Sun (directional, affects day/night)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(5, 2, 3);
  group.add(sunLight);
  
  // Ambient light (subtle fill)
  const ambientLight = new THREE.AmbientLight(0x333355, 0.3);
  group.add(ambientLight);
  
  // Subtle hemisphere light for sky/ground color
  const hemiLight = new THREE.HemisphereLight(0x6688cc, 0x223344, 0.2);
  group.add(hemiLight);
  
  return {
    group,
    earth,
    aurora,
    labels,
    fleet,
    sunLight,
    ambientLight
  };
}

// ─── Starfield ───
function createStarfield() {
  const STAR_COUNT = 5000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  
  for (let i = 0; i < STAR_COUNT; i++) {
    // Random position on a large sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 100;
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8
  });
  
  return new THREE.Points(geometry, material);
}
