import { EventBus } from '../core/EventBus';
import { GameLoop } from '../core/GameLoop';
import { DEFAULT_CAR_KAZE } from '../data/CarData';
import type { GameEvents } from '../data/GameEvents';
import { GRAPHICS_TIER_MEDIUM } from '../data/GraphicsTierConfig';
import { createTouchControlState, TouchControlState } from '../data/TouchControlState';
import { GamepadInput } from '../input/GamepadInput';
import { InputManager } from '../input/InputManager';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { CameraRig } from '../render/CameraRig';
import { getCarDetailForTier } from '../data/CarRenderBudget';
import { CarFactory } from '../render/car/CarFactory';
import { CarView } from '../render/CarView';
import { Renderer } from '../render/Renderer';
import { auditScene } from '../render/sceneAudit';
import { createRotateHint, RotateHintElement } from '../ui/components/RotateHint';
import { createTouchControls, TouchControlsElement } from '../ui/components/TouchControls';
import { GameFlow } from './GameFlow';

export interface AppOptions {
  readonly gameRootId?: string;
  readonly uiRootId?: string;
}

interface DevTools {
  dispose(): void;
  update(
    frameDt: number,
    calls: number,
    triangles: number,
    memoryGeometries?: number,
    memoryTextures?: number,
  ): void;
}

/**
 * Top-level application bootstrap.
 *
 * Responsibilities:
 * - Instantiates long-lived systems (Renderer, CarView, CameraRig, InputManager, EventBus).
 * - Owns GameFlow which coordinates StateMachine, ScreenManager, and RaceSessions.
 * - Runs the 60 Hz fixed timestep GameLoop with coordinated pause arbitration.
 * - Bridges gamepad input to typed menu navigation events.
 */
export class App {
  private readonly bus: EventBus<GameEvents>;
  private readonly renderer: Renderer;
  private readonly cameraRig: CameraRig;
  private readonly carFactory: CarFactory;
  private readonly carView: CarView;

  private readonly keyboardInput: KeyboardInput;
  private readonly gamepadInput: GamepadInput;
  private readonly touchState: TouchControlState;
  private readonly touchInput: TouchInput;
  private readonly inputManager: InputManager;

  private readonly touchControls: TouchControlsElement;
  private readonly rotateHint: RotateHintElement;
  private readonly gameFlow: GameFlow;
  private readonly gameLoop: GameLoop;

  private readonly pauseReasons = new Set<string>();
  private lastRenderTimestampMs = performance.now();

  private debugOverlay: DevTools | null = null;
  private tuningPanel: { dispose(): void } | null = null;

  // Gamepad navigation debounce flags
  private prevDpadUp = false;
  private prevDpadDown = false;
  private prevBtnA = false;
  private prevBtnB = false;

  constructor(options: AppOptions = {}) {
    const gameRootId = options.gameRootId ?? 'game-root';
    const uiRootId = options.uiRootId ?? 'ui-root';

    // 1. Shared EventBus
    this.bus = new EventBus<GameEvents>();

    // 2. Renderer & Camera
    this.renderer = new Renderer(gameRootId, uiRootId, GRAPHICS_TIER_MEDIUM);
    this.cameraRig = new CameraRig(this.renderer.camera, {
      maxSpeed: DEFAULT_CAR_KAZE.topSpeed,
    });

    // 3. 3D Car View with shared CarFactory
    this.carFactory = new CarFactory();
    let carDetail = getCarDetailForTier(GRAPHICS_TIER_MEDIUM.id);
    if (import.meta.env.DEV && typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const queryDetail = params.get('cardetail');
      if (queryDetail === 'low' || queryDetail === 'medium' || queryDetail === 'high') {
        carDetail = queryDetail;
      }
    }
    this.carView = new CarView({
      factory: this.carFactory,
      detail: carDetail,
      paintColor: DEFAULT_CAR_KAZE.paints[0],
    });
    this.renderer.scene.add(this.carView.getRoot());

    // 4. Input devices
    this.keyboardInput = new KeyboardInput();
    this.gamepadInput = new GamepadInput();
    this.touchState = createTouchControlState();
    this.touchInput = new TouchInput(this.touchState);

    this.inputManager = new InputManager({
      keyboard: this.keyboardInput,
      gamepad: this.gamepadInput,
      touch: this.touchInput,
    });

    const uiRoot = document.getElementById(uiRootId);
    if (!uiRoot) {
      throw new Error(`Element #${uiRootId} not found.`);
    }

    // 5. Touch overlay and rotate hint
    this.touchControls = createTouchControls(this.touchState);
    this.touchControls.style.display = 'none';
    uiRoot.appendChild(this.touchControls);

    this.rotateHint = createRotateHint();
    this.rotateHint.onVisibilityChange((showing) => {
      if (showing) {
        this.addPauseReason('rotate_hint');
      } else {
        this.removePauseReason('rotate_hint');
      }
    });
    uiRoot.appendChild(this.rotateHint);

    // 6. Game Flow & State Machine
    this.gameFlow = new GameFlow({
      uiRoot,
      renderer: this.renderer,
      cameraRig: this.cameraRig,
      carView: this.carView,
      bus: this.bus,
      isTouch: this.touchControls.isVisible(),
      onPauseStateChange: (paused) => {
        if (paused) {
          this.addPauseReason('user_pause');
        } else {
          this.removePauseReason('user_pause');
        }
      },
    });

    // 7. Dev-only tools (debug overlay + tuning panel)
    if (import.meta.env.DEV) {
      import('../ui/debug').then(({ DebugOverlay, TuningPanel }) => {
        const overlay = new DebugOverlay();
        overlay.setAuditProvider(() =>
          auditScene(
            this.renderer.webglRenderer,
            this.renderer.scene,
            this.carView.getRoot(),
            this.gameFlow.getActiveTrackView()?.group,
          ),
        );
        this.debugOverlay = overlay;
        this.tuningPanel = new TuningPanel(DEFAULT_CAR_KAZE);
      });
    }

    // 8. Event listeners
    window.addEventListener('keydown', this.onKeyDown);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    // 9. Game loop (60 Hz fixed timestep)
    this.gameLoop = new GameLoop({
      update: this.onSimulate,
      render: this.onRender,
    });
  }

  public start(): void {
    this.lastRenderTimestampMs = performance.now();
    this.gameFlow.start();
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
  }

  public getGameFlow(): GameFlow {
    return this.gameFlow;
  }

  public addPauseReason(reason: string): void {
    this.pauseReasons.add(reason);
  }

  public removePauseReason(reason: string): void {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0) {
      this.lastRenderTimestampMs = performance.now();
    }
  }

  public isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    this.gamepadInput.dispose();
    this.keyboardInput.dispose();
    this.touchInput.dispose();
    this.touchControls.dispose();
    this.rotateHint.dispose();
    this.inputManager.dispose();

    this.gameFlow.dispose();
    this.carView.dispose();
    this.carFactory.dispose();
    this.cameraRig.dispose();
    this.renderer.dispose();
    this.debugOverlay?.dispose();
    this.tuningPanel?.dispose();
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.addPauseReason('tab_hidden');
    } else {
      this.removePauseReason('tab_hidden');
    }
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      this.gameFlow.togglePause();
    } else if (e.code === 'KeyR' && !e.repeat) {
      if (this.gameFlow.getStateMachine().getState() === 'Race') {
        this.gameFlow.transitionTo('Loading');
      }
    }
  };

  private readonly onSimulate = (fixedDt: number): void => {
    if (this.isPaused()) {
      return;
    }

    const input = this.inputManager.poll();
    this.gameFlow.simulate(fixedDt, input);
  };

  private readonly onRender = (alpha: number): void => {
    const nowMs = performance.now();
    const frameDt = (nowMs - this.lastRenderTimestampMs) * 0.001;
    this.lastRenderTimestampMs = nowMs;

    this.gamepadInput.updateCache();
    this.bridgeGamepadMenuNavigation();

    // Sync touch controls visibility with Race state
    const isRaceState = this.gameFlow.getStateMachine().getState() === 'Race';
    if (this.touchControls.isVisible()) {
      this.touchControls.style.display = isRaceState ? 'block' : 'none';
    }

    this.gameFlow.render(alpha, frameDt);
    this.renderer.render();

    if (this.debugOverlay) {
      this.debugOverlay.update(
        frameDt,
        this.renderer.webglRenderer.info.render.calls,
        this.renderer.webglRenderer.info.render.triangles,
        this.renderer.webglRenderer.info.memory.geometries,
        this.renderer.webglRenderer.info.memory.textures,
      );
    }
  };

  private bridgeGamepadMenuNavigation(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    const pad = gamepads[0];
    if (!pad) return;

    const dpadUp = pad.buttons[12]?.pressed ?? false;
    const dpadDown = pad.buttons[13]?.pressed ?? false;
    const btnA = pad.buttons[0]?.pressed ?? false;
    const btnB = pad.buttons[1]?.pressed ?? false;

    if (dpadUp && !this.prevDpadUp) {
      this.bus.emit('menu:navigate', 'up');
    }
    if (dpadDown && !this.prevDpadDown) {
      this.bus.emit('menu:navigate', 'down');
    }
    if (btnA && !this.prevBtnA) {
      this.bus.emit('menu:navigate', 'confirm');
    }
    if (btnB && !this.prevBtnB) {
      this.bus.emit('menu:navigate', 'back');
    }

    this.prevDpadUp = dpadUp;
    this.prevDpadDown = dpadDown;
    this.prevBtnA = btnA;
    this.prevBtnB = btnB;
  }
}
