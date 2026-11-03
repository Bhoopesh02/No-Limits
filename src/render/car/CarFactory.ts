import * as THREE from 'three';
import type { CarDetailLevel } from '../../data/CarRenderBudget';
import { collectMeshStats, type MeshStats } from '../sceneAudit';
import { buildCabinGlassGeometry, buildUnderbodyGeometry, buildBodyShellGeometry } from './carBody';
import { buildCarDetailGeometries, buildStaticMeshDefs, type StaticMeshDef } from './carDetails';
import { buildCarInterior } from './carInterior';
import { createCarMaterials, type CarMaterials } from './carMaterials';
import { createCarTextures, type CarTextures } from './carTextures';
import {
  buildSharedWheelGeometries,
  createWheelAssemblies,
  type KazeWheels,
  type SharedWheelGeometries,
} from './carWheels';

export interface CarInstance {
  readonly root: THREE.Group;
  readonly wheels: KazeWheels;
  readonly stats: MeshStats;
  setPaintColor: (color: string | number | THREE.Color) => void;
  setReversing: (isReversing: boolean) => void;
  getTaillightMaterial: () => THREE.MeshStandardMaterial;
  dispose: () => void;
}

interface CarTemplate {
  readonly detail: CarDetailLevel;
  readonly textures: CarTextures;
  readonly materials: CarMaterials;
  readonly wheelGeometries: SharedWheelGeometries;
  readonly staticMeshDefs: readonly StaticMeshDef[];
  readonly ownedGeometries: readonly THREE.BufferGeometry[];
  dispose: () => void;
}

export class CarFactory {
  private readonly templates = new Map<CarDetailLevel, CarTemplate>();

  /**
   * Retrieves or builds a cached car template for the requested detail level.
   */
  public getTemplate(detail: CarDetailLevel): CarTemplate {
    let template = this.templates.get(detail);
    if (!template) {
      template = this.buildTemplate(detail);
      this.templates.set(detail, template);
    }
    return template;
  }

  /**
   * Creates an instance of a car at the specified detail level.
   * Reuses shared geometries and materials from the factory.
   * Only the body paint material is cloned per instance.
   */
  public create(
    detail: CarDetailLevel,
    paintColor: string | number | THREE.Color = 0x3da5ff,
  ): CarInstance {
    const template = this.getTemplate(detail);
    const root = new THREE.Group();
    root.name = `CarInstance_${detail}`;

    // 1. Cloned body paint material for this instance
    const clonedBodyMat = template.materials.cloneBodyMaterial(paintColor);

    // 2. Add static meshes
    for (const def of template.staticMeshDefs) {
      const mat =
        def.materialKey === 'body'
          ? clonedBodyMat
          : (template.materials[def.materialKey] as THREE.Material);
      const mesh = new THREE.Mesh(def.geometry, mat);
      mesh.castShadow = def.castShadow;
      root.add(mesh);
    }

    // 3. Add wheels
    const { wheels } = createWheelAssemblies(detail, template.materials, template.wheelGeometries);
    root.add(wheels.frontLeft.root);
    root.add(wheels.frontRight.root);
    root.add(wheels.rearLeft.root);
    root.add(wheels.rearRight.root);

    // 4. Compute stats once
    const stats = collectMeshStats(root);

    let isCurrentlyReversing = false;
    const setReversing = (isReversing: boolean): void => {
      if (isCurrentlyReversing === isReversing) return;
      isCurrentlyReversing = isReversing;
      if (isReversing) {
        template.materials.taillightRed.emissive.setHex(0xf0f5ff);
        template.materials.taillightRed.emissiveIntensity = 5.0;
      } else {
        template.materials.taillightRed.emissive.setHex(0xff0818);
        template.materials.taillightRed.emissiveIntensity = 3.0;
      }
    };

    const setPaintColor = (color: string | number | THREE.Color): void => {
      clonedBodyMat.color.set(color as THREE.ColorRepresentation);
    };

    const getTaillightMaterial = (): THREE.MeshStandardMaterial => template.materials.taillightRed;

    const dispose = (): void => {
      clonedBodyMat.dispose();
      root.clear();
    };

    return {
      root,
      wheels,
      stats,
      setPaintColor,
      setReversing,
      getTaillightMaterial,
      dispose,
    };
  }

  /**
   * Disposes all shared resources across all detail levels and clears the cache.
   */
  public dispose(): void {
    for (const t of this.templates.values()) {
      t.dispose();
    }
    this.templates.clear();
  }

  private buildTemplate(detail: CarDetailLevel): CarTemplate {
    const textures = createCarTextures(detail);
    const materials = createCarMaterials(detail, textures);
    const wheelGeometries = buildSharedWheelGeometries(detail);

    const bodyShellGeom = buildBodyShellGeometry(detail);
    const underbodyGeom = buildUnderbodyGeometry();
    const cabinGlassGeom = buildCabinGlassGeometry();
    const detailParts = buildCarDetailGeometries(detail);
    const interior = buildCarInterior(detail);

    const { staticMeshDefs, ownedGeometries } = buildStaticMeshDefs(
      detail,
      bodyShellGeom,
      underbodyGeom,
      cabinGlassGeom,
      detailParts,
      interior,
    );

    return {
      detail,
      textures,
      materials,
      wheelGeometries,
      staticMeshDefs,
      ownedGeometries,
      dispose: () => {
        wheelGeometries.dispose();
        materials.dispose();
        textures.dispose();
        for (const g of ownedGeometries) {
          g.dispose();
        }
      },
    };
  }
}
