import * as THREE from 'three';

// ─── Earth Module ───
// Realistic Earth with day/night blending, city lights, and pronounced 3D terrain

const TEXTURE_URLS = {
  day: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
  night: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg',
  bump: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png',
  specular: 'https://unpkg.com/three-globe@2.31.1/example/img/earth-water.png'
};

const earthVertexShader = `
  uniform sampler2D bumpMap;
  uniform float bumpScale;
  
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vBumpHeight;
  
  void main() {
    vUv = uv;
    
    // Read height from bump map
    float height = texture2D(bumpMap, uv).r;
    vBumpHeight = height;
    
    // Displace vertex along normal (real 3D terrain)
    vec3 displacedPosition = position + normal * height * bumpScale;
    
    // Compute perturbed normal using finite differences
    float dx = texture2D(bumpMap, uv + vec2(0.003, 0.0)).r - height;
    float dy = texture2D(bumpMap, uv + vec2(0.0, 0.003)).r - height;
    vec3 tangentNormal = normalize(normal + vec3(dx, dy, 0.0) * 12.0);
    
    // World-space normal
    vWorldNormal = normalize((modelMatrix * vec4(tangentNormal, 0.0)).xyz);
    vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;
  
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying float vBumpHeight;
  
  void main() {
    // Get textures
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    
    // Day/night calculation in world space
    float NdotL = dot(vWorldNormal, sunDirection);
    
    // Twilight zone - smooth transition
    float dayNight = smoothstep(-0.3, 0.1, NdotL);
    
    // Twilight color (orange/pink at terminator)
    float twilight = 1.0 - abs(NdotL);
    twilight = pow(twilight, 4.0) * 0.4;
    vec3 twilightColor = vec3(1.0, 0.5, 0.2) * twilight;
    
    // Night side - city lights with glow
    vec3 nightLit = nightColor * 3.0;
    nightLit += nightColor * nightColor * 3.0;
    
    // Height-based lighting (mountains catch more light)
    float heightLight = 1.0 + vBumpHeight * 0.6;
    vec3 dayLit = dayColor * heightLight;
    
    // Blend day and night
    vec3 color = mix(nightLit, dayLit, dayNight);
    
    // Add twilight at terminator
    color += twilightColor;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createEarth() {
  const group = new THREE.Group();
  
  const loader = new THREE.TextureLoader();
  
  const dayTexture = loader.load(TEXTURE_URLS.day);
  const nightTexture = loader.load(TEXTURE_URLS.night);
  const bumpMap = loader.load(TEXTURE_URLS.bump);
  
  // High-res sphere for displacement
  const geometry = new THREE.SphereGeometry(1, 256, 128);
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      bumpMap: { value: bumpMap },
      sunDirection: { value: new THREE.Vector3(1, 0, 0).normalize() },
      bumpScale: { value: 0.08 }  // Pronounced 3D terrain
    },
    vertexShader: earthVertexShader,
    fragmentShader: earthFragmentShader
  });
  
  const earth = new THREE.Mesh(geometry, material);
  group.add(earth);
  
  // Axial tilt
  group.rotation.z = THREE.MathUtils.degToRad(23.5);
  
  return {
    group,
    earth,
    material,
    rotate(delta) {
      group.rotation.y += delta * 0.05;
    },
    updateSunDirection(direction) {
      material.uniforms.sunDirection.value.copy(direction).normalize();
    }
  };
}
