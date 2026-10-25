export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
export type ButtonVisualState = 'default' | 'hover' | 'focus' | 'pressed' | 'disabled';

export interface ButtonOptions {
  readonly variant?: ButtonVariant;
  readonly label?: string;
  readonly iconSvg?: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly visualState?: ButtonVisualState;
  readonly onClick?: (event: MouseEvent) => void;
}

export function createButton(options: ButtonOptions = {}): HTMLButtonElement {
  const {
    variant = 'secondary',
    label = '',
    iconSvg,
    ariaLabel,
    disabled = false,
    visualState = 'default',
    onClick,
  } = options;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `nl-btn nl-btn--${variant}`;

  if (visualState === 'hover') {
    btn.classList.add('is-hovered');
  } else if (visualState === 'focus') {
    btn.classList.add('is-focused');
  } else if (visualState === 'pressed') {
    btn.classList.add('is-pressed');
  } else if (visualState === 'disabled') {
    btn.classList.add('is-disabled');
  }

  if (disabled || visualState === 'disabled') {
    btn.disabled = true;
    btn.setAttribute('aria-disabled', 'true');
  }

  if (ariaLabel) {
    btn.setAttribute('aria-label', ariaLabel);
  }

  if (iconSvg) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'nl-btn__icon';
    iconSpan.innerHTML = iconSvg;
    btn.appendChild(iconSpan);
  }

  if (label) {
    const labelSpan = document.createElement('span');
    labelSpan.className = 'nl-btn__text';
    labelSpan.textContent = label;
    btn.appendChild(labelSpan);
  }

  if (onClick) {
    btn.addEventListener('click', onClick);
  }

  return btn;
}

export { createButton as Button };
