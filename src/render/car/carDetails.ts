import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarDetailLevel } from '../../data/CarRenderBudget';
import { setGeometryVertexColor } from './carBody';
import type { CarInteriorResult } from './carInterior';
import type { CarMaterials } from './carMaterials';

export interface CarDetailGeometries {
  readonly aero: THREE.BufferGeometry[];
  readonly chrome: THREE.BufferGeometry[];
  readonly grille: THREE.BufferGeometry[];
  readonly underbody: THREE.BufferGeometry[];
  readonly headlightLED: THREE.BufferGeometry[];
  readonly headlightGlass: THREE.BufferGeometry[];
  readonly taillight: THREE.BufferGeometry[];
  readonly mirrorCaps: THREE.BufferGeometry[];
}

export interface StaticMeshDef {
  readonly geometry: THREE.BufferGeometry;
  readonly materialKey: 'body' | keyof CarMaterials;
  readonly castShadow: boolean;
}

export function mergeGeometryList(parts: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  for (const p of parts) {
    p.dispose();
  }
  return merged;
}

export function buildCarDetailGeometries(detail: CarDetailLevel): CarDetailGeometries {
  const cylSegs = detail === 'low' ? 8 : detail === 'medium' ? 12 : 16;

  const aero: THREE.BufferGeometry[] = [];
  const chrome: THREE.BufferGeometry[] = [];
  const grille: THREE.BufferGeometry[] = [];
  const underbody: THREE.BufferGeometry[] = [];
  const headlightLED: THREE.BufferGeometry[] = [];
  const headlightGlass: THREE.BufferGeometry[] = [];
  const taillight: THREE.BufferGeometry[] = [];
  const mirrorCaps: THREE.BufferGeometry[] = [];

  // Front Splitter
  const splitter = new THREE.BoxGeometry(1.78, 0.04, 0.4);
  splitter.translate(0, 0.13, -2.18);
  aero.push(splitter);

  // Main Grille
  const mainGrille = new THREE.BoxGeometry(1.05, 0.24, 0.1);
  mainGrille.translate(0, 0.32, -2.12);
  grille.push(mainGrille);

  // Side Inlets and Canards
  for (const xSide of [-0.68, 0.68]) {
    const inlet = new THREE.BoxGeometry(0.35, 0.18, 0.1);
    inlet.rotateY((xSide > 0 ? 1 : -1) * 0.2);
    inlet.translate(xSide, 0.3, -2.08);
    grille.push(inlet);

    const canard = new THREE.BoxGeometry(0.22, 0.02, 0.16);
    canard.rotateZ((xSide > 0 ? -1 : 1) * 0.25);
    canard.rotateY((xSide > 0 ? 1 : -1) * 0.3);
    canard.translate(xSide * 1.15, 0.32, -2.04);
    aero.push(canard);
  }

  // Headlights
  for (const xSide of [-0.64, 0.64]) {
    const sign = xSide > 0 ? 1 : -1;
    const boxPos = new THREE.Vector3(xSide, 0.56, -1.98);

    const housing = new THREE.BoxGeometry(0.32, 0.12, 0.2);
    housing.rotateY(sign * 0.32);
    housing.translate(boxPos.x, boxPos.y, boxPos.z);
    underbody.push(housing);

    if (detail !== 'low') {
      for (let l = -1; l <= 1; l += 2) {
        const projector = new THREE.CylinderGeometry(0.032, 0.032, 0.06, cylSegs);
        projector.rotateX(Math.PI * 0.5);
        projector.translate(l * 0.07, 0, -0.07);
        projector.rotateY(sign * 0.32);
        projector.translate(boxPos.x, boxPos.y, boxPos.z);
        headlightLED.push(projector);
      }
    }

    const drl = new THREE.BoxGeometry(0.28, 0.015, 0.04);
    drl.translate(0, -0.04, -0.09);
    drl.rotateY(sign * 0.32);
    drl.translate(boxPos.x, boxPos.y, boxPos.z);
    headlightLED.push(drl);

    const cover = new THREE.BoxGeometry(0.33, 0.13, 0.05);
    cover.translate(0, 0, -0.1);
    cover.rotateY(sign * 0.32);
    cover.translate(boxPos.x, boxPos.y, boxPos.z);
    headlightGlass.push(cover);
  }

  // Taillights
  const lightbar = new THREE.BoxGeometry(1.62, 0.05, 0.08);
  lightbar.translate(0, 0.77, 2.12);
  taillight.push(lightbar);

  for (const xSide of [-0.72, 0.72]) {
    const cluster = new THREE.BoxGeometry(0.28, 0.12, 0.1);
    cluster.rotateY((xSide > 0 ? 1 : -1) * -0.25);
    cluster.translate(xSide, 0.75, 2.1);
    taillight.push(cluster);
  }

  // Rear Diffuser
  const diffuserMain = new THREE.BoxGeometry(1.58, 0.22, 0.45);
  diffuserMain.rotateX(0.22);
  diffuserMain.translate(0, 0.23, 2.14);
  aero.push(diffuserMain);

  if (detail !== 'low') {
    for (let f = -3; f <= 3; f++) {
      if (f === 0) continue;
      const fin = new THREE.BoxGeometry(0.02, 0.18, 0.45);
      fin.rotateX(0.22);
      fin.translate(f * 0.21, 0.21, 2.14);
      aero.push(fin);
    }
  }

  // Exhaust Pipes
  for (const xPos of [-0.52, -0.4, 0.4, 0.52]) {
    const exhaust = new THREE.CylinderGeometry(0.048, 0.048, 0.22, cylSegs);
    exhaust.rotateX(Math.PI * 0.5);
    exhaust.translate(xPos, 0.29, 2.24);
    chrome.push(exhaust);

    const bore = new THREE.CylinderGeometry(0.04, 0.04, 0.02, cylSegs);
    bore.rotateX(Math.PI * 0.5);
    bore.translate(xPos, 0.29, 2.34);
    underbody.push(bore);
  }

  // Raised Rear GT Wing
  const wingY = 0.98;
  const wingZ = 1.95;

  const wingBlade = new THREE.BoxGeometry(1.72, 0.03, 0.28);
  wingBlade.rotateX(-0.1);
  wingBlade.translate(0, wingY, wingZ);
  aero.push(wingBlade);

  for (const xSide of [-0.86, 0.86]) {
    const endplate = new THREE.BoxGeometry(0.02, 0.12, 0.32);
    endplate.translate(xSide, wingY + 0.02, wingZ);
    aero.push(endplate);
  }

  for (const xSide of [-0.42, 0.42]) {
    const strut = new THREE.BoxGeometry(0.035, 0.22, 0.08);
    strut.rotateX(0.25);
    strut.translate(xSide, wingY - 0.1, wingZ + 0.02);
    chrome.push(strut);
  }

  // Side Mirrors, Skirts, Door Handles, Ducts
  for (const side of [-1, 1]) {
    const mirrorOrigin = new THREE.Vector3(side * 0.86, 0.86, -0.42);

    const mirrorArm = new THREE.BoxGeometry(0.12, 0.025, 0.04);
    mirrorArm.rotateZ(side * 0.2);
    mirrorArm.translate(mirrorOrigin.x + side * 0.06, mirrorOrigin.y, mirrorOrigin.z);
    aero.push(mirrorArm);

    const mirrorCap = new THREE.BoxGeometry(0.18, 0.11, 0.12);
    mirrorCap.translate(mirrorOrigin.x + side * 0.16, mirrorOrigin.y + 0.02, mirrorOrigin.z);
    mirrorCaps.push(mirrorCap);

    const reflectiveFace = new THREE.BoxGeometry(0.01, 0.09, 0.1);
    reflectiveFace.translate(
      mirrorOrigin.x + side * 0.12,
      mirrorOrigin.y + 0.02,
      mirrorOrigin.z + 0.04,
    );
    chrome.push(reflectiveFace);

    const skirt = new THREE.BoxGeometry(0.12, 0.06, 2.3);
    skirt.translate(side * 0.89, 0.14, 0);
    aero.push(skirt);

    const handle = new THREE.BoxGeometry(0.02, 0.03, 0.16);
    handle.translate(side * 0.91, 0.68, 0.05);
    chrome.push(handle);

    const duct = new THREE.BoxGeometry(0.1, 0.22, 0.35);
    duct.rotateY(side * 0.15);
    duct.translate(side * 0.88, 0.52, 0.88);
    grille.push(duct);
  }

  return { aero, chrome, grille, underbody, headlightLED, headlightGlass, taillight, mirrorCaps };
}

/**
 * Builds and merges all static mesh definitions for a given detail level.
 */
export function buildStaticMeshDefs(
  detail: CarDetailLevel,
  bodyShellGeom: THREE.BufferGeometry,
  underbodyGeom: THREE.BufferGeometry,
  cabinGlassGeom: THREE.BufferGeometry,
  detailParts: CarDetailGeometries,
  interior: CarInteriorResult,
): { staticMeshDefs: StaticMeshDef[]; ownedGeometries: THREE.BufferGeometry[] } {
  const staticMeshDefs: StaticMeshDef[] = [];
  const ownedGeometries: THREE.BufferGeometry[] = [];

  if (detail === 'low') {
    setGeometryVertexColor(bodyShellGeom, 1.0, 1.0, 1.0);
    setGeometryVertexColor(underbodyGeom, 0.1, 0.1, 0.1);

    const aeroParts = [
      bodyShellGeom,
      underbodyGeom,
      ...detailParts.aero,
      ...detailParts.chrome,
      ...detailParts.grille,
      ...detailParts.underbody,
      ...detailParts.mirrorCaps,
    ];
    for (const p of aeroParts) {
      if (p !== bodyShellGeom && p !== underbodyGeom) {
        setGeometryVertexColor(p, 0.16, 0.16, 0.16);
      }
    }

    const mergedBodyAero = BufferGeometryUtils.mergeGeometries(aeroParts, false)!;
    for (const p of aeroParts) p.dispose();
    ownedGeometries.push(mergedBodyAero);
    staticMeshDefs.push({ geometry: mergedBodyAero, materialKey: 'body', castShadow: true });

    const glassParts = [cabinGlassGeom, ...detailParts.headlightGlass];
    const mergedGlass = BufferGeometryUtils.mergeGeometries(glassParts, false)!;
    for (const p of glassParts) p.dispose();
    ownedGeometries.push(mergedGlass);
    staticMeshDefs.push({ geometry: mergedGlass, materialKey: 'glass', castShadow: false });

    const mergedTaillight = mergeGeometryList(detailParts.taillight);
    if (mergedTaillight) {
      ownedGeometries.push(mergedTaillight);
      staticMeshDefs.push({
        geometry: mergedTaillight,
        materialKey: 'taillightRed',
        castShadow: false,
      });
    }
  } else if (detail === 'medium') {
    const bodyParts = [bodyShellGeom, ...detailParts.mirrorCaps];
    const mergedBody = BufferGeometryUtils.mergeGeometries(bodyParts, false)!;
    for (const p of bodyParts) p.dispose();
    ownedGeometries.push(mergedBody);
    staticMeshDefs.push({ geometry: mergedBody, materialKey: 'body', castShadow: true });

    const glassParts = [cabinGlassGeom, ...detailParts.headlightGlass];
    const mergedGlass = BufferGeometryUtils.mergeGeometries(glassParts, false)!;
    for (const p of glassParts) p.dispose();
    ownedGeometries.push(mergedGlass);
    staticMeshDefs.push({ geometry: mergedGlass, materialKey: 'glass', castShadow: false });

    setGeometryVertexColor(underbodyGeom, 0.07, 0.07, 0.07);
    for (const p of detailParts.aero) setGeometryVertexColor(p, 0.12, 0.12, 0.12);
    for (const p of detailParts.underbody) setGeometryVertexColor(p, 0.07, 0.07, 0.07);
    for (const p of detailParts.grille) setGeometryVertexColor(p, 0.08, 0.08, 0.08);
    for (const p of detailParts.chrome) setGeometryVertexColor(p, 0.85, 0.85, 0.85);

    const trimParts = [
      underbodyGeom,
      ...detailParts.aero,
      ...detailParts.underbody,
      ...detailParts.grille,
      ...detailParts.chrome,
    ];
    if (interior.mediumMerged) {
      trimParts.push(interior.mediumMerged);
    }
    const mergedTrim = BufferGeometryUtils.mergeGeometries(trimParts, false)!;
    for (const p of trimParts) p.dispose();
    ownedGeometries.push(mergedTrim);
    staticMeshDefs.push({ geometry: mergedTrim, materialKey: 'trim', castShadow: true });

    const mergedLED = mergeGeometryList(detailParts.headlightLED);
    if (mergedLED) {
      ownedGeometries.push(mergedLED);
      staticMeshDefs.push({ geometry: mergedLED, materialKey: 'headlightLED', castShadow: false });
    }

    const mergedTaillight = mergeGeometryList(detailParts.taillight);
    if (mergedTaillight) {
      ownedGeometries.push(mergedTaillight);
      staticMeshDefs.push({
        geometry: mergedTaillight,
        materialKey: 'taillightRed',
        castShadow: false,
      });
    }
  } else {
    // High detail: merged by material
    const bodyParts = [bodyShellGeom, ...detailParts.mirrorCaps];
    const mergedBody = BufferGeometryUtils.mergeGeometries(bodyParts, false)!;
    for (const p of bodyParts) p.dispose();
    ownedGeometries.push(mergedBody);
    staticMeshDefs.push({ geometry: mergedBody, materialKey: 'body', castShadow: true });

    const mergedAero = mergeGeometryList(detailParts.aero);
    if (mergedAero) {
      ownedGeometries.push(mergedAero);
      staticMeshDefs.push({ geometry: mergedAero, materialKey: 'aero', castShadow: true });
    }

    const underbodyParts = [underbodyGeom, ...detailParts.underbody];
    if (interior.high?.darkLeather) underbodyParts.push(...interior.high.darkLeather);
    const mergedUnderbody = BufferGeometryUtils.mergeGeometries(underbodyParts, false)!;
    for (const p of underbodyParts) p.dispose();
    ownedGeometries.push(mergedUnderbody);
    staticMeshDefs.push({
      geometry: mergedUnderbody,
      materialKey: 'underbody',
      castShadow: false,
    });

    const glassParts = [cabinGlassGeom, ...detailParts.headlightGlass];
    const mergedGlass = BufferGeometryUtils.mergeGeometries(glassParts, false)!;
    for (const p of glassParts) p.dispose();
    ownedGeometries.push(mergedGlass);
    staticMeshDefs.push({ geometry: mergedGlass, materialKey: 'glass', castShadow: false });

    const chromeParts = [...detailParts.chrome];
    if (interior.high?.chrome) chromeParts.push(...interior.high.chrome);
    const mergedChrome = mergeGeometryList(chromeParts);
    if (mergedChrome) {
      ownedGeometries.push(mergedChrome);
      staticMeshDefs.push({ geometry: mergedChrome, materialKey: 'chrome', castShadow: false });
    }

    const mergedGrille = mergeGeometryList(detailParts.grille);
    if (mergedGrille) {
      ownedGeometries.push(mergedGrille);
      staticMeshDefs.push({ geometry: mergedGrille, materialKey: 'grille', castShadow: false });
    }

    const ledParts = [...detailParts.headlightLED];
    if (interior.high?.screens) ledParts.push(...interior.high.screens);
    const mergedLED = mergeGeometryList(ledParts);
    if (mergedLED) {
      ownedGeometries.push(mergedLED);
      staticMeshDefs.push({
        geometry: mergedLED,
        materialKey: 'headlightLED',
        castShadow: false,
      });
    }

    const mergedTaillight = mergeGeometryList(detailParts.taillight);
    if (mergedTaillight) {
      ownedGeometries.push(mergedTaillight);
      staticMeshDefs.push({
        geometry: mergedTaillight,
        materialKey: 'taillightRed',
        castShadow: false,
      });
    }

    if (interior.high?.redAccent && interior.high.redAccent.length > 0) {
      const mergedAccent = mergeGeometryList(interior.high.redAccent);
      if (mergedAccent) {
        ownedGeometries.push(mergedAccent);
        staticMeshDefs.push({
          geometry: mergedAccent,
          materialKey: 'brakeCaliper',
          castShadow: false,
        });
      }
    }
  }

  return { staticMeshDefs, ownedGeometries };
}
