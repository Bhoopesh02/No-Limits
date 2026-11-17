import { Mesh, PCFShadowMap, PCFSoftShadowMap, Vector3 } from 'three';
import {
  getEffectivePixelRatio,
  type GraphicsTierConfig,
  type ShadowType,
} from '../data/GraphicsTierConfig';
import type { CarView } from './CarView';
import type { Renderer } from './Renderer';

export class TierApplier {
  private readonly renderer: Renderer;
  private readonly carViews = new Set<CarView>();

  private currentTier: GraphicsTierConfig | null = null;
  private currentScale = 1.0;
  private currentShadowType: ShadowType | null = null;
  private currentShadowMapSize = 0;

  // Reusable vectors for zero per-frame allocation in updateShadowFollow
  private readonly lightOffset = new Vector3(60, 100, 40);
  private readonly tempTarget = new Vector3();
  private readonly lightRight = new Vector3();
  private readonly lightUp = new Vector3();
  private readonly halfExtent = 50;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  public registerCarView(carView: CarView): void {
    this.carViews.add(carView);
    if (this.currentTier) {
      carView.setBlobShadowVisible(this.currentTier.shadows === 'blob');
    }
  }

  public unregisterCarView(carView: CarView): void {
    this.carViews.delete(carView);
  }

  public apply(tier: GraphicsTierConfig, resolutionScale = 1.0): void {
    this.currentTier = tier;
    this.currentScale = resolutionScale;

    // 1. Pixel Ratio & Canvas Size
    const devicePixelRatio =
      typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const effectiveDpr = getEffectivePixelRatio(
      devicePixelRatio,
      tier.pixelRatioCap,
      resolutionScale,
    );
    this.renderer.setEffectivePixelRatio(effectiveDpr);

    // 2. Draw Distance & Fog
    this.renderer.setDrawDistance(tier.cameraFar);
    this.renderer.setFog(tier.fogNear, tier.fogFar);

    // 3. Shadows
    const shadowTypeChanged = this.currentShadowType !== tier.shadowType;
    const shadowSizeChanged = this.currentShadowMapSize !== tier.shadowMapSize;
    const dirLight = this.renderer.getDirectionalLight();

    if (dirLight && (shadowTypeChanged || shadowSizeChanged)) {
      if (tier.shadowType === 'none') {
        this.renderer.webglRenderer.shadowMap.enabled = false;
        dirLight.castShadow = false;
        if (dirLight.shadow.map) {
          dirLight.shadow.map.dispose();
          dirLight.shadow.map = null;
        }
      } else {
        this.renderer.webglRenderer.shadowMap.enabled = true;
        this.renderer.webglRenderer.shadowMap.type =
          tier.shadowType === 'pcfSoft' ? PCFSoftShadowMap : PCFShadowMap;

        // If map size changed, dispose old map to prevent texture leak
        if (shadowSizeChanged && dirLight.shadow.map) {
          dirLight.shadow.map.dispose();
          dirLight.shadow.map = null;
        }

        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(tier.shadowMapSize, tier.shadowMapSize);

        const d = this.halfExtent;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 250;
        dirLight.shadow.camera.updateProjectionMatrix();

        dirLight.shadow.bias = -0.0005;
        dirLight.shadow.normalBias = 0.05;
      }

      this.currentShadowType = tier.shadowType;
      this.currentShadowMapSize = tier.shadowMapSize;

      // Recompile materials only when shadow configuration changes (never per frame)
      this.renderer.scene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (mesh.isMesh && mesh.material) {
          if (Array.isArray(mesh.material)) {
            for (const mat of mesh.material) {
              mat.needsUpdate = true;
            }
          } else {
            mesh.material.needsUpdate = true;
          }
        }
      });
    }

    // 4. Blob Shadows
    const showBlob = tier.shadows === 'blob';
    for (const carView of this.carViews) {
      carView.setBlobShadowVisible(showBlob);
    }
  }

  public updateShadowFollow(playerPosition: { x: number; y: number; z: number }): void {
    if (!this.currentTier || this.currentTier.shadowType === 'none') {
      return;
    }

    const dirLight = this.renderer.getDirectionalLight();
    if (!dirLight || !dirLight.castShadow) {
      return;
    }

    // Shadow texel snapping to prevent edge shimmering
    const mapSize = Math.max(1, this.currentShadowMapSize);
    const texelSize = (2 * this.halfExtent) / mapSize;

    dirLight.shadow.camera.updateMatrixWorld();
    const m = dirLight.shadow.camera.matrixWorld.elements;
    this.lightRight.set(m[0], m[1], m[2]).normalize();
    this.lightUp.set(m[4], m[5], m[6]).normalize();

    const xProj =
      playerPosition.x * this.lightRight.x +
      playerPosition.y * this.lightRight.y +
      playerPosition.z * this.lightRight.z;
    const yProj =
      playerPosition.x * this.lightUp.x +
      playerPosition.y * this.lightUp.y +
      playerPosition.z * this.lightUp.z;

    const snappedX = Math.round(xProj / texelSize) * texelSize;
    const snappedY = Math.round(yProj / texelSize) * texelSize;
    const diffX = snappedX - xProj;
    const diffY = snappedY - yProj;

    this.tempTarget.set(playerPosition.x, playerPosition.y, playerPosition.z);
    this.tempTarget.addScaledVector(this.lightRight, diffX);
    this.tempTarget.addScaledVector(this.lightUp, diffY);

    dirLight.target.position.copy(this.tempTarget);
    dirLight.position.copy(this.tempTarget).add(this.lightOffset);
    dirLight.target.updateMatrixWorld();
    dirLight.updateMatrixWorld();
  }

  public getCurrentTier(): GraphicsTierConfig | null {
    return this.currentTier;
  }

  public getCurrentScale(): number {
    return this.currentScale;
  }

  public dispose(): void {
    this.carViews.clear();
    const dirLight = this.renderer.getDirectionalLight();
    if (dirLight?.shadow.map) {
      dirLight.shadow.map.dispose();
      dirLight.shadow.map = null;
    }
  }
}
