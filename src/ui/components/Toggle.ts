export type ControlVisualState = 'default' | 'focus' | 'disabled';

export interface ToggleOptions {
  readonly label: string;
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly visualState?: ControlVisualState;
  readonly onChange?: (checked: boolean) => void;
}

export function createToggle(options: ToggleOptions): HTMLElement {
  const { label, checked = false, disabled = false, visualState = 'default', onChange } = options;

  let isChecked = checked;
  const isDisabled = disabled || visualState === 'disabled';

  const container = document.createElement('label');
  container.className = 'nl-toggle';
  if (isDisabled) {
    container.classList.add('is-disabled');
  }

  const switchBtn = document.createElement('button');
  switchBtn.type = 'button';
  switchBtn.className = 'nl-toggle__switch';
  switchBtn.setAttribute('role', 'switch');
  switchBtn.setAttribute('aria-checked', isChecked ? 'true' : 'false');
  switchBtn.setAttribute('aria-label', label);

  if (visualState === 'focus') {
    switchBtn.classList.add('is-focused');
  }

  if (isDisabled) {
    switchBtn.disabled = true;
    switchBtn.setAttribute('aria-disabled', 'true');
  }

  const thumb = document.createElement('span');
  thumb.className = 'nl-toggle__thumb';
  switchBtn.appendChild(thumb);

  const labelSpan = document.createElement('span');
  labelSpan.className = 'nl-toggle__label';
  labelSpan.textContent = label;

  const toggle = (): void => {
    if (isDisabled) return;
    isChecked = !isChecked;
    switchBtn.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    onChange?.(isChecked);
  };

  switchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggle();
  });

  switchBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  });

  container.appendChild(switchBtn);
  container.appendChild(labelSpan);

  return container;
}

export { createToggle as Toggle };
