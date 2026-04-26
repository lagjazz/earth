import * as THREE from 'three';

// ─── Labels Module ───
// Country name labels that face the camera and hide when not visible

// Major countries with approximate center coordinates
const COUNTRIES = [
  { name: 'United States', lat: 37.09, lon: -95.71 },
  { name: 'Canada', lat: 56.13, lon: -106.35 },
  { name: 'Mexico', lat: 23.63, lon: -102.55 },
  { name: 'Brazil', lat: -14.24, lon: -51.93 },
  { name: 'Argentina', lat: -38.42, lon: -63.62 },
  { name: 'United Kingdom', lat: 55.38, lon: -3.44 },
  { name: 'France', lat: 46.23, lon: 2.21 },
  { name: 'Germany', lat: 51.17, lon: 10.45 },
  { name: 'Italy', lat: 41.87, lon: 12.57 },
  { name: 'Spain', lat: 40.46, lon: -3.75 },
  { name: 'Russia', lat: 61.52, lon: 105.32 },
  { name: 'China', lat: 35.86, lon: 104.20 },
  { name: 'India', lat: 20.59, lon: 78.96 },
  { name: 'Japan', lat: 36.20, lon: 138.25 },
  { name: 'South Korea', lat: 35.91, lon: 127.77 },
  { name: 'Australia', lat: -25.27, lon: 133.78 },
  { name: 'South Africa', lat: -30.56, lon: 22.94 },
  { name: 'Egypt', lat: 26.82, lon: 30.80 },
  { name: 'Nigeria', lat: 9.08, lon: 8.68 },
  { name: 'Kenya', lat: -0.02, lon: 37.91 },
  { name: 'Saudi Arabia', lat: 23.89, lon: 45.08 },
  { name: 'Turkey', lat: 38.96, lon: 35.24 },
  { name: 'Indonesia', lat: -0.79, lon: 113.92 },
  { name: 'Thailand', lat: 15.87, lon: 100.99 },
  { name: 'Vietnam', lat: 14.06, lon: 108.28 },
  { name: 'Philippines', lat: 12.88, lon: 121.77 },
  { name: 'Chile', lat: -35.68, lon: -71.54 },
  { name: 'Colombia', lat: 4.57, lon: -74.30 },
  { name: 'Peru', lat: -9.19, lon: -75.02 },
  { name: 'Venezuela', lat: 6.42, lon: -66.59 },
  { name: 'Poland', lat: 51.92, lon: 19.15 },
  { name: 'Ukraine', lat: 48.38, lon: 31.17 },
  { name: 'Sweden', lat: 60.13, lon: 18.64 },
  { name: 'Norway', lat: 60.47, lon: 8.47 },
  { name: 'Finland', lat: 61.92, lon: 25.75 },
  { name: 'Greece', lat: 39.07, lon: 21.82 },
  { name: 'Portugal', lat: 39.40, lon: -8.22 },
  { name: 'Morocco', lat: 31.79, lon: -7.09 },
  { name: 'Algeria', lat: 28.03, lon: 1.65 },
  { name: 'Libya', lat: 26.34, lon: 17.23 },
  { name: 'Sudan', lat: 12.86, lon: 30.21 },
  { name: 'Ethiopia', lat: 9.15, lon: 40.49 },
  { name: 'Tanzania', lat: -6.37, lon: 34.89 },
  { name: 'Angola', lat: -11.20, lon: 17.87 },
  { name: 'Mozambique', lat: -18.67, lon: 35.52 },
  { name: 'New Zealand', lat: -40.90, lon: 174.89 },
  { name: 'Pakistan', lat: 30.38, lon: 69.35 },
  { name: 'Iran', lat: 32.43, lon: 53.69 },
  { name: 'Iraq', lat: 33.22, lon: 43.68 },
  { name: 'Afghanistan', lat: 33.94, lon: 67.71 },
  { name: 'Kazakhstan', lat: 48.02, lon: 66.92 },
  { name: 'Mongolia', lat: 46.86, lon: 103.85 },
  { name: 'Myanmar', lat: 21.91, lon: 95.96 },
  { name: 'Malaysia', lat: 4.21, lon: 101.98 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Cuba', lat: 21.52, lon: -77.78 },
  { name: 'Greenland', lat: 71.71, lon: -42.60 },
  { name: 'Iceland', lat: 64.96, lon: -19.02 },
  { name: 'Ireland', lat: 53.14, lon: -7.69 },
  { name: 'Netherlands', lat: 52.13, lon: 5.29 },
  { name: 'Belgium', lat: 50.50, lon: 4.47 },
  { name: 'Switzerland', lat: 46.82, lon: 8.23 },
  { name: 'Austria', lat: 47.52, lon: 14.55 },
  { name: 'Czech Republic', lat: 49.82, lon: 15.47 },
  { name: 'Romania', lat: 45.94, lon: 24.97 },
  { name: 'Hungary', lat: 47.16, lon: 19.50 },
  { name: 'Bulgaria', lat: 42.73, lon: 25.49 },
  { name: 'Serbia', lat: 44.02, lon: 21.00 },
  { name: 'Croatia', lat: 45.10, lon: 15.20 },
  { name: 'Slovenia', lat: 46.12, lon: 14.82 },
  { name: 'Slovakia', lat: 48.67, lon: 19.70 },
  { name: 'Lithuania', lat: 55.17, lon: 23.88 },
  { name: 'Latvia', lat: 56.88, lon: 24.60 },
  { name: 'Estonia', lat: 58.60, lon: 25.01 },
  { name: 'Belarus', lat: 53.71, lon: 27.95 },
  { name: 'Georgia', lat: 42.32, lon: 43.36 },
  { name: 'Armenia', lat: 40.07, lon: 45.04 },
  { name: 'Azerbaijan', lat: 40.14, lon: 47.58 },
  { name: 'Uzbekistan', lat: 41.38, lon: 64.59 },
  { name: 'Turkmenistan', lat: 38.97, lon: 59.56 },
  { name: 'Tajikistan', lat: 38.86, lon: 71.28 },
  { name: 'Kyrgyzstan', lat: 41.20, lon: 74.77 },
  { name: 'Nepal', lat: 28.39, lon: 84.12 },
  { name: 'Bangladesh', lat: 23.68, lon: 90.36 },
  { name: 'Sri Lanka', lat: 7.87, lon: 80.77 },
  { name: 'Cambodia', lat: 12.57, lon: 104.99 },
  { name: 'Laos', lat: 19.86, lon: 101.69 },
  { name: 'North Korea', lat: 40.34, lon: 127.51 },
  { name: 'Papua New Guinea', lat: -6.31, lon: 143.96 },
  { name: 'Madagascar', lat: -18.77, lon: 46.87 },
  { name: 'Tunisia', lat: 33.89, lon: 9.54 },
  { name: 'Senegal', lat: 14.49, lon: -14.45 },
  { name: 'Ghana', lat: 7.95, lon: -1.02 },
  { name: 'Cameroon', lat: 7.37, lon: 12.35 },
  { name: 'DR Congo', lat: -4.04, lon: 21.76 },
  { name: 'Uganda', lat: 1.37, lon: 32.29 },
  { name: 'Zimbabwe', lat: -19.02, lon: 29.15 },
  { name: 'Botswana', lat: -22.33, lon: 24.68 },
  { name: 'Namibia', lat: -22.96, lon: 18.49 },
  { name: 'Zambia', lat: -13.13, lon: 27.85 },
  { name: 'Malawi', lat: -13.25, lon: 34.30 },
  { name: 'Somalia', lat: 5.15, lon: 46.19 },
  { name: 'Mali', lat: 17.57, lon: -3.99 },
  { name: 'Niger', lat: 17.61, lon: 8.08 },
  { name: 'Chad', lat: 15.45, lon: 18.73 },
  { name: 'Central African Republic', lat: 6.61, lon: 20.94 },
  { name: 'Gabon', lat: -0.80, lon: 11.61 },
  { name: 'Republic of Congo', lat: -0.23, lon: 15.83 },
  { name: 'Equatorial Guinea', lat: 1.65, lon: 10.27 },
  { name: 'São Tomé and Príncipe', lat: 0.19, lon: 6.61 },
  { name: 'Cape Verde', lat: 16.57, lon: -23.09 },
  { name: 'Guinea-Bissau', lat: 11.80, lon: -15.18 },
  { name: 'Guinea', lat: 9.94, lon: -9.69 },
  { name: 'Sierra Leone', lat: 8.46, lon: -11.78 },
  { name: 'Liberia', lat: 7.54, lon: -9.70 },
  { name: 'Ivory Coast', lat: 7.54, lon: -5.54 },
  { name: 'Burkina Faso', lat: 12.24, lon: -1.56 },
  { name: 'Togo', lat: 8.62, lon: 0.82 },
  { name: 'Benin', lat: 9.31, lon: 2.32 },
  { name: 'Mauritania', lat: 21.01, lon: -10.94 },
  { name: 'Western Sahara', lat: 24.22, lon: -12.89 },
  { name: 'Comoros', lat: -11.65, lon: 43.33 },
  { name: 'Djibouti', lat: 11.83, lon: 42.60 },
  { name: 'Eritrea', lat: 15.18, lon: 39.78 },
  { name: 'Rwanda', lat: -1.94, lon: 29.87 },
  { name: 'Burundi', lat: -3.38, lon: 29.92 },
  { name: 'Lesotho', lat: -29.61, lon: 28.23 },
  { name: 'Eswatini', lat: -26.52, lon: 31.47 },
  { name: 'Mauritius', lat: -20.35, lon: 57.55 },
  { name: 'Seychelles', lat: -4.68, lon: 55.49 },
  { name: 'Fiji', lat: -17.71, lon: 178.07 },
  { name: 'Solomon Islands', lat: -9.65, lon: 160.17 },
  { name: 'Vanuatu', lat: -15.38, lon: 166.96 },
  { name: 'Samoa', lat: -13.76, lon: -172.10 },
  { name: 'Tonga', lat: -21.18, lon: -175.20 },
  { name: 'Kiribati', lat: 1.42, lon: 173.00 },
  { name: 'Marshall Islands', lat: 7.12, lon: 171.21 },
  { name: 'Micronesia', lat: 7.45, lon: 150.55 },
  { name: 'Palau', lat: 7.51, lon: 134.58 },
  { name: 'Nauru', lat: -0.52, lon: 166.93 },
  { name: 'Tuvalu', lat: -7.11, lon: 177.64 },
  { name: 'Cook Islands', lat: -21.24, lon: -159.78 },
  { name: 'Niue', lat: -19.05, lon: -169.87 },
  { name: 'Tokelau', lat: -9.00, lon: -171.81 },
  { name: 'Wallis and Futuna', lat: -13.77, lon: -177.16 },
  { name: 'French Polynesia', lat: -17.68, lon: -149.44 },
  { name: 'New Caledonia', lat: -20.90, lon: 165.62 },
  { name: 'Norfolk Island', lat: -29.04, lon: 167.97 },
  { name: 'Christmas Island', lat: -10.45, lon: 105.69 },
  { name: 'Cocos Islands', lat: -12.17, lon: 96.88 },
  { name: 'Pitcairn Islands', lat: -25.07, lon: -130.10 },
  { name: 'Falkland Islands', lat: -51.79, lon: -59.52 },
  { name: 'South Georgia', lat: -54.43, lon: -36.50 },
  { name: 'Bouvet Island', lat: -54.43, lon: 3.40 },
  { name: 'Heard Island', lat: -53.11, lon: 72.52 },
  { name: 'British Antarctic Territory', lat: -67.50, lon: -55.00 },
  { name: 'Australian Antarctic Territory', lat: -67.50, lon: 105.00 },
  { name: 'Ross Dependency', lat: -77.85, lon: 166.67 },
  { name: 'Queen Maud Land', lat: -69.00, lon: 0.00 },
  { name: 'Adélie Land', lat: -66.67, lon: 140.00 },
  { name: 'Antarctica', lat: -82.86, lon: 135.00 }
];

// Create text texture using canvas
function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size based on text length
  canvas.width = 256;
  canvas.height = 64;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  ctx.font = '300 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // White text with slight blue tint
  ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

// Convert lat/lon to 3D position
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

export function createLabels() {
  const group = new THREE.Group();
  const labels = [];
  
  COUNTRIES.forEach(country => {
    // Create text texture
    const texture = createTextTexture(country.name);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.9
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    
    // Position on Earth surface (slightly above)
    const position = latLonToVector3(country.lat, country.lon, 1.02);
    sprite.position.copy(position);
    
    // Scale sprite
    sprite.scale.set(0.3, 0.075, 1);
    
    group.add(sprite);
    
    labels.push({
      sprite,
      material,
      country,
      position
    });
  });
  
  return {
    group,
    labels,
    update(camera) {
      // Update label visibility based on camera position
      labels.forEach(label => {
        // Get direction from Earth center to label
        const labelDir = label.position.clone().normalize();
        
        // Get direction from Earth center to camera
        const cameraDir = camera.position.clone().normalize();
        
        // Calculate dot product to determine visibility
        const dot = labelDir.dot(cameraDir);
        
        // Show label only if it's facing the camera (dot > 0.1)
        // and fade based on angle
        if (dot > 0.1) {
          label.material.opacity = Math.min(0.8, dot * 0.8);
          label.sprite.visible = true;
        } else {
          label.sprite.visible = false;
        }
      });
    }
  };
}
