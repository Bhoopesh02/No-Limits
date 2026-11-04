import { createDriftHUD, DriftHUDElement } from '../ui/components/DriftHUD';
import { createLapBadge, LapBadgeElement } from '../ui/components/LapBadge';
import { createLapTimerHUD, LapTimerHUDElement } from '../ui/components/LapTimerHUD';
import { createNitroGauge, NitroGaugeElement } from '../ui/components/NitroGauge';
import { createPositionBadge, PositionBadgeElement } from '../ui/components/PositionBadge';
import { createSpeedometer, SpeedometerElement } from '../ui/components/Speedometer';

export interface RaceHudOptions {
  readonly uiRoot: HTMLElement;
  readonly isTouch: boolean;
  readonly totalLaps: number;
  readonly totalRacers: number;
}

export interface RaceHudUpdateParams {
  readonly speedKmh: number;
  readonly isReversing: boolean;
  readonly nitroAmount: number;
  readonly nitroActiveTime: number;
  readonly isDrifting: boolean;
  readonly driftScore: number;
  readonly driftMultiplier: number;
  readonly position: number;
  readonly totalRacers: number;
  readonly currentLap: number;
  readonly totalLaps: number;
  readonly currentLapTimeMs: number;
  readonly lastLapTimeMs: number | null;
  readonly bestLapTimeMs: number | null;
  readonly countdownDisplay: number | string | null;
}

/**
 * Encapsulates the 2D HTML/CSS in-race HUD overlay:
 * Position badge, Lap counter, Lap timer, Drift score, Nitro gauge, Speedometer, and Countdown.
 */
export class RaceHud {
  private readonly hudContainer: HTMLElement;
  private readonly topRow: HTMLElement;
  private readonly bottomRow: HTMLElement;
  private readonly topBar: HTMLElement;
  private readonly countdownEl: HTMLElement;
  private readonly lapGroup: HTMLElement;

  private readonly speedometer: SpeedometerElement;
  private readonly nitroGauge: NitroGaugeElement;
  private readonly driftHud: DriftHUDElement;
  private readonly lapBadge: LapBadgeElement;
  private readonly positionBadge: PositionBadgeElement;
  private readonly lapTimerHud: LapTimerHUDElement;

  constructor(options: RaceHudOptions) {
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
    this.topRow.style.cssText =
      'display: flex; justify-content: space-between; align-items: flex-start; width: 100%;';

    this.positionBadge = createPositionBadge({
      position: options.totalRacers,
      totalRacers: options.totalRacers,
    });
    this.lapBadge = createLapBadge({ currentLap: 1, totalLaps: options.totalLaps });
    this.lapTimerHud = createLapTimerHUD();

    this.lapGroup = document.createElement('div');
    this.lapGroup.className = 'nl-hud-group--lap';
    this.lapGroup.appendChild(this.positionBadge.element);
    this.lapGroup.appendChild(this.lapBadge.element);
    this.lapGroup.appendChild(this.lapTimerHud.element);

    this.topBar = document.createElement('div');
    this.topBar.className = 'hud-desktop-bar';
    this.topBar.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(18, 23, 34, 0.75); backdrop-filter: blur(8px);
      padding: var(--space-2) var(--space-4); border: 1px solid var(--border);
      border-radius: var(--radius-s); font-size: var(--fs-14);
      color: var(--text-secondary); font-family: var(--font-body); max-width: 680px;
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
    this.bottomRow.style.cssText =
      'display: flex; justify-content: space-between; align-items: flex-end; width: 100%;';

    this.nitroGauge = createNitroGauge({ value: 1.0 });
    this.speedometer = createSpeedometer({ speed: 0, unit: 'km/h' });

    this.countdownEl = document.createElement('div');
    this.countdownEl.style.cssText = `
      position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
      font-family: var(--font-display); font-size: clamp(64px, 12vw, 96px); font-weight: 700;
      color: var(--accent); text-shadow: 0 0 32px rgba(61, 165, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.8);
      pointer-events: none; z-index: 100; letter-spacing: 2px; display: none;
    `;

    this.hudContainer.appendChild(this.countdownEl);
    this.hudContainer.appendChild(this.topRow);
    this.hudContainer.appendChild(this.bottomRow);
    options.uiRoot.appendChild(this.hudContainer);

    this.layout(options.isTouch);
  }

  public layout(isTouch: boolean): void {
    if (isTouch) {
      this.hudContainer.classList.add('has-touch-controls');
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.lapGroup);
      this.topRow.appendChild(this.driftHud);

      const topActionsGroup = document.createElement('div');
      topActionsGroup.style.cssText =
        'display: flex; gap: var(--space-3); align-items: flex-start;';
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

  public update(params: RaceHudUpdateParams): void {
    this.speedometer.setSpeed(params.speedKmh);
    this.speedometer.setReversing(params.isReversing);

    this.nitroGauge.setValue(params.nitroAmount);
    const isNitroLow = params.nitroAmount < 0.2 && params.nitroActiveTime <= 0;
    this.nitroGauge.setWarning(isNitroLow, 'LOW NITRO');

    this.driftHud.setDrift(params.isDrifting, params.driftScore, params.driftMultiplier);

    this.positionBadge.setPosition(params.position, params.totalRacers);
    this.lapBadge.setLap(params.currentLap, params.totalLaps);
    this.lapTimerHud.updateTimes(
      params.currentLapTimeMs,
      params.lastLapTimeMs,
      params.bestLapTimeMs,
    );

    if (params.countdownDisplay !== null) {
      this.countdownEl.style.display = 'block';
      this.countdownEl.textContent = String(params.countdownDisplay);
    } else {
      this.countdownEl.style.display = 'none';
    }
  }

  public reset(currentLap: number, totalLaps: number, totalRacers: number): void {
    this.positionBadge.setPosition(totalRacers, totalRacers);
    this.lapBadge.setLap(currentLap, totalLaps);
    this.lapTimerHud.updateTimes(0, null, null);
  }

  public dispose(): void {
    this.hudContainer.remove();
  }
}
