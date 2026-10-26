import { describe, expect, it } from 'vitest';
import { PlanarVehiclePose } from '../data/TrackLimiter';
import { Spline } from './Spline';
import { DEFAULT_TRACK_LIMITS_CONFIG, TrackLimits } from './TrackLimits';

describe('TrackLimits', () => {
  // Simple straight track along -Z for clear test assertions
  const straightPoints = [
    { x: 0, y: 0, z: 100, width: 14 },
    { x: 0, y: 0, z: -100, width: 14 },
    { x: 0, y: 0, z: -300, width: 14 },
    { x: 50, y: 0, z: -100, width: 14 },
  ];
  const spline = new Spline(straightPoints, 1.0);

  it('has no effect on car when on the road', () => {
    const limits = new TrackLimits(spline);
    // Centerline is near x = 0, z = 0. Road width is 14m, half-width is 7m.
    // Car at x = 3, z = -50 (lateral offset ~ +3m, well inside road)
    const pose: PlanarVehiclePose = {
      x: 3.0,
      z: -50.0,
      heading: 0,
      forwardSpeed: 50.0,
      lateralSpeed: 2.0,
    };

    limits.resolve(pose, 1 / 60);

    expect(pose.x).toBeCloseTo(3.0, 2);
    expect(pose.z).toBeCloseTo(-50.0, 2);
    expect(pose.forwardSpeed).toBeCloseTo(50.0, 2);
    expect(pose.lateralSpeed).toBeCloseTo(2.0, 2);
  });

  it('slows the car off-road but never drops below offroadMinSpeed', () => {
    const limits = new TrackLimits(spline);
    // Off-road is between road edge (7m) and barrier (8.5m). E.g. x = 7.8m
    const pose: PlanarVehiclePose = {
      x: 7.8,
      z: -50.0,
      heading: 0,
      forwardSpeed: 40.0,
      lateralSpeed: 0,
    };

    limits.resolve(pose, 1 / 60);

    // Car should have decelerated
    expect(pose.forwardSpeed).toBeLessThan(40.0);
    expect(pose.forwardSpeed).toBeGreaterThan(DEFAULT_TRACK_LIMITS_CONFIG.offroadMinSpeed);

    // After many seconds off-road, speed should stay at offroadMinSpeed, never 0
    for (let i = 0; i < 300; i++) {
      limits.resolve(pose, 1 / 60);
    }
    expect(pose.forwardSpeed).toBeCloseTo(DEFAULT_TRACK_LIMITS_CONFIG.offroadMinSpeed, 1);
    expect(pose.forwardSpeed).toBeGreaterThan(0);
  });

  it('pushes the car back inside on barrier hit, scrape loses less than head-on, never below min speed', () => {
    const limits = new TrackLimits(spline);
    // Barrier is at roadHalfWidth (7m) + barrierMargin (1.5m) = 8.5m
    // 1. Scrape collision: heading almost parallel to barrier (heading ~ 0 rad)
    const scrapePose: PlanarVehiclePose = {
      x: 9.5, // past the 8.5m barrier
      z: -50.0,
      heading: 0,
      forwardSpeed: 60.0,
      lateralSpeed: 2.0, // small outward velocity
    };

    limits.resolve(scrapePose, 1 / 60);

    // Pushed back inside barrier (barrier is at roadHalfWidth 7.0 + barrierMargin 1.5 = 8.5m)
    expect(scrapePose.x).toBeLessThan(9.5);
    expect(limits.getLastProjection().lateralOffset).toBeLessThanOrEqual(8.5);
    expect(limits.getLastProjection().lateralOffset).toBeGreaterThan(8.0);
    const scrapeRemainingSpeed = scrapePose.forwardSpeed;

    // 2. Direct head-on collision: heading 90 deg directly into right barrier (heading = -Math.PI / 2)
    const headOnPose: PlanarVehiclePose = {
      x: 9.5,
      z: -50.0,
      heading: -Math.PI / 2, // facing +X (into barrier)
      forwardSpeed: 60.0,
      lateralSpeed: 0,
    };

    limits.resolve(headOnPose, 1 / 60);

    // Pushed back inside
    expect(headOnPose.x).toBeLessThan(9.5);
    expect(limits.getLastProjection().lateralOffset).toBeLessThanOrEqual(8.5);
    expect(limits.getLastProjection().lateralOffset).toBeGreaterThan(8.0);
    const headOnRemainingSpeed = headOnPose.forwardSpeed;

    // Scrape loses less speed than head-on hit
    expect(scrapeRemainingSpeed).toBeGreaterThan(headOnRemainingSpeed);
    // Neither drops below barrier minimum speed
    expect(scrapeRemainingSpeed).toBeGreaterThanOrEqual(
      DEFAULT_TRACK_LIMITS_CONFIG.barrierMinSpeed,
    );
    expect(headOnRemainingSpeed).toBeGreaterThanOrEqual(
      DEFAULT_TRACK_LIMITS_CONFIG.barrierMinSpeed,
    );
  });

  it('is deterministic over many steps', () => {
    const limits1 = new TrackLimits(spline);
    const limits2 = new TrackLimits(spline);

    const pose1: PlanarVehiclePose = {
      x: 10.0,
      z: -40.0,
      heading: -0.5,
      forwardSpeed: 55.0,
      lateralSpeed: 4.0,
    };
    const pose2: PlanarVehiclePose = { ...pose1 };

    for (let step = 0; step < 120; step++) {
      limits1.resolve(pose1, 1 / 60);
      limits2.resolve(pose2, 1 / 60);
    }

    expect(pose1.x).toBe(pose2.x);
    expect(pose1.z).toBe(pose2.z);
    expect(pose1.forwardSpeed).toBe(pose2.forwardSpeed);
    expect(pose1.lateralSpeed).toBe(pose2.lateralSpeed);
  });

  it('produces no NaN under extreme inputs', () => {
    const limits = new TrackLimits(spline);
    const extremePose: PlanarVehiclePose = {
      x: 10000.0,
      z: -50000.0,
      heading: 1000.0,
      forwardSpeed: 1000.0,
      lateralSpeed: 500.0,
    };

    limits.resolve(extremePose, 1 / 60);

    expect(Number.isFinite(extremePose.x)).toBe(true);
    expect(Number.isFinite(extremePose.z)).toBe(true);
    expect(Number.isFinite(extremePose.forwardSpeed)).toBe(true);
    expect(Number.isFinite(extremePose.lateralSpeed)).toBe(true);
  });
});
