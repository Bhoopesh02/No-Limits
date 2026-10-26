import { describe, expect, it } from 'vitest';
import { CarRenderPose, CarView } from './CarView';

describe('CarView', () => {
  it('instantiates successfully with Kaze procedural car model', () => {
    const carView = new CarView({ tier: 'low', paintColor: '#3DA5FF' });
    expect(carView.getRoot()).toBeDefined();
    expect(carView.getWheels().frontLeft).toBeDefined();
    expect(carView.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
    expect(carView.getHeading()).toBe(0);
    carView.dispose();
  });

  it('steers front wheels and rolls all wheels on update with interpolated state', () => {
    const carView = new CarView({ tier: 'medium' });

    const prev: CarRenderPose = {
      x: 0,
      y: 0,
      z: 0,
      heading: 0,
      forwardSpeed: 20,
      lateralSpeed: 0,
      steerAngle: 0.1,
    };

    const curr: CarRenderPose = {
      x: 0,
      y: 0,
      z: -10,
      heading: 0.2,
      forwardSpeed: 30,
      lateralSpeed: 0,
      steerAngle: 0.3,
    };

    // Step with alpha = 0.5
    carView.update(prev, curr, 0.5);

    // Steer angle should be interpolated (0.1 + 0.3) / 2 = 0.2
    expect(carView.getWheels().frontLeft.steer.rotation.y).toBeCloseTo(0.2, 3);
    expect(carView.getWheels().frontRight.steer.rotation.y).toBeCloseTo(0.2, 3);

    // Rear wheels steer should stay 0
    expect(carView.getWheels().rearLeft.steer.rotation.y).toBe(0);
    expect(carView.getWheels().rearRight.steer.rotation.y).toBe(0);

    // Roll angle should have rotated from speed
    const rollFL = carView.getWheels().frontLeft.roll.rotation.x;
    expect(rollFL).not.toBe(0);
    expect(carView.getWheels().frontRight.roll.rotation.x).toBe(rollFL);
    expect(carView.getWheels().rearLeft.roll.rotation.x).toBe(rollFL);
    expect(carView.getWheels().rearRight.roll.rotation.x).toBe(rollFL);

    carView.dispose();
  });

  it('updates paint color dynamically', () => {
    const carView = new CarView({ tier: 'low', paintColor: '#3DA5FF' });
    expect(() => carView.setPaintColor('#FF4D5E')).not.toThrow();
    carView.dispose();
  });

  it('disposes cleanly and clears scene groups', () => {
    const carView = new CarView({ tier: 'low' });
    carView.dispose();
    expect(carView.getRoot().children.length).toBe(0);
  });

  it('raises taillight emissive intensity for reverse lamps when isReversing is true and restores when false', () => {
    const carView = new CarView({ tier: 'low' });
    const taillightMat = carView.getKazeCar().getTaillightMaterial();

    expect(taillightMat.emissiveIntensity).toBe(3.0);
    expect(taillightMat.emissive.getHexString()).toBe('ff0818');

    // Activate reverse
    carView.setReversing(true);
    expect(taillightMat.emissiveIntensity).toBe(5.0);
    expect(taillightMat.emissive.getHexString()).toBe('f0f5ff');

    // Deactivate reverse
    carView.setReversing(false);
    expect(taillightMat.emissiveIntensity).toBe(3.0);
    expect(taillightMat.emissive.getHexString()).toBe('ff0818');

    // Test through update() with CarRenderPose
    const prev: CarRenderPose = { x: 0, z: 0, heading: 0, isReversing: false };
    const curr: CarRenderPose = { x: 0, z: 0, heading: 0, isReversing: true };
    carView.update(prev, curr, 1.0);
    expect(taillightMat.emissiveIntensity).toBe(5.0);

    carView.dispose();
  });
});
