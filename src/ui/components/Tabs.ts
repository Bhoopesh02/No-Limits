export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content?: HTMLElement | string;
  readonly disabled?: boolean;
}

export type TabsVisualState = 'default' | 'focus' | 'disabled';

export interface TabsOptions {
  readonly id?: string;
  readonly items: readonly TabItem[];
  readonly activeId?: string;
  readonly ariaLabel?: string;
  readonly visualState?: TabsVisualState;
  readonly onChange?: (tabId: string) => void;
}

let tabsIdCounter = 0;

export function createTabs(options: TabsOptions): HTMLElement {
  const {
    id = `nl-tabs-${++tabsIdCounter}`,
    items,
    activeId: initialActiveId,
    ariaLabel = 'Navigation Tabs',
    visualState = 'default',
    onChange,
  } = options;

  let currentActiveId =
    initialActiveId ?? items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? '';

  const container = document.createElement('div');
  container.className = 'nl-tabs';
  if (visualState === 'disabled') {
    container.classList.add('is-disabled');
  }

  const tablist = document.createElement('div');
  tablist.className = 'nl-tabs__list';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', ariaLabel);
  container.appendChild(tablist);

  const panelsContainer = document.createElement('div');
  panelsContainer.className = 'nl-tabs__panels';
  container.appendChild(panelsContainer);

  const tabButtons: HTMLButtonElement[] = [];
  const panelElements: HTMLElement[] = [];

  function activateTab(tabId: string, shouldFocus = true): void {
    const targetItem = items.find((item) => item.id === tabId);
    if (!targetItem || targetItem.disabled) return;

    currentActiveId = tabId;

    tabButtons.forEach((btn, index) => {
      const item = items[index];
      const isActive = item?.id === currentActiveId;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.tabIndex = isActive ? 0 : -1;
      if (isActive) {
        btn.classList.add('is-active');
        if (shouldFocus) btn.focus();
      } else {
        btn.classList.remove('is-active');
      }
    });

    panelElements.forEach((panel, index) => {
      const item = items[index];
      const isActive = item?.id === currentActiveId;
      if (isActive) {
        panel.classList.add('is-active');
        panel.hidden = false;
      } else {
        panel.classList.remove('is-active');
        panel.hidden = true;
      }
    });

    if (onChange) {
      onChange(currentActiveId);
    }
  }

  items.forEach((item, index) => {
    const tabBtnId = `${id}-tab-${item.id}`;
    const panelId = `${id}-panel-${item.id}`;
    const isActive = item.id === currentActiveId;

    // Tab Button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = tabBtnId;
    btn.className = 'nl-tab';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('aria-controls', panelId);
    btn.tabIndex = isActive && !item.disabled ? 0 : -1;

    if (isActive) {
      btn.classList.add('is-active');
    }
    if (visualState === 'focus' && isActive) {
      btn.classList.add('is-focused');
    }
    if (item.disabled || visualState === 'disabled') {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.add('is-disabled');
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'nl-tab__label';
    labelSpan.textContent = item.label;
    btn.appendChild(labelSpan);

    btn.addEventListener('click', () => {
      activateTab(item.id, false);
    });

    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      const enabledIndices = items
        .map((it, idx) => (!it.disabled ? idx : -1))
        .filter((idx) => idx !== -1);
      const currentPos = enabledIndices.indexOf(index);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextPos = (currentPos + 1) % enabledIndices.length;
        const nextIndex = enabledIndices[nextPos];
        const nextItem = items[nextIndex];
        if (nextItem) activateTab(nextItem.id, true);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevPos = (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
        const prevIndex = enabledIndices[prevPos];
        const prevItem = items[prevIndex];
        if (prevItem) activateTab(prevItem.id, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        const firstIndex = enabledIndices[0];
        const firstItem = items[firstIndex];
        if (firstItem) activateTab(firstItem.id, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        const lastIndex = enabledIndices[enabledIndices.length - 1];
        const lastItem = items[lastIndex];
        if (lastItem) activateTab(lastItem.id, true);
      }
    });

    tablist.appendChild(btn);
    tabButtons.push(btn);

    // Tab Panel
    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = `nl-tabpanel${isActive ? ' is-active' : ''}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabBtnId);
    panel.tabIndex = 0;
    panel.hidden = !isActive;

    if (item.content) {
      if (typeof item.content === 'string') {
        panel.innerHTML = item.content;
      } else {
        panel.appendChild(item.content);
      }
    }

    panelsContainer.appendChild(panel);
    panelElements.push(panel);
  });

  return container;
}

export { createTabs as Tabs };
