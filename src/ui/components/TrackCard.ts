import { CardState } from './CarCard';

export interface TrackCardOptions {
  readonly title: string;
  readonly length: string;
  readonly turns: string;
  readonly difficulty: string;
  readonly bestTime: string;
  readonly stars: number;
  readonly maxStars?: number;
  readonly state?: CardState;
  readonly lockLabel?: string;
  readonly onSelect?: () => void;
}

const LOCK_ICON_SVG =
  '<svg viewBox="0 0 24 24" class="nl-card__lock-icon" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';

export function createTrackCard(options: TrackCardOptions): HTMLElement {
  const {
    title,
    length,
    turns,
    difficulty,
    bestTime,
    stars,
    maxStars = 3,
    state = 'default',
    lockLabel = 'Locked • 10 Stars Required',
    onSelect,
  } = options;

  const card = document.createElement('div');
  card.className = 'nl-card nl-track-card';
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

  // Meta row: difficulty & stars
  const meta = document.createElement('div');
  meta.className = 'nl-track-card__meta';

  const diffEl = document.createElement('span');
  diffEl.className = 'nl-track-card__difficulty';
  diffEl.textContent = difficulty;
  meta.appendChild(diffEl);

  const starsEl = document.createElement('span');
  starsEl.className = 'nl-track-card__stars';
  const starString = '★'.repeat(stars) + '☆'.repeat(Math.max(0, maxStars - stars));
  starsEl.textContent = `${starString} ${stars}/${maxStars}`;
  starsEl.setAttribute('aria-label', `${stars} of ${maxStars} stars earned`);
  meta.appendChild(starsEl);

  card.appendChild(meta);

  // Title & Details
  const titleEl = document.createElement('div');
  titleEl.className = 'nl-track-card__title';
  titleEl.textContent = title;
  card.appendChild(titleEl);

  const detailsEl = document.createElement('div');
  detailsEl.className = 'nl-track-card__details';
  detailsEl.textContent = `${length} • ${turns}`;
  card.appendChild(detailsEl);

  // Record / Best Time
  const recordEl = document.createElement('div');
  recordEl.className = 'nl-track-card__record';
  recordEl.innerHTML = `
    <span class="nl-track-card__record-label">Best Record:</span>
    <span class="nl-track-card__record-time">${bestTime}</span>
  `;
  card.appendChild(recordEl);

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

export { createTrackCard as TrackCard };
