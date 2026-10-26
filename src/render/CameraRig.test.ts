import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CameraRig,
  DIST_MAX,
  DIST_MIN,
  FOV_MAX,
  FOV_MAX_REDUCED_MOTION,
  FOV_MIN,
  HEIGHT_MAX,
  HEIGHT_MIN,
  SPEED_SMOOTH,
  updateSpeedFactor,
  ZOOM_CAP_SPEED_KMH,
  ZOOM_CAP_SPEED_MS,
} from './CameraRig';

describe('CameraRig', () => {
  it('initializes with default tuning constants', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera);

    expect(rig.getFovMin()).toBe(FOV_MIN);
    expect(rig.getFovMax()).toBe(FOV_MAX);
    expect(rig.getDistMin()).toBe(DIST_MIN);
    expect(rig.getDistMax()).toBe(DIST_MAX);
    expect(rig.getHeightMin()).toBe(HEIGHT_MIN);
    expect(rig.getHeightMax()).toBe(HEIGHT_MAX);
    expect(rig.getZoomCapSpeed()).toBeCloseTo(ZOOM_CAP_SPEED_MS, 4);
    expect(ZOOM_CAP_SPEED_KMH).toBe(55);
    expect(rig.getMaxSpeed()).toBe(80.56);
    expect(rig.getSpeedFactor()).toBe(0);
    expect(rig.getCamera()).toBe(camera);
  });

  it('supports reduce motion setting by capping fovMax', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera, { reduceMotion: true });

    expect(rig.getFovMax()).toBe(FOV_MAX_REDUCED_MOTION);

    rig.setReduceMotion(false);
    expect(rig.getFovMax()).toBe(FOV_MAX);

    rig.setReduceMotion(true);
    expect(rig.getFovMax()).toBe(FOV_MAX_REDUCED_MOTION);
  });

  it('teleports to car position at standstill distances', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera);

    // Car at origin, heading facing -Z (heading = 0)
    rig.teleport({ x: 0, y: 0, z: 0 }, 0);

    expect(rig.getSpeedFactor()).toBe(0);
    expect(camera.position.x).toBeCloseTo(0, 2);
    expect(camera.position.y).toBeCloseTo(HEIGHT_MIN, 2);
    // Behind car along Z is +DIST_MIN
    expect(camera.position.z).toBeCloseTo(DIST_MIN, 2);
    expect(camera.fov).toBe(FOV_MIN);
  });

  it('clamps speedFactor between 0 and 1 even with nitro speed exceeding topSpeed', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera, { maxSpeed: 80 });

    // Accelerate way beyond top speed (e.g. 150 m/s with nitro) over many frames
    for (let i = 0; i < 120; i++) {
      rig.updateSpeedFactor(150, 80, 1 / 60);
    }

    const factor = rig.getSpeedFactor();
    expect(factor).toBeLessThanOrEqual(1.0);
    expect(factor).toBeGreaterThan(0.99);
  });

  it('smooths speedFactor over time without jumps', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera, { maxSpeed: 80 });

    // Single 16ms frame at top speed should react smoothly, not jump to 1.0 immediately
    rig.updateSpeedFactor(80, 80, 1 / 60);
    const factorAfter1Frame = rig.getSpeedFactor();

    expect(factorAfter1Frame).toBeGreaterThan(0);
    expect(factorAfter1Frame).toBeLessThan(0.15); // Smooth gradual transition
  });

  it('limits camera FOV and chase distance during full updates at top speed', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera, { maxSpeed: 80 });

    const carPos = { x: 0, y: 0, z: 0 };
    const heading = 0;
    const speed = 160; // 2x top speed (nitro)
    const aspect = 16 / 9;

    // Run for 2 seconds of simulation
    for (let i = 0; i < 120; i++) {
      rig.update(carPos, heading, speed, 1 / 60, aspect);
    }

    // FOV should never exceed FOV_MAX
    expect(camera.fov).toBeLessThanOrEqual(FOV_MAX);
    expect(camera.fov).toBeGreaterThan(FOV_MIN);

    // Distance should smoothly approach DIST_MAX
    expect(camera.position.z).toBeLessThanOrEqual(DIST_MAX + 0.1);
  });

  it('standalone updateSpeedFactor exports correct exponential easing', () => {
    const factor = updateSpeedFactor(80, 80, 1.0, SPEED_SMOOTH);
    expect(factor).toBeGreaterThan(0.95);
    expect(factor).toBeLessThanOrEqual(1.0);
  });

  it('stays behind the car and does not widen FOV when reversing', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera, { maxSpeed: 80 });

    const carPos = { x: 0, y: 0, z: -50 };
    const heading = 0; // facing -Z
    const reverseSpeed = -12; // reversing at 12 m/s
    const aspect = 16 / 9;

    // Run updates in reverse for 2 seconds
    for (let i = 0; i < 120; i++) {
      rig.update(carPos, heading, reverseSpeed, 1 / 60, aspect, true);
    }

    // Camera FOV must NOT widen (stays at base FOV_MIN)
    expect(camera.fov).toBeCloseTo(FOV_MIN, 1);
    expect(rig.getSpeedFactor()).toBe(0);

    // Camera position must remain BEHIND the car (z > carPos.z)
    expect(camera.position.z).toBeGreaterThan(carPos.z);
    expect(camera.position.z).toBeCloseTo(carPos.z + DIST_MIN, 1);
  });

  it('stops zoom out at 55 km/h and does not zoom out further at higher speeds', () => {
    const camera55 = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig55 = new CameraRig(camera55);

    const camera200 = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig200 = new CameraRig(camera200);

    const carPos = { x: 0, y: 0, z: 0 };
    const heading = 0;
    const speed55 = ZOOM_CAP_SPEED_MS; // 55 km/h (15.28 m/s)
    const speed200 = 200 / 3.6; // 200 km/h (55.56 m/s)
    const aspect = 16 / 9;

    // Run updates for 2 seconds (120 frames at 60 Hz)
    for (let i = 0; i < 120; i++) {
      rig55.update(carPos, heading, speed55, 1 / 60, aspect);
      rig200.update(carPos, heading, speed200, 1 / 60, aspect);
    }

    // At 55 km/h, zoom-out has reached its maximum
    expect(rig55.getSpeedFactor()).toBeCloseTo(1.0, 2);
    expect(camera55.fov).toBeCloseTo(FOV_MAX, 1);

    // At 200 km/h, zoom-out must NOT expand any further than at 55 km/h
    expect(rig200.getSpeedFactor()).toBeCloseTo(1.0, 2);
    expect(camera200.fov).toBeCloseTo(camera55.fov, 1);
    expect(camera200.position.z).toBeCloseTo(camera55.position.z, 2);
  });

  it('does not produce spring lag when car is moving forward at 250 km/h', () => {
    const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    const rig = new CameraRig(camera);

    const speed = 250 / 3.6; // ~69.4 m/s (250 km/h)
    const dt = 1 / 60;
    const carPos = { x: 0, y: 0, z: 0 };
    const heading = 0; // facing -Z

    for (let i = 0; i < 180; i++) {
      carPos.z -= speed * dt; // car moves forward along -Z
      rig.update(carPos, heading, speed, dt, 16 / 9);
    }

    // Distance behind car along Z must be exactly DIST_MAX, NOT dozens of meters behind
    const actualDistance = camera.position.z - carPos.z;
    expect(actualDistance).toBeCloseTo(DIST_MAX, 2);
  });
});
