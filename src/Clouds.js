import * as THREE from 'three';

// ─── Clouds Module ───
// Volumetric-looking clouds using procedural noise + real cloud texture

const CLOUD_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-clouds.png';

const cloudVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  uniform sampler2D cloudTexture;
  uniform float uTime;
  uniform vec3 sunDirection;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  // 3D noise for volumetric effect
  float hash3(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = hash3(i) * (1.0 - f.x) + hash3(i + vec3(1,0,0)) * f.x;
    float n2 = hash3(i + vec3(0,1,0)) * (1.0 - f.x) + hash3(i + vec3(1,1,0)) * f.x;
    n = n * (1.0 - f.y) + n2 * f.y;
    
    float n3 = hash3(i + vec3(0,0,1)) * (1.0 - f.x) + hash3(i + vec3(1,0,1)) * f.x;
    float n4 = hash3(i + vec3(0,1,1)) * (1.0 - f.x) + hash3(i + vec3(1,1,1)) * f.x;
    n3 = n3 * (1.0 - f.y) + n4 * f.y;
    
    return n * (1.0 - f.z) + n3 * f.z;
  }
  
  // Fractal Brownian Motion for cloud detail
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise3(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    // Base cloud texture
    vec4 texCloud = texture2D(cloudTexture, vUv);
    
    // Procedural volumetric noise
    vec3 noisePos = vPosition * 3.0 + vec3(uTime * 0.02, 0.0, 0.0);
    float procedural = fbm(noisePos);
    
    // Combine texture and procedural
    float cloudDensity = texCloud.a * 0.6 + procedural * 0.4;
    cloudDensity = smoothstep(0.1, 0.5, cloudDensity);
    
    // Lighting - clouds should be lit by sun
    float NdotL = dot(vNormal, sunDirection);
    float light = smoothstep(-0.3, 0.5, NdotL);
    
    // Cloud color - white with slight blue tint in shadows
    vec3 cloudColor = mix(
      vec3(0.7, 0.75, 0.85),  // Shadow color
      vec3(1.0, 1.0, 1.0),     // Lit color
      light
    );
    
    // Add some variation
    cloudColor += vec3(0.02, 0.02, 0.05) * procedural;
    
    // Thickness-based darkening (thicker clouds are darker underneath)
    float thickness = cloudDensity * 0.5;
    cloudColor *= 1.0 - thickness * 0.3;
    
    float alpha = cloudDensity * 0.95;
    
    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

export function createClouds() {
  const loader = new THREE.TextureLoader();
  const cloudTexture = loader.load(CLOUD_TEXTURE_URL);
  
  // Cloud sphere slightly larger than Earth
  const geometry = new THREE.SphereGeometry(1.02, 128, 64);
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cloudTexture: { value: cloudTexture },
      uTime: { value: 0 },
      sunDirection: { value: new THREE.Vector3(1, 0.3, 0.5).normalize() }
    },
    vertexShader: cloudVertexShader,
    fragmentShader: cloudFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide
  });
  
  const clouds = new THREE.Mesh(geometry, material);
  
  return {
    clouds,
    material,
    rotate(delta) {
      // Clouds drift slightly faster than Earth (relative rotation only)
      // The base rotation comes from being a child of Earth's group
      clouds.rotation.y += delta * 0.02;
      material.uniforms.uTime.value += delta;
    },
    updateSunDirection(direction) {
      material.uniforms.sunDirection.value.copy(direction).normalize();
    }
  };
}
