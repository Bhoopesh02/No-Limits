import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createKazeCar, GraphicsTier } from './createKazeCar';

describe('createKazeCar', () => {
  it('creates low tier car with under 40 meshes and simplified features', () => {
    const car = createKazeCar({ tier: 'low', paintColor: '#3DA5FF' });

    let meshCount = 0;
    let triangleCount = 0;
    car.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshCount++;
        const posAttr = obj.geometry.getAttribute('position');
        if (obj.geometry.index) {
          triangleCount += obj.geometry.index.count / 3;
        } else if (posAttr) {
          triangleCount += posAttr.count / 3;
        }
      }
    });

    expect(meshCount).toBeLessThan(40);
    expect(meshCount).toBe(18); // 10 merged static body meshes + 8 wheel meshes (2 per wheel)
    expect(triangleCount).toBeGreaterThan(500);
    expect(triangleCount).toBeLessThan(4000);

    // Wheels check
    expect(car.wheels.frontLeft).toBeDefined();
    expect(car.wheels.frontRight).toBeDefined();
    expect(car.wheels.rearLeft).toBeDefined();
    expect(car.wheels.rearRight).toBeDefined();

    // Low tier should not have brake calipers in steer group
    expect(car.wheels.frontLeft.steer.children.length).toBe(1); // Only roll group, no caliper

    car.dispose();
  });

  it('creates medium tier car with brake discs, calipers, and 8 spokes', () => {
    const car = createKazeCar({ tier: 'medium', paintColor: '#FF4D5E' });

    let meshCount = 0;
    let triangleCount = 0;
    car.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshCount++;
        if (obj.geometry.index) {
          triangleCount += obj.geometry.index.count / 3;
        }
      }
    });

    expect(meshCount).toBeLessThan(40);
    expect(meshCount).toBe(26); // 10 static + 16 wheel (4 per wheel: tire, rim, disc, caliper)
    expect(triangleCount).toBeGreaterThan(1500);

    // Medium tier has caliper in steer group
    expect(car.wheels.frontLeft.steer.children.length).toBe(2); // roll group + caliper mesh
    // Roll group has tire, rim, disc
    expect(car.wheels.frontLeft.roll.children.length).toBe(3);

    car.dispose();
  });

  it('creates high tier car with full detail interior and clearcoat body material', () => {
    const car = createKazeCar({ tier: 'high', paintColor: '#FFC933' });

    let meshCount = 0;
    let triangleCount = 0;
    let foundClearcoat = false;

    car.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshCount++;
        if (obj.geometry.index) {
          triangleCount += obj.geometry.index.count / 3;
        }
        if (obj.material instanceof THREE.MeshPhysicalMaterial) {
          if (obj.material.clearcoat > 0) {
            foundClearcoat = true;
          }
          // Requirement: strictly no transmission anywhere
          expect((obj.material as unknown as { transmission: number }).transmission ?? 0).toBe(0);
        }
      }
    });

    expect(foundClearcoat).toBe(true);
    expect(meshCount).toBe(29); // 13 static (with interior) + 16 wheel
    expect(triangleCount).toBeGreaterThan(3000);

    car.dispose();
  });

  it('allows paint color configuration and dynamic updates', () => {
    const car = createKazeCar({ tier: 'medium', paintColor: '#FF4D5E' });

    car.setPaintColor('#00E5FF');
    // Traverse to verify paint color on body mesh
    let bodyColorHex = '';
    car.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        if (obj.material.metalness === 0.82) {
          bodyColorHex = '#' + obj.material.color.getHexString().toUpperCase();
        }
      }
    });

    expect(bodyColorHex).toBe('#00E5FF');
    car.dispose();
  });

  it('maintains local forward direction at -Z with axle placement', () => {
    const car = createKazeCar({ tier: 'low' });

    // Front wheels should have negative Z (forward), rear wheels positive Z
    expect(car.wheels.frontLeft.root.position.z).toBeLessThan(0);
    expect(car.wheels.frontRight.root.position.z).toBeLessThan(0);
    expect(car.wheels.rearLeft.root.position.z).toBeGreaterThan(0);
    expect(car.wheels.rearRight.root.position.z).toBeGreaterThan(0);

    // Front axle at -1.35m, rear axle at +1.35m
    expect(car.wheels.frontLeft.root.position.z).toBeCloseTo(-1.35, 2);
    expect(car.wheels.rearLeft.root.position.z).toBeCloseTo(1.35, 2);

    car.dispose();
  });

  it('disposes cleanly without throwing', () => {
    const tiers: GraphicsTier[] = ['low', 'medium', 'high'];
    for (const tier of tiers) {
      const car = createKazeCar({ tier });
      expect(() => car.dispose()).not.toThrow();
      expect(car.group.children.length).toBe(0);
    }
  });
});
