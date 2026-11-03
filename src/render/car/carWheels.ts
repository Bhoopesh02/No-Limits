import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CarDetailLevel } from '../../data/CarRenderBudget';
import type { CarMaterials } from './carMaterials';

export interface WheelAssembly {
  readonly root: THREE.Group;
  readonly steer: THREE.Group;
  readonly roll: THREE.Group;
}

export interface KazeWheels {
  readonly 0: WheelAssembly;
  readonly 1: WheelAssembly;
  readonly 2: WheelAssembly;
  readonly 3: WheelAssembly;
  readonly [index: number]: WheelAssembly | undefined;
  readonly frontLeft: WheelAssembly;
  readonly frontRight: WheelAssembly;
  readonly rearLeft: WheelAssembly;
  readonly rearRight: WheelAssembly;
}

export interface SharedWheelGeometries {
  readonly tireGeom: THREE.BufferGeometry;
  readonly rimGeomLeft?: THREE.BufferGeometry;
  readonly rimGeomRight?: THREE.BufferGeometry;
  readonly discGeomLeft?: THREE.BufferGeometry;
  readonly discGeomRight?: THREE.BufferGeometry;
  readonly caliperGeomLeft?: THREE.BufferGeometry;
  readonly caliperGeomRight?: THREE.BufferGeometry;
  readonly simpleWheelGeom?: THREE.BufferGeometry;
  readonly mediumRollGeomLeft?: THREE.BufferGeometry;
  readonly mediumRollGeomRight?: THREE.BufferGeometry;
  dispose: () => void;
}

/**
 * Builds the shared wheel geometries for a given detail level.
 * Built once by CarFactory and reused across all instances.
 */
export function buildSharedWheelGeometries(detail: CarDetailLevel): SharedWheelGeometries {
  const geometriesToDispose: THREE.BufferGeometry[] = [];

  if (detail === 'low') {
    // Minimal segment single wheel geometry (tire + rim combined)
    const simpleWheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 16, 1);
    simpleWheelGeom.rotateZ(Math.PI * 0.5);
    geometriesToDispose.push(simpleWheelGeom);

    return {
      tireGeom: simpleWheelGeom,
      simpleWheelGeom,
      dispose: () => {
        for (const g of geometriesToDispose) {
          g.dispose();
        }
        geometriesToDispose.length = 0;
      },
    };
  }

  const tireRadialSegs = detail === 'medium' ? 20 : 28;
  const rimRadialSegs = detail === 'medium' ? 18 : 24;
  const torusTubularSegs = detail === 'medium' ? 8 : 12;
  const numSpokes = detail === 'medium' ? 8 : 10;

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

  // Brake disc & caliper geometries
  const discGeomLeft = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24);
  discGeomLeft.rotateZ(Math.PI * 0.5);
  discGeomLeft.translate(-1 * 0.04, 0, 0);
  geometriesToDispose.push(discGeomLeft);

  const discGeomRight = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24);
  discGeomRight.rotateZ(Math.PI * 0.5);
  discGeomRight.translate(1 * 0.04, 0, 0);
  geometriesToDispose.push(discGeomRight);

  const caliperGeomLeft = new THREE.BoxGeometry(0.065, 0.13, 0.08);
  caliperGeomLeft.rotateZ(-1 * 0.1);
  caliperGeomLeft.translate(-1 * 0.04, 0.14, -0.06);
  geometriesToDispose.push(caliperGeomLeft);

  const caliperGeomRight = new THREE.BoxGeometry(0.065, 0.13, 0.08);
  caliperGeomRight.rotateZ(1 * 0.1);
  caliperGeomRight.translate(1 * 0.04, 0.14, -0.06);
  geometriesToDispose.push(caliperGeomRight);

  let mediumRollGeomLeft: THREE.BufferGeometry | undefined;
  let mediumRollGeomRight: THREE.BufferGeometry | undefined;

  if (detail === 'medium') {
    // Merge tire + rim into 1 vertex-colored roll geometry per side to meet budget (16 max meshes)
    function buildMediumRoll(rimGeom: THREE.BufferGeometry): THREE.BufferGeometry {
      const tireClone = tireGeom.clone();
      const rimClone = rimGeom.clone();

      const tirePos = tireClone.getAttribute('position');
      const tireColors = new Float32Array(tirePos.count * 3);
      for (let i = 0; i < tirePos.count; i++) {
        tireColors[i * 3] = 0.1;
        tireColors[i * 3 + 1] = 0.1;
        tireColors[i * 3 + 2] = 0.1;
      }
      tireClone.setAttribute('color', new THREE.BufferAttribute(tireColors, 3));

      const rimPos = rimClone.getAttribute('position');
      const rimColors = new Float32Array(rimPos.count * 3);
      for (let i = 0; i < rimPos.count; i++) {
        rimColors[i * 3] = 0.9;
        rimColors[i * 3 + 1] = 0.9;
        rimColors[i * 3 + 2] = 0.9;
      }
      rimClone.setAttribute('color', new THREE.BufferAttribute(rimColors, 3));

      const merged = BufferGeometryUtils.mergeGeometries([tireClone, rimClone], false)!;
      tireClone.dispose();
      rimClone.dispose();
      return merged;
    }

    mediumRollGeomLeft = buildMediumRoll(rimGeomLeft);
    mediumRollGeomRight = buildMediumRoll(rimGeomRight);
    geometriesToDispose.push(mediumRollGeomLeft, mediumRollGeomRight);
  }

  return {
    tireGeom,
    rimGeomLeft,
    rimGeomRight,
    discGeomLeft,
    discGeomRight,
    caliperGeomLeft,
    caliperGeomRight,
    mediumRollGeomLeft,
    mediumRollGeomRight,
    dispose: () => {
      for (const g of geometriesToDispose) {
        g.dispose();
      }
      geometriesToDispose.length = 0;
    },
  };
}

/**
 * Creates wheel assemblies for a car instance reusing shared wheel geometries and materials.
 */
export function createWheelAssemblies(
  detail: CarDetailLevel,
  materials: CarMaterials,
  geometries: SharedWheelGeometries,
): { wheels: KazeWheels; meshes: THREE.Mesh[] } {
  const meshes: THREE.Mesh[] = [];

  function createAssembly(isFront: boolean, side: -1 | 1): WheelAssembly {
    const wheelRoot = new THREE.Group();
    wheelRoot.name = (isFront ? 'Front' : 'Rear') + (side < 0 ? 'Left' : 'Right') + 'Wheel';

    const steerGroup = new THREE.Group();
    steerGroup.name = 'SteerPivot';
    wheelRoot.add(steerGroup);

    const rollGroup = new THREE.Group();
    rollGroup.name = 'RollHub';
    steerGroup.add(rollGroup);

    if (detail === 'low') {
      // Low: 1 simple wheel mesh per wheel
      const mat = materials.wheel ?? materials.glass;
      const mesh = new THREE.Mesh(geometries.simpleWheelGeom ?? geometries.tireGeom, mat);
      mesh.castShadow = true;
      rollGroup.add(mesh);
      meshes.push(mesh);

      return { root: wheelRoot, steer: steerGroup, roll: rollGroup };
    }

    if (detail === 'medium') {
      // Medium: 1 merged roll mesh (tire + rim) + 1 caliper in steer group
      const rollGeom = side < 0 ? geometries.mediumRollGeomLeft! : geometries.mediumRollGeomRight!;
      const rollMesh = new THREE.Mesh(rollGeom, materials.tireRubber);
      rollMesh.castShadow = true;
      rollGroup.add(rollMesh);
      meshes.push(rollMesh);

      if (materials.brakeCaliper && geometries.caliperGeomLeft && geometries.caliperGeomRight) {
        const caliperGeom = side < 0 ? geometries.caliperGeomLeft : geometries.caliperGeomRight;
        const caliper = new THREE.Mesh(caliperGeom, materials.brakeCaliper);
        steerGroup.add(caliper);
        meshes.push(caliper);
      }

      return { root: wheelRoot, steer: steerGroup, roll: rollGroup };
    }

    // High: Tire + Rim + Disc in roll group, Caliper in steer group
    // 1. Tire
    const tire = new THREE.Mesh(geometries.tireGeom, materials.tireRubber);
    tire.castShadow = true;
    rollGroup.add(tire);
    meshes.push(tire);

    // 2. Rim
    const rimGeom = side < 0 ? geometries.rimGeomLeft! : geometries.rimGeomRight!;
    const rim = new THREE.Mesh(rimGeom, materials.alloyRim);
    rim.castShadow = true;
    rollGroup.add(rim);
    meshes.push(rim);

    // 3. Brake Disc (disc in roll group)
    if (materials.brakeDisc && geometries.discGeomLeft) {
      const discGeom = side < 0 ? geometries.discGeomLeft : geometries.discGeomRight!;
      const disc = new THREE.Mesh(discGeom, materials.brakeDisc);
      rollGroup.add(disc);
      meshes.push(disc);
    }

    // 4. Caliper in steer group (stationary relative to wheel spin)
    if (materials.brakeCaliper && geometries.caliperGeomLeft && geometries.caliperGeomRight) {
      const caliperGeom = side < 0 ? geometries.caliperGeomLeft : geometries.caliperGeomRight;
      const caliper = new THREE.Mesh(caliperGeom, materials.brakeCaliper);
      steerGroup.add(caliper);
      meshes.push(caliper);
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

  const wheelFL = createAssembly(true, -1);
  wheelFL.root.position.set(-trackWidthX, wheelPosY, frontAxleZ);

  const wheelFR = createAssembly(true, 1);
  wheelFR.root.position.set(trackWidthX, wheelPosY, frontAxleZ);

  const wheelRL = createAssembly(false, -1);
  wheelRL.root.position.set(-trackWidthX, wheelPosY, rearAxleZ);

  const wheelRR = createAssembly(false, 1);
  wheelRR.root.position.set(trackWidthX, wheelPosY, rearAxleZ);

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

  return { wheels, meshes };
}
