export interface DebugAuditStats {
  readonly meshes: number;
  readonly uniqueMaterials: number;
  readonly transmissionOrClearcoat: number;
  readonly triangles: number;
}

export interface DebugAuditData {
  readonly geometries: number;
  readonly textures: number;
  readonly programs: number;
  readonly car: DebugAuditStats;
  readonly track: DebugAuditStats;
  readonly total: DebugAuditStats;
}

export interface DebugOverlayOptions {
  readonly parent?: HTMLElement;
  readonly auditProvider?: () => DebugAuditData;
}

export class DebugOverlay {
  private readonly container: HTMLElement;
  private readonly liveStatsEl: HTMLElement;
  private readonly auditEl: HTMLElement;
  private visible = false;
  private auditProvider: (() => DebugAuditData) | null = null;

  private frameCount = 0;
  private lastFpsTime = performance.now();
  private currentFps = 60;
  private currentFrameTime = 16.6;
  private avgSimStepTimeMs = 0.5;

  constructor(options: DebugOverlayOptions = {}) {
    const parent = options.parent ?? document.body;
    this.auditProvider = options.auditProvider ?? null;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: var(--space-2);
      left: var(--space-2);
      background: rgba(11, 14, 20, 0.90);
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
      max-width: 380px;
    `;

    this.liveStatsEl = document.createElement('div');
    this.liveStatsEl.className = 'tabular-nums';
    this.container.appendChild(this.liveStatsEl);

    this.auditEl = document.createElement('div');
    this.auditEl.style.cssText = `
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--border);
      font-size: var(--fs-12);
      line-height: 1.4;
      display: none;
    `;
    this.container.appendChild(this.auditEl);

    parent.appendChild(this.container);
    window.addEventListener('keydown', this.onKeyDown);
  }

  public recordSimStep(durationMs: number): void {
    this.avgSimStepTimeMs = this.avgSimStepTimeMs * 0.95 + durationMs * 0.05;
  }

  public setAuditProvider(provider: () => DebugAuditData): void {
    this.auditProvider = provider;
  }

  public update(
    frameDt: number,
    calls: number,
    triangles: number,
    memoryGeometries?: number,
    memoryTextures?: number,
  ): void {
    if (!this.visible) return;

    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;

    if (elapsed >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.currentFrameTime = frameDt * 1000;
      this.frameCount = 0;
      this.lastFpsTime = now;

      const memHtml =
        memoryGeometries !== undefined
          ? `<div>Memory: Geoms: <strong style="color: var(--text-primary);">${memoryGeometries}</strong> | Tex: <strong style="color: var(--text-primary);">${memoryTextures ?? 0}</strong></div>`
          : '';

      this.liveStatsEl.innerHTML = `
        <div style="color: var(--accent); font-weight: 700; margin-bottom: 2px;">DEV STATS [\`]</div>
        <div>FPS: <strong style="color: var(--text-primary);">${this.currentFps}</strong> (${this.currentFrameTime.toFixed(1)}ms) | Sim: <strong style="color: var(--text-primary);">${this.avgSimStepTimeMs.toFixed(2)}ms</strong></div>
        <div>Calls: <strong style="color: var(--text-primary);">${calls}</strong> | Tris: <strong style="color: var(--text-primary);">${triangles.toLocaleString()}</strong></div>
        ${memHtml}
      `;
    }
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';

    if (this.visible && this.auditProvider) {
      this.runAudit();
    }
  }

  public runAudit(): void {
    if (!this.auditProvider) return;
    try {
      const audit = this.auditProvider();
      this.auditEl.style.display = 'block';
      this.auditEl.innerHTML = `
        <div style="color: var(--accent); font-weight: 700; margin-bottom: 2px;">SCENE AUDIT</div>
        <div>Memory: Geoms: <strong style="color: var(--text-primary);">${audit.geometries}</strong> | Tex: <strong style="color: var(--text-primary);">${audit.textures}</strong> | Progs: <strong style="color: var(--text-primary);">${audit.programs}</strong></div>
        <div>Car: Meshes: <strong style="color: var(--text-primary);">${audit.car.meshes}</strong> | Mats: <strong style="color: var(--text-primary);">${audit.car.uniqueMaterials}</strong> (Trans/Clear: <strong style="color: var(--text-primary);">${audit.car.transmissionOrClearcoat}</strong>) | Tris: <strong style="color: var(--text-primary);">${audit.car.triangles.toLocaleString()}</strong></div>
        <div>Track: Meshes: <strong style="color: var(--text-primary);">${audit.track.meshes}</strong> | Mats: <strong style="color: var(--text-primary);">${audit.track.uniqueMaterials}</strong> (Trans/Clear: <strong style="color: var(--text-primary);">${audit.track.transmissionOrClearcoat}</strong>) | Tris: <strong style="color: var(--text-primary);">${audit.track.triangles.toLocaleString()}</strong></div>
        <div>Total Scene: Meshes: <strong style="color: var(--text-primary);">${audit.total.meshes}</strong> | Mats: <strong style="color: var(--text-primary);">${audit.total.uniqueMaterials}</strong> | Tris: <strong style="color: var(--text-primary);">${audit.total.triangles.toLocaleString()}</strong></div>
      `;
    } catch {
      this.auditEl.style.display = 'none';
    }
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
