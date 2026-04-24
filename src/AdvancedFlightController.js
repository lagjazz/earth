import * as THREE from 'three';

// === 飞行控制器（完整版）===
class AdvancedFlightController {
  constructor(curve, radius) {
    this.curve = curve
    this.radius = radius

    this.t = 0
    this.direction = 1

    this.prevForward = new THREE.Vector3(0, 0, 1)
    this.prevUp = new THREE.Vector3(0, 1, 0)
    this.prevRight = new THREE.Vector3(1, 0, 0)

    this.matrix = new THREE.Matrix4()
    this.quaternion = new THREE.Quaternion()
  }

  update(plane) {
    // === ✨ 非线性速度 ===
    const speedFactor = Math.sin(Math.PI * this.t)
    this.t += (0.0005 + speedFactor * 0.001) * this.direction

    if (this.t >= 1 || this.t <= 0) {
      this.direction *= -1
      this.t = THREE.MathUtils.clamp(this.t, 0, 1)
    }

    const pos = this.curve.getPointAt(this.t)
    const nextT = Math.min(this.t + 0.001, 1)
    const nextPos = this.curve.getPointAt(nextT)

    // === 法线 ===
    let up = pos.clone().normalize()

    // === forward ===
    let forward = nextPos.clone().sub(pos).normalize()

    // === 连续性修复 ===
    if (forward.dot(this.prevForward) < 0) forward.negate()
    if (up.dot(this.prevUp) < 0) up.negate()

    // === 极区保护 ===
    if (Math.abs(forward.dot(up)) > 0.98) {
      forward = new THREE.Vector3()
        .crossVectors(up, this.prevRight)
        .normalize()
    }

    // === 初始 right ===
    let right = new THREE.Vector3().crossVectors(forward, up).normalize()

    // === ✨ 转弯侧倾（banking）===
    const turnAxis = new THREE.Vector3().crossVectors(this.prevForward, forward)
    const turnStrength = turnAxis.length()

    const maxBank = Math.PI / 6
    const bankAngle =
      THREE.MathUtils.clamp(turnStrength * 8, -1, 1) * maxBank

    const bankQuat = new THREE.Quaternion()
    bankQuat.setFromAxisAngle(forward, bankAngle)

    right.applyQuaternion(bankQuat)
    up.applyQuaternion(bankQuat)

    // === 正交化 ===
    right.normalize()
    up = new THREE.Vector3().crossVectors(right, forward).normalize()

    // === ✨ pitch（抬头/压头）===
    const heightNow = pos.length()
    const heightNext = nextPos.length()
    const climbRate = heightNext - heightNow

    const pitchAngle = THREE.MathUtils.clamp(climbRate * 5, -0.3, 0.3)

    const pitchQuat = new THREE.Quaternion()
    pitchQuat.setFromAxisAngle(right, pitchAngle)

    forward.applyQuaternion(pitchQuat)
    up.applyQuaternion(pitchQuat)

    // === 构建旋转 ===
    this.matrix.makeBasis(right, up, forward)
    this.quaternion.setFromRotationMatrix(this.matrix)

    plane.quaternion.slerp(this.quaternion, 0.1)

    // === ✨ 高度变化（起飞/降落）===
    const height = 0.2 + Math.sin(Math.PI * this.t) * 0.8
    const finalPos = pos.clone().normalize().multiplyScalar(this.radius + height)

    plane.position.copy(finalPos)

    // === 保存 ===
    this.prevForward.copy(forward)
    this.prevUp.copy(up)
    this.prevRight.copy(right)
  }
}
