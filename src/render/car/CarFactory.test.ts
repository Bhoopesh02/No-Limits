import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CAR_RENDER_BUDGETS, type CarDetailLevel } from '../../data/CarRenderBudget';
import { CarFactory } from './CarFactory';

describe('CarFactory', () => {
  const levels: CarDetailLevel[] = ['low', 'medium', 'high'];

  it('builds cars within budget for each detail level with zero transmission and no NaNs', () => {
    const factory = new CarFactory();

    for (const detail of levels) {
      const budget = CAR_RENDER_BUDGETS[detail];
      const car = factory.create(detail, '#3DA5FF');

      // 1. Budget checks
      expect(
        car.stats.meshes,
        `${detail} meshes (${car.stats.meshes}) exceeds budget (${budget.maxMeshes})`,
      ).toBeLessThanOrEqual(budget.maxMeshes);

      expect(
        car.stats.uniqueMaterials,
        `${detail} unique materials (${car.stats.uniqueMaterials}) exceeds budget (${budget.maxUniqueMaterials})`,
      ).toBeLessThanOrEqual(budget.maxUniqueMaterials);

      expect(
        car.stats.triangles,
        `${detail} triangles (${car.stats.triangles}) exceeds budget (${budget.maxTriangles})`,
      ).toBeLessThanOrEqual(budget.maxTriangles);

      // 2. Strict transmission check (must be 0 on every material)
      car.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            const phys = m as unknown as { transmission?: number };
            expect(phys.transmission ?? 0).toBe(0);
          }

          // 3. No NaN in any geometry position
          const posAttr = obj.geometry.getAttribute('position');
          expect(posAttr).toBeDefined();
          for (let i = 0; i < posAttr.array.length; i++) {
            expect(Number.isNaN(posAttr.array[i])).toBe(false);
          }
        }
      });

      // 4. Wheel and steering references exist
      expect(car.wheels.frontLeft).toBeDefined();
      expect(car.wheels.frontRight).toBeDefined();
      expect(car.wheels.rearLeft).toBeDefined();
      expect(car.wheels.rearRight).toBeDefined();
      expect(car.wheels.frontLeft.steer).toBeDefined();
      expect(car.wheels.frontLeft.roll).toBeDefined();
      expect(car.wheels[0]).toBe(car.wheels.frontLeft);
      expect(car.wheels[1]).toBe(car.wheels.frontRight);
      expect(car.wheels[2]).toBe(car.wheels.rearLeft);
      expect(car.wheels[3]).toBe(car.wheels.rearRight);

      car.dispose();
    }

    factory.dispose();
  });

  it('ensures Low and Medium use no texture maps; High textures are shared across instances', () => {
    const factory = new CarFactory();

    // Low and Medium
    for (const detail of ['low', 'medium'] as const) {
      const car = factory.create(detail);
      car.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            const std = m as THREE.MeshStandardMaterial;
            expect(std.map).toBeNull();
            expect(std.normalMap).toBeNull();
            expect(std.roughnessMap).toBeNull();
            expect(std.metalnessMap).toBeNull();
          }
        }
      });
      car.dispose();
    }

    // High
    const carHigh1 = factory.create('high');
    const carHigh2 = factory.create('high');

    const textures1 = new Set<THREE.Texture>();
    const textures2 = new Set<THREE.Texture>();

    carHigh1.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map) textures1.add(std.map);
        }
      }
    });

    carHigh2.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map) textures2.add(std.map);
        }
      }
    });

    // In Node headless environment, procedural textures are null
    expect(textures1.size).toBe(0);

    carHigh1.dispose();
    carHigh2.dispose();
    factory.dispose();

    // Browser simulation with mock document.createElement('canvas')
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: () => {},
        beginPath: () => {},
        arc: () => {},
        stroke: () => {},
        fill: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
      }),
    };
    const origDoc = globalThis.document;
    (globalThis as unknown as { document: unknown }).document = {
      createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : {}),
    };

    try {
      const browserFactory = new CarFactory();
      const bHigh1 = browserFactory.create('high');
      const bHigh2 = browserFactory.create('high');

      const bTex1 = new Set<THREE.Texture>();
      const bTex2 = new Set<THREE.Texture>();

      bHigh1.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            const std = m as THREE.MeshStandardMaterial;
            if (std.map) bTex1.add(std.map);
          }
        }
      });

      bHigh2.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            const std = m as THREE.MeshStandardMaterial;
            if (std.map) bTex2.add(std.map);
          }
        }
      });

      // High in browser has 3 textures: carbonFiber (aero), hexGrille (grille), brakeDisc (wheels)
      expect(bTex1.size).toBe(3);
      expect(bTex2.size).toBe(3);
      for (const tex of bTex1) {
        expect(bTex2.has(tex)).toBe(true);
      }

      bHigh1.dispose();
      bHigh2.dispose();
      browserFactory.dispose();
    } finally {
      (globalThis as unknown as { document: unknown }).document = origDoc;
    }
  });

  it('shares geometries and materials across two instances except for cloned body paint', () => {
    const factory = new CarFactory();

    for (const detail of levels) {
      const car1 = factory.create(detail, '#3DA5FF');
      const car2 = factory.create(detail, '#FF4D5E');

      const geoms1 = new Set<THREE.BufferGeometry>();
      const geoms2 = new Set<THREE.BufferGeometry>();
      const mats1 = new Set<THREE.Material>();
      const mats2 = new Set<THREE.Material>();

      car1.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          geoms1.add(obj.geometry);
          const mList = Array.isArray(obj.material) ? obj.material : [obj.material];
          mList.forEach((m) => mats1.add(m));
        }
      });

      car2.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          geoms2.add(obj.geometry);
          const mList = Array.isArray(obj.material) ? obj.material : [obj.material];
          mList.forEach((m) => mats2.add(m));
        }
      });

      // Geometries are 100% shared
      expect(geoms1.size).toBe(geoms2.size);
      for (const g of geoms1) {
        expect(geoms2.has(g)).toBe(true);
      }

      // Materials: exactly 1 material is NOT shared (the body paint material)
      let unsharedMats1 = 0;
      for (const m of mats1) {
        if (!mats2.has(m)) {
          unsharedMats1++;
        }
      }
      expect(unsharedMats1).toBe(1);

      // Paints can differ
      let paint1Hex = '';
      let paint2Hex = '';
      car1.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !mats2.has(obj.material as THREE.Material)) {
          paint1Hex = '#' + (obj.material as THREE.MeshStandardMaterial).color.getHexString();
        }
      });
      car2.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !mats1.has(obj.material as THREE.Material)) {
          paint2Hex = '#' + (obj.material as THREE.MeshStandardMaterial).color.getHexString();
        }
      });

      expect(paint1Hex.toLowerCase()).toBe('#3da5ff');
      expect(paint2Hex.toLowerCase()).toBe('#ff4d5e');

      car1.dispose();
      car2.dispose();
    }

    factory.dispose();
  });

  it('supports repeated create and dispose cycles without memory leaks or stale cache errors', () => {
    const factory = new CarFactory();

    for (let i = 0; i < 5; i++) {
      const car = factory.create('medium', '#3DA5FF');
      expect(car.root.children.length).toBeGreaterThan(0);
      car.dispose();
      expect(car.root.children.length).toBe(0);
    }

    factory.dispose();

    // Re-creating after factory.dispose() rebuilds cleanly
    const freshCar = factory.create('medium', '#3DA5FF');
    expect(freshCar.root.children.length).toBeGreaterThan(0);
    freshCar.dispose();
    factory.dispose();
  });

  it('toggles taillight emissive intensity and color on reverse', () => {
    const factory = new CarFactory();
    const car = factory.create('medium');

    const taillightMat = car.getTaillightMaterial();
    expect(taillightMat.emissiveIntensity).toBe(3.0);
    expect(taillightMat.emissive.getHexString()).toBe('ff0818');

    car.setReversing(true);
    expect(taillightMat.emissiveIntensity).toBe(5.0);
    expect(taillightMat.emissive.getHexString()).toBe('f0f5ff');

    car.setReversing(false);
    expect(taillightMat.emissiveIntensity).toBe(3.0);
    expect(taillightMat.emissive.getHexString()).toBe('ff0818');

    car.dispose();
    factory.dispose();
  });

  it('does not leak geometries or rebuild templates across 5 race restarts with a shared CarFactory', () => {
    const factory = new CarFactory();

    // 1st run creates template
    const car1 = factory.create('medium');
    const template = factory.getTemplate('medium');
    const initialGeomCount = template.ownedGeometries.length;
    car1.dispose();

    // 5 restart cycles
    for (let i = 0; i < 5; i++) {
      const car = factory.create('medium');
      expect(car.stats.meshes).toBe(13);
      car.dispose();
      expect(template.ownedGeometries.length).toBe(initialGeomCount);
    }

    factory.dispose();
  });
});
