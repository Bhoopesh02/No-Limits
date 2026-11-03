import { BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { auditScene, collectMeshStats } from './sceneAudit';

describe('sceneAudit', () => {
  it('collects stats from mesh hierarchy', () => {
    const root = new Group();
    const geo = new BoxGeometry(1, 1, 1);
    const mat1 = new MeshBasicMaterial();
    const mat2 = new MeshPhysicalMaterial({ clearcoat: 0.8 });

    const mesh1 = new Mesh(geo, mat1);
    const mesh2 = new Mesh(geo, mat2);

    root.add(mesh1);
    root.add(mesh2);

    const stats = collectMeshStats(root);
    expect(stats.meshes).toBe(2);
    expect(stats.uniqueMaterials).toBe(2);
    expect(stats.transmissionOrClearcoat).toBe(1);
    // BoxGeometry has 12 triangles (36 indices / 3)
    expect(stats.triangles).toBe(24);
  });

  it('handles empty or null roots gracefully', () => {
    expect(collectMeshStats(null)).toEqual({
      meshes: 0,
      uniqueMaterials: 0,
      transmissionOrClearcoat: 0,
      triangles: 0,
    });
  });

  it('runs auditScene with mock webgl renderer info', () => {
    const mockRenderer = {
      info: {
        memory: { geometries: 5, textures: 2 },
        programs: [{ id: 1 }, { id: 2 }],
      },
    };

    const scene = new Group();
    const car = new Group();
    const track = new Group();

    const audit = auditScene(mockRenderer as never, scene, car, track);
    expect(audit.geometries).toBe(5);
    expect(audit.textures).toBe(2);
    expect(audit.programs).toBe(2);
    expect(audit.car.meshes).toBe(0);
    expect(audit.total.meshes).toBe(0);
  });
});
