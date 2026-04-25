import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene } from './Scene.js';

// ─── Main Entry Point ───

const container = document.getElementById('canvas-container');

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// Scene
const scene = createScene();

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 3.5);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1.5;
controls.maxDistance = 10;
controls.enablePan = false;
controls.rotateSpeed = 0.5;

// Earth rotation toggle
const rotationToggle = document.getElementById('rotation-toggle');
let earthRotationEnabled = rotationToggle.checked;
rotationToggle.addEventListener('change', (e) => {
  earthRotationEnabled = e.target.checked;
});

// Country labels toggle
const labelsToggle = document.getElementById('labels-toggle');
let labelsEnabled = labelsToggle.checked;
labelsToggle.addEventListener('change', (e) => {
  labelsEnabled = e.target.checked;
  if (scene.labels) {
    scene.labels.group.visible = labelsEnabled;
  }
});

// Hide labels on initial load (toggle is off by default)
if (scene.labels) scene.labels.group.visible = false;

// Animation loop
const clock = new THREE.Clock();
const fleetStatus = document.getElementById('fleet-status');

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  // Update fleet status
  if (fleetStatus && scene.fleet) {
    const loaded = scene.fleet.loadedCount;
    const total = scene.fleet.total;
    if (loaded < total) {
      fleetStatus.textContent = `🚀 Loading fleet... ${loaded}/${total}`;
    } else if (loaded === total) {
      fleetStatus.textContent = `🚀 ${total} vehicles active`;
      fleetStatus.style.color = '#4a4';
    }
  }
  
  // Update all animated systems
  if (earthRotationEnabled) scene.earth?.rotate(delta);
  scene.aurora?.update(elapsed);
  if (labelsEnabled) scene.labels?.update(camera);
  scene.fleet?.update(delta, elapsed);
  
  // Sync sun direction with Earth shader
  if (scene.sunLight) {
    const sunDir = new THREE.Vector3();
    scene.sunLight.getWorldDirection(sunDir);
    
    if (scene.earth?.updateSunDirection) {
      scene.earth.updateSunDirection(sunDir);
    }
  }
  
  // Debug: log sun direction once
  if (elapsed < 0.1 && scene.sunLight) {
    const sunDir = new THREE.Vector3();
    scene.sunLight.getWorldDirection(sunDir);
    console.log('Sun direction:', sunDir);
  }
  
  controls.update();
  renderer.render(scene.group, camera);
}

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
