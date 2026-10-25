import {
  Color,
  CylinderGeometry,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import { GRAPHICS_TIER_MEDIUM, GraphicsTierConfig } from '../data/GraphicsTierConfig';

export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

export class Renderer {
  public readonly scene: Scene;
  public readonly camera: PerspectiveCamera;
  public readonly webglRenderer: WebGLRenderer;
  private readonly gameRoot: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly tierConfig: GraphicsTierConfig;

  private groundMesh: Mesh | null = null;
  private gridHelper: GridHelper | null = null;
  private markerPillars: InstancedMesh | null = null;
  private hemiLight: HemisphereLight | null = null;
  private dirLight: DirectionalLight | null = null;

  constructor(
    gameRootId = 'game-root',
    uiRootId = 'ui-root',
    tierConfig: GraphicsTierConfig = GRAPHICS_TIER_MEDIUM,
  ) {
    this.tierConfig = tierConfig;

    // Check WebGL2 support
    if (!isWebGL2Supported()) {
      const uiRoot = document.getElementById(uiRootId);
      if (uiRoot) {
        uiRoot.innerHTML = `
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #0B0E14; color: #F2F5FA; font-family: sans-serif; text-align: center; padding: 24px;">
            <div style="max-width: 480px; background: #121722; padding: 32px; border-radius: 12px; border: 1px solid #FF4D5E;">
              <h2 style="color: #FF4D5E; margin-bottom: 12px; font-size: 24px;">WebGL 2 Required</h2>
              <p style="color: #A8B3C7; font-size: 14px; line-height: 1.5;">
                No Limits requires WebGL 2 hardware acceleration. Please check your browser settings or ensure your graphics drivers are up to date.
              </p>
            </div>
          </div>
        `;
      }
      throw new Error('WebGL 2 is not supported by your browser or graphics hardware.');
    }

    const root = document.getElementById(gameRootId);
    if (!root) {
      throw new Error(`Element #${gameRootId} not found in DOM.`);
    }
    this.gameRoot = root;

    // 1. Scene
    this.scene = new Scene();
    this.scene.background = new Color(0x0b0e14); // bg.base

    // 2. Camera
    const initialWidth = this.gameRoot.clientWidth || 800;
    const initialHeight = this.gameRoot.clientHeight || 450;
    const aspect = initialWidth / initialHeight;
    this.camera = new PerspectiveCamera(60, aspect, 0.1, this.tierConfig.drawDistance);
    this.camera.position.set(0, 3, 8);

    // 3. WebGLRenderer
    this.webglRenderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.webglRenderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.tierConfig.pixelRatioCap),
    );
    this.webglRenderer.setSize(initialWidth, initialHeight, false);
    this.webglRenderer.domElement.style.display = 'block';
    this.webglRenderer.domElement.style.width = '100%';
    this.webglRenderer.domElement.style.height = '100%';

    // Clear and mount into #game-root
    this.gameRoot.innerHTML = '';
    this.gameRoot.appendChild(this.webglRenderer.domElement);

    // 4. Setup flat ground and environment lights
    this.setupEnvironment();

    // 5. ResizeObserver on #game-root (not window)
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.setSize(width, height);
        }
      }
    });
    this.resizeObserver.observe(this.gameRoot);
  }

  private setupEnvironment(): void {
    // Flat ground plane
    const groundGeom = new PlaneGeometry(4000, 4000);
    const groundMat = new MeshStandardMaterial({
      color: 0x121722, // surface.1
      roughness: 0.85,
      metalness: 0.1,
    });
    this.groundMesh = new Mesh(groundGeom, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0;
    this.scene.add(this.groundMesh);

    // Grid helper for speed / distance perception
    this.gridHelper = new GridHelper(4000, 200, 0x2e394f, 0x1a2130);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // Instanced marker pillars along roadside for enhanced speed perception
    const pillarCount = 200;
    const pillarGeom = new CylinderGeometry(0.25, 0.25, 2.5, 8);
    const pillarMat = new MeshStandardMaterial({
      color: 0x3da5ff,
      roughness: 0.4,
      metalness: 0.6,
    });
    this.markerPillars = new InstancedMesh(pillarGeom, pillarMat, pillarCount);
    const dummyMat4 = new Matrix4();
    let idx = 0;
    for (let i = 0; i < 100; i++) {
      const z = (i - 50) * 40; // Spaced every 40m from -2000m to +2000m
      // Left pillar (x = -12)
      dummyMat4.makeTranslation(-12, 1.25, z);
      this.markerPillars.setMatrixAt(idx++, dummyMat4);
      // Right pillar (x = +12)
      dummyMat4.makeTranslation(12, 1.25, z);
      this.markerPillars.setMatrixAt(idx++, dummyMat4);
    }
    this.markerPillars.instanceMatrix.needsUpdate = true;
    this.scene.add(this.markerPillars);

    // Hemisphere light (sky and bounce)
    this.hemiLight = new HemisphereLight(0xddeeff, 0x121722, 0.75);
    this.scene.add(this.hemiLight);

    // Directional light (sun)
    this.dirLight = new DirectionalLight(0xfff5e6, 1.25);
    this.dirLight.position.set(60, 100, 40);
    this.scene.add(this.dirLight);
  }

  public setSize(width: number, height: number): void {
    this.webglRenderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public getAspect(): number {
    return this.camera.aspect;
  }

  public render(): void {
    this.webglRenderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.resizeObserver.disconnect();

    if (this.groundMesh) {
      this.groundMesh.geometry.dispose();
      (this.groundMesh.material as MeshStandardMaterial).dispose();
      this.scene.remove(this.groundMesh);
    }

    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      if (Array.isArray(this.gridHelper.material)) {
        for (const mat of this.gridHelper.material) {
          mat.dispose();
        }
      } else {
        this.gridHelper.material.dispose();
      }
      this.scene.remove(this.gridHelper);
    }

    if (this.markerPillars) {
      this.markerPillars.geometry.dispose();
      (this.markerPillars.material as MeshStandardMaterial).dispose();
      this.scene.remove(this.markerPillars);
    }

    if (this.hemiLight) {
      this.scene.remove(this.hemiLight);
    }

    if (this.dirLight) {
      this.scene.remove(this.dirLight);
    }

    this.webglRenderer.dispose();
    if (this.webglRenderer.domElement.parentElement) {
      this.webglRenderer.domElement.parentElement.removeChild(this.webglRenderer.domElement);
    }
  }
}
