export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';
export type ToastVisualState = 'enter' | 'idle' | 'exit';

export interface ToastOptions {
  readonly message: string;
  readonly title?: string;
  readonly variant?: ToastVariant;
  readonly durationMs?: number;
  readonly visualState?: ToastVisualState;
  readonly onDismiss?: () => void;
}

let toastLiveContainer: HTMLElement | null = null;

function getOrCreateToastContainer(): HTMLElement {
  if (!toastLiveContainer || !document.body.contains(toastLiveContainer)) {
    toastLiveContainer = document.createElement('div');
    toastLiveContainer.id = 'nl-toast-container';
    toastLiveContainer.className = 'nl-toast-container';
    toastLiveContainer.setAttribute('role', 'status');
    toastLiveContainer.setAttribute('aria-live', 'polite');
    toastLiveContainer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toastLiveContainer);
  }
  return toastLiveContainer;
}

export function createToast(options: ToastOptions): HTMLElement {
  const {
    message,
    title,
    variant = 'info',
    visualState = 'idle',
    durationMs = 3200,
    onDismiss,
  } = options;

  const toast = document.createElement('div');
  toast.className = `nl-toast nl-toast--${variant} nl-toast--${visualState}`;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'nl-toast__icon';
  iconWrap.setAttribute('aria-hidden', 'true');

  if (variant === 'success') {
    iconWrap.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9.5L7.5 13L14 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  } else if (variant === 'warning') {
    iconWrap.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3L16 15H2L9 3Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/><circle cx="9" cy="12.5" r="0.75" fill="currentColor"/><path d="M9 7V10" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
  } else if (variant === 'danger') {
    iconWrap.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.75"/><path d="M9 5.5V9.5M9 12.5H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  } else {
    // Info
    iconWrap.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.75"/><path d="M9 8.5V12.5M9 5.5H9.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  toast.appendChild(iconWrap);

  const contentWrap = document.createElement('div');
  contentWrap.className = 'nl-toast__content';

  if (title) {
    const titleEl = document.createElement('div');
    titleEl.className = 'nl-toast__title';
    titleEl.textContent = title;
    contentWrap.appendChild(titleEl);
  }

  const msgEl = document.createElement('div');
  msgEl.className = 'nl-toast__message';
  msgEl.textContent = message;
  contentWrap.appendChild(msgEl);

  toast.appendChild(contentWrap);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'nl-toast__close';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M2 10L10 2" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>';
  toast.appendChild(closeBtn);

  function dismiss(): void {
    toast.className = `nl-toast nl-toast--${variant} nl-toast--exit`;
    const finish = (): void => {
      toast.removeEventListener('transitionend', finish);
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      if (onDismiss) onDismiss();
    };
    const timer = window.setTimeout(finish, 250);
    toast.addEventListener(
      'transitionend',
      () => {
        window.clearTimeout(timer);
        finish();
      },
      { once: true },
    );
  }

  closeBtn.addEventListener('click', dismiss);

  if (durationMs > 0 && visualState !== 'exit') {
    window.setTimeout(dismiss, durationMs);
  }

  return toast;
}

export function showToast(options: ToastOptions): HTMLElement {
  const container = getOrCreateToastContainer();
  const toast = createToast({
    ...options,
    visualState: 'enter',
  });

  container.appendChild(toast);

  // Transition to idle
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.remove('nl-toast--enter');
      toast.classList.add('nl-toast--idle');
    });
  });

  return toast;
}

export { createToast as Toast };
