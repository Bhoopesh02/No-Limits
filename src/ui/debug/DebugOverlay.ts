export class DebugOverlay {
  private readonly container: HTMLElement;
  private readonly contentEl: HTMLElement;
  private visible = false;

  private frameCount = 0;
  private lastFpsTime = performance.now();
  private currentFps = 60;
  private currentFrameTime = 16.6;

  constructor(parent: HTMLElement = document.body) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: var(--space-2);
      left: var(--space-2);
      background: rgba(11, 14, 20, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      border-radius: var(--radius-s);
      padding: var(--space-2) var(--space-3);
      font-family: var(--font-display);
      font-size: var(--fs-12);
      color: var(--text-secondary);
      pointer-events: none;
      z-index: 9999;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'tabular-nums';
    this.container.appendChild(this.contentEl);

    parent.appendChild(this.container);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public update(frameDt: number, calls: number, triangles: number): void {
    if (!this.visible) return;

    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;

    if (elapsed >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.currentFrameTime = frameDt * 1000;
      this.frameCount = 0;
      this.lastFpsTime = now;

      this.contentEl.innerHTML = `
        <div style="color: var(--accent); font-weight: 700; margin-bottom: 2px;">DEV STATS [\`]</div>
        <div>FPS: <strong style="color: var(--text-primary);">${this.currentFps}</strong> (${this.currentFrameTime.toFixed(1)}ms)</div>
        <div>Calls: <strong style="color: var(--text-primary);">${calls}</strong> | Tris: <strong style="color: var(--text-primary);">${triangles.toLocaleString()}</strong></div>
      `;
    }
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Backquote') {
      this.toggle();
    }
  };
}
