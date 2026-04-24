import * as THREE from 'three';

// ─── Atmosphere Module ───
// Fresnel-based atmospheric glow with realistic blue edge scattering

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    // Fresnel effect - stronger at edges
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, power);
    
    // Atmospheric scattering - blue tint
    vec3 color = glowColor * fresnel * intensity;
    
    // Add inner glow
    float innerGlow = pow(fresnel, power * 0.5) * 0.3;
    color += glowColor * innerGlow;
    
    gl_FragColor = vec4(color, fresnel * 0.5);
  }
`;

export function createAtmosphere() {
  // Outer glow sphere
  const outerGeometry = new THREE.SphereGeometry(1.15, 64, 64);
  const outerMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
      intensity: { value: 0.6 },
      power: { value: 3.5 }
    },
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending
  });
  
  const outerGlow = new THREE.Mesh(outerGeometry, outerMaterial);
  
  // Inner glow sphere (subtle)
  const innerGeometry = new THREE.SphereGeometry(1.03, 64, 64);
  const innerMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0.4, 0.7, 1.0) },
      intensity: { value: 0.25 },
      power: { value: 4.5 }
    },
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending
  });
  
  const innerGlow = new THREE.Mesh(innerGeometry, innerMaterial);
  
  const group = new THREE.Group();
  group.add(outerGlow);
  group.add(innerGlow);
  
  return {
    group,
    outerMaterial,
    innerMaterial
  };
}
