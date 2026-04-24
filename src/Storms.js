import * as THREE from 'three';

// ─── Storms Module ───
// Simulates storm systems with rotating cloud formations and lightning

const stormCloudVertexShader = `
  uniform float uTime;
  uniform float uRotationSpeed;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;
  
  void main() {
    vUv = uv;
    
    // Rotate around storm center (Y axis in local space)
    float angle = uTime * uRotationSpeed;
    float c = cos(angle);
    float s = sin(angle);
    
    vec3 pos = position;
    float x = pos.x * c - pos.z * s;
    float z = pos.x * s + pos.z * c;
    pos.x = x;
    pos.z = z;
    
    // Add vertical movement
    pos.y += sin(uv.x * 6.28 + uTime * 2.0) * 0.02;
    
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    vHeight = pos.y;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const stormCloudFragmentShader = `
  uniform float uTime;
  uniform vec3 stormColor;
  uniform float opacity;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vHeight;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    float n = noise(vUv * 8.0 + uTime * 0.3);
    float n2 = noise(vUv * 15.0 - uTime * 0.2);
    
    vec3 color = stormColor;
    color *= 0.5 + 0.5 * n;
    color += vec3(0.1, 0.1, 0.15) * n2;
    
    color *= 0.7 + 0.3 * smoothstep(-0.1, 0.1, vHeight);
    
    float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    float alpha = (0.6 + 0.3 * n) * edge * opacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const lightningVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lightningFragmentShader = `
  uniform float uTime;
  uniform float uFlash;
  uniform vec3 lightningColor;
  
  varying vec2 vUv;
  
  float random(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    vec2 p = vUv * 8.0;
    float n = random(floor(p));
    
    float bolt = smoothstep(0.7, 0.8, n);
    bolt *= step(0.5, fract(p.x * 3.14));
    
    float intensity = bolt * uFlash;
    
    vec3 color = lightningColor * intensity;
    color += vec3(0.5, 0.6, 1.0) * intensity * 0.5;
    
    float alpha = intensity * 0.8;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createStorms() {
  const group = new THREE.Group();
  const storms = [];
  
  const stormLocations = [
    { lat: 0.3, lon: 0.5, size: 0.15, intensity: 0.8 },
    { lat: -0.2, lon: 1.2, size: 0.12, intensity: 0.6 },
    { lat: 0.5, lon: -1.0, size: 0.1, intensity: 0.7 }
  ];
  
  stormLocations.forEach((loc, index) => {
    const stormGroup = new THREE.Group();
    
    // Storm cloud cylinder
    const cloudGeometry = new THREE.CylinderGeometry(
      loc.size,
      loc.size * 1.2,
      0.15,
      32,
      1,
      true
    );
    
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: 0.5 + index * 0.2 },
        stormColor: { value: new THREE.Color(0.2, 0.2, 0.25) },
        opacity: { value: loc.intensity }
      },
      vertexShader: stormCloudVertexShader,
      fragmentShader: stormCloudFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });
    
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    stormGroup.add(cloudMesh);
    
    // Lightning layer
    const lightningGeometry = new THREE.PlaneGeometry(loc.size * 2, loc.size * 2);
    const lightningMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFlash: { value: 0 },
        lightningColor: { value: new THREE.Color(0.8, 0.85, 1.0) }
      },
      vertexShader: lightningVertexShader,
      fragmentShader: lightningFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const lightningMesh = new THREE.Mesh(lightningGeometry, lightningMaterial);
    lightningMesh.rotation.x = -Math.PI / 2;
    lightningMesh.position.y = -0.05;
    stormGroup.add(lightningMesh);
    
    // Position storm on Earth surface
    const radius = 1.02;
    const latRad = loc.lat;
    const lonRad = loc.lon;
    
    // Convert lat/lon to 3D position
    const x = radius * Math.cos(latRad) * Math.cos(lonRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.sin(lonRad);
    
    stormGroup.position.set(x, y, z);
    
    // Orient to face outward from Earth center
    // The storm's Y axis should point outward (away from center)
    const outward = new THREE.Vector3(x, y, z).normalize();
    
    // Use quaternion to orient the storm
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, outward);
    stormGroup.quaternion.copy(quaternion);
    
    group.add(stormGroup);
    
    storms.push({
      group: stormGroup,
      cloudMaterial,
      lightningMaterial,
      location: loc,
      nextLightning: Math.random() * 5,
      lightningDuration: 0
    });
  });
  
  return {
    group,
    storms,
    update(elapsed, delta) {
      storms.forEach(storm => {
        storm.cloudMaterial.uniforms.uTime.value = elapsed;
        storm.lightningMaterial.uniforms.uTime.value = elapsed;
        
        storm.nextLightning -= delta;
        
        if (storm.nextLightning <= 0) {
          storm.lightningDuration = 0.1 + Math.random() * 0.2;
          storm.lightningMaterial.uniforms.uFlash.value = 1.0;
          storm.nextLightning = 2 + Math.random() * 8;
        }
        
        if (storm.lightningDuration > 0) {
          storm.lightningDuration -= delta;
          storm.lightningMaterial.uniforms.uFlash.value = 
            Math.max(0, storm.lightningMaterial.uniforms.uFlash.value - delta * 5);
        } else {
          storm.lightningMaterial.uniforms.uFlash.value = 0;
        }
      });
    }
  };
}
