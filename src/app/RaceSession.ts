import { AiDriver } from '../ai/AiDriver';
import { RacingLine } from '../ai/RacingLine';
import type { EventBus } from '../core/EventBus';
import type { CarData } from '../data/CarData';
import type { CarDetailLevel } from '../data/CarRenderBudget';
import { getOpponentCarDetail } from '../data/CarRenderBudget';
import type { GameEvents } from '../data/GameEvents';
import type { InputState } from '../data/InputState';
import { OPPONENT_ROSTER, OpponentDriver } from '../data/OpponentRoster';
import type { TrackData } from '../data/TrackData';
import { buildClassification } from '../race/Classification';
import { CarCollision } from '../race/CarCollision';
import { buildGridLayout, GridSlot } from '../race/GridLayout';
import { LapTimer } from '../race/LapTimer';
import { RaceController } from '../race/RaceController';
import type { Spline } from '../race/Spline';
import { Standings } from '../race/Standings';
import { TrackLimits } from '../race/TrackLimits';
import type { CameraRig } from '../render/CameraRig';
import type { CarFactory } from '../render/car/CarFactory';
import { CarView } from '../render/CarView';
import type { Renderer } from '../render/Renderer';
import type { TrackView } from '../render/TrackView';
import { VehicleModel } from '../vehicle/VehicleModel';
import { copyVehicleState, createVehicleState, VehicleState } from '../vehicle/VehicleState';
import { RaceHud } from './RaceHud';

export interface RaceSessionOptions {
  readonly renderer: Renderer;
  readonly cameraRig: CameraRig;
  readonly carView: CarView;
  readonly carFactory?: CarFactory;
  readonly playerDetail?: CarDetailLevel;
  readonly trackData: TrackData;
  readonly carData: CarData;
  readonly spline: Spline;
  readonly trackView: TrackView;
  readonly bus: EventBus<GameEvents>;
  readonly uiRoot: HTMLElement;
  readonly isTouch: boolean;
}

const TOTAL_RACERS = 6;
const PLAYER_RACER_INDEX = 5;

/**
 * Encapsulates the lifecycle, multi-car simulation, view state, AI opponents, and standings for one race.
 */
export class RaceSession {
  private readonly renderer: Renderer;
  private readonly cameraRig: CameraRig;
  private readonly playerCarView: CarView;
  private readonly trackData: TrackData;
  private readonly spline: Spline;
  private readonly trackView: TrackView;
  private readonly raceController: RaceController;

  // Multi-car simulation states (indices 0..4: Opponents, 5: Player)
  private readonly previousStates: VehicleState[] = [];
  private readonly currentStates: VehicleState[] = [];
  private readonly carDataList: CarData[] = [];
  private readonly trackLimitsList: TrackLimits[] = [];
  private readonly lapTimers: LapTimer[] = [];
  private readonly aiDrivers: AiDriver[] = [];
  private readonly opponentViews: CarView[] = [];
  private readonly standings: Standings;
  private readonly racingLine: RacingLine;

  public aiPaceScale = 1.0;
  public rubberBandStrength = 1.0;
  private simulationStep = 0;

  // In-race HUD overlay
  private readonly hud: RaceHud;

  constructor(options: RaceSessionOptions) {
    this.renderer = options.renderer;
    this.cameraRig = options.cameraRig;
    this.playerCarView = options.carView;
    this.trackData = options.trackData;
    this.spline = options.spline;
    this.trackView = options.trackView;

    // 1. Mount track view to scene
    this.renderer.scene.add(this.trackView.group);

    // 2. Precomputed racing line and starting grid
    this.racingLine = new RacingLine(this.spline, options.carData.topSpeed);
    const slots = buildGridLayout(this.spline);

    this.standings = new Standings(this.spline.length, TOTAL_RACERS);
    const initialDistances: number[] = new Array(TOTAL_RACERS);

    // 3. Setup 5 AI Opponents (Indices 0..4)
    const oppDetail = getOpponentCarDetail(options.playerDetail ?? 'medium');

    for (let i = 0; i < 5; i++) {
      const driver: OpponentDriver = OPPONENT_ROSTER[i];
      const slot: GridSlot = slots[i];
      initialDistances[i] = slot.distance;

      this.previousStates.push(createVehicleState(slot.x, slot.y, slot.z, slot.heading, 0));
      this.currentStates.push(createVehicleState(slot.x, slot.y, slot.z, slot.heading, 0));
      this.carDataList.push(driver.carData);
      this.trackLimitsList.push(new TrackLimits(this.spline));

      this.lapTimers.push(
        new LapTimer(this.spline.length, this.trackData.laps, this.trackData.checkpointCount),
      );

      this.aiDrivers.push(
        new AiDriver({
          driver,
          racingLine: this.racingLine,
          initialDistance: slot.distance,
        }),
      );

      const oppView = new CarView({
        factory: options.carFactory,
        detail: oppDetail,
        paintColor: driver.paintColor,
      });
      this.renderer.scene.add(oppView.getRoot());
      this.opponentViews.push(oppView);
    }

    // 4. Setup Player (Index 5)
    const playerSlot = slots[PLAYER_RACER_INDEX];
    initialDistances[PLAYER_RACER_INDEX] = playerSlot.distance;

    this.previousStates.push(
      createVehicleState(playerSlot.x, playerSlot.y, playerSlot.z, playerSlot.heading, 0),
    );
    this.currentStates.push(
      createVehicleState(playerSlot.x, playerSlot.y, playerSlot.z, playerSlot.heading, 0),
    );
    this.carDataList.push(options.carData);
    this.trackLimitsList.push(new TrackLimits(this.spline));

    this.raceController = new RaceController({
      trackLength: this.spline.length,
      totalLaps: this.trackData.laps,
      checkpointCount: this.trackData.checkpointCount,
      bus: options.bus,
    });
    this.lapTimers.push(this.raceController.getLapTimer());

    this.standings.reset(initialDistances);

    // 5. Build HUD
    this.hud = new RaceHud({
      uiRoot: options.uiRoot,
      isTouch: options.isTouch,
      totalLaps: this.trackData.laps,
      totalRacers: TOTAL_RACERS,
    });

    this.resetCarsToGrid(slots);
  }

  public getTrackView(): TrackView {
    return this.trackView;
  }

  public getRaceController(): RaceController {
    return this.raceController;
  }

  public getStandings(): Standings {
    return this.standings;
  }

  public resetCarsToGrid(slots?: readonly GridSlot[]): void {
    const grid = slots ?? buildGridLayout(this.spline);
    const initialDistances: number[] = new Array(TOTAL_RACERS);
    this.simulationStep = 0;

    for (let i = 0; i < TOTAL_RACERS; i++) {
      const slot = grid[i];
      initialDistances[i] = slot.distance;

      const curr = this.currentStates[i];
      curr.x = slot.x;
      curr.y = slot.y;
      curr.z = slot.z;
      curr.heading = slot.heading;
      curr.forwardSpeed = 0;
      curr.lateralSpeed = 0;
      curr.speed = 0;
      curr.steerAngle = 0;
      curr.steerInput = 0;
      curr.angularVelocity = 0;
      curr.isDrifting = false;
      curr.driftScore = 0;
      curr.driftMultiplier = 1;
      curr.isReversing = false;
      curr.nitroAmount = 1.0;
      curr.nitroActiveTime = 0;
      curr.nitroCooldownTimer = 0;

      copyVehicleState(curr, this.previousStates[i]);
      this.trackLimitsList[i].resetHint(slot.distance);
      this.lapTimers[i].reset(slot.distance);
      if (i < 5) {
        this.aiDrivers[i].setFinished(false);
      }
    }

    this.cameraRig.teleport(
      this.currentStates[PLAYER_RACER_INDEX],
      grid[PLAYER_RACER_INDEX].heading,
    );
    this.raceController.reset(grid[PLAYER_RACER_INDEX].distance);
    this.standings.reset(initialDistances);

    const state = this.raceController.getLapTimer().getState();
    this.hud.reset(state.currentLap, state.totalLaps, TOTAL_RACERS);
  }

  public layoutHud(isTouch: boolean): void {
    this.hud.layout(isTouch);
  }

  /**
   * Fixed 60 Hz simulation step.
   * Fixed execution order:
   * 1. Input: Poll and filter player input through RaceController; poll 5 AI drivers
   * 2. Vehicles: Step physical vehicle simulation for all 6 cars (VehicleModel.step)
   * 3. Track Limits: Resolve road boundaries and barriers for all 6 cars (TrackLimits.resolve)
   * 4. Collisions: Resolve pairwise soft car-to-car separations & speed penalties (CarCollision.resolvePairs)
   * 5. Lap & Checkpoint Updates: Update checkpoints and lap timers for all cars; check finishes
   * 6. Standings: Update accumulated progress and sort 6-car standings
   */
  public simulate(fixedDt: number, rawPlayerInput: InputState): void {
    this.simulationStep++;
    const racePhase = this.raceController.getPhase();

    // 1. Process player input through RaceController
    const playerInput = this.raceController.filterInput(rawPlayerInput);

    // Get player's spline projection for AI rubber-banding reference
    const playerProjection = this.trackLimitsList[PLAYER_RACER_INDEX].getLastProjection();
    const playerDistance = playerProjection.distance;

    // Snapshot previous states for interpolation
    for (let i = 0; i < TOTAL_RACERS; i++) {
      copyVehicleState(this.currentStates[i], this.previousStates[i]);
    }

    // 2. Simulate 5 AI opponents
    for (let i = 0; i < 5; i++) {
      const aiDriver = this.aiDrivers[i];
      const aiState = this.currentStates[i];
      const carData = this.carDataList[i];
      const trackLimits = this.trackLimitsList[i];

      const aiInput = aiDriver.update(
        aiState,
        playerDistance,
        racePhase,
        fixedDt,
        this.aiPaceScale,
      );

      VehicleModel.step(aiState, aiInput, carData, fixedDt, trackLimits);

      // Check if driver needed a standstill recovery respawn
      const respawn = aiDriver.checkRespawn();
      if (respawn) {
        aiState.x = respawn.x;
        aiState.y = respawn.y;
        aiState.z = respawn.z;
        aiState.heading = respawn.heading;
        aiState.forwardSpeed = respawn.speed;
        aiState.speed = respawn.speed;
        aiState.lateralSpeed = 0;
        aiState.angularVelocity = 0;
        trackLimits.resetHint(respawn.distance);
      }
    }

    // 3. Simulate Player car
    VehicleModel.step(
      this.currentStates[PLAYER_RACER_INDEX],
      playerInput,
      this.carDataList[PLAYER_RACER_INDEX],
      fixedDt,
      this.trackLimitsList[PLAYER_RACER_INDEX],
    );

    // 4. Resolve pairwise car collisions (all 15 pairs)
    CarCollision.resolvePairs(this.currentStates);

    // 5. Update LapTimers and distances for opponents (player lap timer is updated by raceController)
    for (let i = 0; i < TOTAL_RACERS; i++) {
      const proj = this.trackLimitsList[i].getLastProjection();
      if (racePhase !== 'Countdown' && i < 5) {
        if (!this.lapTimers[i].hasFinished()) {
          this.lapTimers[i].update(proj.distance, fixedDt);
          if (this.lapTimers[i].hasFinished()) {
            this.standings.recordFinish(i, this.simulationStep);
            this.aiDrivers[i].setFinished(true);
          }
        }
      }
      this.standings.updateProgress(i, proj.distance);
    }

    // 6. Sort standings and compute race classification
    this.standings.sort();
    const playerPosition = this.standings.positionOf(PLAYER_RACER_INDEX);

    const playerProj = this.trackLimitsList[PLAYER_RACER_INDEX].getLastProjection();
    const classification = buildClassification(
      this.standings,
      this.lapTimers,
      OPPONENT_ROSTER,
      PLAYER_RACER_INDEX,
      this.raceController.getTotalTimeMs(fixedDt),
    );

    this.raceController.update(playerProj.distance, fixedDt, playerPosition, classification);
    if (this.lapTimers[PLAYER_RACER_INDEX].hasFinished()) {
      this.standings.recordFinish(PLAYER_RACER_INDEX, this.simulationStep);
    }
  }

  public render(alpha: number, frameDt: number): void {
    // 1. Interpolate player car view & update camera
    this.playerCarView.update(
      this.previousStates[PLAYER_RACER_INDEX],
      this.currentStates[PLAYER_RACER_INDEX],
      alpha,
    );

    this.cameraRig.update(
      this.playerCarView.getPosition(),
      this.playerCarView.getHeading(),
      this.currentStates[PLAYER_RACER_INDEX].speed,
      frameDt,
      this.renderer.getAspect(),
      this.currentStates[PLAYER_RACER_INDEX].isReversing,
    );

    // 2. Interpolate opponent car views
    for (let i = 0; i < 5; i++) {
      this.opponentViews[i].update(this.previousStates[i], this.currentStates[i], alpha);
    }

    // 3. Update HUD readouts
    const playerState = this.currentStates[PLAYER_RACER_INDEX];
    const speedKmh = Math.abs(playerState.speed * 3.6);
    const lapState = this.raceController.getLapTimer().getState();
    const playerPosition = this.standings.positionOf(PLAYER_RACER_INDEX);
    const countdown = this.raceController.getCountdownDisplay();

    this.hud.update({
      speedKmh,
      isReversing: playerState.isReversing,
      nitroAmount: playerState.nitroAmount,
      nitroActiveTime: playerState.nitroActiveTime,
      isDrifting: playerState.isDrifting,
      driftScore: playerState.driftScore,
      driftMultiplier: playerState.driftMultiplier,
      position: playerPosition,
      totalRacers: TOTAL_RACERS,
      currentLap: lapState.currentLap,
      totalLaps: lapState.totalLaps,
      currentLapTimeMs: lapState.currentLapTimeMs,
      lastLapTimeMs: lapState.lastLapTimeMs,
      bestLapTimeMs: lapState.bestLapTimeMs,
      countdownDisplay: countdown,
    });
  }

  public dispose(): void {
    for (const view of this.opponentViews) {
      this.renderer.scene.remove(view.getRoot());
      view.dispose();
    }
    this.opponentViews.length = 0;

    this.renderer.scene.remove(this.trackView.group);
    this.trackView.dispose();
    this.hud.dispose();
  }
}
