import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type GraphicsTier = 'low' | 'medium' | 'high';

export interface WheelAssembly {
  root: THREE.Group;
  steer: THREE.Group;
  roll: THREE.Group;
}

export interface KazeWheels {
  0: WheelAssembly;
  1: WheelAssembly;
  2: WheelAssembly;
  3: WheelAssembly;
  [index: number]: WheelAssembly | undefined;
  frontLeft: WheelAssembly;
  frontRight: WheelAssembly;
  rearLeft: WheelAssembly;
  rearRight: WheelAssembly;
}

export interface KazeCarOptions {
  tier?: GraphicsTier;
  paintColor?: string | number | THREE.Color;
}

export interface KazeCarResult {
  group: THREE.Group;
  wheels: KazeWheels;
  setPaintColor: (color: string | number | THREE.Color) => void;
  setReversing: (isReversing: boolean) => void;
  getTaillightMaterial: () => THREE.MeshStandardMaterial;
  dispose: () => void;
}

/**
 * Creates procedural canvas textures.
 * Falls back to 1x1 DataTexture in headless / node environments.
 */
function createCarbonFiberTexture(texturesToDispose: THREE.Texture[]): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([24, 24, 24, 255]), 1, 1);
    tex.needsUpdate = true;
    texturesToDispose.push(tex);
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#262626';
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        if ((x / 4 + y / 4) % 2 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texturesToDispose.push(texture);
  return texture;
}

function createHexGrilleTexture(texturesToDispose: THREE.Texture[]): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([17, 17, 17, 255]), 1, 1);
    tex.needsUpdate = true;
    texturesToDispose.push(tex);
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 2;
    const r = 8;
    const h = r * Math.sqrt(3);
    for (let y = -h; y < 64 + h; y += h) {
      for (let x = -r * 3; x < 64 + r * 3; x += r * 3) {
        const cx = x + (Math.floor(y / h) % 2) * 1.5 * r;
        const cy = y;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * 60 * Math.PI) / 180;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texturesToDispose.push(texture);
  return texture;
}

function createBrakeDiscTexture(texturesToDispose: THREE.Texture[]): THREE.Texture {
  if (typeof document === 'undefined') {
    const tex = new THREE.DataTexture(new Uint8Array([176, 176, 176, 255]), 1, 1);
    tex.needsUpdate = true;
    texturesToDispose.push(tex);
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, 128, 128);

    // Circular rotor track
    ctx.strokeStyle = '#757575';
    for (let r = 25; r < 58; r += 2.5) {
      ctx.beginPath();
      ctx.arc(64, 64, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Drilled ventilation holes
    ctx.fillStyle = '#212121';
    for (let i = 0; i < 32; i++) {
      const angle = (i * Math.PI * 2) / 32;
      const r1 = 35 + (i % 3) * 8;
      const px = 64 + Math.cos(angle) * r1;
      const py = 64 + Math.sin(angle) * r1;
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texturesToDispose.push(texture);
  return texture;
}

/**
 * Builds the parametric quad-mesh body shell.
 * Low tier uses a reduced cross-section grid for performance.
 */
function buildBodyShellGeometry(tier: GraphicsTier): THREE.BufferGeometry {
  const fullStations = [
    { z: -2.25, w: 0.65, yTop: 0.38, yMid: 0.3, yBot: 0.14 }, // Splitter nose
    { z: -2.05, w: 0.82, yTop: 0.54, yMid: 0.39, yBot: 0.14 }, // Front nose / grille
    { z: -1.75, w: 0.89, yTop: 0.65, yMid: 0.46, yBot: 0.15 }, // Hood front
    { z: -1.35, w: 0.92, yTop: 0.73, yMid: 0.58, yBot: 0.36 }, // Front wheel center
    { z: -0.85, w: 0.9, yTop: 0.8, yMid: 0.52, yBot: 0.16 }, // Hood rear / cowl base
    { z: -0.35, w: 0.82, yTop: 1.2, yMid: 0.65, yBot: 0.16 }, // Windshield top / A-pillar
    { z: 0.15, w: 0.79, yTop: 1.23, yMid: 0.67, yBot: 0.16 }, // Roof center
    { z: 0.65, w: 0.81, yTop: 1.18, yMid: 0.66, yBot: 0.16 }, // Rear window / B-pillar
    { z: 1.05, w: 0.86, yTop: 1.01, yMid: 0.65, yBot: 0.17 }, // Fastback decklid
    { z: 1.35, w: 0.95, yTop: 0.93, yMid: 0.68, yBot: 0.36 }, // Rear wheel center
    { z: 1.75, w: 0.93, yTop: 0.87, yMid: 0.63, yBot: 0.22 }, // Rear deck
    { z: 2.05, w: 0.88, yTop: 0.81, yMid: 0.57, yBot: 0.28 }, // Taillight fascia
    { z: 2.22, w: 0.76, yTop: 0.75, yMid: 0.5, yBot: 0.33 }, // Rear diffuser edge
    { z: 2.28, w: 0.55, yTop: 0.68, yMid: 0.45, yBot: 0.35 }, // Rear trailing edge
  ];

  const lowStations = [
    { z: -2.25, w: 0.65, yTop: 0.38, yMid: 0.3, yBot: 0.14 },
    { z: -1.75, w: 0.89, yTop: 0.65, yMid: 0.46, yBot: 0.15 },
    { z: -1.35, w: 0.92, yTop: 0.73, yMid: 0.58, yBot: 0.36 },
    { z: -0.35, w: 0.82, yTop: 1.2, yMid: 0.65, yBot: 0.16 },
    { z: 0.15, w: 0.79, yTop: 1.23, yMid: 0.67, yBot: 0.16 },
    { z: 1.05, w: 0.86, yTop: 1.01, yMid: 0.65, yBot: 0.17 },
    { z: 1.35, w: 0.95, yTop: 0.93, yMid: 0.68, yBot: 0.36 },
    { z: 2.28, w: 0.55, yTop: 0.68, yMid: 0.45, yBot: 0.35 },
  ];

  const stations = tier === 'low' ? lowStations : fullStations;
  const xRatios = tier === 'low' ? [0.0, 0.5, 1.0] : [0.0, 0.25, 0.55, 0.82, 1.0];
  const numCols = xRatios.length * 2 - 1;
  const numRows = stations.length;

  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < numRows; r++) {
    const s = stations[r];
    const v = r / (numRows - 1);

    // Left side (negative X in standard symmetric space)
    for (let c = xRatios.length - 1; c > 0; c--) {
      const t = xRatios[c];
      const x = -s.w * t;
      const y = s.yTop * (1 - 0.22 * (t * t)) + (s.yMid - s.yTop) * (t * 0.4);
      vertices.push(x, y, s.z);
      uvs.push((xRatios.length - 1 - c) / (numCols - 1), v);
    }
    // Center line (X = 0)
    vertices.push(0, s.yTop, s.z);
    uvs.push((xRatios.length - 1) / (numCols - 1), v);
    // Right side (positive X)
    for (let c = 1; c < xRatios.length; c++) {
      const t = xRatios[c];
      const x = s.w * t;
      const y = s.yTop * (1 - 0.22 * (t * t)) + (s.yMid - s.yTop) * (t * 0.4);
      vertices.push(x, y, s.z);
      uvs.push((xRatios.length - 1 + c) / (numCols - 1), v);
    }
  }

  // Connect grid of quads into two triangles each
  for (let r = 0; r < numRows - 1; r++) {
    for (let c = 0; c < numCols - 1; c++) {
      const i0 = r * numCols + c;
      const i1 = r * numCols + (c + 1);
      const i2 = (r + 1) * numCols + c;
      const i3 = (r + 1) * numCols + (c + 1);

      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Creates the procedural Kaze sports car model.
 * - Local forward direction: -Z
 * - Origin: Ground level (y = 0), centered between front and rear axles (z = 0)
 * - Returns { group, wheels, setPaintColor, dispose }
 */
export function createKazeCar(options: KazeCarOptions = {}): KazeCarResult {
  const tier: GraphicsTier = options.tier ?? 'medium';
  const initialPaint = options.paintColor ?? 0x3da5ff;

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  const carGroup = new THREE.Group();
  carGroup.name = 'KazeCar';

  // 1. Textures
  const carbonFiberTex = createCarbonFiberTexture(texturesToDispose);
  const hexGrilleTex = createHexGrilleTexture(texturesToDispose);
  const brakeDiscTex = tier !== 'low' ? createBrakeDiscTexture(texturesToDispose) : null;

  // 2. Materials
  // Body paint material:
  // - High: MeshPhysicalMaterial with clearcoat and clearcoatRoughness
  // - Medium / Low: MeshStandardMaterial (no physical clearcoat overhead)
  const matBody: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial =
    tier === 'high'
      ? new THREE.MeshPhysicalMaterial({
          color: initialPaint,
          metalness: 0.82,
          roughness: 0.22,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          reflectivity: 0.9,
        })
      : new THREE.MeshStandardMaterial({
          color: initialPaint,
          metalness: 0.82,
          roughness: 0.22,
        });
  materialsToDispose.push(matBody);

  const matAeroCarbon = new THREE.MeshStandardMaterial({
    color: 0x1f1f1f,
    roughness: 0.45,
    metalness: 0.65,
    map: carbonFiberTex,
  });
  materialsToDispose.push(matAeroCarbon);

  const matUnderbody = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
  });
  materialsToDispose.push(matUnderbody);

  // Glass: strictly no transmission anywhere
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x050a12,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.6,
  });
  materialsToDispose.push(matGlass);

  const matTireRubber = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.88,
    metalness: 0.08,
  });
  materialsToDispose.push(matTireRubber);

  const matAlloyRim = new THREE.MeshStandardMaterial({
    color: 0xe6e6e6,
    metalness: 0.92,
    roughness: 0.2,
  });
  materialsToDispose.push(matAlloyRim);

  const matBrakeDisc =
    tier !== 'low' && brakeDiscTex
      ? new THREE.MeshStandardMaterial({
          color: 0xb0b0b0,
          metalness: 0.85,
          roughness: 0.35,
          map: brakeDiscTex,
        })
      : null;
  if (matBrakeDisc) materialsToDispose.push(matBrakeDisc);

  const matBrakeCaliper =
    tier !== 'low'
      ? new THREE.MeshStandardMaterial({
          color: 0xdf1616,
          metalness: 0.4,
          roughness: 0.3,
        })
      : null;
  if (matBrakeCaliper) materialsToDispose.push(matBrakeCaliper);

  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.98,
    roughness: 0.1,
  });
  materialsToDispose.push(matChrome);

  const matHeadlightGlass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.1,
    transparent: true,
    opacity: 0.65,
  });
  materialsToDispose.push(matHeadlightGlass);

  const matHeadlightLED = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd6f1ff,
    emissiveIntensity: 3.5,
    roughness: 0.2,
  });
  materialsToDispose.push(matHeadlightLED);

  const matTaillightRed = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    emissive: 0xff0818,
    emissiveIntensity: 3.0,
    roughness: 0.3,
  });
  materialsToDispose.push(matTaillightRed);

  const matGrille = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.75,
    metalness: 0.3,
    map: hexGrilleTex,
  });
  materialsToDispose.push(matGrille);

  const matMirrorGlass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.02,
  });
  materialsToDispose.push(matMirrorGlass);

  // Interior materials (High tier only)
  const matInteriorLeather =
    tier === 'high'
      ? new THREE.MeshStandardMaterial({
          color: 0x1e1d1b,
          roughness: 0.7,
          metalness: 0.15,
        })
      : null;
  if (matInteriorLeather) materialsToDispose.push(matInteriorLeather);

  const matInteriorAccent =
    tier === 'high'
      ? new THREE.MeshStandardMaterial({
          color: 0xad2313,
          roughness: 0.45,
          metalness: 0.3,
        })
      : null;
  if (matInteriorAccent) materialsToDispose.push(matInteriorAccent);

  const matScreen =
    tier === 'high'
      ? new THREE.MeshStandardMaterial({
          color: 0x021324,
          emissive: 0x00aaff,
          emissiveIntensity: 1.2,
          roughness: 0.2,
        })
      : null;
  if (matScreen) materialsToDispose.push(matScreen);

  // 3. Static Body Assembly staged into temporary groups
  const staticRoot = new THREE.Group();

  // 3a. Body shell
  const bodyShellGeom = buildBodyShellGeometry(tier);
  const bodyShellMesh = new THREE.Mesh(bodyShellGeom, matBody);
  staticRoot.add(bodyShellMesh);

  // 3b. Underbody floorpan
  const underbodyGeom = new THREE.BoxGeometry(1.76, 0.05, 4.3);
  const underbodyMesh = new THREE.Mesh(underbodyGeom, matUnderbody);
  underbodyMesh.position.set(0, 0.12, 0);
  staticRoot.add(underbodyMesh);

  // 3c. Cabin Greenhouse
  const cabinGroup = new THREE.Group();

  const windshieldShape = new THREE.Shape();
  windshieldShape.moveTo(-0.72, -0.42);
  windshieldShape.lineTo(0.72, -0.42);
  windshieldShape.lineTo(0.58, 0.42);
  windshieldShape.lineTo(-0.58, 0.42);
  windshieldShape.closePath();
  const windshieldGeom = new THREE.ShapeGeometry(windshieldShape);
  const windshield = new THREE.Mesh(windshieldGeom, matGlass);
  windshield.position.set(0, 0.99, -0.58);
  windshield.rotation.x = -Math.PI * 0.33;
  cabinGroup.add(windshield);

  const rearWindowShape = new THREE.Shape();
  rearWindowShape.moveTo(-0.62, -0.48);
  rearWindowShape.lineTo(0.62, -0.48);
  rearWindowShape.lineTo(0.54, 0.48);
  rearWindowShape.lineTo(-0.54, 0.48);
  rearWindowShape.closePath();
  const rearWindowGeom = new THREE.ShapeGeometry(rearWindowShape);
  const rearWindow = new THREE.Mesh(rearWindowGeom, matGlass);
  rearWindow.position.set(0, 1.05, 0.85);
  rearWindow.rotation.x = Math.PI * 0.38;
  cabinGroup.add(rearWindow);

  const sideWindowShape = new THREE.Shape();
  sideWindowShape.moveTo(-0.48, -0.16);
  sideWindowShape.lineTo(0.52, -0.16);
  sideWindowShape.lineTo(0.4, 0.18);
  sideWindowShape.lineTo(-0.35, 0.18);
  sideWindowShape.closePath();
  const sideWindowGeomLeft = new THREE.ShapeGeometry(sideWindowShape);
  const sideWindowGeomRight = new THREE.ShapeGeometry(sideWindowShape);

  const leftWindow = new THREE.Mesh(sideWindowGeomLeft, matGlass);
  leftWindow.position.set(-0.76, 0.98, 0.15);
  leftWindow.rotation.y = -Math.PI * 0.5;
  leftWindow.rotation.x = -0.15;
  cabinGroup.add(leftWindow);

  const rightWindow = new THREE.Mesh(sideWindowGeomRight, matGlass);
  rightWindow.position.set(0.76, 0.98, 0.15);
  rightWindow.rotation.y = Math.PI * 0.5;
  rightWindow.rotation.x = 0.15;
  cabinGroup.add(rightWindow);

  const roofGlassGeom = new THREE.BoxGeometry(0.85, 0.02, 0.7);
  const roofGlass = new THREE.Mesh(roofGlassGeom, matGlass);
  roofGlass.position.set(0, 1.23, 0.15);
  cabinGroup.add(roofGlass);

  staticRoot.add(cabinGroup);

  // 3d. Front Fascia
  const frontFascia = new THREE.Group();

  const splitterGeom = new THREE.BoxGeometry(1.78, 0.04, 0.4);
  const splitter = new THREE.Mesh(splitterGeom, matAeroCarbon);
  splitter.position.set(0, 0.13, -2.18);
  frontFascia.add(splitter);

  const mainGrilleGeom = new THREE.BoxGeometry(1.05, 0.24, 0.1);
  const mainGrille = new THREE.Mesh(mainGrilleGeom, matGrille);
  mainGrille.position.set(0, 0.32, -2.12);
  frontFascia.add(mainGrille);

  const cylSegs = tier === 'low' ? 8 : tier === 'medium' ? 12 : 16;

  [-0.68, 0.68].forEach((xSide) => {
    const inletGeom = new THREE.BoxGeometry(0.35, 0.18, 0.1);
    const sideInlet = new THREE.Mesh(inletGeom, matGrille);
    sideInlet.position.set(xSide, 0.3, -2.08);
    sideInlet.rotation.y = (xSide > 0 ? 1 : -1) * 0.2;
    frontFascia.add(sideInlet);

    const canardGeom = new THREE.BoxGeometry(0.22, 0.02, 0.16);
    const canard = new THREE.Mesh(canardGeom, matAeroCarbon);
    canard.position.set(xSide * 1.15, 0.32, -2.04);
    canard.rotation.z = (xSide > 0 ? -1 : 1) * 0.25;
    canard.rotation.y = (xSide > 0 ? 1 : -1) * 0.3;
    frontFascia.add(canard);
  });

  [-0.64, 0.64].forEach((xSide) => {
    const headlightBox = new THREE.Group();
    headlightBox.position.set(xSide, 0.56, -1.98);

    const housingGeom = new THREE.BoxGeometry(0.32, 0.12, 0.2);
    const housing = new THREE.Mesh(housingGeom, matUnderbody);
    housing.rotation.y = (xSide > 0 ? 1 : -1) * 0.32;
    headlightBox.add(housing);

    for (let l = -1; l <= 1; l += 2) {
      const projectorGeom = new THREE.CylinderGeometry(0.032, 0.032, 0.06, cylSegs);
      const projector = new THREE.Mesh(projectorGeom, matHeadlightLED);
      projector.rotation.x = Math.PI * 0.5;
      projector.position.set(l * 0.07, 0, -0.07);
      headlightBox.add(projector);
    }

    const drlGeom = new THREE.BoxGeometry(0.28, 0.015, 0.04);
    const drl = new THREE.Mesh(drlGeom, matHeadlightLED);
    drl.position.set(0, -0.04, -0.09);
    headlightBox.add(drl);

    const coverGeom = new THREE.BoxGeometry(0.33, 0.13, 0.05);
    const cover = new THREE.Mesh(coverGeom, matHeadlightGlass);
    cover.position.set(0, 0, -0.1);
    headlightBox.add(cover);

    frontFascia.add(headlightBox);
  });

  staticRoot.add(frontFascia);

  // 3e. Rear Fascia & Diffuser
  const rearFascia = new THREE.Group();

  const lightbarGeom = new THREE.BoxGeometry(1.62, 0.05, 0.08);
  const lightbar = new THREE.Mesh(lightbarGeom, matTaillightRed);
  lightbar.position.set(0, 0.77, 2.12);
  rearFascia.add(lightbar);

  [-0.72, 0.72].forEach((xSide) => {
    const tailClusterGeom = new THREE.BoxGeometry(0.28, 0.12, 0.1);
    const tailCluster = new THREE.Mesh(tailClusterGeom, matTaillightRed);
    tailCluster.position.set(xSide, 0.75, 2.1);
    tailCluster.rotation.y = (xSide > 0 ? 1 : -1) * -0.25;
    rearFascia.add(tailCluster);
  });

  const diffuserMainGeom = new THREE.BoxGeometry(1.58, 0.22, 0.45);
  const diffuserMain = new THREE.Mesh(diffuserMainGeom, matAeroCarbon);
  diffuserMain.position.set(0, 0.23, 2.14);
  diffuserMain.rotation.x = 0.22;
  rearFascia.add(diffuserMain);

  // Diffuser fins: omitted on Low tier
  if (tier !== 'low') {
    for (let f = -3; f <= 3; f++) {
      if (f === 0) continue;
      const finGeom = new THREE.BoxGeometry(0.02, 0.18, 0.45);
      const fin = new THREE.Mesh(finGeom, matAeroCarbon);
      fin.position.set(f * 0.21, 0.21, 2.14);
      fin.rotation.x = 0.22;
      rearFascia.add(fin);
    }
  }

  [-0.52, -0.4, 0.4, 0.52].forEach((xPos) => {
    const exhaustGeom = new THREE.CylinderGeometry(0.048, 0.048, 0.22, cylSegs);
    const exhaust = new THREE.Mesh(exhaustGeom, matChrome);
    exhaust.rotation.x = Math.PI * 0.5;
    exhaust.position.set(xPos, 0.29, 2.24);
    rearFascia.add(exhaust);

    const boreGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.02, cylSegs);
    const bore = new THREE.Mesh(boreGeom, matUnderbody);
    bore.rotation.x = Math.PI * 0.5;
    bore.position.set(xPos, 0.29, 2.34);
    rearFascia.add(bore);
  });

  // Raised Rear GT Wing
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, 0.98, 1.95);

  const wingBladeGeom = new THREE.BoxGeometry(1.72, 0.03, 0.28);
  const wingBlade = new THREE.Mesh(wingBladeGeom, matAeroCarbon);
  wingBlade.rotation.x = -0.1;
  spoilerGroup.add(wingBlade);

  [-0.86, 0.86].forEach((xSide) => {
    const endplateGeom = new THREE.BoxGeometry(0.02, 0.12, 0.32);
    const endplate = new THREE.Mesh(endplateGeom, matAeroCarbon);
    endplate.position.set(xSide, 0.02, 0);
    spoilerGroup.add(endplate);
  });

  [-0.42, 0.42].forEach((xSide) => {
    const strutGeom = new THREE.BoxGeometry(0.035, 0.22, 0.08);
    const strut = new THREE.Mesh(strutGeom, matChrome);
    strut.position.set(xSide, -0.1, 0.02);
    strut.rotation.x = 0.25;
    spoilerGroup.add(strut);
  });

  rearFascia.add(spoilerGroup);
  staticRoot.add(rearFascia);

  // 3f. Mirrors, Skirts & Door Handles
  [-1, 1].forEach((side) => {
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(side * 0.86, 0.86, -0.42);

    const mirrorArmGeom = new THREE.BoxGeometry(0.12, 0.025, 0.04);
    const mirrorArm = new THREE.Mesh(mirrorArmGeom, matAeroCarbon);
    mirrorArm.position.set(side * 0.06, 0, 0);
    mirrorArm.rotation.z = side * 0.2;
    mirrorGroup.add(mirrorArm);

    const mirrorCapGeom = new THREE.BoxGeometry(0.18, 0.11, 0.12);
    const mirrorCap = new THREE.Mesh(mirrorCapGeom, matBody);
    mirrorCap.position.set(side * 0.16, 0.02, 0);
    mirrorGroup.add(mirrorCap);

    const reflectiveFaceGeom = new THREE.BoxGeometry(0.01, 0.09, 0.1);
    const reflectiveFace = new THREE.Mesh(reflectiveFaceGeom, matMirrorGlass);
    reflectiveFace.position.set(side * 0.12, 0.02, 0.04);
    mirrorGroup.add(reflectiveFace);

    staticRoot.add(mirrorGroup);

    const skirtGeom = new THREE.BoxGeometry(0.12, 0.06, 2.3);
    const skirt = new THREE.Mesh(skirtGeom, matAeroCarbon);
    skirt.position.set(side * 0.89, 0.14, 0);
    staticRoot.add(skirt);

    const handleGeom = new THREE.BoxGeometry(0.02, 0.03, 0.16);
    const handle = new THREE.Mesh(handleGeom, matChrome);
    handle.position.set(side * 0.91, 0.68, 0.05);
    staticRoot.add(handle);

    const ductGeom = new THREE.BoxGeometry(0.1, 0.22, 0.35);
    const duct = new THREE.Mesh(ductGeom, matGrille);
    duct.position.set(side * 0.88, 0.52, 0.88);
    duct.rotation.y = side * 0.15;
    staticRoot.add(duct);
  });

  // 3g. Interior Cockpit (High tier only)
  if (tier === 'high' && matInteriorLeather && matInteriorAccent && matScreen) {
    const interiorGroup = new THREE.Group();

    const tubGeom = new THREE.BoxGeometry(1.4, 0.45, 1.3);
    const tub = new THREE.Mesh(tubGeom, matInteriorLeather);
    tub.position.set(0, 0.45, 0.15);
    interiorGroup.add(tub);

    [-0.34, 0.34].forEach((xSide) => {
      const seatGroup = new THREE.Group();
      seatGroup.position.set(xSide, 0.38, 0.22);

      const seatBaseGeom = new THREE.BoxGeometry(0.42, 0.14, 0.44);
      const seatBase = new THREE.Mesh(seatBaseGeom, matInteriorLeather);
      seatGroup.add(seatBase);

      const backrestGeom = new THREE.BoxGeometry(0.42, 0.54, 0.12);
      const backrest = new THREE.Mesh(backrestGeom, matInteriorLeather);
      backrest.position.set(0, 0.28, 0.2);
      backrest.rotation.x = -0.22;
      seatGroup.add(backrest);

      const stripeGeom = new THREE.BoxGeometry(0.09, 0.52, 0.02);
      const stripe = new THREE.Mesh(stripeGeom, matInteriorAccent);
      stripe.position.set(0, 0.28, 0.14);
      stripe.rotation.x = -0.22;
      seatGroup.add(stripe);

      const headrestGeom = new THREE.BoxGeometry(0.24, 0.16, 0.1);
      const headrest = new THREE.Mesh(headrestGeom, matInteriorLeather);
      headrest.position.set(0, 0.6, 0.26);
      headrest.rotation.x = -0.15;
      seatGroup.add(headrest);

      interiorGroup.add(seatGroup);
    });

    const dashGeom = new THREE.BoxGeometry(1.36, 0.22, 0.38);
    const dash = new THREE.Mesh(dashGeom, matInteriorLeather);
    dash.position.set(0, 0.72, -0.32);
    interiorGroup.add(dash);

    const clusterGeom = new THREE.BoxGeometry(0.28, 0.1, 0.02);
    const clusterScreen = new THREE.Mesh(clusterGeom, matScreen);
    clusterScreen.position.set(-0.34, 0.76, -0.24);
    clusterScreen.rotation.x = -0.3;
    interiorGroup.add(clusterScreen);

    const centerScreenGeom = new THREE.BoxGeometry(0.24, 0.14, 0.02);
    const centerScreen = new THREE.Mesh(centerScreenGeom, matScreen);
    centerScreen.position.set(0, 0.72, -0.24);
    centerScreen.rotation.x = -0.3;
    centerScreen.rotation.y = -0.15;
    interiorGroup.add(centerScreen);

    const steeringWheelGroup = new THREE.Group();
    steeringWheelGroup.position.set(-0.34, 0.72, -0.18);
    steeringWheelGroup.rotation.x = -0.38;

    const rimGeom = new THREE.TorusGeometry(0.14, 0.016, 12, 24);
    const rim = new THREE.Mesh(rimGeom, matInteriorLeather);
    steeringWheelGroup.add(rim);

    const spokeGeom = new THREE.BoxGeometry(0.22, 0.025, 0.02);
    const spoke = new THREE.Mesh(spokeGeom, matChrome);
    steeringWheelGroup.add(spoke);

    const hubGeom = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 16);
    const hub = new THREE.Mesh(hubGeom, matInteriorLeather);
    hub.rotation.x = Math.PI * 0.5;
    steeringWheelGroup.add(hub);

    interiorGroup.add(steeringWheelGroup);

    const consoleGeom = new THREE.BoxGeometry(0.24, 0.2, 0.65);
    const centerConsole = new THREE.Mesh(consoleGeom, matInteriorLeather);
    centerConsole.position.set(0, 0.48, 0.08);
    interiorGroup.add(centerConsole);

    const shifterGeom = new THREE.CylinderGeometry(0.015, 0.02, 0.08, 12);
    const shifter = new THREE.Mesh(shifterGeom, matChrome);
    shifter.position.set(0, 0.62, 0.02);
    interiorGroup.add(shifter);

    staticRoot.add(interiorGroup);
  }

  // 4. Merge static body meshes by material
  staticRoot.updateMatrixWorld(true);

  const geomsByMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const unmergedGeomsToFree: THREE.BufferGeometry[] = [];

  staticRoot.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.Material;
      const geom = obj.geometry.clone();
      geom.applyMatrix4(obj.matrixWorld);
      unmergedGeomsToFree.push(geom);
      obj.geometry.dispose();

      let list = geomsByMaterial.get(mat);
      if (!list) {
        list = [];
        geomsByMaterial.set(mat, list);
      }
      list.push(geom);
    }
  });

  geomsByMaterial.forEach((geoms, mat) => {
    let mergedGeom: THREE.BufferGeometry;
    if (geoms.length === 1) {
      mergedGeom = geoms[0];
    } else {
      const merged = BufferGeometryUtils.mergeGeometries(geoms, false);
      if (!merged) {
        throw new Error('Failed to merge static body geometries');
      }
      mergedGeom = merged;
    }
    geometriesToDispose.push(mergedGeom);

    const mergedMesh = new THREE.Mesh(mergedGeom, mat);
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;
    carGroup.add(mergedMesh);
  });

  // Free unmerged clones
  for (const g of unmergedGeomsToFree) {
    if (!geometriesToDispose.includes(g)) {
      g.dispose();
    }
  }

  // 5. Shared Wheel Geometries
  const tireRadialSegs = tier === 'low' ? 16 : tier === 'medium' ? 24 : 28;
  const rimRadialSegs = tier === 'low' ? 16 : tier === 'medium' ? 20 : 24;
  const torusTubularSegs = tier === 'low' ? 8 : tier === 'medium' ? 10 : 12;
  const numSpokes = tier === 'low' ? 5 : tier === 'medium' ? 8 : 10;

  // Single shared tire geometry for all 4 wheels
  const tireGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.26, tireRadialSegs, 1);
  tireGeom.rotateZ(Math.PI * 0.5);
  geometriesToDispose.push(tireGeom);

  function buildMergedRimGeom(side: -1 | 1): THREE.BufferGeometry {
    const rimParts: THREE.BufferGeometry[] = [];

    // Outer rim cylinder
    const rimOuter = new THREE.CylinderGeometry(0.24, 0.24, 0.265, rimRadialSegs, 1, true);
    rimOuter.rotateZ(Math.PI * 0.5);
    rimParts.push(rimOuter);

    // Concave rim face
    const rimFace = new THREE.TorusGeometry(0.22, 0.02, torusTubularSegs, rimRadialSegs);
    rimFace.rotateY(Math.PI * 0.5);
    rimFace.translate(side * 0.12, 0, 0);
    rimParts.push(rimFace);

    // Spokes
    for (let s = 0; s < numSpokes; s++) {
      const angle = (s * Math.PI * 2) / numSpokes;
      const spoke = new THREE.BoxGeometry(0.022, 0.2, 0.028);
      spoke.rotateX(-angle);
      spoke.translate(side * 0.11, Math.sin(angle) * 0.11, Math.cos(angle) * 0.11);
      rimParts.push(spoke);
    }

    // Center cap
    const cap = new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16);
    cap.rotateZ(Math.PI * 0.5);
    cap.translate(side * 0.125, 0, 0);
    rimParts.push(cap);

    const merged = BufferGeometryUtils.mergeGeometries(rimParts, false);
    for (const part of rimParts) {
      part.dispose();
    }
    if (!merged) {
      throw new Error(`Failed to merge rim geometries for side ${side}`);
    }
    return merged;
  }

  const rimGeomLeft = buildMergedRimGeom(-1);
  geometriesToDispose.push(rimGeomLeft);

  const rimGeomRight = buildMergedRimGeom(1);
  geometriesToDispose.push(rimGeomRight);

  // Brake disc & caliper geometries (medium & high tier only)
  let discGeomLeft: THREE.BufferGeometry | null = null;
  let discGeomRight: THREE.BufferGeometry | null = null;
  let caliperGeomLeft: THREE.BufferGeometry | null = null;
  let caliperGeomRight: THREE.BufferGeometry | null = null;

  if (tier !== 'low') {
    discGeomLeft = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24);
    discGeomLeft.rotateZ(Math.PI * 0.5);
    discGeomLeft.translate(-1 * 0.04, 0, 0);
    geometriesToDispose.push(discGeomLeft);

    discGeomRight = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24);
    discGeomRight.rotateZ(Math.PI * 0.5);
    discGeomRight.translate(1 * 0.04, 0, 0);
    geometriesToDispose.push(discGeomRight);

    caliperGeomLeft = new THREE.BoxGeometry(0.065, 0.13, 0.08);
    caliperGeomLeft.rotateZ(-1 * 0.1);
    caliperGeomLeft.translate(-1 * 0.04, 0.14, -0.06);
    geometriesToDispose.push(caliperGeomLeft);

    caliperGeomRight = new THREE.BoxGeometry(0.065, 0.13, 0.08);
    caliperGeomRight.rotateZ(1 * 0.1);
    caliperGeomRight.translate(1 * 0.04, 0.14, -0.06);
    geometriesToDispose.push(caliperGeomRight);
  }

  function createWheelAssembly(isFront: boolean, side: -1 | 1): WheelAssembly {
    const wheelRoot = new THREE.Group();
    wheelRoot.name = (isFront ? 'Front' : 'Rear') + (side < 0 ? 'Left' : 'Right') + 'Wheel';

    const steerGroup = new THREE.Group();
    steerGroup.name = 'SteerPivot';
    wheelRoot.add(steerGroup);

    const rollGroup = new THREE.Group();
    rollGroup.name = 'RollHub';
    steerGroup.add(rollGroup);

    // 1. Tire
    const tire = new THREE.Mesh(tireGeom, matTireRubber);
    tire.castShadow = true;
    tire.receiveShadow = true;
    rollGroup.add(tire);

    // 2. Rim
    const rimGeom = side < 0 ? rimGeomLeft : rimGeomRight;
    const rim = new THREE.Mesh(rimGeom, matAlloyRim);
    rim.castShadow = true;
    rollGroup.add(rim);

    // 3. Brake Disc (Medium & High)
    if (matBrakeDisc && discGeomLeft && discGeomRight) {
      const discGeom = side < 0 ? discGeomLeft : discGeomRight;
      const disc = new THREE.Mesh(discGeom, matBrakeDisc);
      rollGroup.add(disc);
    }

    // 4. Brake Caliper in steer group (stationary relative to wheel spin)
    if (matBrakeCaliper && caliperGeomLeft && caliperGeomRight) {
      const caliperGeom = side < 0 ? caliperGeomLeft : caliperGeomRight;
      const caliper = new THREE.Mesh(caliperGeom, matBrakeCaliper);
      steerGroup.add(caliper);
    }

    return {
      root: wheelRoot,
      steer: steerGroup,
      roll: rollGroup,
    };
  }

  const trackWidthX = 0.84;
  const wheelPosY = 0.35;
  const frontAxleZ = -1.35;
  const rearAxleZ = 1.35;

  const wheelFL = createWheelAssembly(true, -1);
  wheelFL.root.position.set(-trackWidthX, wheelPosY, frontAxleZ);
  carGroup.add(wheelFL.root);

  const wheelFR = createWheelAssembly(true, 1);
  wheelFR.root.position.set(trackWidthX, wheelPosY, frontAxleZ);
  carGroup.add(wheelFR.root);

  const wheelRL = createWheelAssembly(false, -1);
  wheelRL.root.position.set(-trackWidthX, wheelPosY, rearAxleZ);
  carGroup.add(wheelRL.root);

  const wheelRR = createWheelAssembly(false, 1);
  wheelRR.root.position.set(trackWidthX, wheelPosY, rearAxleZ);
  carGroup.add(wheelRR.root);

  const wheels: KazeWheels = {
    0: wheelFL,
    1: wheelFR,
    2: wheelRL,
    3: wheelRR,
    frontLeft: wheelFL,
    frontRight: wheelFR,
    rearLeft: wheelRL,
    rearRight: wheelRR,
  };

  const setPaintColor = (color: string | number | THREE.Color): void => {
    matBody.color.set(color as THREE.ColorRepresentation);
  };

  let isCurrentlyReversing = false;
  const setReversing = (isReversing: boolean): void => {
    if (isCurrentlyReversing === isReversing) return;
    isCurrentlyReversing = isReversing;
    if (isReversing) {
      // White-ish reverse lamps with raised emissive intensity
      matTaillightRed.emissive.setHex(0xf0f5ff);
      matTaillightRed.emissiveIntensity = 5.0;
    } else {
      // Restore normal red taillight
      matTaillightRed.emissive.setHex(0xff0818);
      matTaillightRed.emissiveIntensity = 3.0;
    }
  };

  const getTaillightMaterial = (): THREE.MeshStandardMaterial => matTaillightRed;

  const dispose = (): void => {
    for (const geom of geometriesToDispose) {
      geom.dispose();
    }
    geometriesToDispose.length = 0;

    for (const mat of materialsToDispose) {
      mat.dispose();
    }
    materialsToDispose.length = 0;

    for (const tex of texturesToDispose) {
      tex.dispose();
    }
    texturesToDispose.length = 0;

    carGroup.clear();
  };

  return {
    group: carGroup,
    wheels,
    setPaintColor,
    setReversing,
    getTaillightMaterial,
    dispose,
  };
}
