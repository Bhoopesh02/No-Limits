import { ControlVisualState } from './Toggle';

export interface SliderOptions {
  readonly label: string;
  readonly value?: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly unit?: string;
  readonly disabled?: boolean;
  readonly visualState?: ControlVisualState;
  readonly onChange?: (value: number) => void;
}

export function createSlider(options: SliderOptions): HTMLElement {
  const {
    label,
    value = 50,
    min = 0,
    max = 100,
    step = 1,
    unit = '%',
    disabled = false,
    visualState = 'default',
    onChange,
  } = options;

  const isDisabled = disabled || visualState === 'disabled';

  const container = document.createElement('div');
  container.className = 'nl-slider';
  if (isDisabled) {
    container.classList.add('is-disabled');
  }

  // Header row
  const header = document.createElement('div');
  header.className = 'nl-slider__header';

  const labelEl = document.createElement('label');
  labelEl.className = 'nl-slider__label';
  const inputId = `slider-${Math.random().toString(36).slice(2, 9)}`;
  labelEl.setAttribute('for', inputId);
  labelEl.textContent = label;
  header.appendChild(labelEl);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'nl-slider__value';
  valueDisplay.textContent = `${value}${unit}`;
  header.appendChild(valueDisplay);

  container.appendChild(header);

  // Input range element
  const input = document.createElement('input');
  input.id = inputId;
  input.type = 'range';
  input.className = 'nl-slider__input';
  input.min = min.toString();
  input.max = max.toString();
  input.step = step.toString();
  input.value = value.toString();
  input.setAttribute('aria-label', label);
  input.setAttribute('aria-valuemin', min.toString());
  input.setAttribute('aria-valuemax', max.toString());
  input.setAttribute('aria-valuenow', value.toString());

  if (visualState === 'focus') {
    input.classList.add('is-focused');
  }

  if (isDisabled) {
    input.disabled = true;
    input.setAttribute('aria-disabled', 'true');
  }

  input.addEventListener('input', () => {
    const val = Number(input.value);
    valueDisplay.textContent = `${val}${unit}`;
    input.setAttribute('aria-valuenow', val.toString());
    onChange?.(val);
  });

  container.appendChild(input);

  return container;
}

export { createSlider as Slider };
