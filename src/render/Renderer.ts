import {
  Color,
  DirectionalLight,
  Fog,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';

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

  private currentWidth = 800;
  private currentHeight = 450;
  private groundMesh: Mesh | null = null;
  private gridHelper: GridHelper | null = null;
  private hemiLight: HemisphereLight | null = null;
  private dirLight: DirectionalLight | null = null;

  constructor(gameRootId = 'game-root', uiRootId = 'ui-root') {
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
    this.currentWidth = this.gameRoot.clientWidth || 800;
    this.currentHeight = this.gameRoot.clientHeight || 450;
    const aspect = this.currentWidth / this.currentHeight;
    this.camera = new PerspectiveCamera(60, aspect, 0.1, 900);
    this.camera.position.set(0, 3, 8);

    // 3. WebGLRenderer
    this.webglRenderer = new WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.webglRenderer.setSize(this.currentWidth, this.currentHeight, false);
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
    // Flat ground plane (receives shadows)
    const groundGeom = new PlaneGeometry(4000, 4000);
    const groundMat = new MeshStandardMaterial({
      color: 0x121722, // surface.1
      roughness: 0.85,
      metalness: 0.1,
    });
    this.groundMesh = new Mesh(groundGeom, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = 0;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Grid helper for speed / distance perception
    this.gridHelper = new GridHelper(4000, 200, 0x2e394f, 0x1a2130);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // Hemisphere light (sky and bounce)
    this.hemiLight = new HemisphereLight(0xddeeff, 0x121722, 0.75);
    this.scene.add(this.hemiLight);

    // Directional light (sun)
    this.dirLight = new DirectionalLight(0xfff5e6, 1.25);
    this.dirLight.position.set(60, 100, 40);
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);
  }

  public setEffectivePixelRatio(pixelRatio: number): void {
    this.webglRenderer.setPixelRatio(pixelRatio);
    this.setSize(this.currentWidth, this.currentHeight);
  }

  public setDrawDistance(far: number): void {
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  }

  public setFog(near: number, far: number, color = 0x0b0e14): void {
    if (this.scene.fog instanceof Fog) {
      this.scene.fog.near = near;
      this.scene.fog.far = far;
      this.scene.fog.color.set(color);
    } else {
      this.scene.fog = new Fog(color, near, far);
    }
  }

  public getDirectionalLight(): DirectionalLight | null {
    return this.dirLight;
  }

  public setSize(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;
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

    if (this.hemiLight) {
      this.scene.remove(this.hemiLight);
    }

    if (this.dirLight) {
      if (this.dirLight.shadow.map) {
        this.dirLight.shadow.map.dispose();
      }
      this.scene.remove(this.dirLight.target);
      this.scene.remove(this.dirLight);
    }

    this.webglRenderer.dispose();
    if (this.webglRenderer.domElement.parentElement) {
      this.webglRenderer.domElement.parentElement.removeChild(this.webglRenderer.domElement);
    }
  }
}
