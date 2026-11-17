import { DirectionalLight, Fog, PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import {
  GRAPHICS_TIER_HIGH,
  GRAPHICS_TIER_LOW,
  GRAPHICS_TIER_MEDIUM,
} from '../data/GraphicsTierConfig';
import { CarView } from './CarView';
import type { Renderer } from './Renderer';
import { auditScene } from './sceneAudit';
import { TierApplier } from './TierApplier';

function createMockRenderer() {
  const scene = new Scene();
  const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 900);
  const dirLight = new DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(60, 100, 40);
  scene.add(dirLight);
  scene.add(dirLight.target);

  const shadowMap = { enabled: false, type: 0 };
  let effectiveDpr = 1.0;
  let drawDist = 900;
  let fogN = 200;
  let fogF = 800;

  const memory = { geometries: 12, textures: 4 };

  const webglRenderer = {
    shadowMap,
    setPixelRatio: (r: number) => {
      effectiveDpr = r;
    },
    setSize: () => {},
    info: {
      memory,
      programs: [],
    },
    render: () => {},
    dispose: () => {},
  };

  const renderer = {
    scene,
    camera,
    webglRenderer,
    getDirectionalLight: () => dirLight,
    setEffectivePixelRatio: (r: number) => {
      effectiveDpr = r;
    },
    setDrawDistance: (d: number) => {
      drawDist = d;
      camera.far = d;
    },
    setFog: (near: number, far: number) => {
      fogN = near;
      fogF = far;
      if (scene.fog instanceof Fog) {
        scene.fog.near = near;
        scene.fog.far = far;
      } else {
        scene.fog = new Fog(0x0b0e14, near, far);
      }
    },
    getEffectivePixelRatio: () => effectiveDpr,
    getDrawDistance: () => drawDist,
    getFogNear: () => fogN,
    getFogFar: () => fogF,
    dispose: () => {},
  };

  return renderer as unknown as Renderer;
}

describe('TierApplier', () => {
  it('applies low, medium, and high tier settings correctly', () => {
    const renderer = createMockRenderer();
    const tierApplier = new TierApplier(renderer);
    const carView = new CarView({ tier: 'medium' });
    tierApplier.registerCarView(carView);

    // 1. Low Tier
    tierApplier.apply(GRAPHICS_TIER_LOW, 1.0);
    expect(renderer.camera.far).toBe(500);
    expect((renderer.scene.fog as Fog).near).toBe(120);
    expect((renderer.scene.fog as Fog).far).toBe(450);
    expect(renderer.webglRenderer.shadowMap.enabled).toBe(false);

    // 2. Medium Tier
    tierApplier.apply(GRAPHICS_TIER_MEDIUM, 1.0);
    expect(renderer.camera.far).toBe(900);
    expect((renderer.scene.fog as Fog).near).toBe(200);
    expect((renderer.scene.fog as Fog).far).toBe(800);
    expect(renderer.webglRenderer.shadowMap.enabled).toBe(true);

    const dirLight = renderer.getDirectionalLight();
    expect(dirLight?.castShadow).toBe(true);
    expect(dirLight?.shadow.mapSize.width).toBe(1024);

    // 3. High Tier
    tierApplier.apply(GRAPHICS_TIER_HIGH, 0.8);
    expect(renderer.camera.far).toBe(1600);
    expect((renderer.scene.fog as Fog).near).toBe(350);
    expect((renderer.scene.fog as Fog).far).toBe(1500);
    expect(renderer.webglRenderer.shadowMap.enabled).toBe(true);
    expect(dirLight?.shadow.mapSize.width).toBe(2048);

    tierApplier.dispose();
    carView.dispose();
  });

  it('updateShadowFollow executes texel snapping without errors', () => {
    const renderer = createMockRenderer();
    const tierApplier = new TierApplier(renderer);
    tierApplier.apply(GRAPHICS_TIER_MEDIUM, 1.0);

    const pos = { x: 123.456, y: 0, z: -789.012 };
    expect(() => tierApplier.updateShadowFollow(pos)).not.toThrow();

    const dirLight = renderer.getDirectionalLight();
    expect(dirLight?.position.x).toBeDefined();
    expect(dirLight?.position.y).toBeGreaterThan(50);

    tierApplier.dispose();
  });

  it('leak test: cycling tiers 20 times preserves texture and geometry counts', () => {
    const renderer = createMockRenderer();
    const tierApplier = new TierApplier(renderer);
    const carView = new CarView({ tier: 'low' });
    renderer.scene.add(carView.getRoot());
    tierApplier.registerCarView(carView);

    // Apply Low tier as base
    tierApplier.apply(GRAPHICS_TIER_LOW, 1.0);
    const baseAudit = auditScene(renderer.webglRenderer, renderer.scene, carView.getRoot());

    let shadowMapDisposeCalls = 0;
    const dirLight = renderer.getDirectionalLight();
    if (dirLight) {
      dirLight.shadow.map = {
        dispose: () => {
          shadowMapDisposeCalls++;
        },
      } as never;
    }

    // Cycle tiers 20 times (low -> medium -> high -> low)
    for (let i = 0; i < 20; i++) {
      tierApplier.apply(GRAPHICS_TIER_MEDIUM, 1.0);
      if (dirLight && !dirLight.shadow.map) {
        dirLight.shadow.map = {
          dispose: () => {
            shadowMapDisposeCalls++;
          },
        } as never;
      }

      tierApplier.apply(GRAPHICS_TIER_HIGH, 0.9);
      if (dirLight && !dirLight.shadow.map) {
        dirLight.shadow.map = {
          dispose: () => {
            shadowMapDisposeCalls++;
          },
        } as never;
      }

      tierApplier.apply(GRAPHICS_TIER_LOW, 1.0);
    }

    const finalAudit = auditScene(renderer.webglRenderer, renderer.scene, carView.getRoot());

    expect(finalAudit.geometries).toBe(baseAudit.geometries);
    expect(finalAudit.textures).toBe(baseAudit.textures);
    expect(shadowMapDisposeCalls).toBeGreaterThanOrEqual(20);

    tierApplier.dispose();
    carView.dispose();
  });
});
