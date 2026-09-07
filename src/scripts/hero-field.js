import * as THREE from 'three';

export function layerHeight(index, assembled) {
  return (1 - index) * (assembled ? 0.3 : 1.22);
}

function roundedPath(path, size, radius) {
  const half = size / 2;
  path.moveTo(-half + radius, -half);
  path.lineTo(half - radius, -half);
  path.quadraticCurveTo(half, -half, half, -half + radius);
  path.lineTo(half, half - radius);
  path.quadraticCurveTo(half, half, half - radius, half);
  path.lineTo(-half + radius, half);
  path.quadraticCurveTo(-half, half, -half, half - radius);
  path.lineTo(-half, -half + radius);
  path.quadraticCurveTo(-half, -half, -half + radius, -half);
  return path;
}

export function initHeroField(canvas) {
  if (!canvas) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x192d34, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(5.7, 4.6, 7.8);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xe7fff7, 0x35434d, 3));
  const key = new THREE.DirectionalLight(0xe0fff6, 5);
  key.position.set(-3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc3b9ff, 4);
  rim.position.set(4, 1, -3);
  scene.add(rim);

  const assembly = new THREE.Group();
  assembly.rotation.set(0.02, -0.2, -0.06);
  scene.add(assembly);
  const tiers = [];
  const outline = roundedPath(new THREE.Shape(), 3.65, 0.7);
  outline.holes.push(roundedPath(new THREE.Path(), 2.75, 0.45));
  const frameGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.16, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.065, bevelThickness: 0.06, curveSegments: 14 });
  frameGeometry.rotateX(-Math.PI / 2);
  frameGeometry.translate(0, -0.08, 0);
  const screwGeometry = new THREE.CylinderGeometry(0.047, 0.047, 0.028, 10);
  const screwMaterial = new THREE.MeshStandardMaterial({ color: 0x20333b, metalness: 0.5, roughness: 0.4 });
  const railGeometry = new THREE.BoxGeometry(0.045, 0.024, 0.22);
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xe4fff6, emissive: 0x88d4c5, emissiveIntensity: 0.3, roughness: 0.5 });
  [0x88d4c5, 0xb3abe7, 0x789eaf].forEach((color, index) => {
    const tier = new THREE.Group();
    tier.position.y = layerHeight(index, false);
    tier.add(new THREE.Mesh(frameGeometry, new THREE.MeshStandardMaterial({ color, metalness: 0.38, roughness: 0.28 })));
    for (const x of [-1.48, 1.48]) {
      for (const z of [-1.48, 1.48]) {
        const screw = new THREE.Mesh(screwGeometry, screwMaterial);
        screw.position.set(x, 0.155, z);
        tier.add(screw);
      }
    }
    for (let i = 0; i < 8; i++) {
      const rail = new THREE.Mesh(railGeometry, railMaterial);
      rail.position.set(-0.65 + i * 0.18, 0.16, 1.6);
      tier.add(rail);
    }
    assembly.add(tier);
    tiers.push(tier);
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.67, 1), new THREE.MeshStandardMaterial({ color: 0xbdeee2, emissive: 0x315950, emissiveIntensity: 0.4, metalness: 0.25, roughness: 0.2, flatShading: true }));
  assembly.add(core);
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.84, 1), new THREE.MeshBasicMaterial({ color: 0x88d4c5, transparent: true, opacity: 0.25, wireframe: true }));
  assembly.add(cage);
  const connectorPoints = [];
  for (const x of [-1.46, 1.46]) {
    for (const z of [-1.46, 1.46]) connectorPoints.push(new THREE.Vector3(x, -1.2, z), new THREE.Vector3(x, 1.22, z));
  }
  const connectors = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(connectorPoints), new THREE.LineDashedMaterial({ color: 0x72999a, transparent: true, opacity: 0.5, dashSize: 0.06, gapSize: 0.065 }));
  connectors.computeLineDistances();
  assembly.add(connectors);
  const platform = new THREE.Mesh(new THREE.RingGeometry(1.9, 1.915, 80), new THREE.MeshBasicMaterial({ color: 0x4a6a72, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = -1.85;
  assembly.add(platform);

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const { signal } = controller;
  const pointer = new THREE.Vector2();
  const host = canvas.closest('.hero-visual') || canvas;
  let paused = media.matches;
  let inView = true;
  let disposed = false;
  let assembled = false;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  function draw() { renderer.render(scene, camera); }
  function tick(now) {
    frame = 0;
    if (disposed || paused || !inView || document.hidden) return;
    const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
    previous = now;
    elapsed += delta;
    const ease = 1 - Math.exp(-delta * 5);
    assembly.rotation.y += (-0.2 + Math.sin(elapsed * 0.18) * 0.12 + pointer.x * 0.22 - assembly.rotation.y) * ease;
    assembly.rotation.x += (0.02 + pointer.y * 0.1 - assembly.rotation.x) * ease;
    assembly.position.y = Math.sin(elapsed * 0.7) * 0.055;
    tiers.forEach((tier, index) => { tier.position.y += (layerHeight(index, assembled) - tier.position.y) * ease; });
    connectors.scale.y += ((assembled ? 0.25 : 1) - connectors.scale.y) * ease;
    core.rotation.y += delta * 0.16;
    cage.rotation.y -= delta * 0.08;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (!disposed && !paused && inView && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(canvas.clientWidth, 1);
    const height = Math.max(canvas.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    controller.abort();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    const geometries = new Set();
    const materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    renderer.dispose();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const visibilityObserver = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, { threshold: 0.01 });
  visibilityObserver.observe(canvas);
  host.addEventListener('pointermove', event => {
    if (paused || event.pointerType === 'touch') return;
    const bounds = host.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1);
  }, { passive: true, signal });
  host.addEventListener('pointerleave', () => pointer.set(0, 0), { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  media.addEventListener('change', () => { paused = media.matches; sync(); }, { signal });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    canvas.classList.remove('ready');
    host.querySelectorAll('button').forEach(button => { button.disabled = true; });
    dispose();
  }, { signal });
  resize();
  sync();
  return {
    get paused() { return paused; },
    setPaused(value) { paused = value; sync(); },
    setAssembled(value) {
      assembled = value;
      if (paused) {
        tiers.forEach((tier, index) => { tier.position.y = layerHeight(index, assembled); });
        connectors.scale.y = assembled ? 0.25 : 1;
        draw();
      }
    },
    dispose,
  };
}
