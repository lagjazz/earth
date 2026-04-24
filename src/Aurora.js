import * as THREE from 'three';

// ─── Aurora Module ───
// Subtle, realistic aurora that only appears near poles

const auroraVertexShader = `
  uniform float uTime;
  
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    
    // Subtle wave animation
    vec3 pos = position;
    float wave = sin(pos.x * 3.0 + uTime * 0.3) * 0.01;
    pos += normal * wave;
    
    // Fade at edges
    vAlpha = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
    vAlpha *= smoothstep(0.0, 0.3, uv.y) * smoothstep(1.0, 0.7, uv.y);
    
    vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const auroraFragmentShader = `
  uniform float uTime;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float uIntensity;
  
  varying vec2 vUv;
  varying float vAlpha;
  varying vec3 vPosition;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }
  
  void main() {
    // Subtle flowing pattern
    float n = noise(vUv * vec2(3.0, 1.5) + uTime * 0.1);
    float n2 = noise(vUv * vec2(6.0, 3.0) - uTime * 0.08);
    
    // Soft curtain effect
    float curtain = sin(vUv.y * 15.0 + n * 4.0) * 0.5 + 0.5;
    curtain = pow(curtain, 4.0);
    
    // Color - mostly green with hints of blue
    vec3 color = mix(color1, color2, n2 * 0.3);
    
    // Very subtle pulse
    float pulse = 0.5 + 0.3 * sin(uTime * 0.2 + n * 8.0);
    
    // Low alpha - aurora should be visible but subtle
    float alpha = vAlpha * curtain * n * 0.6 * pulse * uIntensity;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createAurora() {
  const group = new THREE.Group();
  const ribbons = [];
  
  // 3 ribbons - two north, one south
  const ribbonConfigs = [
    { lat: 0.78, lon: 0, width: 0.12, length: 0.5, intensity: 0.8 },
    { lat: 0.82, lon: 2.0, width: 0.1, length: 0.4, intensity: 0.7 },
    { lat: -0.78, lon: 2.5, width: 0.1, length: 0.4, intensity: 0.6 }
  ];
  
  ribbonConfigs.forEach((config, index) => {
    const segments = 40;
    const widthSegments = 6;
    const vertices = [];
    const uvs = [];
    const indices = [];
    
    const radius = 1.03;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lon = config.lon + (t - 0.5) * config.length;
      
      for (let j = 0; j <= widthSegments; j++) {
        const s = j / widthSegments;
        const lat = config.lat + (s - 0.5) * config.width;
        
        const x = radius * Math.cos(lat) * Math.cos(lon);
        const y = radius * Math.sin(lat);
        const z = radius * Math.cos(lat) * Math.sin(lon);
        
        vertices.push(x, y, z);
        uvs.push(t, s);
      }
    }
    
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < widthSegments; j++) {
        const a = i * (widthSegments + 1) + j;
        const b = a + 1;
        const c = (i + 1) * (widthSegments + 1) + j;
        const d = c + 1;
        
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: config.intensity },
        color1: { value: new THREE.Color(0.2, 0.9, 0.4) },   // Soft green
        color2: { value: new THREE.Color(0.1, 0.5, 0.8) }     // Subtle blue
      },
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const ribbon = new THREE.Mesh(geometry, material);
    group.add(ribbon);
    
    ribbons.push({
      mesh: ribbon,
      material,
      speed: 0.2 + index * 0.1
    });
  });
  
  return {
    group,
    ribbons,
    update(elapsed) {
      ribbons.forEach(ribbon => {
        ribbon.material.uniforms.uTime.value = elapsed * ribbon.speed;
      });
    }
  };
}
