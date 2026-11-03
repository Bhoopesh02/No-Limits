import * as THREE from 'three';
import type { CarDetailLevel } from '../../data/CarRenderBudget';
import type { CarTextures } from './carTextures';

export interface CarMaterials {
  readonly detail: CarDetailLevel;
  readonly bodyTemplate: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  readonly glass: THREE.MeshStandardMaterial;
  readonly taillightRed: THREE.MeshStandardMaterial;
  readonly headlightLED?: THREE.MeshStandardMaterial;
  readonly trim?: THREE.MeshStandardMaterial;
  readonly aero?: THREE.MeshStandardMaterial;
  readonly underbody?: THREE.MeshStandardMaterial;
  readonly chrome?: THREE.MeshStandardMaterial;
  readonly grille?: THREE.MeshStandardMaterial;
  readonly tireRubber?: THREE.MeshStandardMaterial;
  readonly alloyRim?: THREE.MeshStandardMaterial;
  readonly brakeDisc?: THREE.MeshStandardMaterial;
  readonly brakeCaliper?: THREE.MeshStandardMaterial;
  readonly wheel?: THREE.MeshStandardMaterial;
  readonly allSharedMaterials: readonly THREE.Material[];
  cloneBodyMaterial: (
    paintColor: string | number | THREE.Color,
  ) => THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

export function createCarMaterials(detail: CarDetailLevel, textures: CarTextures): CarMaterials {
  const materialsToDispose: THREE.Material[] = [];

  // 1. Cabin & lamp glass: strictly NO transmission at any level
  const glass = new THREE.MeshStandardMaterial({
    color: 0x050a12,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.6,
  });
  materialsToDispose.push(glass);

  // 2. Taillight emissive red (shared across instances)
  const taillightRed = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    emissive: 0xff0818,
    emissiveIntensity: 3.0,
    roughness: 0.3,
  });
  materialsToDispose.push(taillightRed);

  if (detail === 'low') {
    // Low tier: max 4 unique materials in an instance
    // Body + aero is one vertex-colored mesh with body material
    const bodyTemplate = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.5,
      roughness: 0.4,
      vertexColors: true,
    });
    materialsToDispose.push(bodyTemplate);

    const wheel = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2,
    });
    materialsToDispose.push(wheel);

    return {
      detail,
      bodyTemplate,
      glass,
      taillightRed,
      wheel,
      allSharedMaterials: [glass, taillightRed, wheel],
      cloneBodyMaterial: (paintColor) => {
        const cloned = bodyTemplate.clone();
        cloned.color.set(paintColor as THREE.ColorRepresentation);
        return cloned;
      },
      dispose: () => {
        for (const m of materialsToDispose) {
          m.dispose();
        }
        materialsToDispose.length = 0;
      },
    };
  }

  if (detail === 'medium') {
    // Medium tier: MeshStandardMaterial only, no clearcoat, max 8 unique materials
    const bodyTemplate = new THREE.MeshStandardMaterial({
      color: 0x3da5ff,
      metalness: 0.82,
      roughness: 0.22,
    });
    materialsToDispose.push(bodyTemplate);

    // Single vertex-colored trim material for aero, underbody, grille, exhausts, interior
    const trim = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.4,
      vertexColors: true,
    });
    materialsToDispose.push(trim);

    const headlightLED = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xd6f1ff,
      emissiveIntensity: 3.5,
      roughness: 0.2,
    });
    materialsToDispose.push(headlightLED);

    // Wheel roll material (tire + rim with vertex colors)
    const tireRubber = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.4,
      vertexColors: true,
    });
    materialsToDispose.push(tireRubber);

    const alloyRim = new THREE.MeshStandardMaterial({
      color: 0xe6e6e6,
      metalness: 0.92,
      roughness: 0.2,
    });
    materialsToDispose.push(alloyRim);

    const brakeCaliper = new THREE.MeshStandardMaterial({
      color: 0xdf1616,
      metalness: 0.4,
      roughness: 0.3,
    });
    materialsToDispose.push(brakeCaliper);

    return {
      detail,
      bodyTemplate,
      glass,
      taillightRed,
      headlightLED,
      trim,
      tireRubber,
      alloyRim,
      brakeCaliper,
      allSharedMaterials: [
        glass,
        taillightRed,
        headlightLED,
        trim,
        tireRubber,
        alloyRim,
        brakeCaliper,
      ],
      cloneBodyMaterial: (paintColor) => {
        const cloned = bodyTemplate.clone();
        cloned.color.set(paintColor as THREE.ColorRepresentation);
        return cloned;
      },
      dispose: () => {
        for (const m of materialsToDispose) {
          m.dispose();
        }
        materialsToDispose.length = 0;
      },
    };
  }

  // High tier: MeshPhysicalMaterial with clearcoat on body, textures kept, max 14 unique materials
  const bodyTemplate = new THREE.MeshPhysicalMaterial({
    color: 0x3da5ff,
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
  });
  materialsToDispose.push(bodyTemplate);

  const aero = new THREE.MeshStandardMaterial({
    color: 0x1f1f1f,
    roughness: 0.45,
    metalness: 0.65,
    map: textures.carbonFiber,
  });
  materialsToDispose.push(aero);

  const underbody = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
  });
  materialsToDispose.push(underbody);

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.98,
    roughness: 0.1,
  });
  materialsToDispose.push(chrome);

  const headlightLED = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd6f1ff,
    emissiveIntensity: 3.5,
    roughness: 0.2,
  });
  materialsToDispose.push(headlightLED);

  const grille = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.75,
    metalness: 0.3,
    map: textures.hexGrille,
  });
  materialsToDispose.push(grille);

  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.88,
    metalness: 0.08,
  });
  materialsToDispose.push(tireRubber);

  const alloyRim = new THREE.MeshStandardMaterial({
    color: 0xe6e6e6,
    metalness: 0.92,
    roughness: 0.2,
  });
  materialsToDispose.push(alloyRim);

  const brakeDisc = new THREE.MeshStandardMaterial({
    color: 0xb0b0b0,
    metalness: 0.85,
    roughness: 0.35,
    map: textures.brakeDisc,
  });
  materialsToDispose.push(brakeDisc);

  const brakeCaliper = new THREE.MeshStandardMaterial({
    color: 0xdf1616,
    metalness: 0.4,
    roughness: 0.3,
  });
  materialsToDispose.push(brakeCaliper);

  return {
    detail,
    bodyTemplate,
    glass,
    taillightRed,
    headlightLED,
    aero,
    underbody,
    chrome,
    grille,
    tireRubber,
    alloyRim,
    brakeDisc,
    brakeCaliper,
    allSharedMaterials: [
      glass,
      taillightRed,
      headlightLED,
      aero,
      underbody,
      chrome,
      grille,
      tireRubber,
      alloyRim,
      brakeDisc,
      brakeCaliper,
    ],
    cloneBodyMaterial: (paintColor) => {
      const cloned = bodyTemplate.clone();
      cloned.color.set(paintColor as THREE.ColorRepresentation);
      return cloned;
    },
    dispose: () => {
      for (const m of materialsToDispose) {
        m.dispose();
      }
      materialsToDispose.length = 0;
    },
  };
}
