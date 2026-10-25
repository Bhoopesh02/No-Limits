import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './ui/styles/hud.css';
import './ui/styles/touchControls.css';
import { App } from './app/App';
import { GameInfo } from './data/GameInfo';

// Set document title from single source of truth
document.title = GameInfo.displayName;

let activeApp: App | null = null;

function renderNormalApp(): void {
  document.documentElement.classList.remove('is-styleguide');

  if (activeApp) {
    activeApp.dispose();
    activeApp = null;
  }

  try {
    activeApp = new App();
    activeApp.start();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

function handleRoute(): void {
  if (window.location.hash === '#styleguide') {
    if (activeApp) {
      activeApp.dispose();
      activeApp = null;
    }
    const gameRoot = document.getElementById('game-root');
    if (gameRoot) {
      gameRoot.innerHTML = '';
    }
    import('./ui/styleguide/Styleguide').then(({ initStyleguide }) => {
      initStyleguide();
    });
  } else {
    renderNormalApp();
  }
}

window.addEventListener('hashchange', handleRoute);
handleRoute();
