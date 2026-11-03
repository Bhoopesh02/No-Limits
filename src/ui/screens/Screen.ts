export interface Screen {
  readonly id: string;
  readonly element: HTMLElement;
  onEnter?(from?: string): void;
  onExit?(to?: string): void;
}
