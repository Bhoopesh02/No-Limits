import * as THREE from 'three';
import type { CarDetailLevel } from '../../data/CarRenderBudget';

export interface CarTextures {
  readonly carbonFiber: THREE.Texture | null;
  readonly hexGrille: THREE.Texture | null;
  readonly brakeDisc: THREE.Texture | null;
  dispose: () => void;
}

/**
 * Creates procedural canvas textures for the car.
 * Only created for High detail level in browser environments.
 * Low and Medium use no texture maps.
 * Headless/Node environments return null textures so factory runs cleanly without document.
 */
export function createCarTextures(detail: CarDetailLevel): CarTextures {
  const texturesToDispose: THREE.Texture[] = [];

  // Low and Medium use no texture maps at all (budget: zero textures)
  // High in Node/headless skips procedural textures and uses flat colors
  if (detail !== 'high' || typeof document === 'undefined') {
    return {
      carbonFiber: null,
      hexGrille: null,
      brakeDisc: null,
      dispose: () => {},
    };
  }

  // 1. Carbon fiber texture (64x64 checkerboard weave)
  let carbonFiber: THREE.Texture | null = null;
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 64;
  carbonCanvas.height = 64;
  const carbonCtx = carbonCanvas.getContext('2d');
  if (carbonCtx) {
    carbonCtx.fillStyle = '#181818';
    carbonCtx.fillRect(0, 0, 64, 64);
    carbonCtx.fillStyle = '#262626';
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        if ((x / 4 + y / 4) % 2 === 0) {
          carbonCtx.fillRect(x, y, 4, 4);
        }
      }
    }
    const tex = new THREE.CanvasTexture(carbonCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    texturesToDispose.push(tex);
    carbonFiber = tex;
  }

  // 2. Hex grille texture (64x64 wireframe hex pattern)
  let hexGrille: THREE.Texture | null = null;
  const grilleCanvas = document.createElement('canvas');
  grilleCanvas.width = 64;
  grilleCanvas.height = 64;
  const grilleCtx = grilleCanvas.getContext('2d');
  if (grilleCtx) {
    grilleCtx.fillStyle = '#111111';
    grilleCtx.fillRect(0, 0, 64, 64);
    grilleCtx.strokeStyle = '#282828';
    grilleCtx.lineWidth = 2;
    const r = 8;
    const h = r * Math.sqrt(3);
    for (let y = -h; y < 64 + h; y += h) {
      for (let x = -r * 3; x < 64 + r * 3; x += r * 3) {
        const cx = x + (Math.floor(y / h) % 2) * 1.5 * r;
        const cy = y;
        grilleCtx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * 60 * Math.PI) / 180;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (a === 0) grilleCtx.moveTo(px, py);
          else grilleCtx.lineTo(px, py);
        }
        grilleCtx.closePath();
        grilleCtx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(grilleCanvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    texturesToDispose.push(tex);
    hexGrille = tex;
  }

  // 3. Brake disc texture (128x128 circular rotor track + drilled ventilation holes)
  let brakeDisc: THREE.Texture | null = null;
  const discCanvas = document.createElement('canvas');
  discCanvas.width = 128;
  discCanvas.height = 128;
  const discCtx = discCanvas.getContext('2d');
  if (discCtx) {
    discCtx.fillStyle = '#9e9e9e';
    discCtx.fillRect(0, 0, 128, 128);

    discCtx.strokeStyle = '#757575';
    for (let r = 25; r < 58; r += 2.5) {
      discCtx.beginPath();
      discCtx.arc(64, 64, r, 0, Math.PI * 2);
      discCtx.stroke();
    }

    discCtx.fillStyle = '#212121';
    for (let i = 0; i < 32; i++) {
      const angle = (i * Math.PI * 2) / 32;
      const r1 = 35 + (i % 3) * 8;
      const px = 64 + Math.cos(angle) * r1;
      const py = 64 + Math.sin(angle) * r1;
      discCtx.beginPath();
      discCtx.arc(px, py, 1.2, 0, Math.PI * 2);
      discCtx.fill();
    }

    const tex = new THREE.CanvasTexture(discCanvas);
    texturesToDispose.push(tex);
    brakeDisc = tex;
  }

  return {
    carbonFiber,
    hexGrille,
    brakeDisc,
    dispose: () => {
      for (const t of texturesToDispose) {
        t.dispose();
      }
      texturesToDispose.length = 0;
    },
  };
}

