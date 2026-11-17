import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, Texture } from 'three';

let sharedTexture: Texture | null = null;
let sharedGeometry: PlaneGeometry | null = null;
let sharedMaterial: MeshBasicMaterial | null = null;
let activeCount = 0;

function getSharedResources(): {
  geometry: PlaneGeometry;
  material: MeshBasicMaterial;
} {
  if (!sharedGeometry) {
    // 2.2m width x 4.4m length plane matching car footprint
    sharedGeometry = new PlaneGeometry(2.2, 4.4);
    // Rotate to lie flat in XZ plane
    sharedGeometry.rotateX(-Math.PI / 2);
  }

  if (!sharedTexture) {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      if (typeof canvas.getContext === 'function') {
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 64, 64);
          const gradient = ctx.createRadialGradient(32, 32, 6, 32, 32, 30);
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
          gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(32, 32, 30, 0, Math.PI * 2);
          ctx.fill();
          sharedTexture = new CanvasTexture(canvas);
        } else {
          sharedTexture = new Texture();
        }
      } else {
        sharedTexture = new Texture();
      }
    } else {
      // Safe fallback for headless Node environments
      sharedTexture = new Texture();
    }
  }

  if (!sharedMaterial) {
    sharedMaterial = new MeshBasicMaterial({
      map: sharedTexture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }

  activeCount++;
  return { geometry: sharedGeometry, material: sharedMaterial };
}

function releaseSharedResources(): void {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    if (sharedMaterial) {
      sharedMaterial.dispose();
      sharedMaterial = null;
    }
    if (sharedTexture) {
      sharedTexture.dispose();
      sharedTexture = null;
    }
    if (sharedGeometry) {
      sharedGeometry.dispose();
      sharedGeometry = null;
    }
  }
}

export class BlobShadow {
  public readonly mesh: Mesh;
  private disposed = false;

  constructor() {
    const { geometry, material } = getSharedResources();
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'BlobShadow';
    // Slightly elevated to prevent z-fighting with road
    this.mesh.position.set(0, 0.02, 0);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 1;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public isVisible(): boolean {
    return this.mesh.visible;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    releaseSharedResources();
  }
}
