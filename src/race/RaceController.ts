import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../data/GameEvents';
import { createInputState, InputState } from '../data/InputState';
import type { RacePhase, RaceResult } from '../data/RaceResult';
import { LapTimer } from './LapTimer';

export const COUNTDOWN_STEPS_PER_TICK = 60; // 60 steps at 60 Hz = 1.0 second per tick
export const COUNTDOWN_TOTAL_STEPS = 3 * COUNTDOWN_STEPS_PER_TICK; // 180 steps for 3, 2, 1
export const GO_DISPLAY_STEPS = 60; // 'GO' displays for 60 steps (1.0 second) into running phase

export interface RaceControllerOptions {
  readonly trackLength: number;
  readonly totalLaps?: number;
  readonly checkpointCount?: number;
  readonly bus?: EventBus<GameEvents>;
  readonly stepsPerCountdownTick?: number;
}

/**
 * Deterministic race controller managing Countdown, Running, and Finished phases.
 *
 * Rules:
 * - Countdown: 3, 2, 1, GO, counted strictly in simulation steps. Player input is locked (neutral).
 * - Running: Timer advances in fixed simulation steps, checkpoints and laps are validated.
 * - Finished: Reached after completing configured laps. Input locked to neutral to coast to a stop.
 * - Records RaceResult (total time, per-lap times, best lap, position).
 * - Zero allocations per simulation step.
 */
export class RaceController {
  private readonly lapTimer: LapTimer;
  private readonly bus?: EventBus<GameEvents>;
  private readonly stepsPerTick: number;
  private readonly neutralInput: InputState = createInputState();

  private phase: RacePhase = 'Countdown';
  private countdownSteps = 0;
  private runningSteps = 0;
  private lastCountdownTick: number | 'GO' | null = null;

  private readonly lapTimesMs: number[] = [];
  private result: RaceResult | null = null;

  constructor(options: RaceControllerOptions) {
    this.lapTimer = new LapTimer(
      options.trackLength,
      options.totalLaps ?? 3,
      options.checkpointCount ?? 8,
    );
    this.bus = options.bus;
    this.stepsPerTick = options.stepsPerCountdownTick ?? COUNTDOWN_STEPS_PER_TICK;
  }

  public getLapTimer(): LapTimer {
    return this.lapTimer;
  }

  public getPhase(): RacePhase {
    return this.phase;
  }

  public getResult(): RaceResult | null {
    return this.result;
  }

  public getCountdownDisplay(): number | 'GO' | null {
    if (this.phase === 'Countdown') {
      const tick = Math.floor(this.countdownSteps / this.stepsPerTick);
      if (tick === 0) return 3;
      if (tick === 1) return 2;
      return 1;
    }
    if (this.phase === 'Running' && this.runningSteps < GO_DISPLAY_STEPS) {
      return 'GO';
    }
    return null;
  }

  public getCurrentLap(): number {
    return this.lapTimer.getState().currentLap;
  }

  public getTotalLaps(): number {
    return this.lapTimer.getState().totalLaps;
  }

  public getCurrentLapTimeMs(): number {
    return this.lapTimer.getState().currentLapTimeMs;
  }

  public getLastLapTimeMs(): number | null {
    return this.lapTimer.getState().lastLapTimeMs;
  }

  public getBestLapTimeMs(): number | null {
    return this.lapTimer.getState().bestLapTimeMs;
  }

  public getTotalTimeMs(fixedDt = 1 / 60): number {
    return this.runningSteps * fixedDt * 1000;
  }

  public reset(startingDistance = 0): void {
    this.phase = 'Countdown';
    this.countdownSteps = 0;
    this.runningSteps = 0;
    this.lastCountdownTick = null;
    this.lapTimesMs.length = 0;
    this.result = null;
    this.lapTimer.reset(startingDistance);
  }

  public filterInput(rawInput: InputState): InputState {
    if (this.phase === 'Countdown' || this.phase === 'Finished') {
      return this.neutralInput;
    }
    return rawInput;
  }

  public update(distanceAlongTrack: number, fixedDt: number): void {
    if (this.phase === 'Countdown') {
      const tick = Math.floor(this.countdownSteps / this.stepsPerTick);
      const currentTickValue: number = tick === 0 ? 3 : tick === 1 ? 2 : 1;

      if (this.lastCountdownTick !== currentTickValue) {
        this.lastCountdownTick = currentTickValue;
        this.bus?.emit('race:countdown', { count: currentTickValue });
      }

      this.countdownSteps++;

      if (this.countdownSteps >= this.stepsPerTick * 3) {
        const prevPhase = this.phase;
        this.phase = 'Running';
        this.lastCountdownTick = 'GO';
        this.bus?.emit('race:countdown', { count: 'GO' });
        this.bus?.emit('race:phase', { phase: 'Running', previous: prevPhase });
      }
      return;
    }

    if (this.phase === 'Running') {
      this.runningSteps++;
      const lapCompleted = this.lapTimer.update(distanceAlongTrack, fixedDt);

      if (lapCompleted) {
        const state = this.lapTimer.getState();
        const recordedLapTime = state.lastLapTimeMs ?? 0;
        this.lapTimesMs.push(recordedLapTime);

        this.bus?.emit('race:lap', {
          lap: this.lapTimesMs.length,
          totalLaps: state.totalLaps,
          lapTimeMs: recordedLapTime,
          bestLapTimeMs: state.bestLapTimeMs,
        });

        if (state.isFinished) {
          const prevPhase = this.phase;
          this.phase = 'Finished';

          const totalTimeMs = this.runningSteps * fixedDt * 1000;
          this.result = {
            totalTimeMs,
            lapTimesMs: [...this.lapTimesMs],
            bestLapTimeMs: state.bestLapTimeMs ?? totalTimeMs,
            lapsCompleted: state.totalLaps,
            position: 1,
          };

          this.bus?.emit('race:phase', { phase: 'Finished', previous: prevPhase });
          this.bus?.emit('race:finished', this.result);
        }
      }
      return;
    }

    // Finished phase: nothing to update
  }
}
