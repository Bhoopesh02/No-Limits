import { StateMachine } from '../core/StateMachine';
import type { EventBus, Unsubscribe } from '../core/EventBus';
import type { GameEvents } from '../data/GameEvents';
import { GAME_STATE_TRANSITIONS, GameState } from '../data/GameState';
import { getCarDetailForTier, type CarDetailLevel } from '../data/CarRenderBudget';
import type { GraphicsTierConfig } from '../data/GraphicsTierConfig';
import type { InputState } from '../data/InputState';
import type { RaceResult } from '../data/RaceResult';
import { Spline } from '../race/Spline';
import { AssetLoader } from '../render/AssetLoader';
import type { CameraRig } from '../render/CameraRig';
import type { CarFactory } from '../render/car/CarFactory';
import type { CarView } from '../render/CarView';
import type { Renderer } from '../render/Renderer';
import type { TierApplier } from '../render/TierApplier';
import type { TrackView } from '../render/TrackView';
import type { GraphicsService } from '../services/GraphicsService';
import type { SettingsService } from '../services/SettingsService';
import { ScreenManager } from '../ui/ScreenManager';
import { BootScreen } from '../ui/screens/BootScreen';
import { LoadingScreen } from '../ui/screens/LoadingScreen';
import { MenuScreen } from '../ui/screens/MenuScreen';
import { PauseOverlay } from '../ui/screens/PauseOverlay';
import { ResultsScreen } from '../ui/screens/ResultsScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { RaceSession } from './RaceSession';

export interface GameFlowOptions {
  readonly uiRoot: HTMLElement;
  readonly renderer: Renderer;
  readonly cameraRig: CameraRig;
  readonly carView: CarView;
  readonly carFactory?: CarFactory;
  readonly playerDetail?: CarDetailLevel;
  readonly tier?: GraphicsTierConfig;
  readonly tierApplier?: TierApplier;
  readonly bus: EventBus<GameEvents>;
  readonly isTouch: boolean;
  readonly onPauseStateChange?: (isPaused: boolean) => void;
  readonly graphicsService?: GraphicsService;
  readonly settingsService?: SettingsService;
}

export class GameFlow {
  private readonly uiRoot: HTMLElement;
  private readonly renderer: Renderer;
  private readonly cameraRig: CameraRig;
  private readonly carView: CarView;
  private readonly carFactory?: CarFactory;
  private readonly playerDetail?: CarDetailLevel;
  private readonly bus: EventBus<GameEvents>;
  private readonly isTouch: boolean;
  private readonly onPauseStateChange?: (isPaused: boolean) => void;
  private readonly tierApplier?: TierApplier;
  private tier?: GraphicsTierConfig;

  private readonly stateMachine: StateMachine<GameState>;
  private readonly screenManager: ScreenManager;
  private readonly pauseOverlay: PauseOverlay;
  private readonly settingsScreen?: SettingsScreen;

  private readonly loadingScreen: LoadingScreen;
  private readonly resultsScreen: ResultsScreen;

  private raceSession: RaceSession | null = null;
  private unsubs: Unsubscribe[] = [];

  constructor(options: GameFlowOptions) {
    this.uiRoot = options.uiRoot;
    this.renderer = options.renderer;
    this.cameraRig = options.cameraRig;
    this.carView = options.carView;
    this.carFactory = options.carFactory;
    this.playerDetail = options.playerDetail;
    this.bus = options.bus;
    this.isTouch = options.isTouch;
    this.onPauseStateChange = options.onPauseStateChange;
    this.tier = options.tier;
    this.tierApplier = options.tierApplier;

    // 1. State machine
    this.stateMachine = new StateMachine<GameState>({
      initial: 'Boot',
      transitions: GAME_STATE_TRANSITIONS,
      bus: this.bus,
    });

    // 2. Screen manager
    this.screenManager = new ScreenManager({
      uiRoot: this.uiRoot,
      bus: this.bus,
    });

    // 3. Settings modal
    if (options.settingsService && options.graphicsService) {
      this.settingsScreen = new SettingsScreen({
        settingsService: options.settingsService,
        graphicsService: options.graphicsService,
      });
      this.uiRoot.appendChild(this.settingsScreen.modal);
    }

    // 4. Register screens
    const bootScreen = new BootScreen({
      onStart: () => {
        this.transitionTo('Menu');
      },
    });

    const menuScreen = new MenuScreen({
      onPlay: () => {
        this.transitionTo('Loading');
      },
      onSettings: () => {
        this.settingsScreen?.open();
      },
    });

    this.loadingScreen = new LoadingScreen({
      onRetry: () => {
        this.startLoading();
      },
    });

    this.resultsScreen = new ResultsScreen({
      onRaceAgain: () => {
        this.transitionTo('Loading');
      },
      onMainMenu: () => {
        this.transitionTo('Menu');
      },
    });

    this.screenManager.registerScreen('Boot', bootScreen);
    this.screenManager.registerScreen('Menu', menuScreen);
    this.screenManager.registerScreen('Loading', this.loadingScreen);
    this.screenManager.registerScreen('Results', this.resultsScreen);

    // 5. Pause overlay
    this.pauseOverlay = new PauseOverlay({
      onResume: () => this.onPauseStateChange?.(false),
      onRestart: () => {
        this.onPauseStateChange?.(false);
        this.transitionTo('Loading');
      },
      onSettings: () => this.settingsScreen?.open(),
      onQuit: () => {
        this.onPauseStateChange?.(false);
        this.transitionTo('Menu');
      },
    });

    // 6. Listen to race events
    this.unsubs.push(
      this.bus.on('race:finished', (result: RaceResult) => {
        this.resultsScreen.setResult(result);
        this.transitionTo('Results');
      }),
      this.bus.on('race:pause', () => this.togglePause()),
    );
  }

  public getStateMachine(): StateMachine<GameState> {
    return this.stateMachine;
  }

  public getActiveTrackView(): TrackView | null {
    return this.raceSession?.getTrackView() ?? null;
  }

  public getActiveRaceSession(): RaceSession | null {
    return this.raceSession;
  }

  public isPaused(): boolean {
    return this.pauseOverlay.isOpen();
  }

  public togglePause(): void {
    if (this.stateMachine.getState() !== 'Race') return;
    this.pauseOverlay.toggle();
    this.onPauseStateChange?.(this.pauseOverlay.isOpen());
  }

  public start(): void {
    this.stateMachine.start();
  }

  public transitionTo(nextState: GameState): void {
    if (!this.stateMachine.canTransition(nextState)) {
      return;
    }

    const prevState = this.stateMachine.getState();

    // Clean up race session when leaving Race state
    if (prevState === 'Race' && nextState !== 'Race') {
      this.raceSession?.dispose();
      this.raceSession = null;
    }

    this.stateMachine.transition(nextState);

    // Handlers for entering specific states
    if (nextState === 'Loading') {
      this.startLoading();
    } else if (nextState === 'Menu' || nextState === 'Results') {
      this.setupParkedCamera();
    }
  }

  private setupParkedCamera(): void {
    // Parked car view: fixed angled camera view overlooking the car
    this.renderer.camera.position.set(4, 2.2, 5);
    this.renderer.camera.lookAt(0, 0.6, 0);
  }

  private startLoading(): void {
    const loader = new AssetLoader({
      createSpline: (pts, step) => new Spline(pts, step ?? 1.0),
      onProgress: (ratio) => {
        this.loadingScreen.setProgress(ratio);
      },
    });

    loader
      .load()
      .then((assets) => {
        // Build new RaceSession
        this.raceSession?.dispose();
        const detail = this.tier
          ? getCarDetailForTier(this.tier.id)
          : (this.playerDetail ?? 'medium');
        const opponents = this.tier?.maxOpponents ?? 5;
        this.carView.setDetail(detail);

        this.raceSession = new RaceSession({
          renderer: this.renderer,
          cameraRig: this.cameraRig,
          carView: this.carView,
          carFactory: this.carFactory,
          playerDetail: detail,
          opponentCount: opponents,
          tierApplier: this.tierApplier,
          trackData: assets.trackData,
          carData: assets.carData,
          spline: assets.spline as Spline,
          trackView: assets.trackView,
          bus: this.bus,
          uiRoot: this.uiRoot,
          isTouch: this.isTouch,
        });

        this.transitionTo('Race');
      })
      .catch((err: Error) => {
        this.loadingScreen.setError(err.message, () => this.startLoading());
      });
  }

  public simulate(fixedDt: number, input: InputState): void {
    if (this.stateMachine.getState() === 'Race' && this.raceSession && !this.isPaused()) {
      this.raceSession.simulate(fixedDt, input);
    }
  }

  public render(alpha: number, frameDt: number): void {
    if (this.stateMachine.getState() === 'Race' && this.raceSession) {
      this.raceSession.render(alpha, frameDt);
    }
  }

  public setTier(tier: GraphicsTierConfig): void {
    this.tier = tier;
  }

  public getState(): GameState {
    return this.stateMachine.getState();
  }

  public getSettingsScreen(): SettingsScreen | undefined {
    return this.settingsScreen;
  }

  public dispose(): void {
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs.length = 0;
    this.raceSession?.dispose();
    this.raceSession = null;
    this.screenManager.dispose();
    this.pauseOverlay.dispose();
    this.settingsScreen?.dispose();
  }
}
