import './ui/styles/tokens.css';
import './ui/styles/base.css';
import { GameInfo } from './data/GameInfo';

// Set document title from single source of truth
document.title = GameInfo.displayName;

// TODO: Remove this temporary visual proof in Week 1
const uiRoot = document.getElementById('ui-root');
if (uiRoot) {
  const proofElement = document.createElement('div');
  proofElement.style.cssText =
    'font-size: var(--fs-14); color: var(--text-secondary); background: var(--surface-1); padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-s); display: inline-block; font-variant-numeric: tabular-nums;';

  const updateProof = (): void => {
    proofElement.textContent = `${GameInfo.displayName} — ${window.innerWidth}×${window.innerHeight}`;
  };

  updateProof();
  window.addEventListener('resize', updateProof);
  uiRoot.appendChild(proofElement);
}
