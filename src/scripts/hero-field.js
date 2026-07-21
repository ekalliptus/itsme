// src/scripts/hero-field.js
// Interactive 3D particle field for the hero - original work.
// A receding grid of points animated by layered waves; the cursor projects
// onto the plane and pushes a gaussian ripple through it. Monochrome base
// with a periwinkle accent that lights up by height + cursor proximity.

import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2  uMouse;        // cursor position in the field's XZ plane
  uniform float uMouseStrength;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aScale;      // per-point size variation
  attribute float aOffset;     // per-point phase offset (organic motion)

  varying float vIntensity;

  void main() {
    vec3 pos = position;

    // Layered travelling waves
    float w = 0.0;
    w += sin(pos.x * 0.32 + uTime * 0.75 + aOffset) * 0.55;
    w += sin(pos.z * 0.46 + uTime * 0.55) * 0.45;
    w += sin((pos.x + pos.z) * 0.18 + uTime * 0.40) * 0.40;

    // Gaussian ripple following the cursor
    float d = distance(pos.xz, uMouse);
    float ripple = exp(-d * d * 0.009) * uMouseStrength;
    w += ripple * 4.6;

    pos.y += w;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective size attenuation
    gl_PointSize = uSize * aScale * uPixelRatio * (280.0 / -mvPosition.z);

    vIntensity = clamp((w + 0.8) * 0.34 + ripple * 0.9, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorBase;
  uniform vec3 uColorAccent;

  varying float vIntensity;

  void main() {
    // Soft circular point
    vec2 c = gl_PointCoord - vec2(0.5);
    float dist = length(c);
    if (dist > 0.5) discard;
    float edge = smoothstep(0.5, 0.0, dist);

    vec3 color = mix(uColorBase, uColorAccent, vIntensity);
    float alpha = edge * (0.30 + vIntensity * 0.70);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class HeroField {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.points = null;
    this.material = null;
    this.geometry = null;
    this.raf = null;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Pointer state (NDC) + eased world target
    this.pointerNDC = new THREE.Vector2(0, 0);
    this.pointerActive = 0;          // eased 0..1
    this.mouseWorld = new THREE.Vector2(0, 0);
    this.mouseTarget = new THREE.Vector2(0, 0);

    this.baseCam = new THREE.Vector3(0, 20, 38);
    this.paused = false;
    this.disposed = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._onResize = this._onResize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onContextLost = this._onContextLost.bind(this);
    this._tick = this._tick.bind(this);
  }

  init() {
    const ok = this._initRenderer();
    if (!ok) return false;

    this.scene = new THREE.Scene();

    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 200);
    this.camera.position.copy(this.baseCam);
    this.camera.lookAt(0, -2, -4);

    this._buildField();

    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerleave', this._onPointerLeave);
    this.canvas.addEventListener('webglcontextlost', this._onContextLost);

    this._setupVisibility();

    if (this.reducedMotion) {
      this._renderOnce();      // single static frame, no loop
    } else {
      this.raf = requestAnimationFrame(this._tick);
    }
    return true;
  }

  _initRenderer() {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    if (!context) return false;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'default',
      });
    } catch (e) {
      return false;
    }
    if (!this.renderer.getContext()) return false;

    this.renderer.setClearColor(0x000000, 0);
    this._resizeRenderer();
    return true;
  }

  _buildField() {
    // Grid sized down on small screens for performance
    const small = window.innerWidth < 768;
    const cols = small ? 80 : 120;
    const rows = small ? 48 : 70;
    const spacing = 0.7;

    const count = cols * rows;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const offsets = new Float32Array(count);

    const halfW = (cols - 1) * spacing * 0.5;
    const halfD = (rows - 1) * spacing * 0.5;

    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions[i * 3]     = c * spacing - halfW;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = r * spacing - halfD;
        // deterministic pseudo-random - no Math.random (keeps SSR/replay safe)
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        const rnd = seed - Math.floor(seed);
        scales[i] = 0.6 + rnd * 0.9;
        offsets[i] = rnd * Math.PI * 2;
        i++;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    this.geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime:          { value: 0 },
        uMouse:         { value: new THREE.Vector2(0, 0) },
        uMouseStrength: { value: 0 },
        uSize:          { value: 2.2 },
        uPixelRatio:    { value: Math.min(window.devicePixelRatio, 2) },
        uColorBase:     { value: new THREE.Color(0x4a4f63) },
        uColorAccent:   { value: new THREE.Color(0x8395f2) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  _onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Ignore movement well outside the hero canvas
    if (e.clientY > rect.bottom + 40) return;
    this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerActive = 1;
  }

  _onPointerLeave() {
    this.pointerActive = 0;
  }

  _onContextLost(event) {
    event.preventDefault();
    this.pause();
  }

  _updatePointer() {
    // Project cursor onto the ground plane to get its XZ in field space
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
      this.mouseTarget.set(hit.x, hit.z);
    }
    // Ease world position + strength
    this.mouseWorld.lerp(this.mouseTarget, 0.08);
    const m = this.material.uniforms;
    m.uMouse.value.copy(this.mouseWorld);
    m.uMouseStrength.value += (this.pointerActive - m.uMouseStrength.value) * 0.06;

    // Subtle camera parallax toward cursor
    const targetX = this.baseCam.x + this.pointerNDC.x * 5.0;
    const targetY = this.baseCam.y + this.pointerNDC.y * 2.4;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.04;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, -2, -4);
  }

  _renderOnce() {
    this.material.uniforms.uTime.value = 2.0; // a pleasant frozen pose
    this._updatePointer();
    this.renderer.render(this.scene, this.camera);
  }

  _tick() {
    if (this.disposed || this.paused) return;
    this.raf = requestAnimationFrame(this._tick);

    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    this._updatePointer();
    this.renderer.render(this.scene, this.camera);
  }

  _resizeRenderer() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
  }

  _onResize() {
    if (!this.renderer || !this.camera) return;
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._resizeRenderer();
    this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    if (this.reducedMotion) this._renderOnce();
  }

  _setupVisibility() {
    if (typeof IntersectionObserver === 'undefined') return;
    this.io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) this.resume();
        else this.pause();
      });
    }, { threshold: 0.01 });
    this.io.observe(this.canvas);
  }

  pause() {
    this.paused = true;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
  }

  resume() {
    if (this.disposed || this.reducedMotion) return;
    if (!this.paused) return;
    this.paused = false;
    this.clock.getDelta(); // discard idle gap
    this.raf = requestAnimationFrame(this._tick);
  }

  dispose() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.io) this.io.disconnect();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerleave', this._onPointerLeave);
    this.canvas.removeEventListener('webglcontextlost', this._onContextLost);
    this.geometry?.dispose();
    this.material?.dispose();
    this.renderer?.dispose();
    this.scene = null;
    this.camera = null;
    this.points = null;
  }
}

export function initHeroField(canvas) {
  if (!canvas) return null;
  const field = new HeroField(canvas);
  const ok = field.init();
  return ok ? field : null;
}
