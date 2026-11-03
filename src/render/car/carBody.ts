import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarDetailLevel } from '../../data/CarRenderBudget';

/**
 * Adds or replaces a vertex color attribute on a BufferGeometry.
 */
export function setGeometryVertexColor(
  geom: THREE.BufferGeometry,
  r: number,
  g: number,
  b: number,
): void {
  const count = geom.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Builds the parametric quad-mesh body shell.
 * Low detail uses a reduced cross-section grid for performance.
 */
export function buildBodyShellGeometry(detail: CarDetailLevel): THREE.BufferGeometry {
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

  const stations = detail === 'low' ? lowStations : fullStations;
  const xRatios = detail === 'low' ? [0.0, 0.5, 1.0] : [0.0, 0.25, 0.55, 0.82, 1.0];
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
 * Builds the underbody floorpan geometry positioned at ground height.
 */
export function buildUnderbodyGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(1.76, 0.05, 4.3);
  geom.translate(0, 0.12, 0);
  return geom;
}

/**
 * Builds the merged cabin glass geometry (windshield, rear window, side windows, roof glass).
 * Merging all cabin windows into 1 geometry reduces draw calls.
 */
export function buildCabinGlassGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Windshield
  const windshieldShape = new THREE.Shape();
  windshieldShape.moveTo(-0.72, -0.42);
  windshieldShape.lineTo(0.72, -0.42);
  windshieldShape.lineTo(0.58, 0.42);
  windshieldShape.lineTo(-0.58, 0.42);
  windshieldShape.closePath();
  const windshield = new THREE.ShapeGeometry(windshieldShape);
  windshield.rotateX(-Math.PI * 0.33);
  windshield.translate(0, 0.99, -0.58);
  parts.push(windshield);

  // 2. Rear window
  const rearWindowShape = new THREE.Shape();
  rearWindowShape.moveTo(-0.62, -0.48);
  rearWindowShape.lineTo(0.62, -0.48);
  rearWindowShape.lineTo(0.54, 0.48);
  rearWindowShape.lineTo(-0.54, 0.48);
  rearWindowShape.closePath();
  const rearWindow = new THREE.ShapeGeometry(rearWindowShape);
  rearWindow.rotateX(Math.PI * 0.38);
  rearWindow.translate(0, 1.05, 0.85);
  parts.push(rearWindow);

  // 3. Left side window
  const sideWindowShape = new THREE.Shape();
  sideWindowShape.moveTo(-0.48, -0.16);
  sideWindowShape.lineTo(0.52, -0.16);
  sideWindowShape.lineTo(0.4, 0.18);
  sideWindowShape.lineTo(-0.35, 0.18);
  sideWindowShape.closePath();

  const leftWindow = new THREE.ShapeGeometry(sideWindowShape);
  leftWindow.rotateX(-0.15);
  leftWindow.rotateY(-Math.PI * 0.5);
  leftWindow.translate(-0.76, 0.98, 0.15);
  parts.push(leftWindow);

  // 4. Right side window
  const rightWindow = new THREE.ShapeGeometry(sideWindowShape);
  rightWindow.rotateX(0.15);
  rightWindow.rotateY(Math.PI * 0.5);
  rightWindow.translate(0.76, 0.98, 0.15);
  parts.push(rightWindow);

  // 5. Roof glass
  const roofGlass = new THREE.BoxGeometry(0.85, 0.02, 0.7);
  roofGlass.translate(0, 1.23, 0.15);
  parts.push(roofGlass);

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const p of parts) {
    p.dispose();
  }

  if (!merged) {
    throw new Error('Failed to merge cabin glass geometries');
  }

  return merged;
}

