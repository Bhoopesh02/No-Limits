import { createButton } from '../components/Button';
import { createModal, ModalElement } from '../components/Modal';

export interface PauseOverlayOptions {
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onQuit: () => void;
}

export class PauseOverlay {
  public readonly modal: ModalElement;
  private isPaused = false;
  private readonly resumeBtn: HTMLButtonElement;

  constructor(options: PauseOverlayOptions) {
    const content = document.createElement('div');
    content.className = 'nl-pause-actions';

    this.resumeBtn = createButton({
      variant: 'primary',
      label: 'Resume',
      onClick: () => {
        this.close();
        options.onResume();
      },
    });
    this.resumeBtn.style.minHeight = '48px';
    content.appendChild(this.resumeBtn);

    const restartBtn = createButton({
      variant: 'secondary',
      label: 'Restart Race',
      onClick: () => {
        this.close();
        options.onRestart();
      },
    });
    restartBtn.style.minHeight = '48px';
    content.appendChild(restartBtn);

    const quitBtn = createButton({
      variant: 'secondary',
      label: 'Quit to Menu',
      onClick: () => {
        this.close();
        options.onQuit();
      },
    });
    quitBtn.style.minHeight = '48px';
    content.appendChild(quitBtn);

    this.modal = createModal({
      id: 'nl-pause-modal',
      title: 'PAUSED',
      content,
      cancelLabel: 'Resume',
      onCancel: () => {
        this.isPaused = false;
        options.onResume();
      },
    });
  }

  public isOpen(): boolean {
    return this.isPaused;
  }

  public open(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.modal.open(document.activeElement as HTMLElement | null);
    this.resumeBtn.focus();
  }

  public close(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.modal.close();
  }

  public toggle(): void {
    if (this.isPaused) {
      this.close();
    } else {
      this.open();
    }
  }

  public dispose(): void {
    this.modal.remove();
  }
}
