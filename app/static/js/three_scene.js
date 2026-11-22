/**
 * 3D Holographic Neural Core & Particle Field
 * Built with Three.js for AI PDF Chatbot 3D
 */

class HologramScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 24;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    this.isQuerying = false;

    this.initLights();
    this.initCore();
    this.initParticles();
    this.initRings();
    this.addEventListeners();
    this.animate();
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.5);
    this.scene.add(ambientLight);

    this.pointLight1 = new THREE.PointLight(0x38bdf8, 3, 50);
    this.pointLight1.position.set(10, 15, 12);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0xc084fc, 2.5, 50);
    this.pointLight2.position.set(-12, -10, -8);
    this.scene.add(this.pointLight2);
  }

  initCore() {
    this.coreGroup = new THREE.Group();

    // Inner glowing icosahedron (Neural Core)
    const geometry = new THREE.IcosahedronGeometry(4.5, 1);
    const wireframeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2,
      metalness: 0.9
    });
    this.coreMesh = new THREE.Mesh(geometry, wireframeMat);
    this.coreGroup.add(this.coreMesh);

    // Inner glowing sphere
    const innerGeo = new THREE.SphereGeometry(2.8, 32, 32);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.35
    });
    this.innerSphere = new THREE.Mesh(innerGeo, innerMat);
    this.coreGroup.add(this.innerSphere);

    // Document Hologram Planes (Mini 3D cards orbiting inside)
    const cardGeo = new THREE.PlaneGeometry(1.6, 2.2);
    const cardMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });

    for (let i = 0; i < 4; i++) {
      const card = new THREE.Mesh(cardGeo, cardMat);
      const angle = (i / 4) * Math.PI * 2;
      card.position.set(Math.cos(angle) * 5.5, (i % 2 === 0 ? 1 : -1) * 1.5, Math.sin(angle) * 5.5);
      card.rotation.y = -angle;
      this.coreGroup.add(card);
    }

    this.scene.add(this.coreGroup);
  }

  initRings() {
    // Gyroscopic Orbit Rings
    const ringGeo = new THREE.TorusGeometry(7.2, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4
    });

    this.ring1 = new THREE.Mesh(ringGeo, ringMat);
    this.ring1.rotation.x = Math.PI / 3;
    this.coreGroup.add(this.ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.3
    });
    this.ring2 = new THREE.Mesh(ringGeo, ringMat2);
    this.ring2.rotation.y = Math.PI / 4;
    this.coreGroup.add(this.ring2);
  }

  initParticles() {
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x38bdf8);
    const color2 = new THREE.Color(0x818cf8);
    const color3 = new THREE.Color(0xc084fc);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Spread in sphere
      const radius = 10 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);

      const chosenColor = Math.random() > 0.6 ? color3 : (Math.random() > 0.3 ? color1 : color2);
      colors[i] = chosenColor.r;
      colors[i + 1] = chosenColor.g;
      colors[i + 2] = chosenColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  addEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  setQueryingState(active) {
    this.isQuerying = active;
    if (active) {
      this.pointLight1.color.setHex(0xc084fc);
      this.coreMesh.material.color.setHex(0xc084fc);
    } else {
      this.pointLight1.color.setHex(0x38bdf8);
      this.coreMesh.material.color.setHex(0x38bdf8);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Smooth mouse interpolation
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    const speed = this.isQuerying ? 0.018 : 0.005;

    if (this.coreGroup) {
      this.coreGroup.rotation.y += speed;
      this.coreGroup.rotation.x = this.mouseY * 0.35;
      this.coreGroup.position.x = this.mouseX * 2;
      this.coreGroup.position.y = -this.mouseY * 1.5;

      if (this.ring1) this.ring1.rotation.z += 0.008;
      if (this.ring2) this.ring2.rotation.x += 0.006;
    }

    if (this.particles) {
      this.particles.rotation.y -= speed * 0.5;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Global scene instance attached on DOM load
window.hologramScene = null;
document.addEventListener('DOMContentLoaded', () => {
  window.hologramScene = new HologramScene('three-canvas');
});
