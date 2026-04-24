import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createPathFollower,
  createGreatCircleCurve,
  createFlightPathLine,
  createContrail
} from './PathFollower.js';

// ─── Plane Module ───
// Consumer of PathFollower + SphericalOrientation algorithms.
// Responsible for: model loading, visual setup, and applying follower state.

export function createPlane() {
  const group = new THREE.Group();
  group.visible = false;

  // ── Route: Toronto → Beijing ──
  const curve = createGreatCircleCurve(43.7, -79.4, 39.9, 116.4, 100, 1);

  // Flight path visualization
  const pathLine = createFlightPathLine(curve.getPoints(100), 0x4488ff, 0.12);
  group.add(pathLine);

  // Contrail
  const contrail = createContrail(300);
  group.add(contrail.line);

  // ── Path follower (handles all path/orientation logic) ──
  const follower = createPathFollower({
    curve,
    speed: 0.015,
    heightMultiplier: 0.1,
    earthRadius: 1,
    turnaroundDelay: 3,
    smoothing: 0.15,
    contrailMinHeight: 0.005,
    modelOffsetY: Math.PI // GLB aircraft face -Z, need +Z for outbound
  });

  // ── Container + model ──
  const container = new THREE.Group();
  group.add(container);

  // Wrapper: flips model so belly faces Earth (not sky)
  const wrapper = new THREE.Group();
  wrapper.rotation.x = Math.PI;
  container.add(wrapper);

  // ── Load GLB model ──
  const loader = new GLTFLoader();
  const modelPath = '/models/aircraft_boeing_747_red.glb';
  let airplane = null;

  console.log(`Loading airplane: ${modelPath}`);

  loader.load(
    modelPath,
    (gltf) => {
      console.log('Plane model loaded ✓');
      airplane = gltf.scene;
      airplane.scale.set(0.00125, 0.00125, 0.00125);
      wrapper.add(airplane);
      group.visible = true;
      console.log('Airplane ready! ✈️');
    },
    (xhr) => {
      if (xhr.total) {
        const pct = ((xhr.loaded / xhr.total) * 100).toFixed(0);
        console.log(`Loading: ${pct}%`);
      }
    },
    (error) => {
      console.error('Failed to load plane model:', error);
    }
  );

  return {
    group,
    get airplane() { return airplane; },
    curve,
    contrail,
    follower,
    update(delta, elapsed = 0) {
      if (!airplane) return;

      // Get state from follower
      const state = follower.update(delta);

      // Apply to container + model
      follower.applyState(container, airplane, state);

      // Contrail
      if (state.shouldContrail) {
        contrail.addPoint(state.position.clone());
      } else {
        contrail.clear();
      }
    }
  };
}
