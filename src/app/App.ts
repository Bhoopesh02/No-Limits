import { GameLoop } from '../core/GameLoop';
import { CarData, DEFAULT_CAR_KAZE } from '../data/CarData';
import { GRAPHICS_TIER_MEDIUM } from '../data/GraphicsTierConfig';
import { createTouchControlState, TouchControlState } from '../data/TouchControlState';
import { GamepadInput } from '../input/GamepadInput';
import { InputManager } from '../input/InputManager';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { CameraRig } from '../render/CameraRig';
import { CarView } from '../render/CarView';
import { Renderer } from '../render/Renderer';
import { createDriftHUD, DriftHUDElement } from '../ui/components/DriftHUD';
import { createNitroGauge, NitroGaugeElement } from '../ui/components/NitroGauge';
import { createRotateHint, RotateHintElement } from '../ui/components/RotateHint';
import { createSpeedometer, SpeedometerElement } from '../ui/components/Speedometer';
import { createTouchControls, TouchControlsElement } from '../ui/components/TouchControls';
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
  private readonly gamepadInput: GamepadInput;
  private readonly touchState: TouchControlState;
  private readonly touchInput: TouchInput;
  private readonly inputManager: InputManager;

  private readonly touchControls: TouchControlsElement;
  private readonly rotateHint: RotateHintElement;
  private readonly gameLoop: GameLoop;

  private readonly previousVehicleState: VehicleState;
  private readonly currentVehicleState: VehicleState;
  private readonly liveCarData: CarData;

  private readonly speedometer: SpeedometerElement;
  private readonly nitroGauge: NitroGaugeElement;
  private readonly driftHud: DriftHUDElement;
  private readonly hudContainer: HTMLElement;
  private readonly topRow: HTMLElement;
  private readonly bottomRow: HTMLElement;
  private readonly topBar: HTMLElement;

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

    // 4. Input handling: keyboard, gamepad, and touch controls
    this.keyboardInput = new KeyboardInput();
    this.gamepadInput = new GamepadInput();
    this.touchState = createTouchControlState();
    this.touchInput = new TouchInput(this.touchState);

    this.inputManager = new InputManager({
      keyboard: this.keyboardInput,
      gamepad: this.gamepadInput,
      touch: this.touchInput,
    });

    // 5. Vehicle state (zero-allocation simulation buffers)
    this.previousVehicleState = createVehicleState(0, 0, 0, 0, 0);
    this.currentVehicleState = createVehicleState(0, 0, 0, 0, 0);

    // Initial camera placement
    this.cameraRig.teleport(this.currentVehicleState, this.currentVehicleState.heading);

    // 6. HUD elements & touch overlay
    const uiRoot = document.getElementById(uiRootId);
    if (!uiRoot) {
      throw new Error(`Element #${uiRootId} not found.`);
    }
    uiRoot.innerHTML = '';

    this.hudContainer = document.createElement('div');
    this.hudContainer.className = 'hud-root';
    this.hudContainer.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: max(var(--space-4), env(safe-area-inset-top, 0px))
        max(var(--space-4), env(safe-area-inset-right, 0px))
        max(var(--space-4), env(safe-area-inset-bottom, 0px))
        max(var(--space-4), env(safe-area-inset-left, 0px));
      box-sizing: border-box;
    `;

    this.topRow = document.createElement('div');
    this.topRow.className = 'hud-row--top';
    this.topRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    `;

    this.topBar = document.createElement('div');
    this.topBar.className = 'hud-desktop-bar';
    this.topBar.style.cssText = `
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
    this.topBar.innerHTML = `
      <div><strong style="color: var(--text-primary); font-family: var(--font-display);">NO LIMITS</strong> &bull; Week 2 Milestone</div>
      <div style="font-size: var(--fs-12); color: var(--text-secondary); margin-left: var(--space-3);">
        Controls: <strong style="color: var(--accent);">W/S/A/D</strong> | Space: Drift | Shift: Nitro | \`: Dev Stats | F2: Tuning
      </div>
    `;

    this.driftHud = createDriftHUD();

    this.bottomRow = document.createElement('div');
    this.bottomRow.className = 'hud-row--bottom';
    this.bottomRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
    `;

    this.nitroGauge = createNitroGauge({ value: 1.0 });
    this.speedometer = createSpeedometer({ speed: 0, unit: 'km/h' });

    this.hudContainer.appendChild(this.topRow);
    this.hudContainer.appendChild(this.bottomRow);
    uiRoot.appendChild(this.hudContainer);

    // Touch controls DOM layer (writes to this.touchState)
    this.touchControls = createTouchControls(this.touchState);
    uiRoot.appendChild(this.touchControls);

    // Rotate hint (phones in portrait)
    this.rotateHint = createRotateHint();
    this.rotateHint.onVisibilityChange((showing) => {
      if (!showing) {
        this.lastRenderTimestampMs = performance.now();
      }
    });
    uiRoot.appendChild(this.rotateHint);

    // Initial HUD layout based on touch controls visibility
    this.layoutHud(this.touchControls.isVisible());

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
    this.gamepadInput.dispose();
    this.keyboardInput.dispose();
    this.touchInput.dispose();
    this.touchControls.dispose();
    this.rotateHint.dispose();
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

  private layoutHud(isTouch: boolean): void {
    if (isTouch) {
      this.hudContainer.classList.add('has-touch-controls');
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.nitroGauge);
      this.topRow.appendChild(this.driftHud);
      this.topRow.appendChild(this.speedometer);
      this.bottomRow.style.display = 'none';
    } else {
      this.hudContainer.classList.remove('has-touch-controls');
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.topBar);
      this.topRow.appendChild(this.driftHud);
      this.bottomRow.style.display = 'flex';
      this.bottomRow.innerHTML = '';
      this.bottomRow.appendChild(this.nitroGauge);
      this.bottomRow.appendChild(this.speedometer);
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
    // Pause simulation updates while rotate hint is shown
    if (this.rotateHint.isShowing()) {
      return;
    }

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

    // Refresh gamepad cache once per rendered frame (navigator.getGamepads allocation protection)
    this.gamepadInput.updateCache();

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

    // 5. Update nitro gauge readout
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
