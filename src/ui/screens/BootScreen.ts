import { GameInfo } from '../../data/GameInfo';
import type { Screen } from './Screen';

export interface BootScreenOptions {
  readonly onStart: () => void;
}

export class BootScreen implements Screen {
  public readonly id = 'Boot';
  public readonly element: HTMLElement;
  private readonly onStartCallback: () => void;
  private started = false;

  constructor(options: BootScreenOptions) {
    this.onStartCallback = options.onStart;

    this.element = document.createElement('div');
    this.element.className = 'nl-screen nl-boot-screen';
    this.element.tabIndex = 0;
    this.element.setAttribute('role', 'button');
    this.element.setAttribute(
      'aria-label',
      `${GameInfo.displayName} - Press any key or tap to start`,
    );

    const titleEl = document.createElement('h1');
    titleEl.className = 'nl-boot-title';
    titleEl.textContent = GameInfo.displayName;

    const promptEl = document.createElement('div');
    promptEl.className = 'nl-boot-prompt';
    promptEl.textContent = 'PRESS ANY KEY OR TAP TO START';

    this.element.appendChild(titleEl);
    this.element.appendChild(promptEl);

    this.element.addEventListener('click', this.triggerStart);
    this.element.addEventListener('keydown', this.triggerStart);
    window.addEventListener('keydown', this.onWindowKeyDown);
  }

  public onEnter(): void {
    this.started = false;
    this.element.focus();
  }

  public onExit(): void {
    window.removeEventListener('keydown', this.onWindowKeyDown);
  }

  private readonly triggerStart = (): void => {
    if (this.started) return;
    this.started = true;
    this.onExit();
    this.onStartCallback();
  };

  private readonly onWindowKeyDown = (e: KeyboardEvent): void => {
    if (this.started) return;
    // Any key triggers boot except dev overlay toggles if any
    if (e.code !== 'Backquote' && e.code !== 'F12') {
      this.triggerStart();
    }
  };
}
