import { CarData, DEFAULT_CAR_KAZE } from '../../data/CarData';
import { createButton } from '../components/Button';
import { createSlider } from '../components/Slider';

export class TuningPanel {
  private readonly container: HTMLElement;
  private readonly sliderListEl: HTMLElement;
  private readonly liveCarData: CarData;
  private visible = false;

  constructor(liveCarData: CarData, parent: HTMLElement = document.body) {
    this.liveCarData = liveCarData;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      width: 320px;
      max-height: calc(100vh - var(--space-8));
      background: rgba(18, 23, 34, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: var(--radius-m);
      padding: var(--space-4);
      font-family: var(--font-body);
      color: var(--text-primary);
      z-index: 9998;
      display: none;
      flex-direction: column;
      gap: var(--space-3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      overflow-y: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: var(--space-2);
    `;
    header.innerHTML = `
      <div style="font-family: var(--font-display); font-weight: 700; font-size: var(--fs-16); color: var(--accent);">
        PHYSICS TUNING <span style="font-size: var(--fs-12); color: var(--text-secondary);">[F2]</span>
      </div>
    `;

    const closeBtn = createButton({
      variant: 'ghost',
      label: '✕',
      onClick: () => this.toggle(),
    });
    closeBtn.style.padding = '0 6px';
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Scrollable slider list
    this.sliderListEl = document.createElement('div');
    this.sliderListEl.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    `;
    this.container.appendChild(this.sliderListEl);

    // Button actions row
    const actionsRow = document.createElement('div');
    actionsRow.style.cssText = `
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-2);
      border-top: 1px solid var(--border);
      padding-top: var(--space-3);
    `;

    const resetBtn = createButton({
      variant: 'secondary',
      label: 'Reset Defaults',
      onClick: () => this.resetDefaults(),
    });
    resetBtn.style.flex = '1';

    const copyBtn = createButton({
      variant: 'primary',
      label: 'Copy JSON',
      onClick: () => this.copyJson(copyBtn),
    });
    copyBtn.style.flex = '1';

    actionsRow.appendChild(resetBtn);
    actionsRow.appendChild(copyBtn);
    this.container.appendChild(actionsRow);

    parent.appendChild(this.container);
    this.renderSliders();

    window.addEventListener('keydown', this.onKeyDown);
  }

  private renderSliders(): void {
    this.sliderListEl.innerHTML = '';

    const configs: Array<{
      key: keyof CarData;
      label: string;
      min: number;
      max: number;
      step: number;
      unit: string;
    }> = [
      { key: 'mass', label: 'Mass', min: 800, max: 2000, step: 25, unit: ' kg' },
      {
        key: 'topSpeed',
        label: 'Top Speed',
        min: 40,
        max: 120,
        step: 1,
        unit: ' m/s',
      },
      {
        key: 'reverseTopSpeed',
        label: 'Reverse Top Speed',
        min: 5,
        max: 30,
        step: 1,
        unit: ' m/s',
      },
      {
        key: 'reverseAccel',
        label: 'Reverse Accel',
        min: 1.0,
        max: 15.0,
        step: 0.2,
        unit: ' m/s²',
      },
      {
        key: 'grip',
        label: 'Lateral Grip',
        min: 3.0,
        max: 20.0,
        step: 0.5,
        unit: ' m/s²',
      },
      {
        key: 'driftGripFactor',
        label: 'Drift Grip Factor',
        min: 0.1,
        max: 0.9,
        step: 0.05,
        unit: '',
      },
      {
        key: 'steerPressRate',
        label: 'Steer Press Rate',
        min: 1.0,
        max: 10.0,
        step: 0.5,
        unit: ' /s',
      },
      {
        key: 'maxSteerAngle',
        label: 'Max Steer Angle',
        min: 0.2,
        max: 0.8,
        step: 0.02,
        unit: ' rad',
      },
      {
        key: 'nitroStrength',
        label: 'Nitro Strength',
        min: 1.0,
        max: 3.0,
        step: 0.1,
        unit: 'x',
      },
      {
        key: 'nitroDuration',
        label: 'Nitro Duration',
        min: 1.5,
        max: 8.0,
        step: 0.5,
        unit: ' s',
      },
      {
        key: 'nitroCooldown',
        label: 'Nitro Cooldown',
        min: 2.0,
        max: 15.0,
        step: 0.5,
        unit: ' s',
      },
    ];

    for (const cfg of configs) {
      const currentVal = Number(this.liveCarData[cfg.key]);
      const slider = createSlider({
        label: cfg.label,
        value: currentVal,
        min: cfg.min,
        max: cfg.max,
        step: cfg.step,
        unit: cfg.unit,
        onChange: (newVal) => {
          // Mutate live config directly
          (this.liveCarData as unknown as Record<string, number>)[cfg.key] = newVal;
        },
      });
      this.sliderListEl.appendChild(slider);
    }
  }

  private resetDefaults(): void {
    Object.assign(this.liveCarData, {
      mass: DEFAULT_CAR_KAZE.mass,
      topSpeed: DEFAULT_CAR_KAZE.topSpeed,
      reverseTopSpeed: DEFAULT_CAR_KAZE.reverseTopSpeed,
      reverseAccel: DEFAULT_CAR_KAZE.reverseAccel,
      grip: DEFAULT_CAR_KAZE.grip,
      driftGripFactor: DEFAULT_CAR_KAZE.driftGripFactor,
      steerPressRate: DEFAULT_CAR_KAZE.steerPressRate,
      maxSteerAngle: DEFAULT_CAR_KAZE.maxSteerAngle,
      nitroStrength: DEFAULT_CAR_KAZE.nitroStrength,
      nitroDuration: DEFAULT_CAR_KAZE.nitroDuration,
      nitroCooldown: DEFAULT_CAR_KAZE.nitroCooldown,
    });
    this.renderSliders();
  }

  private copyJson(btn: HTMLElement): void {
    const text = JSON.stringify(this.liveCarData, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      });
    }
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'flex' : 'none';
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'F2') {
      e.preventDefault();
      this.toggle();
    }
  };
}
