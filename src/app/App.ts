import { AudioEngine } from '../audio/AudioEngine';
import { EventBus } from '../core/EventBus';
import { GameLoop } from '../core/GameLoop';
import { DEFAULT_CAR_KAZE } from '../data/CarData';
import { getCarDetailForTier } from '../data/CarRenderBudget';
import type { GameEvents } from '../data/GameEvents';
import { getEffectivePixelRatio } from '../data/GraphicsTierConfig';
import { createTouchControlState, TouchControlState } from '../data/TouchControlState';
import { GamepadInput } from '../input/GamepadInput';
import { InputManager } from '../input/InputManager';
import { KeyboardInput } from '../input/KeyboardInput';
import { TouchInput } from '../input/TouchInput';
import { CameraRig } from '../render/CameraRig';
import { CarFactory } from '../render/car/CarFactory';
import { CarView } from '../render/CarView';
import { Renderer } from '../render/Renderer';
import { auditScene } from '../render/sceneAudit';
import { TierApplier } from '../render/TierApplier';
import { GraphicsService } from '../services/GraphicsService';
import { SettingsService } from '../services/SettingsService';
import { createRotateHint, RotateHintElement } from '../ui/components/RotateHint';
import { createTouchControls, TouchControlsElement } from '../ui/components/TouchControls';
import { GameFlow } from './GameFlow';

export interface AppOptions {
  readonly gameRootId?: string;
  readonly uiRootId?: string;
}

interface DevTools {
  dispose(): void;
  update(frameDt: number, calls: number, triangles: number, geoms?: number, tex?: number): void;
  recordSimStep?(durationMs: number): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setGraphicsProvider?(provider: () => any): void;
}

/**
 * Top-level application bootstrap.
 */
export class App {
  private readonly bus: EventBus<GameEvents>;
  private readonly settingsService: SettingsService;
  private readonly graphicsService: GraphicsService;
  private readonly renderer: Renderer;
  private readonly tierApplier: TierApplier;
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
  private readonly audioEngine: AudioEngine;

  private readonly pauseReasons = new Set<string>();
  private lastRenderTimestampMs = performance.now();

  private debugOverlay: DevTools | null = null;
  private tuningPanel: { dispose(): void } | null = null;

  private prevDpadUp = false;
  private prevDpadDown = false;
  private prevBtnA = false;
  private prevBtnB = false;

  constructor(options: AppOptions = {}) {
    const gameRootId = options.gameRootId ?? 'game-root';
    const uiRootId = options.uiRootId ?? 'ui-root';

    this.bus = new EventBus<GameEvents>();
    this.settingsService = new SettingsService();
    this.audioEngine = new AudioEngine({
      bus: this.bus,
      initialMaster: this.settingsService.get('masterVolume'),
      initialSfx: this.settingsService.get('sfxVolume'),
      initialMusic: this.settingsService.get('musicVolume'),
    });
    this.settingsService.subscribe((s) => this.audioEngine.syncVolumes(s));
    this.graphicsService = new GraphicsService({
      bus: this.bus,
      defaultTier: this.settingsService.get('graphicsTier'),
      initialScale: this.settingsService.get('resolutionScale'),
    });
    this.renderer = new Renderer(gameRootId, uiRootId);
    this.tierApplier = new TierApplier(this.renderer);
    this.cameraRig = new CameraRig(this.renderer.camera, { maxSpeed: DEFAULT_CAR_KAZE.topSpeed });

    if (this.graphicsService.isAuto()) {
      this.graphicsService.probeAndApplyInitialTier();
    }

    const initialTier = this.graphicsService.getTier();
    const initialScale = this.graphicsService.getResolutionScale();
    this.tierApplier.apply(initialTier, initialScale);

    this.carFactory = new CarFactory();
    let carDetail = getCarDetailForTier(initialTier.id);
    if (import.meta.env.DEV && typeof window !== 'undefined' && window.location) {
      const q = new URLSearchParams(window.location.search).get('cardetail');
      if (q === 'low' || q === 'medium' || q === 'high') carDetail = q;
    }
    this.carView = new CarView({
      factory: this.carFactory,
      detail: carDetail,
      paintColor: DEFAULT_CAR_KAZE.paints[0],
    });
    this.tierApplier.registerCarView(this.carView);
    this.renderer.scene.add(this.carView.getRoot());

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
    if (!uiRoot) throw new Error(`Element #${uiRootId} not found.`);

    this.touchControls = createTouchControls(this.touchState);
    this.touchControls.style.display = 'none';
    uiRoot.appendChild(this.touchControls);

    this.rotateHint = createRotateHint();
    this.rotateHint.onVisibilityChange((showing) => {
      if (showing) this.addPauseReason('rotate_hint');
      else this.removePauseReason('rotate_hint');
    });
    uiRoot.appendChild(this.rotateHint);

    this.gameFlow = new GameFlow({
      uiRoot,
      renderer: this.renderer,
      cameraRig: this.cameraRig,
      carView: this.carView,
      carFactory: this.carFactory,
      playerDetail: carDetail,
      tier: initialTier,
      tierApplier: this.tierApplier,
      bus: this.bus,
      isTouch: this.touchControls.isVisible(),
      graphicsService: this.graphicsService,
      settingsService: this.settingsService,
      onPauseStateChange: (paused) => {
        if (paused) this.addPauseReason('user_pause');
        else this.removePauseReason('user_pause');
      },
    });

    this.bus.on('graphics:changed', (payload) => {
      this.tierApplier.apply(payload.tier, payload.resolutionScale);
      this.gameFlow.setTier(payload.tier);
      const state = this.gameFlow.getState();
      if (state === 'Menu' || state === 'Results' || state === 'Boot') {
        this.carView.setDetail(getCarDetailForTier(payload.tier.id));
      }
    });

    this.bus.on('state:change', ({ to }) => {
      if (to === 'Race') this.audioEngine.startPlayerEngine();
      else this.audioEngine.stopPlayerEngine();
    });

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
        overlay.setGraphicsProvider(() => {
          const tier = this.graphicsService.getTier();
          const scale = this.graphicsService.getResolutionScale();
          const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
          const activeSession = this.gameFlow.getActiveRaceSession();
          return {
            tierId: tier.id,
            isAuto: this.graphicsService.isAuto(),
            effectivePixelRatio: getEffectivePixelRatio(dpr, tier.pixelRatioCap, scale),
            resolutionScale: scale,
            shadowMode: tier.shadows,
            cameraFar: tier.cameraFar,
            opponentCount: activeSession ? activeSession.opponentCount : tier.maxOpponents,
          };
        });
        this.debugOverlay = overlay;

        this.tuningPanel = new TuningPanel(
          DEFAULT_CAR_KAZE,
          document.body,
          {
            getAiPace: () => this.gameFlow.getActiveRaceSession()?.aiPaceScale ?? 1.0,
            setAiPace: (v) => {
              const s = this.gameFlow.getActiveRaceSession();
              if (s) s.aiPaceScale = v;
            },
            getRubberBandStrength: () =>
              this.gameFlow.getActiveRaceSession()?.rubberBandStrength ?? 1.0,
            setRubberBandStrength: (v) => {
              const s = this.gameFlow.getActiveRaceSession();
              if (s) s.rubberBandStrength = v;
            },
          },
          {
            getTierId: () => this.graphicsService.getSelectedOption(),
            setTierId: (id) => this.graphicsService.setTier(id),
            getResolutionScale: () => this.graphicsService.getResolutionScale(),
            setResolutionScale: (s) => this.graphicsService.setResolutionScale(s),
          },
        );
      });
    }

    window.addEventListener('keydown', this.onKeyDown);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    this.gameLoop = new GameLoop({ update: this.onSimulate, render: this.onRender });
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

  public getGraphicsService(): GraphicsService {
    return this.graphicsService;
  }

  public getSettingsService(): SettingsService {
    return this.settingsService;
  }

  public getTierApplier(): TierApplier {
    return this.tierApplier;
  }

  public getAudioEngine(): AudioEngine {
    return this.audioEngine;
  }

  public addPauseReason(reason: string): void {
    this.pauseReasons.add(reason);
    this.audioEngine.setPaused(true);
  }

  public removePauseReason(reason: string): void {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size === 0) {
      this.lastRenderTimestampMs = performance.now();
      this.audioEngine.setPaused(false);
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
    this.tierApplier.dispose();
    this.carView.dispose();
    this.carFactory.dispose();
    this.cameraRig.dispose();
    this.renderer.dispose();
    this.audioEngine.dispose();
    this.debugOverlay?.dispose();
    this.tuningPanel?.dispose();
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.addPauseReason('tab_hidden');
    else this.removePauseReason('tab_hidden');
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
    if (this.isPaused()) return;
    const t0 = performance.now();
    const input = this.inputManager.poll();
    this.gameFlow.simulate(fixedDt, input);
    if (this.gameFlow.getStateMachine().getState() === 'Race') {
      const ps = this.gameFlow.getActiveRaceSession()?.getPlayerState();
      if (ps) {
        this.audioEngine.updatePlayerAudio(
          ps.forwardSpeed, ps.lateralSpeed, input.throttle,
          ps.isReversing, ps.isDrifting, ps.nitroActiveTime, fixedDt,
        );
      }
    }
    this.debugOverlay?.recordSimStep?.(performance.now() - t0);
  };

  private readonly onRender = (alpha: number): void => {
    const nowMs = performance.now();
    const frameDt = (nowMs - this.lastRenderTimestampMs) * 0.001;
    this.lastRenderTimestampMs = nowMs;

    this.gamepadInput.updateCache();
    this.bridgeGamepadMenuNavigation();

    const isRaceState = this.gameFlow.getStateMachine().getState() === 'Race';
    if (this.touchControls.isVisible()) {
      this.touchControls.style.display = isRaceState ? 'block' : 'none';
    }

    const isSimulatingOrRacing = isRaceState && !this.isPaused();
    this.graphicsService.recordFrame(frameDt, isSimulatingOrRacing);

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
    const pad = navigator.getGamepads()[0];
    if (!pad) return;

    const dpadUp = pad.buttons[12]?.pressed ?? false;
    const dpadDown = pad.buttons[13]?.pressed ?? false;
    const btnA = pad.buttons[0]?.pressed ?? false;
    const btnB = pad.buttons[1]?.pressed ?? false;

    if (dpadUp && !this.prevDpadUp) this.bus.emit('menu:navigate', 'up');
    if (dpadDown && !this.prevDpadDown) this.bus.emit('menu:navigate', 'down');
    if (btnA && !this.prevBtnA) this.bus.emit('menu:navigate', 'confirm');
    if (btnB && !this.prevBtnB) this.bus.emit('menu:navigate', 'back');

    this.prevDpadUp = dpadUp;
    this.prevDpadDown = dpadDown;
    this.prevBtnA = btnA;
    this.prevBtnB = btnB;
  }
}
