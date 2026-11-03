import { GameInfo } from '../../data/GameInfo';
import { createButton } from '../components/Button';
import type { Screen } from './Screen';

export interface MenuScreenOptions {
  readonly onPlay: () => void;
}

export class MenuScreen implements Screen {
  public readonly id = 'Menu';
  public readonly element: HTMLElement;
  private readonly playBtn: HTMLButtonElement;

  constructor(options: MenuScreenOptions) {
    this.element = document.createElement('div');
    this.element.className = 'nl-screen nl-menu-screen';

    // Header
    const header = document.createElement('div');
    header.className = 'nl-menu-header';
    const title = document.createElement('h1');
    title.className = 'nl-menu-title';
    title.textContent = GameInfo.displayName;
    header.appendChild(title);
    this.element.appendChild(header);

    // Navigation buttons
    const nav = document.createElement('div');
    nav.className = 'nl-menu-nav';

    // 1. Play (primary, 56 px min-height)
    this.playBtn = createButton({
      variant: 'primary',
      label: 'Play',
      onClick: () => options.onPlay(),
    });
    this.playBtn.style.minHeight = '56px';
    this.playBtn.style.fontSize = 'var(--fs-18)';
    this.playBtn.style.width = '100%';
    nav.appendChild(this.playBtn);

    // 2. Garage (disabled with "Coming soon" label)
    const garageWrapper = document.createElement('div');
    garageWrapper.className = 'nl-menu-btn-wrapper';
    const garageBtn = createButton({
      variant: 'secondary',
      label: 'Garage',
      disabled: true,
    });
    garageBtn.style.minHeight = '48px';
    garageBtn.style.flex = '1';
    const garageBadge = document.createElement('span');
    garageBadge.className = 'nl-badge--coming-soon';
    garageBadge.textContent = 'Coming soon';
    garageWrapper.appendChild(garageBtn);
    garageWrapper.appendChild(garageBadge);
    nav.appendChild(garageWrapper);

    // 3. Settings (disabled with "Coming soon" label)
    const settingsWrapper = document.createElement('div');
    settingsWrapper.className = 'nl-menu-btn-wrapper';
    const settingsBtn = createButton({
      variant: 'secondary',
      label: 'Settings',
      disabled: true,
    });
    settingsBtn.style.minHeight = '48px';
    settingsBtn.style.flex = '1';
    const settingsBadge = document.createElement('span');
    settingsBadge.className = 'nl-badge--coming-soon';
    settingsBadge.textContent = 'Coming soon';
    settingsWrapper.appendChild(settingsBtn);
    settingsWrapper.appendChild(settingsBadge);
    nav.appendChild(settingsWrapper);

    this.element.appendChild(nav);

    // Footer with version
    const footer = document.createElement('div');
    footer.className = 'nl-menu-footer';
    footer.textContent = `v${GameInfo.version}`;
    this.element.appendChild(footer);
  }

  public onEnter(): void {
    // Focus first interactive control
    this.playBtn.focus();
  }
}
