import { GameLoop } from '../core/GameLoop';
import { CarData, DEFAULT_CAR_KAZE } from '../data/CarData';
import { GRAPHICS_TIER_MEDIUM } from '../data/GraphicsTierConfig';
import { InputManager } from '../input/InputManager';
import { KeyboardInput } from '../input/KeyboardInput';
import { CameraRig } from '../render/CameraRig';
import { CarView } from '../render/CarView';
import { Renderer } from '../render/Renderer';
import { createDriftHUD, DriftHUDElement } from '../ui/components/DriftHUD';
import { createNitroGauge, NitroGaugeElement } from '../ui/components/NitroGauge';
import { createSpeedometer, SpeedometerElement } from '../ui/components/Speedometer';
import { VehicleModel } from '../vehicle/VehicleModel';
import { copyVehicleState, createVehicleState, VehicleState } from '../vehicle/VehicleState';

export interface AppOptions {
  gameRootId?: string;
  uiRootId?: string;
}

interface DevTools {
  dispose(): void;
  update(frameDt: number, calls: number, triangles: number): void;
}

export class App {
  private readonly renderer: Renderer;
  private readonly cameraRig: CameraRig;
  private readonly carView: CarView;
  private readonly keyboardInput: KeyboardInput;
  private readonly inputManager: InputManager;
  private readonly gameLoop: GameLoop;

  private readonly previousVehicleState: VehicleState;
  private readonly currentVehicleState: VehicleState;
  private readonly liveCarData: CarData;

  private readonly speedometer: SpeedometerElement;
  private readonly nitroGauge: NitroGaugeElement;
  private readonly driftHud: DriftHUDElement;
  private readonly hudContainer: HTMLElement;
  private lastRenderTimestampMs = performance.now();

  private debugOverlay: DevTools | null = null;
  private tuningPanel: { dispose(): void } | null = null;

  constructor(options: AppOptions = {}) {
    const gameRootId = options.gameRootId ?? 'game-root';
    const uiRootId = options.uiRootId ?? 'ui-root';

    // Live car parameters for real-time dev tuning
    this.liveCarData = { ...DEFAULT_CAR_KAZE };

    // 1. Renderer (owns WebGLRenderer, scene, camera, flat ground, lights, marker pillars)
    this.renderer = new Renderer(gameRootId, uiRootId, GRAPHICS_TIER_MEDIUM);

    // 2. Camera rig
    this.cameraRig = new CameraRig(this.renderer.camera, {
      maxSpeed: this.liveCarData.topSpeed,
    });

    // 3. 3D Car View
    this.carView = new CarView();
    this.renderer.scene.add(this.carView.getRoot());

    // 4. Input handling
    this.keyboardInput = new KeyboardInput();
    this.inputManager = new InputManager(this.keyboardInput);

    // 5. Vehicle state (zero-allocation simulation buffers)
    this.previousVehicleState = createVehicleState(0, 0, 0, 0, 0);
    this.currentVehicleState = createVehicleState(0, 0, 0, 0, 0);

    // Initial camera placement
    this.cameraRig.teleport(this.currentVehicleState, this.currentVehicleState.heading);

    // 6. HUD elements overlay
    const uiRoot = document.getElementById(uiRootId);
    if (!uiRoot) {
      throw new Error(`Element #${uiRootId} not found.`);
    }
    uiRoot.innerHTML = '';

    this.hudContainer = document.createElement('div');
    this.hudContainer.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--space-4);
    `;

    // Top row: controls hint & title + Drift HUD centered
    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    `;

    const topBar = document.createElement('div');
    topBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(18, 23, 34, 0.75);
      backdrop-filter: blur(8px);
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--border);
      border-radius: var(--radius-s);
      font-size: var(--fs-14);
      color: var(--text-secondary);
      font-family: var(--font-body);
      max-width: 680px;
    `;
    topBar.innerHTML = `
      <div><strong style="color: var(--text-primary); font-family: var(--font-display);">NO LIMITS</strong> &bull; Week 2 Milestone</div>
      <div style="font-size: var(--fs-12); color: var(--text-secondary); margin-left: var(--space-3);">
        Controls: <strong style="color: var(--accent);">W/S/A/D</strong> | Space: Drift | Shift: Nitro | \`: Dev Stats | F2: Tuning
      </div>
    `;
    topRow.appendChild(topBar);

    this.driftHud = createDriftHUD();
    topRow.appendChild(this.driftHud);
    this.hudContainer.appendChild(topRow);

    // Bottom bar: NitroGauge at bottom-left, Speedometer at bottom-right
    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    `;

    this.nitroGauge = createNitroGauge({
      value: 1.0,
    });
    bottomBar.appendChild(this.nitroGauge);

    this.speedometer = createSpeedometer({
      speed: 0,
      unit: 'km/h',
    });
    bottomBar.appendChild(this.speedometer);
    this.hudContainer.appendChild(bottomBar);

    uiRoot.appendChild(this.hudContainer);

    // 7. Dev-only debug tools: dynamically imported only when import.meta.env.DEV
    if (import.meta.env.DEV) {
      import('../ui/debug').then(({ DebugOverlay, TuningPanel }) => {
        this.debugOverlay = new DebugOverlay();
        this.tuningPanel = new TuningPanel(this.liveCarData);
      });
    }

    // 8. Game loop (60 Hz fixed timestep simulation, interpolated rendering)
    this.gameLoop = new GameLoop({
      update: this.onSimulate,
      render: this.onRender,
    });
  }

  public start(): void {
    this.lastRenderTimestampMs = performance.now();
    this.gameLoop.start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  public stop(): void {
    this.gameLoop.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  public dispose(): void {
    this.stop();
    this.inputManager.dispose();
    this.carView.dispose();
    this.cameraRig.dispose();
    this.renderer.dispose();
    this.debugOverlay?.dispose();
    this.tuningPanel?.dispose();
    if (this.hudContainer.parentElement) {
      this.hudContainer.parentElement.removeChild(this.hudContainer);
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.gameLoop.stop();
    } else {
      this.lastRenderTimestampMs = performance.now();
      this.gameLoop.start();
    }
  };

  private readonly onSimulate = (fixedDt: number): void => {
    // 1. Copy current state to previous state for interpolation (zero allocations)
    copyVehicleState(this.currentVehicleState, this.previousVehicleState);

    // 2. Poll input state (zero allocations)
    const input = this.inputManager.poll();

    // 3. Step vehicle simulation (zero allocations)
    VehicleModel.step(this.currentVehicleState, input, this.liveCarData, fixedDt);
  };

  private readonly onRender = (alpha: number): void => {
    const nowMs = performance.now();
    const frameDt = (nowMs - this.lastRenderTimestampMs) * 0.001;
    this.lastRenderTimestampMs = nowMs;

    // 1. Interpolate car 3D mesh with drift slide angle & steering roll
    this.carView.update(this.previousVehicleState, this.currentVehicleState, alpha);

    // 2. Update chase camera with spring smoothing and dynamic FOV
    this.cameraRig.update(
      this.carView.getPosition(),
      this.carView.getHeading(),
      this.currentVehicleState.speed,
      frameDt,
      this.renderer.getAspect(),
    );

    // 3. Render 3D scene
    this.renderer.render();

    // 4. Update speedometer readout with real vehicle speed (m/s converted to km/h)
    const speedKmh = this.currentVehicleState.speed * 3.6;
    this.speedometer.setSpeed(speedKmh);

    // 5. Update nitro gauge readout (bottom-left)
    this.nitroGauge.setValue(this.currentVehicleState.nitroAmount);
    const isNitroLow =
      this.currentVehicleState.nitroAmount < 0.2 && this.currentVehicleState.nitroActiveTime <= 0;
    this.nitroGauge.setWarning(isNitroLow, 'LOW NITRO');

    // 6. Update drift points and multiplier widget
    this.driftHud.setDrift(
      this.currentVehicleState.isDrifting,
      this.currentVehicleState.driftScore,
      this.currentVehicleState.driftMultiplier,
    );

    // 7. Update dev debug stats if active
    if (this.debugOverlay) {
      this.debugOverlay.update(
        frameDt,
        this.renderer.webglRenderer.info.render.calls,
        this.renderer.webglRenderer.info.render.triangles,
      );
    }
  };
}
