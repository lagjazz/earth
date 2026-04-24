import * as THREE from 'three'

export default class CloudLayer {
  constructor(radius = 5) {
    this.radius = radius

    this.group = new THREE.Group()

    this.rotationSpeed = 0.0015
    this.driftSpeed = 0.0003

    this._init()
  }

  _init() {
    const loader = new THREE.TextureLoader()

    const cloudTexture = loader.load('/textures/clouds.png')

    // === 主云层 ===
    const geometry = new THREE.SphereGeometry(
      this.radius + 0.15,
      64,
      64
    )

    const material = new THREE.MeshLambertMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    })

    this.cloudMesh = new THREE.Mesh(geometry, material)
    this.group.add(this.cloudMesh)

    // === 第二层云（制造“飘动错位感”）===
    const geometry2 = new THREE.SphereGeometry(
      this.radius + 0.18,
      64,
      64
    )

    const material2 = new THREE.MeshLambertMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })

    this.cloudMesh2 = new THREE.Mesh(geometry2, material2)
    this.group.add(this.cloudMesh2)

    // 初始随机旋转（更自然）
    this.cloudMesh.rotation.y = Math.random() * Math.PI
    this.cloudMesh2.rotation.y = Math.random() * Math.PI
  }

  // === 更新动画 ===
  update(earthRotationY = 0) {
    // 🌍 跟随地球整体旋转
    this.group.rotation.y = earthRotationY

    // ☁️ 云层自身缓慢流动
    this.cloudMesh.rotation.y += this.rotationSpeed
    this.cloudMesh2.rotation.y -= this.rotationSpeed * 0.6

    // ☁️ 添加轻微“漂移”（关键感觉）
    this.cloudMesh.rotation.x += this.driftSpeed
    this.cloudMesh2.rotation.z += this.driftSpeed * 0.5
  }

  // === 添加到场景 ===
  addTo(scene) {
    scene.add(this.group)
  }
}
