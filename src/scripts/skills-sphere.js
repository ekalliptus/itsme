import * as THREE from 'three';
import { SKILLS_DATA } from '../data/skills.js';

export const THEME_COLORS = {
  dark: { background: 0x101b20, nodeColor: 0xffffff, textColor: 0xffffff, glowColor: 0x88d4c5, hoverGlow: 0x88d4c5 },
  light: { background: 0x101b20, nodeColor: 0xffffff, textColor: 0xffffff, glowColor: 0x88d4c5, hoverGlow: 0x88d4c5 }
};

export function getThemeColors(theme) { return THEME_COLORS.dark; }

export class SphereController {
  constructor(sphereGroup, options = {}) {
    this.sphereGroup = sphereGroup;
    this.options = { dragSensitivity: 0.005, momentumDecay: 0.95, idleTimeout: 3000, autoRotateSpeed: 0.002, ...options };
    this.isDragging = false;
    this.lastPosition = { x: 0, y: 0 };
    this.currentPosition = { x: 0, y: 0 };
    this.momentum = { x: 0, y: 0 };
    this.lastInteractionTime = 0;
    this.isHovering = false;
  }
  startDrag(x, y) {
    this.isDragging = true;
    this.lastPosition = { x, y };
    this.momentum = { x: 0, y: 0 };
    this.lastInteractionTime = Date.now();
  }
  updateDrag(x, y) {
    if (!this.isDragging || !this.sphereGroup) return;
    const deltaX = x - this.lastPosition.x;
    const deltaY = y - this.lastPosition.y;
    this.sphereGroup.rotation.y += deltaX * this.options.dragSensitivity;
    this.sphereGroup.rotation.x += deltaY * this.options.dragSensitivity;
    this.momentum.x = deltaY * this.options.dragSensitivity;
    this.momentum.y = deltaX * this.options.dragSensitivity;
    this.lastPosition = { x, y };
    this.lastInteractionTime = Date.now();
  }
  endDrag() {
    this.isDragging = false;
    this.lastInteractionTime = Date.now();
  }
  applyMomentumDecay() {
    this.momentum.x *= this.options.momentumDecay;
    this.momentum.y *= this.options.momentumDecay;
    if (Math.abs(this.momentum.x) < 0.0001) this.momentum.x = 0;
    if (Math.abs(this.momentum.y) < 0.0001) this.momentum.y = 0;
  }
  isAutoRotating() {
    if (this.isDragging || this.isHovering) return false;
    return (Date.now() - this.lastInteractionTime >= this.options.idleTimeout) && Math.abs(this.momentum.x) < 0.0001 && Math.abs(this.momentum.y) < 0.0001;
  }
  setHovering(hovering) {
    const wasHovering = this.isHovering;
    this.isHovering = hovering;
    if (hovering) {
      this.lastInteractionTime = Date.now();
    } else if (wasHovering && !hovering) {
      this.lastInteractionTime = Date.now() - this.options.idleTimeout - 100;
    }
  }
  update(deltaTime = 0) {
    if (!this.sphereGroup || this.isDragging) return;
    if (Math.abs(this.momentum.x) > 0.0001 || Math.abs(this.momentum.y) > 0.0001) {
      this.sphereGroup.rotation.x += this.momentum.x;
      this.sphereGroup.rotation.y += this.momentum.y;
      this.applyMomentumDecay();
    } else if (this.isAutoRotating()) {
      this.sphereGroup.rotation.y += this.options.autoRotateSpeed;
    }
  }
}

export function distributeOnSphere(count, radius) {
  if (count <= 0 || radius <= 0) return [];
  const positions = [];
  const angleIncrement = Math.PI * 2 * ((1 + Math.sqrt(5)) / 2);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1 || 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = angleIncrement * i;
    positions.push({ x: Math.cos(theta) * radiusAtY * radius, y: y * radius, z: Math.sin(theta) * radiusAtY * radius });
  }
  return positions;
}

export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export class SkillsSphere {
  constructor(container, skills = SKILLS_DATA, options = {}) {
    this.container = container;
    this.skills = skills;
    this.options = { radius: 200, autoRotateSpeed: 0.002, dragSensitivity: 0.005, momentumDecay: 0.95, hoverScale: 1.2, idleTimeout: 3000, mobileRadius: 150, mobileBreakpoint: 768, ...options };
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphereGroup = null;
    this.nodes = [];
    this.raycaster = null;
    this.controller = null;
    this.isInitialized = false;
    this.isPaused = false;
    this.isDragging = false;
    this.hoveredNode = null;
    this.isVisible = true;
    this.mouse = { x: 0, y: 0 };
    this.animationFrameId = null;
    this.intersectionObserver = null;
    this.boundHandlers = {};
    this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  async init() {
    if (!this.container || !checkWebGLSupport()) { this.showFallback(); return; }
    try {
      this.isInitialized = true;
      await this.initThree();
    } catch (error) {
      this.isInitialized = false;
      this.showFallback();
    }
  }

  async initThree() {
    const canvas = this.container.querySelector('#skills-sphere-canvas');
    if (!canvas) return;
    this.container.classList.add('loading');
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.scene = new THREE.Scene();
    this.currentRadius = window.innerWidth < this.options.mobileBreakpoint ? this.options.mobileRadius : this.options.radius;
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = this.currentRadius * 2.5;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.sphereGroup = new THREE.Group();
    this.scene.add(this.sphereGroup);
    this.raycaster = new THREE.Raycaster();
    this.controller = new SphereController(this.sphereGroup, this.options);
    
    const textureMap = await this.preloadTextures();
    if (!this.isInitialized) {
      textureMap.forEach(texture => texture?.dispose());
      return;
    }
    
    this.createNodes(textureMap);
    this.container.classList.remove('loading');
    this.setupEventListeners();
    this.setupVisibilityObserver();
    
    if (this.mediaQuery.matches) {
      this.isPaused = true;
      this.renderer.render(this.scene, this.camera);
    } else {
      this.animate();
    }
  }

  async preloadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const textureMap = new Map();
    await Promise.all(this.skills.map(skill => new Promise(resolve => {
      textureLoader.load(skill.icon, texture => { texture.colorSpace = THREE.SRGBColorSpace; textureMap.set(skill.icon, texture); resolve(); }, undefined, () => { textureMap.set(skill.icon, null); resolve(); });
    })));
    return textureMap;
  }

  createNodes(textureMap) {
    if (!this.sphereGroup) return;
    const positions = distributeOnSphere(this.skills.length, this.currentRadius);
    const nodeSize = this.currentRadius * 0.25;
    this.skills.forEach((skill, index) => {
      const texture = textureMap.get(skill.icon);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture || null, color: texture ? 0xffffff : 0xb1c0c2, transparent: true }));
      sprite.position.set(positions[index].x, positions[index].y, positions[index].z);
      sprite.scale.set(nodeSize, nodeSize, 1);
      sprite.userData = { skill, baseScale: nodeSize, index };
      this.sphereGroup.add(sprite);
      this.nodes.push(sprite);
    });
  }

  setupEventListeners() {
    const canvas = this.container.querySelector('#skills-sphere-canvas');
    if (!canvas) return;
    const bind = (el, ev, handler) => { el.addEventListener(ev, handler, { passive: ev.startsWith('touch') }); this.boundHandlers[`${ev}_${Math.random()}`] = { element: el, event: ev, handler }; };
    
    bind(canvas, 'mousedown', e => { e.preventDefault(); this.controller?.startDrag(e.clientX, e.clientY); this.isDragging = true; });
    bind(canvas, 'mousemove', e => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (this.controller?.isDragging) this.controller.updateDrag(e.clientX, e.clientY);
    });
    bind(window, 'mouseup', () => { this.controller?.endDrag(); this.isDragging = false; });
    
    bind(canvas, 'touchstart', e => { if (e.touches.length === 1) { this.controller?.startDrag(e.touches[0].clientX, e.touches[0].clientY); this.isDragging = true; } });
    bind(canvas, 'touchmove', e => {
      if (e.touches.length === 1) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.touches[0].clientY - rect.top) / rect.height) * 2 + 1;
        if (this.controller?.isDragging) this.controller.updateDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    });
    bind(window, 'touchend', () => { this.controller?.endDrag(); this.isDragging = false; });
    bind(window, 'resize', () => this.handleResize());
  }

  setupVisibilityObserver() {
    if (!this.container || typeof IntersectionObserver === 'undefined') return;
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.isVisible = entries[0].isIntersecting;
      if (!this.isVisible) this.pause();
      else if (!this.mediaQuery.matches) this.resume();
    }, { threshold: 0.1 });
    this.intersectionObserver.observe(this.container);
  }

  handleResize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    const newRadius = window.innerWidth < this.options.mobileBreakpoint ? this.options.mobileRadius : this.options.radius;
    if (Math.abs(newRadius - this.currentRadius) > 1) {
      this.currentRadius = newRadius;
      const positions = distributeOnSphere(this.nodes.length, newRadius);
      const nodeSize = newRadius * 0.25;
      this.nodes.forEach((node, i) => {
        if (positions[i]) {
          node.position.set(positions[i].x, positions[i].y, positions[i].z);
          node.userData.baseScale = nodeSize;
          if (node !== this.hoveredNode) node.scale.set(nodeSize, nodeSize, 1);
          else node.scale.set(nodeSize * this.options.hoverScale, nodeSize * this.options.hoverScale, 1);
        }
      });
      this.camera.position.z = newRadius * 2.5;
    }
    if (this.mediaQuery.matches || this.isPaused) this.renderer.render(this.scene, this.camera);
  }

  animate() {
    if (this.isPaused || !this.isInitialized) return;
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    if (this.controller) this.controller.update();
    if (this.camera && this.nodes.length) {
      this.nodes.forEach(node => { node.quaternion.copy(this.camera.quaternion); });
    }
    if (!this.isDragging) {
      if (this.raycaster && this.camera && this.nodes.length) {
        this.raycaster.setFromCamera(new THREE.Vector2(this.mouse.x, this.mouse.y), this.camera);
        const intersects = this.raycaster.intersectObjects(this.nodes);
        if (intersects.length > 0) {
          const hovered = intersects[0].object;
          if (this.hoveredNode !== hovered) {
            this.clearHoverEffect();
            this.hoveredNode = hovered;
            const s = (hovered.userData.baseScale || 1) * this.options.hoverScale;
            hovered.scale.set(s, s, 1);
            if (hovered.material) { hovered.material.opacity = 1; if (hovered.material.map) hovered.material.color.setHex(0xffffff); }
            if (this.controller) this.controller.setHovering(true);
          }
        } else if (this.hoveredNode) {
          this.clearHoverEffect();
          this.hoveredNode = null;
          if (this.controller) this.controller.setHovering(false);
        }
      }
    }
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }

  clearHoverEffect() {
    if (!this.hoveredNode || !this.hoveredNode.userData) return;
    const s = this.hoveredNode.userData.baseScale || 1;
    this.hoveredNode.scale.set(s, s, 1);
    if (this.hoveredNode.material) { this.hoveredNode.material.opacity = 1; if (this.hoveredNode.material.map) this.hoveredNode.material.color.setHex(0xffffff); }
  }

  pause() { this.isPaused = true; if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; } }
  resume() { if (this.isPaused && this.isInitialized && !this.mediaQuery.matches) { this.isPaused = false; this.animate(); } }
  showFallback() { const canvas = this.container.querySelector('#skills-sphere-canvas'); if (canvas) canvas.style.display = 'none'; }

  dispose() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    Object.values(this.boundHandlers).forEach(({ element, event, handler }) => { if (element) element.removeEventListener(event, handler); });
    this.boundHandlers = {};
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    this.nodes.forEach(node => {
      if (node.material) { if (node.material.map) node.material.map.dispose(); node.material.dispose(); }
      if (node.geometry) node.geometry.dispose();
    });
    this.nodes = [];
    if (this.scene) { while (this.scene.children.length > 0) this.scene.remove(this.scene.children[0]); this.scene = null; }
    this.camera = null;
    this.sphereGroup = null;
    this.raycaster = null;
    this.controller = null;
    this.isInitialized = false;
  }
}

export function initSkillsSphere(containerId = 'skills-sphere-container') {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const sphere = new SkillsSphere(container);
  sphere.init();
  return sphere;
}

export default SkillsSphere;
