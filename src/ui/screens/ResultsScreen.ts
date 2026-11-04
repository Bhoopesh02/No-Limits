import { formatLapTime } from '../../core/formatLapTime';
import { formatOrdinal } from '../../core/formatOrdinal';
import type { RaceResult } from '../../data/RaceResult';
import { createButton } from '../components/Button';
import type { Screen } from './Screen';

export interface ResultsScreenOptions {
  readonly onRaceAgain: () => void;
  readonly onMainMenu: () => void;
}

export class ResultsScreen implements Screen {
  public readonly id = 'Results';
  public readonly element: HTMLElement;

  private readonly positionEl: HTMLElement;
  private readonly totalTimeEl: HTMLElement;
  private readonly bestLapEl: HTMLElement;
  private readonly lapsContainer: HTMLElement;
  private readonly classificationContainer: HTMLElement;
  private readonly raceAgainBtn: HTMLButtonElement;

  constructor(options: ResultsScreenOptions) {
    this.element = document.createElement('div');
    this.element.className = 'nl-screen nl-results-screen';

    // Title
    const title = document.createElement('h2');
    title.style.cssText = `
      font-family: var(--font-display);
      font-size: var(--fs-24);
      color: var(--text-primary);
      margin: 0;
      letter-spacing: 1px;
    `;
    title.textContent = 'RACE FINISHED';
    this.element.appendChild(title);

    // Finishing position
    this.positionEl = document.createElement('div');
    this.positionEl.className = 'nl-results-position';
    this.positionEl.textContent = '1st';
    this.element.appendChild(this.positionEl);

    // Stats Grid (Total Time & Best Lap)
    const statsGrid = document.createElement('div');
    statsGrid.className = 'nl-results-stats';

    const totalBox = document.createElement('div');
    totalBox.className = 'nl-results-stat-box';
    const totalLabel = document.createElement('span');
    totalLabel.className = 'nl-results-stat-label';
    totalLabel.textContent = 'Total Time';
    this.totalTimeEl = document.createElement('span');
    this.totalTimeEl.className = 'nl-results-stat-value tabular-nums';
    this.totalTimeEl.textContent = '0:00.000';
    totalBox.appendChild(totalLabel);
    totalBox.appendChild(this.totalTimeEl);

    const bestBox = document.createElement('div');
    bestBox.className = 'nl-results-stat-box';
    const bestLabel = document.createElement('span');
    bestLabel.className = 'nl-results-stat-label';
    bestLabel.textContent = 'Best Lap';
    this.bestLapEl = document.createElement('span');
    this.bestLapEl.className = 'nl-results-stat-value tabular-nums';
    this.bestLapEl.textContent = '0:00.000';
    bestBox.appendChild(bestLabel);
    bestBox.appendChild(this.bestLapEl);

    statsGrid.appendChild(totalBox);
    statsGrid.appendChild(bestBox);
    this.element.appendChild(statsGrid);

    // Lap times breakdown
    this.lapsContainer = document.createElement('div');
    this.lapsContainer.className = 'nl-results-laps tabular-nums';
    this.element.appendChild(this.lapsContainer);

    // Official Race Classification Table
    this.classificationContainer = document.createElement('div');
    this.classificationContainer.className = 'nl-results-classification tabular-nums';
    this.classificationContainer.style.cssText = `
      width: 100%;
      max-width: 520px;
      max-height: 140px;
      overflow-y: auto;
      background: rgba(18, 23, 34, 0.85);
      border: 1px solid var(--border);
      border-radius: var(--radius-s);
      margin: var(--space-2) 0;
      padding: var(--space-2);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    this.element.appendChild(this.classificationContainer);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'nl-results-actions';

    this.raceAgainBtn = createButton({
      variant: 'primary',
      label: 'Race Again',
      onClick: () => options.onRaceAgain(),
    });
    this.raceAgainBtn.style.minHeight = '56px';
    this.raceAgainBtn.style.flex = '1';
    actions.appendChild(this.raceAgainBtn);

    const mainMenuBtn = createButton({
      variant: 'secondary',
      label: 'Main Menu',
      onClick: () => options.onMainMenu(),
    });
    mainMenuBtn.style.minHeight = '48px';
    mainMenuBtn.style.flex = '1';
    actions.appendChild(mainMenuBtn);

    this.element.appendChild(actions);
  }

  public setResult(result: RaceResult): void {
    this.positionEl.textContent = formatOrdinal(result.position);
    this.totalTimeEl.textContent = formatLapTime(result.totalTimeMs);
    this.bestLapEl.textContent = formatLapTime(result.bestLapTimeMs);

    this.lapsContainer.innerHTML = '';
    result.lapTimesMs.forEach((timeMs, idx) => {
      const row = document.createElement('div');
      row.className = 'nl-results-lap-row';
      if (timeMs === result.bestLapTimeMs) {
        row.classList.add('is-best');
      }

      const lapName = document.createElement('span');
      lapName.textContent = `Lap ${idx + 1}${timeMs === result.bestLapTimeMs ? ' (Best)' : ''}`;

      const lapVal = document.createElement('span');
      lapVal.textContent = formatLapTime(timeMs);

      row.appendChild(lapName);
      row.appendChild(lapVal);
      this.lapsContainer.appendChild(row);
    });

    // Populate Classification Table
    this.classificationContainer.innerHTML = '';
    if (result.classification && result.classification.length > 0) {
      result.classification.forEach((entry) => {
        const row = document.createElement('div');
        row.className = `nl-classification-row${entry.isPlayer ? ' is-player' : ''}`;
        row.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-s);
          font-family: var(--font-body);
          font-size: var(--fs-14);
          color: ${entry.isPlayer ? 'var(--accent)' : 'var(--text-secondary)'};
          background: ${entry.isPlayer ? 'rgba(61, 165, 255, 0.12)' : 'transparent'};
          border: 1px solid ${entry.isPlayer ? 'rgba(61, 165, 255, 0.4)' : 'transparent'};
          font-weight: ${entry.isPlayer ? '700' : '400'};
        `;

        const leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display: flex; gap: var(--space-3); align-items: center;';

        const posBadge = document.createElement('span');
        posBadge.style.cssText = `
          font-family: var(--font-display);
          font-weight: 700;
          min-width: 28px;
          color: ${entry.position === 1 ? 'var(--warning)' : 'inherit'};
        `;
        posBadge.textContent = formatOrdinal(entry.position);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = entry.driverName;

        leftGroup.appendChild(posBadge);
        leftGroup.appendChild(nameSpan);

        const timeSpan = document.createElement('span');
        timeSpan.className = 'tabular-nums';
        timeSpan.style.fontFamily = 'var(--font-display)';
        timeSpan.textContent = entry.formattedTimeOrGap;

        row.appendChild(leftGroup);
        row.appendChild(timeSpan);
        this.classificationContainer.appendChild(row);
      });
    }
  }

  public onEnter(): void {
    this.raceAgainBtn.focus();
  }
}
