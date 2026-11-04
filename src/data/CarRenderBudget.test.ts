import { describe, expect, it } from 'vitest';
import { CAR_RENDER_BUDGETS, getCarDetailForTier, getOpponentCarDetail } from './CarRenderBudget';

describe('CarRenderBudget', () => {
  it('defines valid render budgets for low, medium, and high detail levels', () => {
    expect(CAR_RENDER_BUDGETS.low).toEqual({
      maxTriangles: 8000,
      maxMeshes: 8,
      maxUniqueMaterials: 4,
    });

    expect(CAR_RENDER_BUDGETS.medium).toEqual({
      maxTriangles: 20000,
      maxMeshes: 16,
      maxUniqueMaterials: 8,
    });

    expect(CAR_RENDER_BUDGETS.high).toEqual({
      maxTriangles: 45000,
      maxMeshes: 30,
      maxUniqueMaterials: 14,
    });
  });

  it('maps graphics tiers to car detail levels as a pure function', () => {
    expect(getCarDetailForTier('low')).toBe('low');
    expect(getCarDetailForTier('medium')).toBe('medium');
    expect(getCarDetailForTier('high')).toBe('high');
  });

  it('computes opponent car detail one level below player detail', () => {
    expect(getOpponentCarDetail('high')).toBe('medium');
    expect(getOpponentCarDetail('medium')).toBe('low');
    expect(getOpponentCarDetail('low')).toBe('low');
  });
});
