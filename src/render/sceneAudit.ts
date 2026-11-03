import type { Material, Mesh, Object3D, WebGLRenderer } from 'three';

export interface MeshStats {
  readonly meshes: number;
  readonly uniqueMaterials: number;
  readonly transmissionOrClearcoat: number;
  readonly triangles: number;
}

export interface SceneAuditData {
  readonly geometries: number;
  readonly textures: number;
  readonly programs: number;
  readonly car: MeshStats;
  readonly track: MeshStats;
  readonly total: MeshStats;
}

export function collectMeshStats(root: Object3D | null | undefined): MeshStats {
  if (!root) {
    return { meshes: 0, uniqueMaterials: 0, transmissionOrClearcoat: 0, triangles: 0 };
  }

  let meshes = 0;
  const materials = new Set<Material>();
  let transOrClearcoat = 0;
  let triangles = 0;

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh) {
      meshes++;
      if (mesh.geometry) {
        if (mesh.geometry.index) {
          triangles += mesh.geometry.index.count / 3;
        } else if (mesh.geometry.attributes.position) {
          triangles += mesh.geometry.attributes.position.count / 3;
        }
      }
      if (mesh.material) {
        const matList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of matList) {
          if (!materials.has(m)) {
            materials.add(m);
            const physical = m as unknown as { transmission?: number; clearcoat?: number };
            if (
              (typeof physical.transmission === 'number' && physical.transmission > 0) ||
              (typeof physical.clearcoat === 'number' && physical.clearcoat > 0)
            ) {
              transOrClearcoat++;
            }
          }
        }
      }
    }
  });

  return {
    meshes,
    uniqueMaterials: materials.size,
    transmissionOrClearcoat: transOrClearcoat,
    triangles: Math.round(triangles),
  };
}

export function auditScene(
  webglRenderer: WebGLRenderer,
  scene: Object3D,
  carRoot?: Object3D | null,
  trackRoot?: Object3D | null,
): SceneAuditData {
  const car = collectMeshStats(carRoot);
  const track = collectMeshStats(trackRoot);
  const total = collectMeshStats(scene);

  const memory = webglRenderer.info.memory;
  const programs = webglRenderer.info.programs?.length ?? 0;

  return {
    geometries: memory.geometries,
    textures: memory.textures,
    programs,
    car,
    track,
    total,
  };
}
