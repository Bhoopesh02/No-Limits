import { createButton } from '../components/Button';
import { createDropdown } from '../components/Dropdown';
import { createModal, type ModalElement } from '../components/Modal';
import { createSlider } from '../components/Slider';
import { createTabs } from '../components/Tabs';
import { createToggle } from '../components/Toggle';
import type { GraphicsService } from '../../services/GraphicsService';
import type { SettingsService, UserSettings } from '../../services/SettingsService';
import type { GraphicsTierOption } from '../../data/GraphicsTierConfig';

export interface SettingsScreenOptions {
  readonly settingsService: SettingsService;
  readonly graphicsService: GraphicsService;
  readonly onClose?: () => void;
}

export class SettingsScreen {
  public readonly modal: ModalElement;
  private readonly settingsService: SettingsService;
  private readonly graphicsService: GraphicsService;
  private readonly onClose?: () => void;

  constructor(options: SettingsScreenOptions) {
    this.settingsService = options.settingsService;
    this.graphicsService = options.graphicsService;
    this.onClose = options.onClose;

    const modalContent = document.createElement('div');
    modalContent.className = 'nl-settings-container';
    modalContent.style.minWidth = '340px';
    modalContent.style.maxWidth = '500px';

    const tabsContainer = createTabs({
      ariaLabel: 'Settings Categories',
      items: [
        {
          id: 'graphics',
          label: 'Graphics',
          content: this.buildGraphicsPanel(),
        },
        {
          id: 'audio',
          label: 'Audio',
          content: this.buildAudioPanel(),
        },
        {
          id: 'controls',
          label: 'Controls',
          content: this.buildControlsPanel(),
        },
        {
          id: 'accessibility',
          label: 'Accessibility',
          content: this.buildAccessibilityPanel(),
        },
      ],
    });
    modalContent.appendChild(tabsContainer);

    // Reset button row
    const footerActions = document.createElement('div');
    footerActions.style.cssText =
      'display: flex; justify-content: flex-end; margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--border);';

    const resetBtn = createButton({
      variant: 'secondary',
      label: 'Reset Defaults',
      onClick: () => {
        this.settingsService.resetToDefaults();
        const s = this.settingsService.getSettings();
        this.graphicsService.setGraphics(s.graphicsTier, s.resolutionScale);
        // Refresh by re-closing/re-opening or re-rendering
        this.close();
      },
    });
    resetBtn.style.minHeight = '40px';
    footerActions.appendChild(resetBtn);
    modalContent.appendChild(footerActions);

    this.modal = createModal({
      id: 'nl-settings-modal',
      title: 'SETTINGS',
      content: modalContent,
      cancelLabel: 'Close',
      onCancel: () => {
        this.onClose?.();
      },
    });
  }

  public open(opener?: HTMLElement | null): void {
    this.modal.open(opener);
  }

  public close(): void {
    this.modal.close();
    this.onClose?.();
  }

  public isOpen(): boolean {
    return this.modal.getAttribute('aria-hidden') === 'false';
  }

  public dispose(): void {
    this.modal.remove();
  }

  private buildGraphicsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText =
      'display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0;';

    const currentSettings = this.settingsService.getSettings();

    // 1. Tier Dropdown
    const tierDropdown = createDropdown({
      label: 'Graphics Quality',
      items: [
        { value: 'auto', label: 'Auto (Recommended)' },
        { value: 'high', label: 'High (60 FPS)' },
        { value: 'medium', label: 'Medium (45-60 FPS)' },
        { value: 'low', label: 'Low (30 FPS)' },
      ],
      value: currentSettings.graphicsTier,
      onChange: (val) => {
        const tierOption = val as GraphicsTierOption;
        this.settingsService.update({ graphicsTier: tierOption });
        this.graphicsService.setTier(tierOption);
      },
    });
    panel.appendChild(tierDropdown);

    // 2. Resolution Scale Slider
    const scaleSlider = createSlider({
      label: 'Resolution Scale',
      value: Math.round(currentSettings.resolutionScale * 100),
      min: 60,
      max: 100,
      step: 5,
      unit: '%',
      onChange: (pct) => {
        const scale = pct / 100;
        this.settingsService.update({ resolutionScale: scale });
        this.graphicsService.setResolutionScale(scale);
      },
    });
    panel.appendChild(scaleSlider);

    // 3. Dev Stats / FPS Overlay Toggle
    const statsToggle = createToggle({
      label: 'Show FPS & Performance Stats',
      checked: currentSettings.showDevStats,
      onChange: (checked) => {
        this.settingsService.update({ showDevStats: checked });
      },
    });
    panel.appendChild(statsToggle);

    return panel;
  }

  private buildAudioPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText =
      'display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0;';

    const s = this.settingsService.getSettings();

    panel.appendChild(
      createSlider({
        label: 'Master Volume',
        value: s.masterVolume,
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
        onChange: (val) => this.settingsService.update({ masterVolume: val }),
      }),
    );

    panel.appendChild(
      createSlider({
        label: 'SFX Volume',
        value: s.sfxVolume,
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
        onChange: (val) => this.settingsService.update({ sfxVolume: val }),
      }),
    );

    panel.appendChild(
      createSlider({
        label: 'Music Volume',
        value: s.musicVolume,
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
        onChange: (val) => this.settingsService.update({ musicVolume: val }),
      }),
    );

    return panel;
  }

  private buildControlsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText =
      'display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0;';

    const s = this.settingsService.getSettings();

    panel.appendChild(
      createDropdown({
        label: 'Control Scheme',
        items: [
          { value: 'auto', label: 'Auto Detect (Recommended)' },
          { value: 'keyboard', label: 'Keyboard (WASD / Arrows)' },
          { value: 'touch', label: 'On-Screen Touch Controls' },
          { value: 'gamepad', label: 'Gamepad Controller' },
        ],
        value: s.controlScheme,
        onChange: (val) =>
          this.settingsService.update({
            controlScheme: val as UserSettings['controlScheme'],
          }),
      }),
    );

    panel.appendChild(
      createSlider({
        label: 'Steering Sensitivity',
        value: Math.round(s.steeringSensitivity * 100),
        min: 50,
        max: 150,
        step: 5,
        unit: '%',
        onChange: (val) => this.settingsService.update({ steeringSensitivity: val / 100 }),
      }),
    );

    return panel;
  }

  private buildAccessibilityPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText =
      'display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-2) 0;';

    const s = this.settingsService.getSettings();

    panel.appendChild(
      createToggle({
        label: 'Reduce Motion',
        checked: s.reduceMotion,
        onChange: (checked) => this.settingsService.update({ reduceMotion: checked }),
      }),
    );

    panel.appendChild(
      createDropdown({
        label: 'Speedometer Units',
        items: [
          { value: 'kmh', label: 'km/h (Kilometers per hour)' },
          { value: 'mph', label: 'mph (Miles per hour)' },
        ],
        value: s.speedUnits,
        onChange: (val) =>
          this.settingsService.update({ speedUnits: val as UserSettings['speedUnits'] }),
      }),
    );

    return panel;
  }
}
