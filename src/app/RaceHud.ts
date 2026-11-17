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
  readonly onPause?: () => void;
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
 * In-race 2D HUD overlay.
 * Adapts responsively between desktop and touch/mobile layouts:
 * - Desktop: corner-anchored gauges, control banner, and bottom speedometer/nitro.
 * - Mobile: ergonomic top-row layout (pause button, horizontal position/lap pills,
 *   centered lap timer, compact top-right speed/nitro cluster) leaving the bottom clear for touch controls.
 */
export class RaceHud {
  private readonly hudContainer: HTMLElement;
  private readonly topRow: HTMLElement;
  private readonly bottomRow: HTMLElement;
  private readonly topBar: HTMLElement;
  private readonly countdownEl: HTMLElement;
  private readonly lapGroup: HTMLElement;
  private readonly mobilePillsGroup: HTMLElement;
  private readonly mobileActionsGroup: HTMLElement;
  private readonly pauseBtn: HTMLButtonElement;

  private readonly speedometer: SpeedometerElement;
  private readonly nitroGauge: NitroGaugeElement;
  private readonly driftHud: DriftHUDElement;
  private readonly lapBadge: LapBadgeElement;
  private readonly positionBadge: PositionBadgeElement;
  private readonly lapTimerHud: LapTimerHUDElement;
  private readonly onPauseCallback?: () => void;

  constructor(options: RaceHudOptions) {
    this.onPauseCallback = options.onPause;

    this.hudContainer = document.createElement('div');
    this.hudContainer.className = 'hud-root';
    this.hudContainer.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: max(var(--space-3), env(safe-area-inset-top, 0px))
        max(var(--space-4), env(safe-area-inset-right, 0px))
        max(var(--space-3), env(safe-area-inset-bottom, 0px))
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

    // Desktop lap group (vertical stack)
    this.lapGroup = document.createElement('div');
    this.lapGroup.className = 'nl-hud-group--lap';

    // Mobile pause button
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.type = 'button';
    this.pauseBtn.className = 'nl-hud-pause-btn';
    this.pauseBtn.setAttribute('aria-label', 'Pause Race');
    this.pauseBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1"/>
        <rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>
    `;
    if (typeof this.pauseBtn.addEventListener === 'function') {
      this.pauseBtn.addEventListener('click', this.handlePauseClick);
    }

    // Mobile horizontal pill container (Pause + Position + Lap)
    this.mobilePillsGroup = document.createElement('div');
    this.mobilePillsGroup.className = 'nl-hud-mobile-pills';

    // Mobile right container (Speedometer + Nitro Gauge stacked vertically)
    this.mobileActionsGroup = document.createElement('div');
    this.mobileActionsGroup.className = 'hud-mobile-actions';

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

      // 1. Mobile top-left: Pause button + Position + Lap in a horizontal row
      this.mobilePillsGroup.innerHTML = '';
      this.mobilePillsGroup.appendChild(this.pauseBtn);
      this.mobilePillsGroup.appendChild(this.positionBadge.element);
      this.mobilePillsGroup.appendChild(this.lapBadge.element);

      // 2. Mobile top-right: Speedometer on top, Nitro gauge directly below
      this.mobileActionsGroup.innerHTML = '';
      this.mobileActionsGroup.appendChild(this.speedometer);
      this.mobileActionsGroup.appendChild(this.nitroGauge);

      // 3. Assemble mobile top row
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.mobilePillsGroup);
      this.topRow.appendChild(this.lapTimerHud.element);
      this.topRow.appendChild(this.mobileActionsGroup);

      // 4. Center Drift HUD
      if (!this.hudContainer.contains(this.driftHud)) {
        this.hudContainer.appendChild(this.driftHud);
      }

      this.pauseBtn.style.display = 'inline-flex';
      this.bottomRow.style.display = 'none';
      this.topBar.style.display = 'none';
    } else {
      this.hudContainer.classList.remove('has-touch-controls');

      // 1. Desktop top-left: Lap group (Position + Lap + Timer stacked)
      this.lapGroup.innerHTML = '';
      this.lapGroup.appendChild(this.positionBadge.element);
      this.lapGroup.appendChild(this.lapBadge.element);
      this.lapGroup.appendChild(this.lapTimerHud.element);

      // 2. Desktop top row: Lap group (left), Drift HUD (center), Top bar (right)
      this.topRow.innerHTML = '';
      this.topRow.appendChild(this.lapGroup);
      this.topRow.appendChild(this.driftHud);
      this.topRow.appendChild(this.topBar);

      // 3. Desktop bottom row: Nitro gauge (left), Speedometer (right)
      this.bottomRow.innerHTML = '';
      this.bottomRow.appendChild(this.nitroGauge);
      this.bottomRow.appendChild(this.speedometer);

      this.pauseBtn.style.display = 'none';
      this.bottomRow.style.display = 'flex';
      this.topBar.style.display = 'flex';
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
    if (typeof this.pauseBtn.removeEventListener === 'function') {
      this.pauseBtn.removeEventListener('click', this.handlePauseClick);
    }
    this.hudContainer.remove();
  }

  private readonly handlePauseClick = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    this.onPauseCallback?.();
  };
}
