import { describe, expect, it } from 'vitest';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../data/GameEvents';
import { GraphicsService } from './GraphicsService';

describe('GraphicsService', () => {
  it('initializes with default tier medium and resolution scale 1.0', () => {
    const service = new GraphicsService();
    expect(service.getTierId()).toBe('medium');
    expect(service.getTier().id).toBe('medium');
    expect(service.getResolutionScale()).toBe(1.0);
  });

  it('clamps initial scale to 0.6 - 1.0 range', () => {
    const low = new GraphicsService({ initialScale: 0.2 });
    expect(low.getResolutionScale()).toBe(0.6);

    const high = new GraphicsService({ initialScale: 1.5 });
    expect(high.getResolutionScale()).toBe(1.0);
  });

  it('allows dev query param to override default tier in DEV mode', () => {
    const serviceLow = new GraphicsService({ searchParams: '?tier=low' });
    expect(serviceLow.getTierId()).toBe('low');

    const serviceHigh = new GraphicsService({ searchParams: '?tier=high' });
    expect(serviceHigh.getTierId()).toBe('high');

    const serviceInvalid = new GraphicsService({ searchParams: '?tier=ultra' });
    expect(serviceInvalid.getTierId()).toBe('medium');
  });

  it('emits graphics:changed once when tier changes', () => {
    const bus = new EventBus<GameEvents>();
    const service = new GraphicsService({ bus });

    let emitCount = 0;
    let lastPayload: { tierId: string; scale: number } | null = null;

    bus.on('graphics:changed', (payload) => {
      emitCount++;
      lastPayload = { tierId: payload.tier.id, scale: payload.resolutionScale };
    });

    service.setTier('high');
    expect(emitCount).toBe(1);
    expect(lastPayload).toEqual({ tierId: 'high', scale: 1.0 });

    // Setting same tier again emits nothing
    service.setTier('high');
    expect(emitCount).toBe(1);
  });

  it('emits graphics:changed once when resolution scale changes and clamps values', () => {
    const bus = new EventBus<GameEvents>();
    const service = new GraphicsService({ bus });

    let emitCount = 0;
    let lastScale = 0;

    bus.on('graphics:changed', (payload) => {
      emitCount++;
      lastScale = payload.resolutionScale;
    });

    service.setResolutionScale(0.75);
    expect(emitCount).toBe(1);
    expect(lastScale).toBe(0.75);

    // Setting same scale again emits nothing
    service.setResolutionScale(0.75);
    expect(emitCount).toBe(1);

    // Clamps below 0.6
    service.setResolutionScale(0.3);
    expect(emitCount).toBe(2);
    expect(lastScale).toBe(0.6);

    // Setting below 0.6 again stays 0.6 and does not emit
    service.setResolutionScale(0.1);
    expect(emitCount).toBe(2);
  });

  it('setGraphics updates both and emits once', () => {
    const bus = new EventBus<GameEvents>();
    const service = new GraphicsService({ bus });

    let emitCount = 0;
    bus.on('graphics:changed', () => {
      emitCount++;
    });

    service.setGraphics('low', 0.8);
    expect(emitCount).toBe(1);
    expect(service.getTierId()).toBe('low');
    expect(service.getResolutionScale()).toBe(0.8);

    // Calling with exact same parameters does not emit
    service.setGraphics('low', 0.8);
    expect(emitCount).toBe(1);
  });
});

