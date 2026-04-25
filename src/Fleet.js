import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createPathFollower,
  createGreatCircleCurve,
  createFlightPathLine,
  createContrail
} from './PathFollower.js';

// ─── Fleet Module ───
// Manages all vehicles: aircraft, balloons, airships, helicopters, cruise ships.
// Each type uses the same PathFollower + SphericalOrientation algorithms with different configs.

// ── City database (name, lat, lng) ──
const CITIES = {
  toronto:    { name: 'Toronto',    lat: 43.7,  lng: -79.4 },
  newyork:    { name: 'New York',   lat: 40.7,  lng: -74.0 },
  losangeles: { name: 'Los Angeles', lat: 34.1, lng: -118.2 },
  london:     { name: 'London',     lat: 51.5,  lng: -0.1  },
  paris:      { name: 'Paris',      lat: 48.9,  lng: 2.3   },
  beijing:    { name: 'Beijing',    lat: 39.9,  lng: 116.4 },
  tokyo:      { name: 'Tokyo',      lat: 35.7,  lng: 139.7 },
  sydney:     { name: 'Sydney',     lat: -33.9, lng: 151.2 },
  saopaulo:   { name: 'São Paulo',  lat: -23.5, lng: -46.6 },
  capeTown:   { name: 'Cape Town',  lat: -33.9, lng: 18.4  },
  dubai:      { name: 'Dubai',      lat: 25.2,  lng: 55.3  },
  mumbai:     { name: 'Mumbai',     lat: 19.1,  lng: 72.9  },
  singapore:  { name: 'Singapore',  lat: 1.3,   lng: 103.8 },
  moscow:     { name: 'Moscow',     lat: 55.8,  lng: 37.6  },
  berlin:     { name: 'Berlin',     lat: 52.5,  lng: 13.4  },
  bangkok:    { name: 'Bangkok',    lat: 13.8,  lng: 100.5 },
  seoul:      { name: 'Seoul',      lat: 37.6,  lng: 127.0 },
  istanbul:   { name: 'Istanbul',   lat: 41.0,  lng: 29.0  },
  lagos:      { name: 'Lagos',      lat: 6.5,   lng: 3.4   },
  // Additional cities for new routes
  vancouver:  { name: 'Vancouver',  lat: 49.3,  lng: -123.1 },
  seattle:    { name: 'Seattle',    lat: 47.6,  lng: -122.3 },
  montreal:   { name: 'Montreal',   lat: 45.5,  lng: -73.6  },
  boston:     { name: 'Boston',     lat: 42.4,  lng: -71.1  },
  rio:        { name: 'Rio',        lat: -22.9, lng: -43.2  },
  sanfran:    { name: 'San Francisco', lat: 37.8, lng: -122.4 },
  honolulu:   { name: 'Honolulu',   lat: 21.3,  lng: -157.9 },
  capetown:   { name: 'Cape Town',  lat: -33.9, lng: 18.4  },
  miami:      { name: 'Miami',      lat: 25.8,  lng: -80.2  },
  havana:     { name: 'Havana',     lat: 23.1,  lng: -82.4  },
};

// ── Aircraft models ──
const AIRCRAFT = [
  '/models/aircraft_boeing_747_red.glb',
  '/models/aircraft_yellow.glb',
  '/models/aircraft_boeing_737_blue.glb',
  '/models/aircraft_private_jet.glb',
  '/models/aircraft_space_ship.glb'
];

// ── Hot air balloon models ──
const BALLOONS = [
  '/models/hot_air_balloon_blue_white.glb',
  '/models/hot_air_balloon_pink_white.glb',
  '/models/hot_air_balloon_rainbow.glb',
  '/models/hot_air_balloon_yellow_red.glb',
  '/models/hot_air_balloon_blue.glb',
];

// ── All vehicle routes ──
const VEHICLES = [
  // ── 15 Aircraft ──
  { type: 'aircraft', from: 'toronto',    to: 'beijing',    model: 0, color: 0x4488ff, speed: 0.015, delay: 0 },
  { type: 'aircraft', from: 'newyork',    to: 'london',     model: 1, color: 0xffaa44, speed: 0.018, delay: 2 },
  { type: 'aircraft', from: 'losangeles', to: 'tokyo',      model: 2, color: 0x44aaff, speed: 0.012, delay: 5 },
  { type: 'aircraft', from: 'sydney',     to: 'singapore',  model: 3, color: 0x44ff88, speed: 0.016, delay: 1 },
  { type: 'aircraft', from: 'saopaulo',   to: 'london',     model: 0, color: 0xff44aa, speed: 0.010, delay: 8 },
  { type: 'aircraft', from: 'paris',      to: 'dubai',      model: 0, color: 0xff6644, speed: 0.020, delay: 3 },
  { type: 'aircraft', from: 'mumbai',     to: 'sydney',     model: 0, color: 0x44ffaa, speed: 0.014, delay: 6 },
  { type: 'aircraft', from: 'moscow',     to: 'newyork',    model: 2, color: 0xaa44ff, speed: 0.011, delay: 4 },
  { type: 'aircraft', from: 'capetown',   to: 'mumbai',     model: 3, color: 0xffff44, speed: 0.013, delay: 7 },
  { type: 'aircraft', from: 'bangkok',    to: 'losangeles', model: 0, color: 0x44ffff, speed: 0.009, delay: 10 },
  { type: 'aircraft', from: 'seoul',      to: 'paris',      model: 0, color: 0xff4444, speed: 0.017, delay: 2 },
  { type: 'aircraft', from: 'istanbul',   to: 'lagos',      model: 0, color: 0x44ff44, speed: 0.019, delay: 9 },
  { type: 'aircraft', from: 'berlin',     to: 'tokyo',      model: 2, color: 0xff8844, speed: 0.015, delay: 11 },
  { type: 'aircraft', from: 'dubai',      to: 'saopaulo',   model: 3, color: 0x8844ff, speed: 0.010, delay: 3 },
  { type: 'aircraft', from: 'lagos',      to: 'bangkok',    model: 4, color: 0x4488ff, speed: 0.012, delay: 12 },

  // ── 8 Hot Air Balloons (above Turkey, 2 each of 4 models) ──
  { type: 'balloon', model: 0, color: 0x4488ff, delay: 0 },
  { type: 'balloon', model: 1, color: 0x4488ff, delay: 1 },
  { type: 'balloon', model: 2, color: 0xff88cc, delay: 2 },
  { type: 'balloon', model: 4, color: 0xff88cc, delay: 3 },
  { type: 'balloon', model: 0, color: 0xff88cc, delay: 4 },
  { type: 'balloon', model: 1, color: 0xffaa44, delay: 5 },
  { type: 'balloon', model: 2, color: 0xffaa44, delay: 6 },
  { type: 'balloon', model: 3, color: 0xffaa44, delay: 7 },

  // ── 1 Airship (Canada ↔ US, slow) ──
  { type: 'airship', from: 'toronto', to: 'newyork', color: 0xcccccc, speed: 0.004, delay: 0 },

  // ── 2 Helicopters (Canada ↔ US, different cities) ──
  //{ type: 'helicopter', from: 'vancouver', to: 'seattle', color: 0xff4444, speed: 0.025, delay: 0 },
  //{ type: 'helicopter', from: 'montreal',  to: 'boston',   color: 0xff4444, speed: 0.025, delay: 5 },

  // ── 10 Cruise Ships (ocean routes) ──
  { type: 'cruise', model: 0, from: 'newyork',    to: 'london',     color: 0x4488ff, speed: 0.003, delay: 0 },
  { type: 'cruise', model: 0, from: 'losangeles', to: 'tokyo',      color: 0x4488ff, speed: 0.003, delay: 8 },
  { type: 'cruise', model: 0, from: 'sydney',     to: 'singapore',  color: 0x4488ff, speed: 0.003, delay: 15 },
  { type: 'cruise', model: 0, from: 'london',     to: 'saopaulo',   color: 0x4488ff, speed: 0.003, delay: 5 },
  { type: 'cruise', model: 0, from: 'mumbai',     to: 'sydney',     color: 0x4488ff, speed: 0.003, delay: 12 },
  { type: 'cruise', model: 1, from: 'sanfran',    to: 'tokyo',      color: 0xffaa44, speed: 0.003, delay: 3 },
  { type: 'cruise', model: 1, from: 'sydney',     to: 'sanfran',    color: 0xffaa44, speed: 0.003, delay: 10 },
  { type: 'cruise', model: 1, from: 'rio',        to: 'london',     color: 0xffaa44, speed: 0.003, delay: 7 },
  { type: 'cruise', model: 1, from: 'mumbai',     to: 'singapore',  color: 0xffaa44, speed: 0.003, delay: 18 },
  { type: 'cruise', model: 1, from: 'sanfran',    to: 'honolulu',   color: 0xffaa44, speed: 0.003, delay: 14 },
];

// ── Scale map ──
function getScale(modelPath) {
  if (modelPath.includes('private_jet')) return 0.01;
  if (modelPath.includes('737')) return 0.000015;
  if (modelPath.includes('space_ship')) return 0.01;
  if (modelPath.includes('aircraft_yellow')) return 0.005;
  if (modelPath.includes('airship')) return 0.001;
  if (modelPath.includes('helicopter')) return 0.003;
  if (modelPath.includes('cruise_aircraft')) return 0.0002;
  if (modelPath.includes('cruise_liberty')) return 0.3;
  if (modelPath.includes('hot_air_balloon_rainbow')) return 0.00002;
  if (modelPath.includes('hot_air_balloon_pink')) return 0.0001;
  if (modelPath.includes('hot_air_balloon_yellow')) return 0.0001;
  if (modelPath.includes('hot_air_balloon_blue_white')) return 0.002;
  if (modelPath.includes('hot_air_balloon_blue')) return 0.002;
  return 0.00125; // default aircraft
}

// ── Wrapper rotation per model ──
function getWrapperRotation(modelPath) {
  if (modelPath.includes('aircraft_yellow')) return { x: Math.PI, y: Math.PI / 2 };
  return { x: Math.PI, y: 0 };
}

/**
 * Create a small circular path around a point (for hot air balloons).
 */
function createCirclePath(lat, lng, radius, earthRadius, segments = 60) {
  const center = latLngToVector3(lat, lng, earthRadius);
  const points = [];
  // Compute local tangent plane at center
  const up = center.clone().normalize();
  // Pick reference vector not parallel to up
  const ref = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().cross(up, ref).normalize();
  const localForward = new THREE.Vector3().cross(right, up).normalize();

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Point on circle in local tangent plane
    const point = new THREE.Vector3()
      .copy(right).multiplyScalar(sin * radius)
      .add(localForward.clone().multiplyScalar(cos * radius))
      .add(center);
    // Project back to sphere surface + altitude
    point.normalize().multiplyScalar(earthRadius);
    points.push(point);
  }
  return new THREE.CatmullRomCurve3(points, true);
}

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Create the full fleet.
 */
export function createFleet(earth) {
  const parentGroup = earth.group;
  const vehicles = [];
  const total = VEHICLES.length;

  VEHICLES.forEach((v, index) => {
    let vehicle;
    if (v.type === 'balloon') {
      vehicle = createBalloon(v, index, total);
    } else if (v.type === 'airship') {
      vehicle = createVehicle(v, index, total);
    } else if (v.type === 'helicopter') {
      vehicle = createVehicle(v, index, total);
    } else if (v.type === 'cruise') {
      vehicle = createCruise(v, index, total, earth);
    } else {
      vehicle = createVehicle(v, index, total);
    }
    parentGroup.add(vehicle.group);
    vehicles.push(vehicle);
  });

  return {
    vehicles,
    update(delta, elapsed) {
      vehicles.forEach(v => v.update(delta, elapsed));
    },
    get loadedCount() {
      return vehicles.filter(v => v.model).length;
    },
    get total() { return total; }
  };
}

/**
 * Create a hot air balloon hovering above Turkey.
 */
function createBalloon(config, index, total) {
  const { model: modelIdx, color, delay } = config;
  const modelPath = BALLOONS[modelIdx];

  const group = new THREE.Group();
  group.visible = false;

  // Each balloon gets a scattered position across Turkey (not in a line)
  const istanbul = CITIES.istanbul;
  // Use golden-angle spiral for even distribution across the region
  const goldenAngle = 2.399963; // ~137.5° in radians
  const spreadRadius = 2.5; // degrees
  const r = Math.sqrt((index + 1) / 9) * spreadRadius;
  const angle = (index + 1) * goldenAngle;
  const offsetLat = Math.cos(angle) * r;
  const offsetLng = Math.sin(angle) * r * 1.5; // wider east-west for Turkey shape
  const balloonLat = istanbul.lat + offsetLat;
  const balloonLng = istanbul.lng + offsetLng;

  // Small circular path
  const circleRadius = 0.015 + (index % 4) * 0.005;
  const curve = createCirclePath(balloonLat, balloonLng, circleRadius, 1);

  // No path line for balloons
  // No contrail for balloons

  const follower = createPathFollower({
    curve,
    speed: 0.002, // Very slow floating
    heightMultiplier: 0.02, // Low hover for balloons
    earthRadius: 1,
    turnaroundDelay: 0,
    smoothing: 0.05,
    contrailMinHeight: 999, // Disable contrails
    modelOffsetY: 0
  });

  if (delay > 0) {
    const steps = Math.floor(delay * 60);
    for (let i = 0; i < steps; i++) follower.update(1 / 60);
  }

  const container = new THREE.Group();
  group.add(container);

  // Helper vectors for balloon orientation (avoid GC in update loop)
  const _balloonRadial = new THREE.Vector3();
  const _balloonUp = new THREE.Vector3(0, 1, 0);
  const _balloonQuat = new THREE.Quaternion();

  const wrapper = new THREE.Group();
  wrapper.rotation.x = 0; // Balloons don't need flip
  container.add(wrapper);

  const loader = new GLTFLoader();
  let model = null;
  const scale = getScale(modelPath);

  loader.load(modelPath, (gltf) => {
    model = gltf.scene;
    model.scale.set(scale, scale, scale);
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (!child.material.map) {
          child.material.emissive = child.material.color.clone();
          child.material.emissiveIntensity = 1.0;
        }
      }
    });
    wrapper.add(model);
    group.visible = true;
    console.log(`🎈 Balloon ${index + 1} ready above Turkey`);
  }, null, (e) => console.error(`Balloon ${index + 1} load failed:`, e));

  return {
    group,
    get model() { return model; },
    follower,
    update(delta, elapsed = 0) {
      if (!model) return;
      const state = follower.update(delta);
      follower.applyState(container, model, state);
      // Balloons always point straight up (perpendicular to ground)
      _balloonRadial.copy(container.position).normalize();
      _balloonQuat.setFromUnitVectors(_balloonUp, _balloonRadial);
      container.quaternion.copy(_balloonQuat);
      model.quaternion.identity();
    }
  };
}

/**
 * Create a cruise ship (stays on ocean surface).
 */
function createCruise(config, index, total, earth) {
  const { model: modelIdx, from, to, color, speed, delay } = config;
  const modelPath = modelIdx === 0
    ? '/models/cruise_aircraft_carrier.glb'
    : '/models/cruise_liberty.glb';

  const fromCity = CITIES[from];
  const toCity = CITIES[to];

  const group = new THREE.Group();
  group.visible = false;

  const curve = createGreatCircleCurve(
    fromCity.lat, fromCity.lng,
    toCity.lat, toCity.lng,
    100, 1
  );

  // Subtle path line
  const pathLine = createFlightPathLine(curve.getPoints(100), color, 0.03);
  group.add(pathLine);

  const follower = createPathFollower({
    curve,
    speed: speed,
    heightMultiplier: 0.002, // On surface
    earthRadius: 1,
    turnaroundDelay: 5,
    smoothing: 0.08,
    contrailMinHeight: 999, // No contrails
    modelOffsetY: 0
  });

  if (delay > 0) {
    const steps = Math.floor(delay * 60);
    for (let i = 0; i < steps; i++) follower.update(1 / 60);
  }

  const container = new THREE.Group();
  group.add(container);

  const wrapper = new THREE.Group();
  wrapper.rotation.x = Math.PI; // Ships sit flat (models are upside down)
  if (modelIdx === 0) wrapper.rotation.y = Math.PI; // Aircraft carrier faces forward
  container.add(wrapper);

  const loader = new GLTFLoader();
  let model = null;
  const scale = getScale(modelPath);

  loader.load(modelPath, (gltf) => {
    model = gltf.scene;
    model.scale.set(scale, scale, scale);
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (!child.material.map) {
          child.material.emissive = child.material.color.clone();
          child.material.emissiveIntensity = 1.0;
        }
      }
    });
    wrapper.add(model);
    group.visible = true;
    console.log(`🚢 Cruise ${index + 1} ready: ${fromCity.name} → ${toCity.name}`);
  }, null, (e) => console.error(`Cruise ${index + 1} load failed:`, e));

  return {
    group,
    get model() { return model; },
    follower,
    update(delta, elapsed = 0) {
      if (!model) return;
      const state = follower.update(delta);
      follower.applyState(container, model, state);
      // Hide ship when over land
      if (earth && earth.isWater) {
        const overWater = earth.isWater(container.position);
        group.visible = overWater || !earth.waterMap?.image; // Show if texture not loaded
      }
    }
  };
}

/**
 * Create a standard vehicle (aircraft, airship, helicopter).
 */
function createVehicle(config, index, total) {
  const { type, from, to, model: modelIdx, color, speed, delay } = config;

  let modelPath;
  if (type === 'aircraft') modelPath = AIRCRAFT[modelIdx];
  else if (type === 'airship') modelPath = '/models/airship.glb';
  else if (type === 'helicopter') modelPath = '/models/helicopter_red.glb';

  const fromCity = CITIES[from];
  const toCity = CITIES[to];

  const group = new THREE.Group();
  group.visible = false;

  const curve = createGreatCircleCurve(
    fromCity.lat, fromCity.lng,
    toCity.lat, toCity.lng,
    100, 1
  );

  const pathLine = createFlightPathLine(curve.getPoints(100), color, 0.06);
  group.add(pathLine);

  const contrail = createContrail(200);
  contrail.line.material.color.setHex(color);
  contrail.line.material.opacity = 0.2;
  group.add(contrail.line);

  // Type-specific height
  let heightMult = 0.1;
  let contrailMin = 0.005;
  if (type === 'airship') { heightMult = 0.25; contrailMin = 999; }
  if (type === 'helicopter') { heightMult = 0.03; contrailMin = 999; }

  const follower = createPathFollower({
    curve,
    speed: speed,
    heightMultiplier: heightMult,
    earthRadius: 1,
    turnaroundDelay: 3,
    smoothing: 0.15,
    contrailMinHeight: contrailMin,
    modelOffsetY: Math.PI
  });

  if (delay > 0) {
    const steps = Math.floor(delay * 60);
    for (let i = 0; i < steps; i++) follower.update(1 / 60);
  }

  const container = new THREE.Group();
  group.add(container);

  const wrapper = new THREE.Group();
  const rot = getWrapperRotation(modelPath);
  wrapper.rotation.x = rot.x;
  wrapper.rotation.y = rot.y;
  container.add(wrapper);

  const loader = new GLTFLoader();
  let model = null;
  const scale = getScale(modelPath);

  loader.load(modelPath, (gltf) => {
    model = gltf.scene;
    model.scale.set(scale, scale, scale);
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (!child.material.map) {
          child.material.emissive = child.material.color.clone();
          child.material.emissiveIntensity = 1.0;
        }
      }
    });
    wrapper.add(model);
    group.visible = true;
    const emoji = type === 'airship' ? '🎈' : type === 'helicopter' ? '🚁' : '✈️';
    console.log(`${emoji} ${type} ${index + 1} ready: ${fromCity.name} → ${toCity.name}`);
  }, null, (e) => console.error(`${type} ${index + 1} load failed:`, e));

  return {
    group,
    get model() { return model; },
    curve,
    contrail,
    follower,
    update(delta, elapsed = 0) {
      if (!model) return;
      const state = follower.update(delta);
      follower.applyState(container, model, state);
      if (type === 'aircraft') {
        if (state.shouldContrail) contrail.addPoint(state.position.clone());
        else contrail.clear();
      }
    }
  };
}
