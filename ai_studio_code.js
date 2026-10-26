/**
 * carModel.js
 *
 * Procedural, game-ready sports car model for Three.js.
 * - Local forward direction: -Z
 * - Origin: Ground level (y = 0), centered between front and rear axles (z = 0)
 * - Car dimensions: ~4.5m (L) x 1.95m (W) x 1.25m (H)
 * - Returns a THREE.Group with animated wheel hubs and steering pivots exposed.
 */

export function createCar(THREE) {
  const carGroup = new THREE.Group();
  carGroup.name = 'SportsCar';

  // -------------------------------------------------------------------------
  // 1. PROCEDURAL TEXTURES (Generated via Offscreen Canvas)
  // -------------------------------------------------------------------------
  function createCarbonFiberTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#262626';
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        if ((x / 4 + y / 4) % 2 === 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    return texture;
  }

  function createHexGrilleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 2;
    const r = 8;
    const h = r * Math.sqrt(3);
    for (let y = -h; y < 64 + h; y += h) {
      for (let x = -r * 3; x < 64 + r * 3; x += r * 3) {
        const cx = x + (Math.floor(y / h) % 2) * 1.5 * r;
        const cy = y;
        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = (a * 60 * Math.PI) / 180;
          const px = cx + r * Math.cos(angle);
          const py = cy + r * Math.sin(angle);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  function createBrakeDiscTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(0, 0, 128, 128);

    // Circular rotor track
    ctx.strokeStyle = '#757575';
    for (let r = 25; r < 58; r += 2.5) {
      ctx.beginPath();
      ctx.arc(64, 64, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Drilled ventilation holes
    ctx.fillStyle = '#212121';
    for (let i = 0; i < 32; i++) {
      const angle = (i * Math.PI * 2) / 32;
      const r1 = 35 + (i % 3) * 8;
      const px = 64 + Math.cos(angle) * r1;
      const py = 64 + Math.sin(angle) * r1;
      ctx.beginPath();
      ctx.arc(px, py, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  const carbonFiberTex = createCarbonFiberTexture();
  const hexGrilleTex = createHexGrilleTexture();
  const brakeDiscTex = createBrakeDiscTexture();

  // -------------------------------------------------------------------------
  // 2. MATERIALS
  // -------------------------------------------------------------------------
  const matBody = new THREE.MeshPhysicalMaterial({
    color: 0x0a52b8, // Metallic Sapphire Blue
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
  });

  const matAeroCarbon = new THREE.MeshStandardMaterial({
    color: 0x1f1f1f,
    roughness: 0.45,
    metalness: 0.65,
    map: carbonFiberTex,
  });

  const matUnderbody = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
  });

  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x050a12,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.6,
    transmission: 0.7,
    ior: 1.52,
    reflectivity: 0.95,
  });

  const matTireRubber = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.88,
    metalness: 0.08,
  });

  const matAlloyRim = new THREE.MeshStandardMaterial({
    color: 0xe6e6e6,
    metalness: 0.92,
    roughness: 0.2,
  });

  const matBrakeDisc = new THREE.MeshStandardMaterial({
    color: 0xb0b0b0,
    metalness: 0.85,
    roughness: 0.35,
    map: brakeDiscTex,
  });

  const matBrakeCaliper = new THREE.MeshStandardMaterial({
    color: 0xdf1616,
    metalness: 0.4,
    roughness: 0.3,
  });

  const matChrome = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.98,
    roughness: 0.1,
  });

  const matHeadlightGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
    transmission: 0.8,
  });

  const matHeadlightLED = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xd6f1ff,
    emissiveIntensity: 3.5,
    roughness: 0.2,
  });

  const matTaillightRed = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    emissive: 0xff0818,
    emissiveIntensity: 3.0,
    roughness: 0.3,
  });

  const matGrille = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.75,
    metalness: 0.3,
    map: hexGrilleTex,
  });

  const matInteriorLeather = new THREE.MeshStandardMaterial({
    color: 0x1e1d1b,
    roughness: 0.7,
    metalness: 0.15,
  });

  const matInteriorAccent = new THREE.MeshStandardMaterial({
    color: 0xad2313,
    roughness: 0.45,
    metalness: 0.3,
  });

  const matScreen = new THREE.MeshStandardMaterial({
    color: 0x021324,
    emissive: 0x00aaff,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });

  const matMirrorGlass = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.02,
  });

  // -------------------------------------------------------------------------
  // 3. AERODYNAMIC CAR BODY (Parametric Quad-Mesh BufferGeometry)
  // -------------------------------------------------------------------------
  function buildBodyShellGeometry() {
    // Defines 14 cross-sections along the car's longitudinal axis (Z) from front to rear
    // Local forward is -Z. Axles are at Z = -1.35 (Front) and Z = +1.35 (Rear).
    const stations = [
      { z: -2.25, w: 0.65, yTop: 0.38, yMid: 0.3, yBot: 0.14 }, // Splitter nose
      { z: -2.05, w: 0.82, yTop: 0.54, yMid: 0.39, yBot: 0.14 }, // Front nose / grille
      { z: -1.75, w: 0.89, yTop: 0.65, yMid: 0.46, yBot: 0.15 }, // Hood front
      { z: -1.35, w: 0.92, yTop: 0.73, yMid: 0.58, yBot: 0.36 }, // Front wheel center
      { z: -0.85, w: 0.9, yTop: 0.8, yMid: 0.52, yBot: 0.16 }, // Hood rear / cowl base
      { z: -0.35, w: 0.82, yTop: 1.2, yMid: 0.65, yBot: 0.16 }, // Windshield top / A-pillar
      { z: 0.15, w: 0.79, yTop: 1.23, yMid: 0.67, yBot: 0.16 }, // Roof center
      { z: 0.65, w: 0.81, yTop: 1.18, yMid: 0.66, yBot: 0.16 }, // Rear window / B-pillar
      { z: 1.05, w: 0.86, yTop: 1.01, yMid: 0.65, yBot: 0.17 }, // Fastback decklid
      { z: 1.35, w: 0.95, yTop: 0.93, yMid: 0.68, yBot: 0.36 }, // Rear wheel center
      { z: 1.75, w: 0.93, yTop: 0.87, yMid: 0.63, yBot: 0.22 }, // Rear deck
      { z: 2.05, w: 0.88, yTop: 0.81, yMid: 0.57, yBot: 0.28 }, // Taillight fascia
      { z: 2.22, w: 0.76, yTop: 0.75, yMid: 0.5, yBot: 0.33 }, // Rear diffuser edge
      { z: 2.28, w: 0.55, yTop: 0.68, yMid: 0.45, yBot: 0.35 }, // Rear trailing edge
    ];

    const xRatios = [0.0, 0.25, 0.55, 0.82, 1.0]; // 5 lateral vertices per side
    const numCols = xRatios.length * 2 - 1; // 9 lateral columns across whole width
    const numRows = stations.length;

    const vertices = [];
    const indices = [];

    for (let r = 0; r < numRows; r++) {
      const s = stations[r];
      const rowVerts = [];

      // Left side (negative X in standard symmetric space)
      for (let c = xRatios.length - 1; c > 0; c--) {
        const t = xRatios[c];
        const x = -s.w * t;
        const y = s.yTop * (1 - 0.22 * (t * t)) + (s.yMid - s.yTop) * (t * 0.4);
        rowVerts.push(x, y, s.z);
      }
      // Center line (X = 0)
      rowVerts.push(0, s.yTop, s.z);
      // Right side (positive X)
      for (let c = 1; c < xRatios.length; c++) {
        const t = xRatios[c];
        const x = s.w * t;
        const y = s.yTop * (1 - 0.22 * (t * t)) + (s.yMid - s.yTop) * (t * 0.4);
        rowVerts.push(x, y, s.z);
      }
      vertices.push(...rowVerts);
    }

    // Connect grid of quads into two triangles each
    for (let r = 0; r < numRows - 1; r++) {
      for (let c = 0; c < numCols - 1; c++) {
        const i0 = r * numCols + c;
        const i1 = r * numCols + (c + 1);
        const i2 = (r + 1) * numCols + c;
        const i3 = (r + 1) * numCols + (c + 1);

        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  const bodyShellMesh = new THREE.Mesh(buildBodyShellGeometry(), matBody);
  bodyShellMesh.castShadow = true;
  bodyShellMesh.receiveShadow = true;
  carGroup.add(bodyShellMesh);

  // Flat Underbody Floorpan
  const underbodyGeom = new THREE.BoxGeometry(1.76, 0.05, 4.3);
  const underbodyMesh = new THREE.Mesh(underbodyGeom, matUnderbody);
  underbodyMesh.position.set(0, 0.12, 0);
  carGroup.add(underbodyMesh);

  // -------------------------------------------------------------------------
  // 4. CABIN GREENHOUSE (Windshield, Roof, Windows)
  // -------------------------------------------------------------------------
  const cabinGroup = new THREE.Group();
  cabinGroup.name = 'CabinGlass';

  // Front Windshield
  const windshieldShape = new THREE.Shape();
  windshieldShape.moveTo(-0.72, -0.42);
  windshieldShape.lineTo(0.72, -0.42);
  windshieldShape.lineTo(0.58, 0.42);
  windshieldShape.lineTo(-0.58, 0.42);
  windshieldShape.closePath();
  const windshieldGeom = new THREE.ShapeGeometry(windshieldShape);
  const windshield = new THREE.Mesh(windshieldGeom, matGlass);
  windshield.position.set(0, 0.99, -0.58);
  windshield.rotation.x = -Math.PI * 0.33;
  cabinGroup.add(windshield);

  // Rear Windshield
  const rearWindowShape = new THREE.Shape();
  rearWindowShape.moveTo(-0.62, -0.48);
  rearWindowShape.lineTo(0.62, -0.48);
  rearWindowShape.lineTo(0.54, 0.48);
  rearWindowShape.lineTo(-0.54, 0.48);
  rearWindowShape.closePath();
  const rearWindowGeom = new THREE.ShapeGeometry(rearWindowShape);
  const rearWindow = new THREE.Mesh(rearWindowGeom, matGlass);
  rearWindow.position.set(0, 1.05, 0.85);
  rearWindow.rotation.x = Math.PI * 0.38;
  cabinGroup.add(rearWindow);

  // Side Windows (Left & Right)
  const sideWindowShape = new THREE.Shape();
  sideWindowShape.moveTo(-0.48, -0.16);
  sideWindowShape.lineTo(0.52, -0.16);
  sideWindowShape.lineTo(0.4, 0.18);
  sideWindowShape.lineTo(-0.35, 0.18);
  sideWindowShape.closePath();

  const sideWindowGeom = new THREE.ShapeGeometry(sideWindowShape);

  const leftWindow = new THREE.Mesh(sideWindowGeom, matGlass);
  leftWindow.position.set(-0.76, 0.98, 0.15);
  leftWindow.rotation.y = -Math.PI * 0.5;
  leftWindow.rotation.x = -0.15;
  cabinGroup.add(leftWindow);

  const rightWindow = new THREE.Mesh(sideWindowGeom, matGlass);
  rightWindow.position.set(0.76, 0.98, 0.15);
  rightWindow.rotation.y = Math.PI * 0.5;
  rightWindow.rotation.x = 0.15;
  cabinGroup.add(rightWindow);

  // Glass Panorama Roof Panel
  const roofGlassGeom = new THREE.BoxGeometry(0.85, 0.02, 0.7);
  const roofGlass = new THREE.Mesh(roofGlassGeom, matGlass);
  roofGlass.position.set(0, 1.23, 0.15);
  cabinGroup.add(roofGlass);

  carGroup.add(cabinGroup);

  // -------------------------------------------------------------------------
  // 5. FRONT FASCIA (Grille, Splitter, Headlights, Canards)
  // -------------------------------------------------------------------------
  const frontFascia = new THREE.Group();
  frontFascia.name = 'FrontFascia';

  // Front Lower Carbon Splitter
  const splitterGeom = new THREE.BoxGeometry(1.78, 0.04, 0.4);
  const splitter = new THREE.Mesh(splitterGeom, matAeroCarbon);
  splitter.position.set(0, 0.13, -2.18);
  splitter.castShadow = true;
  frontFascia.add(splitter);

  // Front Intake Grille (Hexagonal mesh)
  const mainGrilleGeom = new THREE.BoxGeometry(1.05, 0.24, 0.1);
  const mainGrille = new THREE.Mesh(mainGrilleGeom, matGrille);
  mainGrille.position.set(0, 0.32, -2.12);
  frontFascia.add(mainGrille);

  // Side Brake Cooling Inlets
  [-0.68, 0.68].forEach((xSide) => {
    const inletGeom = new THREE.BoxGeometry(0.35, 0.18, 0.1);
    const sideInlet = new THREE.Mesh(inletGeom, matGrille);
    sideInlet.position.set(xSide, 0.3, -2.08);
    sideInlet.rotation.y = (xSide > 0 ? 1 : -1) * 0.2;
    frontFascia.add(sideInlet);

    // Front Aero Canard Flicks
    const canardGeom = new THREE.BoxGeometry(0.22, 0.02, 0.16);
    const canard = new THREE.Mesh(canardGeom, matAeroCarbon);
    canard.position.set(xSide * 1.15, 0.32, -2.04);
    canard.rotation.z = (xSide > 0 ? -1 : 1) * 0.25;
    canard.rotation.y = (xSide > 0 ? 1 : -1) * 0.3;
    frontFascia.add(canard);
  });

  // Headlight Assemblies
  [-0.64, 0.64].forEach((xSide) => {
    const headlightBox = new THREE.Group();
    headlightBox.position.set(xSide, 0.56, -1.98);

    // Housing Backplate
    const housingGeom = new THREE.BoxGeometry(0.32, 0.12, 0.2);
    const housing = new THREE.Mesh(housingGeom, matUnderbody);
    housing.rotation.y = (xSide > 0 ? 1 : -1) * 0.32;
    headlightBox.add(housing);

    // Dual Projector LED Lenses
    for (let l = -1; l <= 1; l += 2) {
      const projectorGeom = new THREE.CylinderGeometry(0.032, 0.032, 0.06, 16);
      const projector = new THREE.Mesh(projectorGeom, matHeadlightLED);
      projector.rotation.x = Math.PI * 0.5;
      projector.position.set(l * 0.07, 0, -0.07);
      headlightBox.add(projector);
    }

    // LED Daytime Running Light (DRL Strip)
    const drlGeom = new THREE.BoxGeometry(0.28, 0.015, 0.04);
    const drl = new THREE.Mesh(drlGeom, matHeadlightLED);
    drl.position.set(0, -0.04, -0.09);
    headlightBox.add(drl);

    // Outer Protective Glass Cover
    const coverGeom = new THREE.BoxGeometry(0.33, 0.13, 0.05);
    const cover = new THREE.Mesh(coverGeom, matHeadlightGlass);
    cover.position.set(0, 0, -0.1);
    headlightBox.add(cover);

    frontFascia.add(headlightBox);
  });

  carGroup.add(frontFascia);

  // -------------------------------------------------------------------------
  // 6. REAR AERO, TAILLIGHTS, DIFFUSER & EXHAUSTS
  // -------------------------------------------------------------------------
  const rearFascia = new THREE.Group();
  rearFascia.name = 'RearFascia';

  // Full-width Horizontal LED Lightbar
  const lightbarGeom = new THREE.BoxGeometry(1.62, 0.05, 0.08);
  const lightbar = new THREE.Mesh(lightbarGeom, matTaillightRed);
  lightbar.position.set(0, 0.77, 2.12);
  rearFascia.add(lightbar);

  // Corner Taillight Clusters
  [-0.72, 0.72].forEach((xSide) => {
    const tailClusterGeom = new THREE.BoxGeometry(0.28, 0.12, 0.1);
    const tailCluster = new THREE.Mesh(tailClusterGeom, matTaillightRed);
    tailCluster.position.set(xSide, 0.75, 2.1);
    tailCluster.rotation.y = (xSide > 0 ? 1 : -1) * -0.25;
    rearFascia.add(tailCluster);
  });

  // Aggressive Rear Diffuser
  const diffuserMainGeom = new THREE.BoxGeometry(1.58, 0.22, 0.45);
  const diffuserMain = new THREE.Mesh(diffuserMainGeom, matAeroCarbon);
  diffuserMain.position.set(0, 0.23, 2.14);
  diffuserMain.rotation.x = 0.22;
  rearFascia.add(diffuserMain);

  // Vertical Diffuser Fins
  for (let f = -3; f <= 3; f++) {
    if (f === 0) continue;
    const finGeom = new THREE.BoxGeometry(0.02, 0.18, 0.45);
    const fin = new THREE.Mesh(finGeom, matAeroCarbon);
    fin.position.set(f * 0.21, 0.21, 2.14);
    fin.rotation.x = 0.22;
    rearFascia.add(fin);
  }

  // Quad Chrome Exhaust Tips
  [-0.52, -0.4, 0.4, 0.52].forEach((xPos) => {
    const exhaustGeom = new THREE.CylinderGeometry(0.048, 0.048, 0.22, 16);
    const exhaust = new THREE.Mesh(exhaustGeom, matChrome);
    exhaust.rotation.x = Math.PI * 0.5;
    exhaust.position.set(xPos, 0.29, 2.24);
    rearFascia.add(exhaust);

    // Inner dark exhaust bore
    const boreGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
    const bore = new THREE.Mesh(boreGeom, matUnderbody);
    bore.rotation.x = Math.PI * 0.5;
    bore.position.set(xPos, 0.29, 2.34);
    rearFascia.add(bore);
  });

  // Raised Rear GT Wing / Spoiler
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, 0.98, 1.95);

  const wingBladeGeom = new THREE.BoxGeometry(1.72, 0.03, 0.28);
  const wingBlade = new THREE.Mesh(wingBladeGeom, matAeroCarbon);
  wingBlade.rotation.x = -0.1;
  spoilerGroup.add(wingBlade);

  // Wing Endplates
  [-0.86, 0.86].forEach((xSide) => {
    const endplateGeom = new THREE.BoxGeometry(0.02, 0.12, 0.32);
    const endplate = new THREE.Mesh(endplateGeom, matAeroCarbon);
    endplate.position.set(xSide, 0.02, 0);
    spoilerGroup.add(endplate);
  });

  // Vertical Mounting Struts
  [-0.42, 0.42].forEach((xSide) => {
    const strutGeom = new THREE.BoxGeometry(0.035, 0.22, 0.08);
    const strut = new THREE.Mesh(strutGeom, matChrome);
    strut.position.set(xSide, -0.1, 0.02);
    strut.rotation.x = 0.25;
    spoilerGroup.add(strut);
  });

  rearFascia.add(spoilerGroup);
  carGroup.add(rearFascia);

  // -------------------------------------------------------------------------
  // 7. SIDE MIRRORS, SKIRTS & DOOR HANDLES
  // -------------------------------------------------------------------------
  [-1, 1].forEach((side) => {
    // Aerodynamic Side Mirror
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(side * 0.86, 0.86, -0.42);

    const mirrorArmGeom = new THREE.BoxGeometry(0.12, 0.025, 0.04);
    const mirrorArm = new THREE.Mesh(mirrorArmGeom, matAeroCarbon);
    mirrorArm.position.set(side * 0.06, 0, 0);
    mirrorArm.rotation.z = side * 0.2;
    mirrorGroup.add(mirrorArm);

    const mirrorCapGeom = new THREE.BoxGeometry(0.18, 0.11, 0.12);
    const mirrorCap = new THREE.Mesh(mirrorCapGeom, matBody);
    mirrorCap.position.set(side * 0.16, 0.02, 0);
    mirrorGroup.add(mirrorCap);

    const reflectiveFaceGeom = new THREE.BoxGeometry(0.01, 0.09, 0.1);
    const reflectiveFace = new THREE.Mesh(reflectiveFaceGeom, matMirrorGlass);
    reflectiveFace.position.set(side * 0.12, 0.02, 0.04);
    mirrorGroup.add(reflectiveFace);

    carGroup.add(mirrorGroup);

    // Aerodynamic Side Skirts
    const skirtGeom = new THREE.BoxGeometry(0.12, 0.06, 2.3);
    const skirt = new THREE.Mesh(skirtGeom, matAeroCarbon);
    skirt.position.set(side * 0.89, 0.14, 0);
    carGroup.add(skirt);

    // Flush Sports Door Handle
    const handleGeom = new THREE.BoxGeometry(0.02, 0.03, 0.16);
    const handle = new THREE.Mesh(handleGeom, matChrome);
    handle.position.set(side * 0.91, 0.68, 0.05);
    carGroup.add(handle);

    // Side Engine Intake Ducts
    const ductGeom = new THREE.BoxGeometry(0.1, 0.22, 0.35);
    const duct = new THREE.Mesh(ductGeom, matGrille);
    duct.position.set(side * 0.88, 0.52, 0.88);
    duct.rotation.y = side * 0.15;
    carGroup.add(duct);
  });

  // -------------------------------------------------------------------------
  // 8. VISIBLE INTERIOR COCKPIT
  // -------------------------------------------------------------------------
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'Interior';

  // Cockpit Tub
  const tubGeom = new THREE.BoxGeometry(1.4, 0.45, 1.3);
  const tub = new THREE.Mesh(tubGeom, matInteriorLeather);
  tub.position.set(0, 0.45, 0.15);
  interiorGroup.add(tub);

  // Ergonomic Sport Bucket Seats (Driver & Passenger)
  [-0.34, 0.34].forEach((xSide) => {
    const seatGroup = new THREE.Group();
    seatGroup.position.set(xSide, 0.38, 0.22);

    // Seat Bottom Cushion
    const seatBaseGeom = new THREE.BoxGeometry(0.42, 0.14, 0.44);
    const seatBase = new THREE.Mesh(seatBaseGeom, matInteriorLeather);
    seatGroup.add(seatBase);

    // Seat Backrest with Bolsters
    const backrestGeom = new THREE.BoxGeometry(0.42, 0.54, 0.12);
    const backrest = new THREE.Mesh(backrestGeom, matInteriorLeather);
    backrest.position.set(0, 0.28, 0.2);
    backrest.rotation.x = -0.22;
    seatGroup.add(backrest);

    // Racing Stripe / Accent Inlay
    const stripeGeom = new THREE.BoxGeometry(0.09, 0.52, 0.02);
    const stripe = new THREE.Mesh(stripeGeom, matInteriorAccent);
    stripe.position.set(0, 0.28, 0.14);
    stripe.rotation.x = -0.22;
    seatGroup.add(stripe);

    // Integrated Headrest
    const headrestGeom = new THREE.BoxGeometry(0.24, 0.16, 0.1);
    const headrest = new THREE.Mesh(headrestGeom, matInteriorLeather);
    headrest.position.set(0, 0.6, 0.26);
    headrest.rotation.x = -0.15;
    seatGroup.add(headrest);

    interiorGroup.add(seatGroup);
  });

  // Sculpted Dashboard & Cowl
  const dashGeom = new THREE.BoxGeometry(1.36, 0.22, 0.38);
  const dash = new THREE.Mesh(dashGeom, matInteriorLeather);
  dash.position.set(0, 0.72, -0.32);
  interiorGroup.add(dash);

  // Digital Instrument Driver Display
  const clusterGeom = new THREE.BoxGeometry(0.28, 0.1, 0.02);
  const clusterScreen = new THREE.Mesh(clusterGeom, matScreen);
  clusterScreen.position.set(-0.34, 0.76, -0.24);
  clusterScreen.rotation.x = -0.3;
  interiorGroup.add(clusterScreen);

  // Central Infotainment Screen
  const centerScreenGeom = new THREE.BoxGeometry(0.24, 0.14, 0.02);
  const centerScreen = new THREE.Mesh(centerScreenGeom, matScreen);
  centerScreen.position.set(0, 0.72, -0.24);
  centerScreen.rotation.x = -0.3;
  centerScreen.rotation.y = -0.15;
  interiorGroup.add(centerScreen);

  // Sport Flat-Bottom Steering Wheel
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(-0.34, 0.72, -0.18);
  steeringWheelGroup.rotation.x = -0.38;

  const rimGeom = new THREE.TorusGeometry(0.14, 0.016, 12, 24);
  const rim = new THREE.Mesh(rimGeom, matInteriorLeather);
  steeringWheelGroup.add(rim);

  const spokeGeom = new THREE.BoxGeometry(0.22, 0.025, 0.02);
  const spoke = new THREE.Mesh(spokeGeom, matChrome);
  steeringWheelGroup.add(spoke);

  const hubGeom = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 16);
  const hub = new THREE.Mesh(hubGeom, matInteriorLeather);
  hub.rotation.x = Math.PI * 0.5;
  steeringWheelGroup.add(hub);

  interiorGroup.add(steeringWheelGroup);

  // Center Console & Shifter
  const consoleGeom = new THREE.BoxGeometry(0.24, 0.2, 0.65);
  const centerConsole = new THREE.Mesh(consoleGeom, matInteriorLeather);
  centerConsole.position.set(0, 0.48, 0.08);
  interiorGroup.add(centerConsole);

  const shifterGeom = new THREE.CylinderGeometry(0.015, 0.02, 0.08, 12);
  const shifter = new THREE.Mesh(shifterGeom, matChrome);
  shifter.position.set(0, 0.62, 0.02);
  interiorGroup.add(shifter);

  carGroup.add(interiorGroup);

  // -------------------------------------------------------------------------
  // 9. WHEELS & BRAKE ASSEMBLIES (Separate for Rolling & Steering)
  // -------------------------------------------------------------------------
  function createWheelAssembly(isFront, side) {
    // Root group placed at the axle mounting location
    const wheelRoot = new THREE.Group();
    wheelRoot.name = (isFront ? 'Front' : 'Rear') + (side < 0 ? 'Left' : 'Right') + 'Wheel';

    // Steering group (only turns around Y axis for front wheels)
    const steerGroup = new THREE.Group();
    steerGroup.name = 'SteerPivot';
    wheelRoot.add(steerGroup);

    // Roll group (rotates continuously around X axis for forward/backward driving)
    const rollGroup = new THREE.Group();
    rollGroup.name = 'RollHub';
    steerGroup.add(rollGroup);

    // High Performance Rubber Tire
    const tireGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 28, 2);
    tireGeom.rotateZ(Math.PI * 0.5); // Cylinder aligned laterally along X
    const tire = new THREE.Mesh(tireGeom, matTireRubber);
    tire.castShadow = true;
    tire.receiveShadow = true;
    rollGroup.add(tire);

    // Alloy Rim Outer Ring
    const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.265, 24, 1, true);
    rimGeom.rotateZ(Math.PI * 0.5);
    const rim = new THREE.Mesh(rimGeom, matAlloyRim);
    rollGroup.add(rim);

    // Deep Concave Rim Face (Outer side)
    const rimFaceGeom = new THREE.TorusGeometry(0.22, 0.02, 12, 28);
    rimFaceGeom.rotateY(Math.PI * 0.5);
    const rimFace = new THREE.Mesh(rimFaceGeom, matAlloyRim);
    rimFace.position.set(side * 0.12, 0, 0);
    rollGroup.add(rimFace);

    // Multi-spoke Wheel Design (5 Twin-Spokes = 10 spokes)
    const numSpokes = 10;
    for (let s = 0; s < numSpokes; s++) {
      const angle = (s * Math.PI * 2) / numSpokes;
      const spokeMeshGeom = new THREE.BoxGeometry(0.022, 0.2, 0.028);
      const spokeMesh = new THREE.Mesh(spokeMeshGeom, matAlloyRim);
      spokeMesh.position.set(side * 0.11, Math.sin(angle) * 0.11, Math.cos(angle) * 0.11);
      spokeMesh.rotation.x = -angle;
      rollGroup.add(spokeMesh);
    }

    // Center Wheel Cap & Lug Nuts
    const capGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16);
    capGeom.rotateZ(Math.PI * 0.5);
    const cap = new THREE.Mesh(capGeom, matAlloyRim);
    cap.position.set(side * 0.125, 0, 0);
    rollGroup.add(cap);

    // Perforated Ventilated Brake Disc (Mounted inside wheel rim)
    const discGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24);
    discGeom.rotateZ(Math.PI * 0.5);
    const disc = new THREE.Mesh(discGeom, matBrakeDisc);
    disc.position.set(side * 0.04, 0, 0);
    rollGroup.add(disc);

    // High Performance Brake Caliper (Stationary relative to rolling wheel)
    const caliperGeom = new THREE.BoxGeometry(0.065, 0.13, 0.08);
    const caliper = new THREE.Mesh(caliperGeom, matBrakeCaliper);
    // Position caliper at top-front quadrant of disc
    caliper.position.set(side * 0.04, 0.14, -0.06);
    caliper.rotation.z = side * 0.1;
    steerGroup.add(caliper);

    return {
      root: wheelRoot,
      steer: steerGroup,
      roll: rollGroup,
    };
  }

  // Wheel placement coordinates (Ground clearance = 0.35m radius -> wheel center at y = 0.35)
  // Axles centered at Z = -1.35 (Front) and Z = +1.35 (Rear)
  const trackWidthX = 0.84;
  const wheelPosY = 0.35;
  const frontAxleZ = -1.35;
  const rearAxleZ = 1.35;

  const wheelFL = createWheelAssembly(true, -1);
  wheelFL.root.position.set(-trackWidthX, wheelPosY, frontAxleZ);
  carGroup.add(wheelFL.root);

  const wheelFR = createWheelAssembly(true, 1);
  wheelFR.root.position.set(trackWidthX, wheelPosY, frontAxleZ);
  carGroup.add(wheelFR.root);

  const wheelRL = createWheelAssembly(false, -1);
  wheelRL.root.position.set(-trackWidthX, wheelPosY, rearAxleZ);
  carGroup.add(wheelRL.root);

  const wheelRR = createWheelAssembly(false, 1);
  wheelRR.root.position.set(trackWidthX, wheelPosY, rearAxleZ);
  carGroup.add(wheelRR.root);

  // -------------------------------------------------------------------------
  // 10. EXPOSE ANIMATION REFERENCES & RETURN
  // -------------------------------------------------------------------------
  const wheelsMap = {
    frontLeft: wheelFL,
    frontRight: wheelFR,
    rearLeft: wheelRL,
    rearRight: wheelRR,
  };

  carGroup.userData.wheels = wheelsMap;
  carGroup.wheels = wheelsMap;

  return carGroup;
}
