import * as THREE from 'three';
import { SKILLS_DATA } from '../data/skills.js';

/**
 * 3D Skills Sphere - Interactive 3D visualization of technical skills
 * Uses Three.js to render skill icons in a rotating sphere formation
 *
 * @module skills-sphere
 */

/**
 * Theme color configuration for dark and light modes
 * Defines colors for sphere background, node text, and glow effects
 *
 * @constant {Object} THEME_COLORS
 */
export const THEME_COLORS = {
  dark: {
    background: 0x111111,      // Dark background (transparent in actual use)
    nodeColor: 0xffffff,       // Light/white icons for dark mode
    textColor: 0xffffff,       // Light text for dark mode
    glowColor: 0x8395f2,       // Periwinkle accent glow
    hoverGlow: 0x8395f2        // Hover glow color
  },
  light: {
    background: 0xffffff,      // Light background (transparent in actual use)
    nodeColor: 0x333333,       // Dark icons for light mode
    textColor: 0x333333,       // Dark text for light mode
    glowColor: 0x8395f2,       // Periwinkle accent glow
    hoverGlow: 0x8395f2        // Hover glow color
  }
};

/**
 * Get theme colors for a given theme
 * @param {string} theme - 'dark' or 'light'
 * @returns {Object} Theme color configuration
 */
export function getThemeColors(theme) {
  return THEME_COLORS[theme] || THEME_COLORS.dark;
}

/**
 * SphereController - Handles drag interaction and rotation control for the sphere
 * Manages drag start, update, end, and calculates rotation delta from mouse movement
 */
export class SphereController {
  /**
   * @param {THREE.Group} sphereGroup - Three.js Group containing skill nodes
   * @param {Object} options - Configuration options
   */
  constructor(sphereGroup, options = {}) {
    this.sphereGroup = sphereGroup;
    this.options = {
      dragSensitivity: 0.005,    // Mouse movement to rotation ratio
      momentumDecay: 0.95,       // Momentum reduction per frame (0-1)
      idleTimeout: 3000,         // Time before auto-rotate resumes (ms)
      autoRotateSpeed: 0.002,    // Radians per frame for auto-rotation
      ...options
    };

    // Drag state
    this.isDragging = false;
    this.lastPosition = { x: 0, y: 0 };
    this.currentPosition = { x: 0, y: 0 };

    // Momentum state
    this.momentum = { x: 0, y: 0 };

    // Auto-rotation state
    this.lastInteractionTime = 0;
    this.isHovering = false;
  }

  /**
   * Begin drag interaction from a position
   * @param {number} x - X coordinate (screen space)
   * @param {number} y - Y coordinate (screen space)
   */
  startDrag(x, y) {
    this.isDragging = true;
    this.lastPosition = { x, y };
    this.currentPosition = { x, y };
    // Reset momentum when starting a new drag
    this.momentum = { x: 0, y: 0 };
    this.lastInteractionTime = Date.now();
  }

  /**
   * Update rotation based on drag movement delta
   * Applies rotation proportionally: rotation.y += deltaX * sensitivity, rotation.x += deltaY * sensitivity
   * @param {number} x - Current X coordinate (screen space)
   * @param {number} y - Current Y coordinate (screen space)
   */
  updateDrag(x, y) {
    if (!this.isDragging || !this.sphereGroup) return;

    // Calculate delta from last position
    const deltaX = x - this.lastPosition.x;
    const deltaY = y - this.lastPosition.y;

    // Apply rotation based on drag sensitivity
    // Horizontal drag (deltaX) rotates around Y-axis
    // Vertical drag (deltaY) rotates around X-axis
    this.sphereGroup.rotation.y += deltaX * this.options.dragSensitivity;
    this.sphereGroup.rotation.x += deltaY * this.options.dragSensitivity;

    // Store momentum for when drag ends (based on recent movement)
    this.momentum.x = deltaY * this.options.dragSensitivity;
    this.momentum.y = deltaX * this.options.dragSensitivity;

    // Update last position
    this.lastPosition = { x, y };
    this.lastInteractionTime = Date.now();
  }

  /**
   * End drag interaction and apply momentum
   */
  endDrag() {
    this.isDragging = false;
    this.lastInteractionTime = Date.now();
    // Momentum is already set from the last updateDrag call
  }

  /**
   * Apply momentum decay - reduces momentum each frame
   * Formula: momentum = momentum * decayFactor
   */
  applyMomentumDecay() {
    this.momentum.x *= this.options.momentumDecay;
    this.momentum.y *= this.options.momentumDecay;

    // Stop momentum when it becomes negligible
    if (Math.abs(this.momentum.x) < 0.0001) this.momentum.x = 0;
    if (Math.abs(this.momentum.y) < 0.0001) this.momentum.y = 0;
  }

  /**
   * Check if sphere should be auto-rotating
   * Auto-rotation resumes after idle timeout when not dragging and not hovering
   * @returns {boolean}
   */
  isAutoRotating() {
    if (this.isDragging || this.isHovering) return false;

    const timeSinceInteraction = Date.now() - this.lastInteractionTime;
    const hasMomentum = Math.abs(this.momentum.x) > 0.0001 || Math.abs(this.momentum.y) > 0.0001;

    // Auto-rotate when idle timeout exceeded and no significant momentum
    return timeSinceInteraction >= this.options.idleTimeout && !hasMomentum;
  }

  /**
   * Set hover state - pauses auto-rotation when hovering
   * @param {boolean} hovering - Whether a node is being hovered
   */
  setHovering(hovering) {
    const wasHovering = this.isHovering;
    this.isHovering = hovering;

    if (hovering) {
      // When starting to hover, record the time
      this.lastInteractionTime = Date.now();
    } else if (wasHovering && !hovering) {
      // When hover ends, reset the interaction time to allow immediate auto-rotate
      // Set to a time in the past so idle timeout is already exceeded
      this.lastInteractionTime = Date.now() - this.options.idleTimeout - 100;
    }
  }

  /**
   * Update method called each frame
   * Handles momentum application and auto-rotation
   * @param {number} deltaTime - Time since last frame (optional, for future use)
   */
  update(deltaTime = 0) {
    if (!this.sphereGroup) return;

    if (this.isDragging) {
      // During drag, rotation is handled by updateDrag
      return;
    }

    // Apply momentum if not dragging
    if (Math.abs(this.momentum.x) > 0.0001 || Math.abs(this.momentum.y) > 0.0001) {
      this.sphereGroup.rotation.x += this.momentum.x;
      this.sphereGroup.rotation.y += this.momentum.y;
      this.applyMomentumDecay();
    } else if (this.isAutoRotating()) {
      // Auto-rotate around Y-axis only
      this.sphereGroup.rotation.y += this.options.autoRotateSpeed;
    }
  }

  /**
   * Get current momentum values
   * @returns {{x: number, y: number}}
   */
  getMomentum() {
    return { ...this.momentum };
  }

  /**
   * Get current rotation values from sphere group
   * @returns {{x: number, y: number, z: number}|null}
   */
  getRotation() {
    if (!this.sphereGroup) return null;
    return {
      x: this.sphereGroup.rotation.x,
      y: this.sphereGroup.rotation.y,
      z: this.sphereGroup.rotation.z
    };
  }
}

/**
 * Distribute points evenly on a sphere surface using Fibonacci sphere algorithm
 * This algorithm provides near-optimal distribution of points on a sphere
 *
 * @param {number} count - Number of points to distribute
 * @param {number} radius - Radius of the sphere
 * @returns {Array<{x: number, y: number, z: number}>} Array of 3D positions
 */
export function distributeOnSphere(count, radius) {
  if (count <= 0 || radius <= 0) {
    return [];
  }

  const positions = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2; // φ ≈ 1.618
  const angleIncrement = Math.PI * 2 * goldenRatio;

  for (let i = 0; i < count; i++) {
    // Calculate y coordinate: evenly spaced from -1 to 1
    const y = 1 - (i / (count - 1 || 1)) * 2;

    // Calculate radius at this y level (circle of latitude)
    const radiusAtY = Math.sqrt(1 - y * y);

    // Calculate angle around the y-axis using golden ratio
    const theta = angleIncrement * i;

    // Convert to Cartesian coordinates
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions.push({
      x: x * radius,
      y: y * radius,
      z: z * radius
    });
  }

  return positions;
}

/**
 * Check if WebGL is supported in the browser
 * @returns {boolean}
 */
export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Calculate responsive radius based on viewport width
 * Returns mobileRadius for viewports < breakpoint, otherwise desktopRadius
 *
 * @param {number} viewportWidth - Current viewport width in pixels
 * @param {number} desktopRadius - Radius for desktop viewports (default 200)
 * @param {number} mobileRadius - Radius for mobile viewports (default 150)
 * @param {number} breakpoint - Viewport width breakpoint (default 768)
 * @returns {number} The appropriate radius for the viewport
 */
export function calculateResponsiveRadius(viewportWidth, desktopRadius = 200, mobileRadius = 150, breakpoint = 768) {
  return viewportWidth < breakpoint ? mobileRadius : desktopRadius;
}

/**
 * Determine if rendering should be paused based on visibility
 * When element is not visible, rendering should be paused to save resources
 *
 * @param {boolean} isVisible - Whether the element is currently visible
 * @returns {boolean} True if rendering should be paused (element not visible)
 */
export function shouldPauseRendering(isVisible) {
  return !isVisible;
}

/**
 * Calculate hover scale for a node
 * @param {number} baseScale - The base scale of the node
 * @param {number} hoverScaleFactor - The hover scale multiplier (default 1.2)
 * @returns {number} The scaled value
 */
export function calculateHoverScale(baseScale, hoverScaleFactor = 1.2) {
  return baseScale * hoverScaleFactor;
}

/**
 * Check if a node's quaternion is facing the camera
 * Used for testing billboard orientation
 * @param {Object} nodeQuaternion - The node's quaternion {x, y, z, w}
 * @param {Object} cameraQuaternion - The camera's quaternion {x, y, z, w}
 * @param {number} tolerance - Angular tolerance in radians (default 0.01)
 * @returns {boolean} True if the node is facing the camera within tolerance
 */
export function isBillboardFacingCamera(nodeQuaternion, cameraQuaternion, tolerance = 0.01) {
  // Calculate the dot product of the two quaternions
  // If they're the same, dot product = 1
  const dot = Math.abs(
    nodeQuaternion.x * cameraQuaternion.x +
    nodeQuaternion.y * cameraQuaternion.y +
    nodeQuaternion.z * cameraQuaternion.z +
    nodeQuaternion.w * cameraQuaternion.w
  );

  // Convert tolerance from radians to quaternion dot product threshold
  // For small angles, the relationship is approximately: angle ≈ 2 * acos(dot)
  // So for tolerance t: dot >= cos(t/2)
  const dotThreshold = Math.cos(tolerance / 2);

  return dot >= dotThreshold;
}

/**
 * SkillsSphere - Main class for 3D skills visualization
 */
export class SkillsSphere {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {Array} skills - Array of skill data objects
   * @param {Object} options - Configuration options
   */
  constructor(container, skills = SKILLS_DATA, options = {}) {
    this.container = container;
    this.skills = skills;
    this.options = {
      radius: 200,                   // Sphere radius in pixels
      autoRotateSpeed: 0.002,        // Radians per frame
      dragSensitivity: 0.005,        // Mouse movement to rotation ratio
      momentumDecay: 0.95,           // Momentum reduction per frame
      hoverScale: 1.2,               // Scale factor on hover
      idleTimeout: 3000,             // Time before auto-rotate resumes (ms)
      mobileRadius: 150,             // Reduced radius for mobile
      mobileBreakpoint: 768,         // Viewport width breakpoint
      ...options
    };

    // Three.js objects
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.sphereGroup = null;
    this.nodes = [];
    this.raycaster = null;
    this.controller = null;

    // State
    this.isInitialized = false;
    this.isPaused = false;
    this.isDragging = false;
    this.isAutoRotating = true;
    this.hoveredNode = null;
    this.theme = 'dark';
    this.isVisible = true;  // Visibility state for IntersectionObserver

    // Interaction state
    this.momentum = { x: 0, y: 0 };
    this.lastInteractionTime = 0;
    this.lastMousePosition = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };

    // Animation frame ID for cleanup
    this.animationFrameId = null;

    // IntersectionObserver for visibility-based pause
    this.intersectionObserver = null;

    // MutationObserver for theme changes
    this.themeObserver = null;

    // Bound event handlers for cleanup
    this.boundHandlers = {};
  }

  /**
   * Initialize the 3D scene, camera, renderer, and skill nodes
   * @returns {Promise<void>}
   */
  async init() {
    if (!this.container) {
      console.error('Skills sphere container not found');
      return;
    }

    if (!checkWebGLSupport()) {
      console.warn('WebGL not supported, falling back to grid layout');
      this.showFallback();
      return;
    }

    try {
      this.isInitialized = true;  // Set before initThree so animate() can run
      await this.initThree();
    } catch (error) {
      console.error('Failed to initialize skills sphere:', error);
      this.isInitialized = false;
      this.showFallback();
    }
  }

  /**
   * Initialize Three.js scene, camera, and renderer
   * @private
   */
  async initThree() {
    const canvas = this.container.querySelector('#skills-sphere-canvas');
    if (!canvas) {
      console.error('Skills sphere canvas not found');
      return;
    }

    // Add loading class to container
    this.container.classList.add('loading');

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Create scene
    this.scene = new THREE.Scene();

    // Store current radius for resize tracking
    this.currentRadius = this.getResponsiveRadius();

    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = this.currentRadius * 2.5;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create sphere group to hold all nodes
    this.sphereGroup = new THREE.Group();
    this.scene.add(this.sphereGroup);

    // Create raycaster for hover detection
    this.raycaster = new THREE.Raycaster();

    // Create sphere controller for interaction
    this.controller = new SphereController(this.sphereGroup, {
      dragSensitivity: this.options.dragSensitivity,
      momentumDecay: this.options.momentumDecay,
      idleTimeout: this.options.idleTimeout,
      autoRotateSpeed: this.options.autoRotateSpeed
    });

    // Preload all textures first, then create nodes
    const textureMap = await this.preloadTextures();

    // Create skill nodes with preloaded textures
    this.createNodes(textureMap);

    // Remove loading class
    this.container.classList.remove('loading');

    // Setup event listeners
    this.setupEventListeners();

    // Setup visibility observer for performance optimization
    this.setupVisibilityObserver();

    // Setup theme change listener
    this.setupThemeListener();

    // Start animation loop
    this.animate();
  }

  /**
   * Get responsive radius based on viewport width
   * @returns {number}
   */
  getResponsiveRadius() {
    const viewportWidth = window.innerWidth;
    return calculateResponsiveRadius(
      viewportWidth,
      this.options.radius,
      this.options.mobileRadius,
      this.options.mobileBreakpoint
    );
  }

  /**
   * Preload all skill icon textures
   * @returns {Promise<Map<string, THREE.Texture>>} Map of icon path to texture
   * @private
   */
  async preloadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const textureMap = new Map();

    const loadPromises = this.skills.map(skill => {
      return new Promise((resolve) => {
        textureLoader.load(
          skill.icon,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            textureMap.set(skill.icon, texture);
            resolve();
          },
          undefined,
          (error) => {
            console.warn(`Failed to load texture: ${skill.icon}`, error);
            textureMap.set(skill.icon, null); // Mark as failed
            resolve(); // Don't reject, continue with other textures
          }
        );
      });
    });

    await Promise.all(loadPromises);
    return textureMap;
  }

  /**
   * Create skill nodes and position them on the sphere
   * Uses distributeOnSphere for even distribution and creates Three.js Sprites
   * @param {Map<string, THREE.Texture>} textureMap - Preloaded textures
   * @private
   */
  createNodes(textureMap = new Map()) {
    if (!this.sphereGroup) return;

    const radius = this.getResponsiveRadius();
    const positions = distributeOnSphere(this.skills.length, radius);

    // Node size - consistent for all nodes
    const nodeSize = radius * 0.25;

    this.skills.forEach((skill, index) => {
      const position = positions[index];
      const texture = textureMap.get(skill.icon);

      // Create sprite material with preloaded texture
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture || null,
        color: texture ? 0xffffff : 0x888888, // Gray fallback if no texture
        transparent: true,
        opacity: 1,
        sizeAttenuation: true
      });

      // Create sprite
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(position.x, position.y, position.z);
      sprite.scale.set(nodeSize, nodeSize, 1);

      // Store skill data on the sprite for hover detection
      sprite.userData = {
        skill: skill,
        baseScale: nodeSize,
        index: index
      };

      // Add to sphere group and nodes array
      this.sphereGroup.add(sprite);
      this.nodes.push(sprite);
    });
  }

  /**
   * Setup mouse, touch, and resize event listeners
   * @private
   */
  setupEventListeners() {
    const canvas = this.container.querySelector('#skills-sphere-canvas');
    if (!canvas) return;

    // Mouse event handlers
    this.boundHandlers.mousedown = {
      element: canvas,
      event: 'mousedown',
      handler: (e) => this.handleMouseDown(e)
    };
    this.boundHandlers.mousemove = {
      element: canvas,
      event: 'mousemove',
      handler: (e) => this.handleMouseMove(e)
    };
    this.boundHandlers.mouseup = {
      element: window,
      event: 'mouseup',
      handler: (e) => this.handleMouseUp(e)
    };
    this.boundHandlers.mouseleave = {
      element: canvas,
      event: 'mouseleave',
      handler: (e) => this.handleMouseLeave(e)
    };

    // Touch event handlers
    this.boundHandlers.touchstart = {
      element: canvas,
      event: 'touchstart',
      handler: (e) => this.handleTouchStart(e)
    };
    this.boundHandlers.touchmove = {
      element: canvas,
      event: 'touchmove',
      handler: (e) => this.handleTouchMove(e)
    };
    this.boundHandlers.touchend = {
      element: window,
      event: 'touchend',
      handler: (e) => this.handleTouchEnd(e)
    };

    // Resize handler
    this.boundHandlers.resize = {
      element: window,
      event: 'resize',
      handler: () => this.handleResize()
    };

    // Attach all event listeners
    Object.values(this.boundHandlers).forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler);
    });
  }

  /**
   * Setup IntersectionObserver to detect when the sphere is visible
   * Pauses rendering when not visible to save resources
   * @private
   */
  setupVisibilityObserver() {
    if (!this.container || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const options = {
      root: null,  // Use viewport as root
      rootMargin: '50px',  // Start loading slightly before visible
      threshold: 0.1  // Trigger when 10% visible
    };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.isVisible = entry.isIntersecting;

        if (shouldPauseRendering(this.isVisible)) {
          // Pause rendering when not visible
          this.pause();
        } else {
          // Resume rendering when visible
          this.resume();
        }
      });
    }, options);

    // Start observing the container
    this.intersectionObserver.observe(this.container);
  }

  /**
   * Handle mouse down event - start drag
   * @param {MouseEvent} event
   * @private
   */
  handleMouseDown(event) {
    event.preventDefault();
    if (this.controller) {
      this.controller.startDrag(event.clientX, event.clientY);
    }
    this.isDragging = true;
  }

  /**
   * Handle mouse move event - update drag or check hover
   * @param {MouseEvent} event
   * @private
   */
  handleMouseMove(event) {
    // Update normalized mouse coordinates for raycasting
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.controller && this.controller.isDragging) {
      this.controller.updateDrag(event.clientX, event.clientY);
    }
  }

  /**
   * Handle mouse up event - end drag
   * @param {MouseEvent} event
   * @private
   */
  handleMouseUp(event) {
    if (this.controller) {
      this.controller.endDrag();
    }
    this.isDragging = false;
  }

  /**
   * Handle mouse leave event
   * @param {MouseEvent} event
   * @private
   */
  handleMouseLeave(event) {
    // Don't end drag on mouse leave - let mouseup handle it
    // This allows dragging outside the canvas
  }

  /**
   * Handle window resize
   * Updates camera aspect ratio, renderer size, and sphere radius for responsive design
   * @private
   */
  handleResize() {
    if (!this.renderer || !this.camera || !this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Update camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    // Update sphere radius based on new viewport width
    const newRadius = this.getResponsiveRadius();
    const oldRadius = this.currentRadius || this.options.radius;

    // Only reposition nodes if radius changed significantly
    if (Math.abs(newRadius - oldRadius) > 1) {
      this.currentRadius = newRadius;
      this.repositionNodes(newRadius);

      // Update camera position to maintain proper view distance
      this.camera.position.z = newRadius * 2.5;
    }
  }

  /**
   * Reposition all nodes on the sphere with a new radius
   * @param {number} newRadius - The new sphere radius
   * @private
   */
  repositionNodes(newRadius) {
    if (!this.nodes.length) return;

    const positions = distributeOnSphere(this.nodes.length, newRadius);
    const nodeSize = newRadius * 0.25;

    this.nodes.forEach((node, index) => {
      if (node && positions[index]) {
        const pos = positions[index];
        node.position.set(pos.x, pos.y, pos.z);

        // Update scale based on new radius
        node.userData.baseScale = nodeSize;

        // Only update scale if not currently hovered
        if (node !== this.hoveredNode) {
          node.scale.set(nodeSize, nodeSize, 1);
        } else {
          // Maintain hover scale ratio
          const hoverScale = nodeSize * this.options.hoverScale;
          node.scale.set(hoverScale, hoverScale, 1);
        }
      }
    });
  }

  /**
   * Handle touch start event - map to mouse down
   * @param {TouchEvent} event
   * @private
   */
  handleTouchStart(event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      if (this.controller) {
        this.controller.startDrag(touch.clientX, touch.clientY);
      }
      this.isDragging = true;
    }
  }

  /**
   * Handle touch move event - map to mouse move for single-finger drag
   * @param {TouchEvent} event
   * @private
   */
  handleTouchMove(event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];

      // Update normalized coordinates for raycasting
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.controller && this.controller.isDragging) {
        this.controller.updateDrag(touch.clientX, touch.clientY);
      }
    }
  }

  /**
   * Handle touch end event - map to mouse up
   * @param {TouchEvent} event
   * @private
   */
  handleTouchEnd(event) {
    if (this.controller) {
      this.controller.endDrag();
    }
    this.isDragging = false;
  }

  /**
   * Main animation loop
   * @private
   */
  animate() {
    if (this.isPaused || !this.isInitialized) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update auto-rotation or momentum
    this.updateRotation();

    // Update billboard effect for nodes
    this.updateBillboards();

    // Check hover state (only when not dragging)
    if (!this.isDragging) {
      this.checkHover();
    }

    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Update sphere rotation based on auto-rotate or momentum
   * @private
   */
  updateRotation() {
    if (this.controller) {
      this.controller.update();
    }
  }

  /**
   * Update billboard effect to make nodes face camera
   * Each sprite's forward vector should point toward the camera position
   * @private
   */
  updateBillboards() {
    if (!this.camera || !this.nodes.length) return;

    // Get camera world position
    const cameraWorldPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraWorldPosition);

    // Make each node face the camera
    this.nodes.forEach(node => {
      if (!node) return;

      // Get node's world position
      const nodeWorldPosition = new THREE.Vector3();
      node.getWorldPosition(nodeWorldPosition);

      // Make the node look at the camera
      // For sprites, we copy the camera's quaternion to make them face the camera
      node.quaternion.copy(this.camera.quaternion);
    });
  }

  /**
   * Check hover state using raycasting
   * @private
   */
  checkHover() {
    if (!this.raycaster || !this.camera || !this.nodes.length || this.isDragging) {
      return;
    }

    // Update raycaster with current mouse position
    const mouseVector = new THREE.Vector2(this.mouse.x, this.mouse.y);
    this.raycaster.setFromCamera(mouseVector, this.camera);

    // Check for intersections with nodes
    const intersects = this.raycaster.intersectObjects(this.nodes);

    if (intersects.length > 0) {
      const hoveredObject = intersects[0].object;

      // Only update if hovered node changed
      if (this.hoveredNode !== hoveredObject) {
        // Clear previous hover
        this.clearHoverEffect();

        // Set new hovered node
        this.hoveredNode = hoveredObject;
        this.applyHoverEffect(hoveredObject);

        // Notify controller that we're hovering
        if (this.controller) {
          this.controller.setHovering(true);
        }
      }
    } else {
      // No intersection - clear hover
      if (this.hoveredNode) {
        this.clearHoverEffect();
        this.hoveredNode = null;

        // Notify controller that we're no longer hovering
        if (this.controller) {
          this.controller.setHovering(false);
        }
      }
    }
  }

  /**
   * Apply hover effect to a node
   * Scales up the node and adds glow effect
   * @param {THREE.Sprite} node - The node to apply hover effect to
   * @private
   */
  applyHoverEffect(node) {
    if (!node || !node.userData) return;

    const baseScale = node.userData.baseScale || 1;
    const hoverScale = baseScale * this.options.hoverScale;

    // Scale up the node
    node.scale.set(hoverScale, hoverScale, 1);

    // Add glow effect by increasing opacity and brightness
    if (node.material) {
      node.material.opacity = 1;
      // Store original color for restoration
      if (!node.userData.originalColor && node.material.color) {
        node.userData.originalColor = node.material.color.getHex();
      }
      // Brighten the color slightly for glow effect
      node.material.color.setHex(0xffffff);
    }
  }

  /**
   * Clear hover effect from the currently hovered node
   * @private
   */
  clearHoverEffect() {
    if (!this.hoveredNode || !this.hoveredNode.userData) return;

    const baseScale = this.hoveredNode.userData.baseScale || 1;

    // Reset scale to base
    this.hoveredNode.scale.set(baseScale, baseScale, 1);

    // Reset material properties
    if (this.hoveredNode.material) {
      this.hoveredNode.material.opacity = 1;
      // Restore original color if stored
      if (this.hoveredNode.userData.originalColor !== undefined) {
        this.hoveredNode.material.color.setHex(this.hoveredNode.userData.originalColor);
      }
    }
  }

  /**
   * Get the currently hovered node
   * @returns {THREE.Sprite|null}
   */
  getHoveredNode() {
    return this.hoveredNode;
  }

  /**
   * Check if a node is currently being hovered
   * @returns {boolean}
   */
  isNodeHovered() {
    return this.hoveredNode !== null;
  }

  /**
   * Update theme colors
   * Updates sprite materials based on theme and listens to theme change events
   * @param {string} theme - 'dark' or 'light'
   */
  updateTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') {
      console.warn(`Invalid theme: ${theme}. Using 'dark' as default.`);
      theme = 'dark';
    }

    this.theme = theme;
    const colors = getThemeColors(theme);

    // Update all node materials with new theme colors
    if (this.nodes && this.nodes.length > 0) {
      this.nodes.forEach(node => {
        if (node && node.material) {
          // For sprites with textures (SVG icons), always use white (0xffffff)
          // to show the original texture colors without tinting
          // The SVG icons already have their own colors
          if (node.material.map) {
            // Has texture - use white to preserve original icon colors
            node.material.color.setHex(0xffffff);
          } else {
            // No texture (fallback) - use theme color for visibility
            node.material.color.setHex(colors.nodeColor);
          }
          node.material.needsUpdate = true;
        }
      });
    }

    // Update renderer clear color if needed (for non-transparent backgrounds)
    // Note: We use alpha: true so background is transparent, but this is here for completeness
    if (this.renderer) {
      // Keep transparent background, but store theme for reference
      this.renderer.setClearColor(colors.background, 0);
    }
  }

  /**
   * Setup theme change listener to respond to theme-manager.js events
   * Listens for body class changes (dark class toggle or light-mode class toggle)
   * @private
   */
  setupThemeListener() {
    // Create a MutationObserver to watch for class changes on body
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          // Check for both 'dark' class (theme-manager.js) and 'light-mode' class (main.js)
          const isDark = document.body.classList.contains('dark');
          const isLightMode = document.body.classList.contains('light-mode');

          // If 'dark' class is present, use dark theme
          // If 'light-mode' class is present, use light theme
          // Otherwise default to dark
          let theme = 'dark';
          if (isLightMode) {
            theme = 'light';
          } else if (isDark) {
            theme = 'dark';
          }

          this.updateTheme(theme);
        }
      });
    });

    // Start observing body for class changes
    this.themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Set initial theme based on current body class
    const isDark = document.body.classList.contains('dark');
    const isLightMode = document.body.classList.contains('light-mode');
    let initialTheme = 'dark';
    if (isLightMode) {
      initialTheme = 'light';
    } else if (isDark) {
      initialTheme = 'dark';
    }
    this.updateTheme(initialTheme);
  }

  /**
   * Pause rendering to save resources
   */
  pause() {
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resume rendering
   */
  resume() {
    if (this.isPaused && this.isInitialized) {
      this.isPaused = false;
      this.animate();
    }
  }

  showFallback() {
    const canvas = this.container.querySelector('#skills-sphere-canvas');
    if (canvas) canvas.style.display = 'none';
  }

  /**
   * Cleanup all resources and event listeners
   */
  dispose() {
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Disconnect IntersectionObserver
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Disconnect theme observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }

    // Remove event listeners
    Object.keys(this.boundHandlers).forEach(key => {
      const { element, event, handler } = this.boundHandlers[key];
      if (element && handler) {
        element.removeEventListener(event, handler);
      }
    });
    this.boundHandlers = {};

    // Dispose Three.js objects
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Clear nodes
    this.nodes.forEach(node => {
      if (node.material) {
        if (node.material.map) node.material.map.dispose();
        node.material.dispose();
      }
      if (node.geometry) node.geometry.dispose();
    });
    this.nodes = [];

    // Clear scene
    if (this.scene) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null;
    }

    this.camera = null;
    this.sphereGroup = null;
    this.raycaster = null;
    this.controller = null;
    this.isInitialized = false;
  }
}

/**
 * Initialize skills sphere on a container element
 * @param {string} containerId - ID of the container element
 * @param {string} theme - Initial theme ('dark' or 'light')
 * @returns {SkillsSphere|null}
 */
export function initSkillsSphere(containerId = 'skills-sphere-container', theme = 'dark') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return null;
  }

  const sphere = new SkillsSphere(container);
  sphere.theme = theme;
  sphere.init();

  return sphere;
}

export default SkillsSphere;
