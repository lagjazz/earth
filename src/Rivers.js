import * as THREE from 'three';

// ─── Rivers Module ───
// Procedural river system with realistic flow patterns

const riverVertexShader = `
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

const riverFragmentShader = `
  uniform float uTime;
  uniform sampler2D riverMask;
  uniform vec3 riverColor;
  uniform vec3 foamColor;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  // Flow noise
  float flowNoise(vec2 uv, float time) {
    vec2 p = uv * 15.0;
    float n = sin(p.x * 3.0 + time * 2.0) * cos(p.y * 2.0 - time * 1.5);
    n += sin(p.x * 5.0 - time * 3.0) * 0.5;
    n += cos(p.y * 7.0 + time * 2.5) * 0.3;
    return n * 0.5 + 0.5;
  }
  
  void main() {
    // River mask
    float mask = texture2D(riverMask, vUv).r;
    
    // Flow animation
    float flow = flowNoise(vUv, uTime);
    
    // River color with flow variation
    vec3 color = riverColor;
    color += foamColor * smoothstep(0.7, 0.9, flow) * 0.4;
    
    // Shimmer
    float shimmer = sin(vUv.y * 80.0 + uTime * 6.0) * 0.5 + 0.5;
    color += vec3(0.2, 0.3, 0.4) * shimmer * 0.15;
    
    // Edge fade
    float edge = smoothstep(0.0, 0.15, mask) * smoothstep(1.0, 0.85, mask);
    
    // Specular
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(vec3(1.0, 0.3, 0.5) + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
    color += vec3(0.7, 0.8, 1.0) * spec * 0.25;
    
    float alpha = edge * 0.7;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// Generate a better river mask using real geographic data
function createRiverMaskTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Fill with black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 2048, 1024);
  
  // Major world rivers with more accurate paths
  const rivers = [
    // Amazon
    { path: [[0.22, 0.52], [0.24, 0.54], [0.27, 0.56], [0.3, 0.58], [0.33, 0.6], [0.36, 0.62], [0.39, 0.64]], width: 5 },
    // Nile
    { path: [[0.5, 0.32], [0.51, 0.36], [0.52, 0.4], [0.53, 0.44], [0.54, 0.48], [0.55, 0.52], [0.56, 0.56]], width: 4 },
    // Mississippi
    { path: [[0.16, 0.28], [0.17, 0.32], [0.18, 0.36], [0.19, 0.4], [0.2, 0.44], [0.21, 0.48], [0.22, 0.52]], width: 4 },
    // Yangtze
    { path: [[0.68, 0.38], [0.7, 0.4], [0.72, 0.42], [0.74, 0.44], [0.76, 0.46], [0.78, 0.48], [0.8, 0.5]], width: 4 },
    // Ganges
    { path: [[0.7, 0.42], [0.71, 0.44], [0.72, 0.46], [0.73, 0.48], [0.74, 0.5], [0.75, 0.52], [0.76, 0.54]], width: 3 },
    // Congo
    { path: [[0.53, 0.48], [0.54, 0.5], [0.55, 0.52], [0.56, 0.54], [0.57, 0.56], [0.58, 0.58], [0.59, 0.6]], width: 3 },
    // Danube
    { path: [[0.46, 0.33], [0.48, 0.34], [0.5, 0.35], [0.52, 0.36], [0.54, 0.37], [0.56, 0.38]], width: 2.5 },
    // Volga
    { path: [[0.5, 0.26], [0.51, 0.28], [0.52, 0.3], [0.53, 0.32], [0.54, 0.34], [0.55, 0.36]], width: 2.5 },
    // Mekong
    { path: [[0.73, 0.42], [0.74, 0.44], [0.75, 0.46], [0.76, 0.48], [0.77, 0.5], [0.78, 0.52], [0.79, 0.54]], width: 2.5 },
    // Indus
    { path: [[0.66, 0.38], [0.67, 0.4], [0.68, 0.42], [0.69, 0.44], [0.7, 0.46], [0.71, 0.48]], width: 2.5 },
    // Parana
    { path: [[0.3, 0.6], [0.31, 0.62], [0.32, 0.64], [0.33, 0.66], [0.34, 0.68], [0.35, 0.7]], width: 3 },
    // Zambesi
    { path: [[0.54, 0.56], [0.55, 0.58], [0.56, 0.6], [0.57, 0.62], [0.58, 0.64], [0.59, 0.66]], width: 2.5 },
    // Lena
    { path: [[0.78, 0.22], [0.79, 0.24], [0.8, 0.26], [0.81, 0.28], [0.82, 0.3], [0.83, 0.32]], width: 2.5 },
    // Yenisei
    { path: [[0.72, 0.2], [0.73, 0.22], [0.74, 0.24], [0.75, 0.26], [0.76, 0.28], [0.77, 0.3]], width: 2.5 },
    // Ob
    { path: [[0.68, 0.22], [0.69, 0.24], [0.7, 0.26], [0.71, 0.28], [0.72, 0.3], [0.73, 0.32]], width: 2.5 }
  ];
  
  // Draw rivers with smooth curves
  rivers.forEach(river => {
    ctx.beginPath();
    ctx.lineWidth = river.width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const points = river.path.map(p => [p[0] * 2048, p[1] * 1024]);
    
    // Draw smooth curve
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i][0] + points[i + 1][0]) / 2;
      const yc = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], xc, yc);
    }
    ctx.stroke();
  });
  
  // Add tributaries
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 2048;
    const y = 300 + Math.random() * 424;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (Math.random() - 0.5) * 80,
      y + Math.random() * 50,
      x + (Math.random() - 0.5) * 120,
      y + Math.random() * 80
    );
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  
  return texture;
}

export function createRivers() {
  const riverMask = createRiverMaskTexture();
  
  const geometry = new THREE.SphereGeometry(1.008, 128, 64);
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      riverMask: { value: riverMask },
      riverColor: { value: new THREE.Color(0.08, 0.35, 0.65) },
      foamColor: { value: new THREE.Color(0.6, 0.75, 0.9) }
    },
    vertexShader: riverVertexShader,
    fragmentShader: riverFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide
  });
  
  const rivers = new THREE.Mesh(geometry, material);
  
  return {
    rivers,
    material,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    }
  };
}
