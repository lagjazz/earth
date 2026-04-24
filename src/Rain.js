import * as THREE from 'three';

// ─── Rain Module ───
// Particle system simulating rainfall over a local region
// Rain falls along surface normals (radially inward toward Earth)

const RAIN_COUNT = 3000;

const rainVertexShader = `
  attribute float aOffset;
  attribute float aSpeed;
  
  uniform float uTime;
  uniform float uSize;
  
  varying float vAlpha;
  
  void main() {
    // Animate rain drops falling
    float t = mod(uTime * aSpeed + aOffset, 1.0);
    
    // Rain falls radially inward from above the surface
    // Start at radius 1.3, fall to radius 1.0 (Earth surface)
    float radius = 1.3 - t * 0.3;
    vec3 pos = normalize(position) * radius;
    
    // Fade in/out at edges
    vAlpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.85, t);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (2.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const rainFragmentShader = `
  uniform vec3 rainColor;
  
  varying float vAlpha;
  
  void main() {
    // Elongated rain drop (streak)
    vec2 center = gl_PointCoord - vec2(0.5);
    
    // Stretch vertically for streak effect
    center.y *= 2.0;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    // Soft edge
    float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * 0.5;
    
    gl_FragColor = vec4(rainColor, alpha);
  }
`;

export function createRain() {
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(RAIN_COUNT * 3);
  const offsets = new Float32Array(RAIN_COUNT);
  const speeds = new Float32Array(RAIN_COUNT);
  
  // Concentrate rain in a region (over a specific area)
  const rainCenter = new THREE.Vector3(0.3, 0.2, 0.8);
  const rainRadius = 0.4;
  
  for (let i = 0; i < RAIN_COUNT; i++) {
    // Random position on sphere surface, biased toward rain center
    const bias = 0.3 + Math.random() * 0.7;
    const x = rainCenter.x * bias + (Math.random() - 0.5) * rainRadius;
    const y = rainCenter.y * bias + (Math.random() - 0.5) * rainRadius;
    const z = rainCenter.z * bias + (Math.random() - 0.5) * rainRadius;
    
    const pos = new THREE.Vector3(x, y, z).normalize();
    
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
    
    offsets[i] = Math.random() * 10;
    speeds[i] = 0.5 + Math.random() * 1.5;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 3.0 },
      rainColor: { value: new THREE.Color(0.6, 0.7, 0.9) }
    },
    vertexShader: rainVertexShader,
    fragmentShader: rainFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const rain = new THREE.Points(geometry, material);
  
  return {
    rain,
    material,
    update(delta, elapsed) {
      material.uniforms.uTime.value = elapsed;
    }
  };
}
