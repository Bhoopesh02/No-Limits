export type CardState = 'default' | 'selected' | 'locked';

export interface CarCardOptions {
  readonly name: string;
  readonly tier: string;
  readonly topSpeed: string;
  readonly acceleration: string;
  readonly handling: string;
  readonly nitro: string;
  readonly state?: CardState;
  readonly lockLabel?: string;
  readonly onSelect?: () => void;
}

const LOCK_ICON_SVG =
  '<svg viewBox="0 0 24 24" class="nl-card__lock-icon" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';

export function createCarCard(options: CarCardOptions): HTMLElement {
  const {
    name,
    tier,
    topSpeed,
    acceleration,
    handling,
    nitro,
    state = 'default',
    lockLabel = 'Locked • Reach Level 5',
    onSelect,
  } = options;

  const card = document.createElement('div');
  card.className = 'nl-card nl-car-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', state === 'locked' ? '-1' : '0');
  card.setAttribute('aria-disabled', state === 'locked' ? 'true' : 'false');
  card.setAttribute('aria-selected', state === 'selected' ? 'true' : 'false');

  if (state === 'selected') {
    card.classList.add('is-selected');
    const badge = document.createElement('div');
    badge.className = 'nl-card__badge-selected';
    badge.textContent = 'Selected';
    card.appendChild(badge);
  } else if (state === 'locked') {
    card.classList.add('is-locked');
    const overlay = document.createElement('div');
    overlay.className = 'nl-card__locked-overlay';
    overlay.innerHTML = `${LOCK_ICON_SVG}<span class="nl-card__lock-text">${lockLabel}</span>`;
    card.appendChild(overlay);
  }

  // Preview silhouette
  const preview = document.createElement('div');
  preview.className = 'nl-car-card__preview';
  preview.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
      <circle cx="7.5" cy="14.5" r="1.5"/>
      <circle cx="16.5" cy="14.5" r="1.5"/>
    </svg>
  `;
  card.appendChild(preview);

  // Title & Tier
  const title = document.createElement('div');
  title.className = 'nl-car-card__title';
  title.textContent = name;
  card.appendChild(title);

  const tierEl = document.createElement('div');
  tierEl.className = 'nl-car-card__tier';
  tierEl.textContent = tier;
  card.appendChild(tierEl);

  // Stats grid
  const stats = document.createElement('div');
  stats.className = 'nl-car-card__stats';
  stats.innerHTML = `
    <div class="nl-car-card__stat-item">Top Speed: <span class="nl-car-card__stat-val">${topSpeed}</span></div>
    <div class="nl-car-card__stat-item">0-100: <span class="nl-car-card__stat-val">${acceleration}</span></div>
    <div class="nl-car-card__stat-item">Handling: <span class="nl-car-card__stat-val">${handling}</span></div>
    <div class="nl-car-card__stat-item">Nitro: <span class="nl-car-card__stat-val">${nitro}</span></div>
  `;
  card.appendChild(stats);

  if (state !== 'locked' && onSelect) {
    card.addEventListener('click', onSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect();
      }
    });
  }

  return card;
}

export { createCarCard as CarCard };
