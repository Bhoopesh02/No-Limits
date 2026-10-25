export interface DropdownItem {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export type DropdownVisualState = 'default' | 'open' | 'focus' | 'disabled';

export interface DropdownOptions {
  readonly id?: string;
  readonly label?: string;
  readonly items: readonly DropdownItem[];
  readonly value?: string;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly visualState?: DropdownVisualState;
  readonly onChange?: (value: string) => void;
}

let dropdownIdCounter = 0;

export function createDropdown(options: DropdownOptions): HTMLElement {
  const {
    id = `nl-dropdown-${++dropdownIdCounter}`,
    label,
    items,
    value: initialValue,
    placeholder = 'Select option...',
    disabled = false,
    visualState = 'default',
    onChange,
  } = options;

  let isOpen = visualState === 'open';
  let currentValue = initialValue ?? (items[0]?.value || '');
  let activeIndex = items.findIndex((item) => item.value === currentValue);
  if (activeIndex === -1 && items.length > 0) {
    activeIndex = 0;
  }

  const container = document.createElement('div');
  container.className = 'nl-dropdown';
  if (visualState === 'open') container.classList.add('is-open');
  if (visualState === 'focus') container.classList.add('is-focused');
  if (disabled || visualState === 'disabled') container.classList.add('is-disabled');

  const triggerId = `${id}-trigger`;
  const listId = `${id}-list`;
  const labelId = `${id}-label`;

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.id = labelId;
    labelEl.className = 'nl-dropdown__label';
    labelEl.textContent = label;
    labelEl.htmlFor = triggerId;
    container.appendChild(labelEl);
  }

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.id = triggerId;
  trigger.className = 'nl-dropdown__trigger';
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-controls', listId);
  if (label) {
    trigger.setAttribute('aria-labelledby', `${labelId} ${triggerId}`);
  }

  if (disabled || visualState === 'disabled') {
    trigger.disabled = true;
    trigger.setAttribute('aria-disabled', 'true');
  }

  const selectedText = document.createElement('span');
  selectedText.className = 'nl-dropdown__selected';
  const selectedItem = items.find((item) => item.value === currentValue);
  selectedText.textContent = selectedItem ? selectedItem.label : placeholder;
  trigger.appendChild(selectedText);

  const arrow = document.createElement('span');
  arrow.className = 'nl-dropdown__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  trigger.appendChild(arrow);

  container.appendChild(trigger);

  const listbox = document.createElement('ul');
  listbox.id = listId;
  listbox.className = 'nl-dropdown__menu';
  listbox.setAttribute('role', 'listbox');
  if (label) {
    listbox.setAttribute('aria-labelledby', labelId);
  } else {
    listbox.setAttribute('aria-label', placeholder);
  }
  listbox.tabIndex = -1;

  const optionElements: HTMLElement[] = [];

  function updateActiveDescendant(): void {
    optionElements.forEach((el, idx) => {
      const isAct = idx === activeIndex && isOpen;
      if (isAct) {
        el.classList.add('is-active');
        trigger.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('is-active');
      }
    });
    if (!isOpen || activeIndex < 0) {
      trigger.removeAttribute('aria-activedescendant');
    }
  }

  function renderItems(): void {
    listbox.innerHTML = '';
    optionElements.length = 0;

    items.forEach((item, index) => {
      const opt = document.createElement('li');
      opt.id = `${id}-opt-${index}`;
      opt.className = 'nl-dropdown__item';
      opt.setAttribute('role', 'option');
      opt.setAttribute('data-value', item.value);

      const isSelected = item.value === currentValue;
      opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) opt.classList.add('is-selected');

      if (item.disabled) {
        opt.setAttribute('aria-disabled', 'true');
        opt.classList.add('is-disabled');
      } else {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          selectValue(item.value);
          closeDropdown();
          trigger.focus();
        });
        opt.addEventListener('pointerenter', () => {
          activeIndex = index;
          updateActiveDescendant();
        });
      }

      const optText = document.createElement('span');
      optText.className = 'nl-dropdown__item-text';
      optText.textContent = item.label;
      opt.appendChild(optText);

      listbox.appendChild(opt);
      optionElements.push(opt);
    });

    updateActiveDescendant();
  }

  renderItems();
  container.appendChild(listbox);

  function openDropdown(): void {
    if (disabled || visualState === 'disabled') return;
    isOpen = true;
    container.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');

    // Ensure list stays inside viewport on small screens
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      listbox.classList.add('nl-dropdown__menu--top');
    } else {
      listbox.classList.remove('nl-dropdown__menu--top');
    }

    if (activeIndex === -1) {
      const firstEnabled = items.findIndex((it) => !it.disabled);
      activeIndex = firstEnabled !== -1 ? firstEnabled : 0;
    }
    updateActiveDescendant();
    document.addEventListener('pointerdown', handleOutsidePointer);
  }

  function closeDropdown(): void {
    isOpen = false;
    container.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    document.removeEventListener('pointerdown', handleOutsidePointer);
  }

  function handleOutsidePointer(e: PointerEvent): void {
    if (!container.contains(e.target as Node)) {
      closeDropdown();
    }
  }

  function selectValue(newValue: string): void {
    if (newValue === currentValue) return;
    currentValue = newValue;
    const found = items.find((it) => it.value === currentValue);
    selectedText.textContent = found ? found.label : placeholder;
    activeIndex = items.findIndex((it) => it.value === currentValue);

    optionElements.forEach((el, idx) => {
      const match = items[idx]?.value === currentValue;
      el.setAttribute('aria-selected', match ? 'true' : 'false');
      if (match) {
        el.classList.add('is-selected');
      } else {
        el.classList.remove('is-selected');
      }
    });

    if (onChange) {
      onChange(currentValue);
    }
  }

  // Trigger click
  trigger.addEventListener('click', () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Keyboard navigation
  trigger.addEventListener('keydown', (e: KeyboardEvent) => {
    if (disabled || visualState === 'disabled') return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
        if (e.key === 'ArrowUp') {
          // Highlight last enabled
          for (let i = items.length - 1; i >= 0; i--) {
            if (!items[i].disabled) {
              activeIndex = i;
              break;
            }
          }
          updateActiveDescendant();
        }
      }
      return;
    }

    // When open
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        let next = activeIndex + 1;
        while (next < items.length && items[next].disabled) {
          next++;
        }
        if (next < items.length) {
          activeIndex = next;
          updateActiveDescendant();
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        let prev = activeIndex - 1;
        while (prev >= 0 && items[prev].disabled) {
          prev--;
        }
        if (prev >= 0) {
          activeIndex = prev;
          updateActiveDescendant();
        }
        break;
      }
      case 'Home': {
        e.preventDefault();
        const first = items.findIndex((it) => !it.disabled);
        if (first !== -1) {
          activeIndex = first;
          updateActiveDescendant();
        }
        break;
      }
      case 'End': {
        e.preventDefault();
        for (let i = items.length - 1; i >= 0; i--) {
          if (!items[i].disabled) {
            activeIndex = i;
            updateActiveDescendant();
            break;
          }
        }
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length && !items[activeIndex].disabled) {
          selectValue(items[activeIndex].value);
          closeDropdown();
          trigger.focus();
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        closeDropdown();
        trigger.focus();
        break;
      }
      case 'Tab': {
        closeDropdown();
        break;
      }
    }
  });

  return container;
}

export { createDropdown as Dropdown };
