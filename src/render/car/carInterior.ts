import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarDetailLevel } from '../../data/CarRenderBudget';
import { setGeometryVertexColor } from './carBody';

export interface HighInteriorGeometries {
  readonly darkLeather: THREE.BufferGeometry[];
  readonly redAccent: THREE.BufferGeometry[];
  readonly screens: THREE.BufferGeometry[];
  readonly chrome: THREE.BufferGeometry[];
}

export interface CarInteriorResult {
  readonly high?: HighInteriorGeometries;
  readonly mediumMerged?: THREE.BufferGeometry;
}

/**
 * Builds interior cockpit geometries.
 * - High: full interior with bucket seats, screens, steering wheel, console.
 * - Medium: simplified interior (tub, seats, and dash merged into 1 vertex-colored mesh).
 * - Low: no interior.
 */
export function buildCarInterior(detail: CarDetailLevel): CarInteriorResult {
  if (detail === 'low') {
    return {};
  }

  if (detail === 'medium') {
    // Simplified interior: tub, 2 seats, dash merged into ONE vertex-colored geometry
    const parts: THREE.BufferGeometry[] = [];

    // Tub
    const tub = new THREE.BoxGeometry(1.4, 0.45, 1.3);
    tub.translate(0, 0.45, 0.15);
    setGeometryVertexColor(tub, 0.1, 0.1, 0.1);
    parts.push(tub);

    // Seats
    for (const xSide of [-0.34, 0.34]) {
      const seatBase = new THREE.BoxGeometry(0.42, 0.14, 0.44);
      seatBase.translate(xSide, 0.38, 0.22);
      setGeometryVertexColor(seatBase, 0.12, 0.12, 0.12);
      parts.push(seatBase);

      const backrest = new THREE.BoxGeometry(0.42, 0.54, 0.12);
      backrest.rotateX(-0.22);
      backrest.translate(xSide, 0.38 + 0.28, 0.22 + 0.2);
      setGeometryVertexColor(backrest, 0.12, 0.12, 0.12);
      parts.push(backrest);
    }

    // Dash
    const dash = new THREE.BoxGeometry(1.36, 0.22, 0.38);
    dash.translate(0, 0.72, -0.32);
    setGeometryVertexColor(dash, 0.08, 0.08, 0.08);
    parts.push(dash);

    const merged = BufferGeometryUtils.mergeGeometries(parts, false);
    for (const p of parts) {
      p.dispose();
    }

    return {
      mediumMerged: merged ?? undefined,
    };
  }

  // High detail full interior
  const darkLeather: THREE.BufferGeometry[] = [];
  const redAccent: THREE.BufferGeometry[] = [];
  const screens: THREE.BufferGeometry[] = [];
  const chrome: THREE.BufferGeometry[] = [];

  // Cockpit tub
  const tub = new THREE.BoxGeometry(1.4, 0.45, 1.3);
  tub.translate(0, 0.45, 0.15);
  darkLeather.push(tub);

  // Bucket seats
  for (const xSide of [-0.34, 0.34]) {
    const seatOrigin = new THREE.Vector3(xSide, 0.38, 0.22);

    const seatBase = new THREE.BoxGeometry(0.42, 0.14, 0.44);
    seatBase.translate(seatOrigin.x, seatOrigin.y, seatOrigin.z);
    darkLeather.push(seatBase);

    const backrest = new THREE.BoxGeometry(0.42, 0.54, 0.12);
    backrest.rotateX(-0.22);
    backrest.translate(seatOrigin.x, seatOrigin.y + 0.28, seatOrigin.z + 0.2);
    darkLeather.push(backrest);

    const stripe = new THREE.BoxGeometry(0.09, 0.52, 0.02);
    stripe.rotateX(-0.22);
    stripe.translate(seatOrigin.x, seatOrigin.y + 0.28, seatOrigin.z + 0.14);
    redAccent.push(stripe);

    const headrest = new THREE.BoxGeometry(0.24, 0.16, 0.1);
    headrest.rotateX(-0.15);
    headrest.translate(seatOrigin.x, seatOrigin.y + 0.6, seatOrigin.z + 0.26);
    darkLeather.push(headrest);
  }

  // Dashboard & Screens
  const dash = new THREE.BoxGeometry(1.36, 0.22, 0.38);
  dash.translate(0, 0.72, -0.32);
  darkLeather.push(dash);

  const cluster = new THREE.BoxGeometry(0.28, 0.1, 0.02);
  cluster.rotateX(-0.3);
  cluster.translate(-0.34, 0.76, -0.24);
  screens.push(cluster);

  const centerScreen = new THREE.BoxGeometry(0.24, 0.14, 0.02);
  centerScreen.rotateX(-0.3);
  centerScreen.rotateY(-0.15);
  centerScreen.translate(0, 0.72, -0.24);
  screens.push(centerScreen);

  // Steering wheel
  const wheelOrigin = new THREE.Vector3(-0.34, 0.72, -0.18);

  const rim = new THREE.TorusGeometry(0.14, 0.016, 12, 24);
  rim.rotateX(-0.38);
  rim.translate(wheelOrigin.x, wheelOrigin.y, wheelOrigin.z);
  darkLeather.push(rim);

  const spoke = new THREE.BoxGeometry(0.22, 0.025, 0.02);
  spoke.rotateX(-0.38);
  spoke.translate(wheelOrigin.x, wheelOrigin.y, wheelOrigin.z);
  chrome.push(spoke);

  const hub = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 16);
  hub.rotateX(Math.PI * 0.5 - 0.38);
  hub.translate(wheelOrigin.x, wheelOrigin.y, wheelOrigin.z);
  darkLeather.push(hub);

  // Center console & shifter
  const consoleGeom = new THREE.BoxGeometry(0.24, 0.2, 0.65);
  consoleGeom.translate(0, 0.48, 0.08);
  darkLeather.push(consoleGeom);

  const shifter = new THREE.CylinderGeometry(0.015, 0.02, 0.08, 12);
  shifter.translate(0, 0.62, 0.02);
  chrome.push(shifter);

  return {
    high: {
      darkLeather,
      redAccent,
      screens,
      chrome,
    },
  };
}
