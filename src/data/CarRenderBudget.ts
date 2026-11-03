export type CarDetailLevel = 'low' | 'medium' | 'high';

export interface CarRenderBudget {
  readonly maxTriangles: number;
  readonly maxMeshes: number;
  readonly maxUniqueMaterials: number;
}

/**
 * Starting budgets for car rendering across detail levels.
 *
 * Triangle limits follow Docs/Project_Structure_and_Design_System.md section 14:
 * - Low: 8,000 max
 * - Medium: 20,000 max
 * - High: 45,000 max
 *
 * Meshes (draw calls per car) and unique material limits are budgeted to allow
 * up to 6 cars on screen simultaneously (e.g. Task 10 AI opponents) within
 * mobile and low-end rendering performance budgets (AGENTS.md).
 */
export const CAR_RENDER_BUDGETS: Readonly<Record<CarDetailLevel, CarRenderBudget>> = {
  low: {
    maxTriangles: 8000,
    maxMeshes: 8,
    maxUniqueMaterials: 4,
  },
  medium: {
    maxTriangles: 20000,
    maxMeshes: 16,
    maxUniqueMaterials: 8,
  },
  high: {
    maxTriangles: 45000,
    maxMeshes: 30,
    maxUniqueMaterials: 14,
  },
};

/**
 * Maps a graphics tier ID ('low' | 'medium' | 'high') to the corresponding car detail level.
 * Pure function. Currently 1:1, but isolated so dynamic tier scaling or user overrides
 * can adapt independently.
 */
export function getCarDetailForTier(tierId: 'low' | 'medium' | 'high'): CarDetailLevel {
  switch (tierId) {
    case 'low':
      return 'low';
    case 'medium':
      return 'medium';
    case 'high':
      return 'high';
  }
}

