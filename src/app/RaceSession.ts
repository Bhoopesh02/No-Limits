import type { EventBus } from '../core/EventBus';
import type { CarData } from '../data/CarData';
import type { GameEvents } from '../data/GameEvents';
import type { InputState } from '../data/InputState';
import type { TrackData } from '../data/TrackData';
import { RaceController } from '../race/RaceController';
import { createEmptySplineSample, Spline } from '../race/Spline';
import { TrackLimits } from '../race/TrackLimits';
import type { CameraRig } from '../render/CameraRig';
import type { CarView } from '../render/CarView';
import type { Renderer } from '../render/Renderer';
import type { TrackView } from '../render/TrackView';
import { createDriftHUD, DriftHUDElement } from '../ui/components/DriftHUD';
import { createLapBadge, LapBadgeElement } from '../ui/components/LapBadge';
import { createLapTimerHUD, LapTimerHUDElement } from '../ui/components/LapTimerHUD';
import { createNitroGauge, NitroGaugeElement } from '../ui/components/NitroGauge';
import { createSpeedometer, SpeedometerElement } from '../ui/components/Speedometer';
import { VehicleModel } from '../vehicle/VehicleModel';
import { copyVehicleState, createVehicleState, VehicleState } from '../vehicle/VehicleState';

export interface RaceSessionOptions {
  readonly renderer: Renderer;
  readonly cameraRig: CameraRig;
  readonly carView: CarView;
  readonly trackData: TrackData;
  readonly carData: CarData;
  readonly spline: Spline;
  readonly trackView: TrackView;
  readonly bus: EventBus<GameEvents>;
  readonly uiRoot: HTMLElement;
  readonly isTouch: boolean;
}

/**
 * Encapsulates the lifecycle, simulation, view state, and HUD for one race.
 *
 * Rules:
 * - Owns VehicleState, TrackLimits, RaceController, and HUD elements.
 * - Guarantees zero allocations per simulation and render step.
 * - Fully disposes track mesh geometries, materials, and HUD elements upon session exit.
 */
export class RaceSession {
  private readonly renderer: Renderer;
  private readonly cameraRig: CameraRig;
  private readonly carView: CarView;
  private readonly trackData: TrackData;
  private readonly liveCarData: CarData;
  private readonly spline: Spline;
  private readonly trackView: TrackView;

  private readonly trackLimits: TrackLimits;
  private readonly raceController: RaceController;

  private readonly previousVehicleState: VehicleState;
  private readonly currentVehicleState: VehicleState;

  // Race HUD
  private readonly hudContainer: HTMLElement;
  private readonly topRow: HTMLElement;
  private readonly bottomRow: HTMLElement;
  private readonly topBar: HTMLElement;
  private readonly countdownEl: HTMLElement;
  private readonly speedometer: SpeedometerElement;
  private readonly nitroGauge: NitroGaugeElement;
  private readonly driftHud: DriftHUDElement;
  private readonly lapBadge: LapBadgeElement;
  private readonly lapTimerHud: LapTimerHUDElement;
  private readonly lapGroup: HTMLElement;

  constructor(options: RaceSessionOptions) {
    this.renderer = options.renderer;
    this.cameraRig = options.cameraRig;
    this.carView = options.carView;
    this.trackData = options.trackData;
    this.liveCarData = options.carData;
    this.spline = options.spline;
    this.trackView = options.trackView;

    // 1. Mount track view to scene
    this.renderer.scene.add(this.trackView.group);

    // 2. Race physics limits and controller
    this.trackLimits = new TrackLimits(this.spline);
    this.raceController = new RaceController({
      trackLength: this.spline.length,
      totalLaps: this.trackData.laps,
      checkpointCount: this.trackData.checkpointCount,
      bus: options.bus,
    });

    // 3. Vehicle zero-allocation states
    this.previousVehicleState = createVehicleState(0, 0, 0, 0, 0);
    this.currentVehicleState = createVehicleState(0, 0, 0, 0, 0);

    // 4. Build HUD
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
      z-index: 15;
    `;

    this.topRow = document.createElement('div');
    this.topRow.className = 'hud-row--top';
    this.topRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    `;

    this.lapBadge = createLapBadge({ currentLap: 1, totalLaps: this.trackData.laps });
    this.lapTimerHud = createLapTimerHUD();
    this.lapGroup = document.createElement('div');
    this.lapGroup.className = 'nl-hud-group--lap';
    this.lapGroup.appendChild(this.lapBadge.element);
    this.lapGroup.appendChild(this.lapTimerHud.element);

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
      <div><strong style="color: var(--text-primary); font-family: var(--font-display);">NO LIMITS</strong> &bull; Race</div>
      <div style="font-size: var(--fs-12); color: var(--text-secondary); margin-left: var(--space-3);">
        <strong style="color: var(--accent);">W/S/A/D</strong> | Space: Drift | Shift: Nitro | Esc: Pause | R: Reset
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

    // Prominent countdown display
    this.countdownEl = document.createElement('div');
    this.countdownEl.style.cssText = `
      position: absolute;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--font-display);
      font-size: clamp(64px, 12vw, 96px);
      font-weight: 700;
      color: var(--accent);
      text-shadow: 0 0 32px rgba(61, 165, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.8);
      pointer-events: none;
      z-index: 100;
      letter-spacing: 2px;
      display: none;
    `;
    this.hudContainer.appendChild(this.countdownEl);

    this.hudContainer.appendChild(this.topRow);
    this.hudContainer.appendChild(this.bottomRow);
    options.uiRoot.appendChild(this.hudContainer);

    this.layoutHud(options.isTouch);
    this.resetCarToStart();
  }

  public getTrackView(): TrackView {
    return this.trackView;
  }

  public getRaceController(): RaceController {
    return this.raceController;
  }

  public resetCarToStart(): void {
    const sample = createEmptySplineSample();
    this.spline.sample(0, sample);
    const startHeading = Math.atan2(-sample.tangentX, -sample.tangentZ);

    this.currentVehicleState.x = sample.x;
    this.currentVehicleState.y = sample.y;
    this.currentVehicleState.z = sample.z;
    this.currentVehicleState.heading = startHeading;
    this.currentVehicleState.forwardSpeed = 0;
    this.currentVehicleState.lateralSpeed = 0;
    this.currentVehicleState.speed = 0;
    this.currentVehicleState.steerAngle = 0;
    this.currentVehicleState.steerInput = 0;
    this.currentVehicleState.angularVelocity = 0;
    this.currentVehicleState.isDrifting = false;
    this.currentVehicleState.driftScore = 0;
    this.currentVehicleState.driftMultiplier = 1;
    this.currentVehicleState.isReversing = false;
    this.currentVehicleState.nitroAmount = 1.0;
    this.currentVehicleState.nitroActiveTime = 0;
    this.currentVehicleState.nitroCooldownTimer = 0;

    copyVehicleState(this.currentVehicleState, this.previousVehicleState);
    this.cameraRig.teleport(this.currentVehicleState, startHeading);
    this.trackLimits.resetHint(0);
    this.raceController.reset(0);

    const state = this.raceController.getLapTimer().getState();
    this.lapBadge.setLap(state.currentLap, state.totalLaps);
    this.lapTimerHud.updateTimes(state.currentLapTimeMs, state.lastLapTimeMs, state.bestLapTimeMs);
  }

  public layoutHud(isTouch: boolean): void {
    if (isTouch) {
      this.hudContainer.classList.add('has-touch-controls');
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.lapGroup);
      this.topRow.appendChild(this.driftHud);

      const topActionsGroup = document.createElement('div');
      topActionsGroup.style.cssText = `
        display: flex;
        gap: var(--space-3);
        align-items: flex-start;
      `;
      topActionsGroup.appendChild(this.nitroGauge);
      topActionsGroup.appendChild(this.speedometer);
      this.topRow.appendChild(topActionsGroup);

      this.bottomRow.style.display = 'none';
    } else {
      this.hudContainer.classList.remove('has-touch-controls');
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.lapGroup);
      this.topRow.appendChild(this.driftHud);
      this.topRow.appendChild(this.topBar);

      this.bottomRow.style.display = 'flex';
      this.bottomRow.innerHTML = '';
      this.bottomRow.appendChild(this.nitroGauge);
      this.bottomRow.appendChild(this.speedometer);
    }
  }

  public simulate(fixedDt: number, rawInput: InputState): void {
    // 1. Copy current state to previous for interpolation
    copyVehicleState(this.currentVehicleState, this.previousVehicleState);

    // 2. Filter input through race phase (neutral during countdown / finished)
    const input = this.raceController.filterInput(rawInput);

    // 3. Step physics simulation
    VehicleModel.step(this.currentVehicleState, input, this.liveCarData, fixedDt, this.trackLimits);

    // 4. Update checkpoints and lap timer
    const dist = this.trackLimits.getLastProjection().distance;
    this.raceController.update(dist, fixedDt);
  }

  public render(alpha: number, frameDt: number): void {
    // 1. Interpolate car mesh
    this.carView.update(this.previousVehicleState, this.currentVehicleState, alpha);

    // 2. Update chase camera
    this.cameraRig.update(
      this.carView.getPosition(),
      this.carView.getHeading(),
      this.currentVehicleState.speed,
      frameDt,
      this.renderer.getAspect(),
      this.currentVehicleState.isReversing,
    );

    // 3. Update HUD readouts
    const speedKmh = Math.abs(this.currentVehicleState.speed * 3.6);
    this.speedometer.setSpeed(speedKmh);
    this.speedometer.setReversing(this.currentVehicleState.isReversing);

    this.nitroGauge.setValue(this.currentVehicleState.nitroAmount);
    const isNitroLow =
      this.currentVehicleState.nitroAmount < 0.2 && this.currentVehicleState.nitroActiveTime <= 0;
    this.nitroGauge.setWarning(isNitroLow, 'LOW NITRO');

    this.driftHud.setDrift(
      this.currentVehicleState.isDrifting,
      this.currentVehicleState.driftScore,
      this.currentVehicleState.driftMultiplier,
    );

    const lapState = this.raceController.getLapTimer().getState();
    this.lapBadge.setLap(lapState.currentLap, lapState.totalLaps);
    this.lapTimerHud.updateTimes(
      lapState.currentLapTimeMs,
      lapState.lastLapTimeMs,
      lapState.bestLapTimeMs,
    );

    // 4. Countdown banner readout
    const countdown = this.raceController.getCountdownDisplay();
    if (countdown !== null) {
      this.countdownEl.style.display = 'block';
      this.countdownEl.textContent = String(countdown);
    } else {
      this.countdownEl.style.display = 'none';
    }
  }

  public dispose(): void {
    this.renderer.scene.remove(this.trackView.group);
    this.trackView.dispose();
    this.hudContainer.remove();
  }
}
