import { getRandomLoadingTip } from '../../data/LoadingTips';
import { createButton } from '../components/Button';
import { createProgressBar } from '../components/ProgressBar';
import type { Screen } from './Screen';

export interface LoadingScreenOptions {
  readonly onRetry?: () => void;
}

export class LoadingScreen implements Screen {
  public readonly id = 'Loading';
  public readonly element: HTMLElement;

  private readonly progressBarContainer: HTMLElement;
  private progressFill: HTMLElement | null = null;
  private progressValueEl: HTMLElement | null = null;
  private readonly tipEl: HTMLElement;
  private readonly errorContainer: HTMLElement;
  private readonly onRetryCallback?: () => void;

  constructor(options: LoadingScreenOptions = {}) {
    this.onRetryCallback = options.onRetry;

    this.element = document.createElement('div');
    this.element.className = 'nl-screen nl-loading-screen';

    const title = document.createElement('h2');
    title.style.cssText = `
      font-family: var(--font-display);
      font-size: var(--fs-24);
      color: var(--text-primary);
      margin: 0;
      letter-spacing: 1px;
    `;
    title.textContent = 'LOADING';
    this.element.appendChild(title);

    // Progress Bar
    this.progressBarContainer = document.createElement('div');
    this.progressBarContainer.style.width = '100%';
    this.rebuildProgressBar(0);
    this.element.appendChild(this.progressBarContainer);

    // Tip line
    this.tipEl = document.createElement('div');
    this.tipEl.className = 'nl-loading-tip';
    this.tipEl.textContent = `TIP: ${getRandomLoadingTip(0)}`;
    this.element.appendChild(this.tipEl);

    // Error container (hidden unless error occurs)
    this.errorContainer = document.createElement('div');
    this.errorContainer.style.cssText = `
      display: none;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      margin-top: var(--space-2);
    `;
    this.element.appendChild(this.errorContainer);
  }

  private rebuildProgressBar(percent: number): void {
    this.progressBarContainer.innerHTML = '';
    const bar = createProgressBar({
      label: 'Loading Assets',
      value: percent,
    });
    this.progressFill = bar.querySelector('.nl-progress-bar__fill');
    this.progressValueEl = bar.querySelector('.nl-progress-bar__value');
    this.progressBarContainer.appendChild(bar);
  }

  public setProgress(ratio: number): void {
    const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
    }
    if (this.progressValueEl) {
      this.progressValueEl.textContent = `${percent}%`;
    }
  }

  public setError(message: string, onRetry?: () => void): void {
    this.errorContainer.innerHTML = '';
    this.errorContainer.style.display = 'flex';

    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = `
      color: var(--danger);
      font-family: var(--font-body);
      font-size: var(--fs-14);
      background: rgba(255, 77, 94, 0.1);
      border: 1px solid var(--danger);
      border-radius: var(--radius-s);
      padding: var(--space-2) var(--space-3);
      width: 100%;
      box-sizing: border-box;
    `;
    errorMsg.textContent = `Failed to load: ${message}`;
    this.errorContainer.appendChild(errorMsg);

    const retryHandler = onRetry ?? this.onRetryCallback;
    if (retryHandler) {
      const retryBtn = createButton({
        variant: 'primary',
        label: 'Retry',
        onClick: () => {
          this.errorContainer.style.display = 'none';
          retryHandler();
        },
      });
      retryBtn.style.minHeight = '48px';
      this.errorContainer.appendChild(retryBtn);
      retryBtn.focus();
    }
  }

  public onEnter(): void {
    this.errorContainer.style.display = 'none';
    this.setProgress(0);
    this.tipEl.textContent = `TIP: ${getRandomLoadingTip(Math.floor(Math.random() * 100))}`;
  }
}
