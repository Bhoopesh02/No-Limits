import { createButton } from './Button';

export type ModalVisualState = 'enter' | 'idle' | 'exit';

export interface ModalOptions {
  readonly id?: string;
  readonly title: string;
  readonly content: HTMLElement | string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly visualState?: ModalVisualState;
  readonly isStatic?: boolean;
  readonly onConfirm?: () => void;
  readonly onCancel?: () => void;
}

export interface ModalController {
  readonly element: HTMLElement;
  open(openerElement?: HTMLElement | null): void;
  close(): void;
}

export type ModalElement = HTMLElement & ModalController;

let modalIdCounter = 0;

export function createModal(options: ModalOptions): ModalElement {
  const {
    id = `nl-modal-${++modalIdCounter}`,
    title,
    content,
    confirmLabel,
    cancelLabel = 'Close',
    visualState = 'idle',
    isStatic = false,
    onConfirm,
    onCancel,
  } = options;

  let opener: HTMLElement | null = null;
  let isClosing = false;

  const backdrop = document.createElement('div');
  backdrop.id = id;
  backdrop.className = `nl-modal-backdrop${isStatic ? ' nl-modal-backdrop--static' : ''} nl-modal--${visualState}`;

  if (!isStatic) {
    backdrop.setAttribute('aria-hidden', 'true');
  }

  const dialog = document.createElement('div');
  dialog.className = 'nl-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const titleId = `${id}-title`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.tabIndex = -1;

  // Header
  const header = document.createElement('div');
  header.className = 'nl-modal__header';

  const titleEl = document.createElement('h3');
  titleEl.id = titleId;
  titleEl.className = 'nl-modal__title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const closeBtn = createButton({
    variant: 'icon',
    ariaLabel: 'Close dialog',
    iconSvg:
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 1.5L12.5 12.5M1.5 12.5L12.5 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    onClick: () => {
      close();
    },
  });
  closeBtn.classList.add('nl-modal__close-btn');
  header.appendChild(closeBtn);

  dialog.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'nl-modal__body';
  if (typeof content === 'string') {
    const p = document.createElement('div');
    p.innerHTML = content;
    body.appendChild(p);
  } else {
    body.appendChild(content);
  }
  dialog.appendChild(body);

  // Footer Actions
  const footer = document.createElement('div');
  footer.className = 'nl-modal__footer';

  if (cancelLabel) {
    const cancelBtn = createButton({
      variant: 'secondary',
      label: cancelLabel,
      onClick: () => {
        if (onCancel) onCancel();
        close();
      },
    });
    footer.appendChild(cancelBtn);
  }

  if (confirmLabel) {
    const confirmBtn = createButton({
      variant: 'primary',
      label: confirmLabel,
      onClick: () => {
        if (onConfirm) onConfirm();
        close();
      },
    });
    footer.appendChild(confirmBtn);
  }

  dialog.appendChild(footer);
  backdrop.appendChild(dialog);

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'Tab') {
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([aria-disabled="true"]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === dialog) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  function handleBackdropClick(e: MouseEvent): void {
    if (e.target === backdrop) {
      close();
    }
  }

  function open(openerElement?: HTMLElement | null): void {
    opener = openerElement ?? (document.activeElement as HTMLElement | null);
    isClosing = false;

    if (!document.body.contains(backdrop)) {
      document.body.appendChild(backdrop);
    }

    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nl-no-scroll');

    backdrop.className = 'nl-modal-backdrop nl-modal--enter';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backdrop.className = 'nl-modal-backdrop nl-modal--idle';
      });
    });

    backdrop.addEventListener('keydown', handleKeyDown);
    backdrop.addEventListener('click', handleBackdropClick);

    const firstFocusable = dialog.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      dialog.focus();
    }
  }

  function close(): void {
    if (isClosing) return;
    isClosing = true;

    backdrop.removeEventListener('keydown', handleKeyDown);
    backdrop.removeEventListener('click', handleBackdropClick);

    backdrop.className = 'nl-modal-backdrop nl-modal--exit';

    const handleTransitionEnd = (): void => {
      backdrop.removeEventListener('transitionend', handleTransitionEnd);
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nl-no-scroll');
      if (backdrop.parentNode && !isStatic) {
        backdrop.parentNode.removeChild(backdrop);
      }
      isClosing = false;
      if (opener && typeof opener.focus === 'function') {
        opener.focus();
      }
    };

    const timer = window.setTimeout(handleTransitionEnd, 250);
    backdrop.addEventListener(
      'transitionend',
      () => {
        window.clearTimeout(timer);
        handleTransitionEnd();
      },
      { once: true },
    );
  }

  const result = backdrop as unknown as ModalElement;
  Object.defineProperties(result, {
    element: { value: backdrop, writable: false },
    open: { value: open, writable: false },
    close: { value: close, writable: false },
  });

  return result;
}

export { createModal as Modal };
