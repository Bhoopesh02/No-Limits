import type { EventBus, Unsubscribe } from '../core/EventBus';
import type { GameEvents, MenuNavigationAction } from '../data/GameEvents';
import type { GameState } from '../data/GameState';
import type { Screen } from './screens/Screen';

export interface ScreenManagerOptions {
  readonly uiRoot: HTMLElement;
  readonly bus: EventBus<GameEvents>;
}

export class ScreenManager {
  private readonly container: HTMLElement;
  private readonly scrim: HTMLElement;
  private readonly bus: EventBus<GameEvents>;
  private readonly screens = new Map<GameState, Screen>();
  private activeScreen: Screen | null = null;
  private unsubs: Unsubscribe[] = [];

  constructor(options: ScreenManagerOptions) {
    this.bus = options.bus;

    // Scrim overlay behind Menu and Results
    this.scrim = document.createElement('div');
    this.scrim.className = 'nl-scrim';
    this.scrim.style.display = 'none';
    options.uiRoot.appendChild(this.scrim);

    // Screen container
    this.container = document.createElement('div');
    this.container.className = 'nl-screen-container';
    this.container.style.display = 'none';
    options.uiRoot.appendChild(this.container);

    this.unsubs.push(
      this.bus.on('state:enter', (payload) => {
        this.onStateEnter(payload.state, payload.from);
      }),
      this.bus.on('state:exit', (payload) => {
        this.onStateExit(payload.state, payload.to);
      }),
      this.bus.on('menu:navigate', (action) => {
        this.handleNavigation(action);
      }),
    );
  }

  public registerScreen(state: GameState, screen: Screen): void {
    this.screens.set(state, screen);
  }

  public getScreen<T extends Screen>(state: GameState): T | undefined {
    return this.screens.get(state) as T | undefined;
  }

  public getActiveScreen(): Screen | null {
    return this.activeScreen;
  }

  private onStateExit(state: GameState, nextState: GameState): void {
    if (this.activeScreen && this.activeScreen.id === state) {
      this.activeScreen.onExit?.(nextState);
    }
  }

  private onStateEnter(state: GameState, from?: GameState): void {
    const targetScreen = this.screens.get(state);

    if (!targetScreen) {
      // In Race state, menu screens are hidden
      if (this.activeScreen) {
        this.container.innerHTML = '';
        this.container.style.display = 'none';
        this.activeScreen = null;
      }
      this.scrim.style.display = 'none';
      return;
    }

    // Show scrim for Menu, Loading, and Results
    if (state === 'Menu' || state === 'Results' || state === 'Loading') {
      this.scrim.style.display = 'block';
    } else {
      this.scrim.style.display = 'none';
    }

    this.container.style.display = 'flex';
    this.container.innerHTML = '';

    const el = targetScreen.element;
    el.classList.add('is-entering');
    this.container.appendChild(el);

    // Force reflow for transition
    void el.offsetHeight;
    el.classList.remove('is-entering');

    this.activeScreen = targetScreen;
    targetScreen.onEnter?.(from);

    // Focus the first interactive control
    this.focusFirstControl(el);
  }

  private focusFirstControl(root: HTMLElement): void {
    const focusables = root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex="0"]:not([disabled]), input:not([disabled])',
    );
    if (focusables.length > 0) {
      focusables[0].focus();
    }
  }

  public handleNavigation(action: MenuNavigationAction): void {
    // Collect all interactive elements in active screen or open modal
    const searchRoot = document.querySelector('.nl-modal-backdrop') ?? this.container;
    const focusables = Array.from(
      searchRoot.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([aria-disabled="true"]), [tabindex="0"]:not([disabled]), input:not([disabled])',
      ),
    );

    if (focusables.length === 0) return;

    const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);

    if (action === 'down' || action === 'up') {
      let nextIndex = 0;
      if (currentIndex === -1) {
        nextIndex = 0;
      } else if (action === 'down') {
        nextIndex = (currentIndex + 1) % focusables.length;
      } else {
        nextIndex = (currentIndex - 1 + focusables.length) % focusables.length;
      }
      focusables[nextIndex].focus();
    } else if (action === 'confirm') {
      if (currentIndex !== -1) {
        focusables[currentIndex].click();
      } else {
        focusables[0].click();
      }
    }
  }

  public dispose(): void {
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs.length = 0;
    this.scrim.remove();
    this.container.remove();
  }
}
