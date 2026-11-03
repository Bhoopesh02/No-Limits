#!/usr/bin/env node
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  checkAssetBudget,
  getCarTierFromFilename,
  getCarTriangleBudget,
  MAX_SINGLE_FILE_BYTES,
  MAX_TEXTURE_DIMENSION,
  parseGlbTriangles,
  parseKtx2Dimensions,
  validateAssetName,
  validateDataFileLocation,
  validateTrackData,
} from './lib/assetRules.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const assetsDir = path.join(publicDir, 'assets');
const fontsDir = path.join(publicDir, 'fonts');
const licenseDocPath = path.join(rootDir, 'Docs', 'ASSET_LICENSES.md');

const passes = [];
const warnings = [];
const failures = [];

function pass(msg) {
  passes.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function fail(msg) {
  failures.push(msg);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// 1. Check folder structure for cars and tracks: model, textures, audio, data
const REQUIRED_SUBFOLDERS = ['model', 'textures', 'audio', 'data'];

function checkSubfolders(categoryDir, categoryName) {
  if (!fs.existsSync(categoryDir)) return;
  const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const itemDir = path.join(categoryDir, entry.name);
      for (const sub of REQUIRED_SUBFOLDERS) {
        const subPath = path.join(itemDir, sub);
        if (!fs.existsSync(subPath) || !fs.statSync(subPath).isDirectory()) {
          fail(`Missing required subfolder: ${categoryName}/${entry.name}/${sub}`);
        } else {
          pass(`Found subfolder: ${categoryName}/${entry.name}/${sub}`);
        }
      }
    }
  }
}

checkSubfolders(path.join(assetsDir, 'cars'), 'cars');
checkSubfolders(path.join(assetsDir, 'tracks'), 'tracks');

// 2. Walk public/assets recursively and inspect files
function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const allAssetFiles = walk(assetsDir);
const trackSizes = new Map();
const carSizes = new Map();

for (const filePath of allAssetFiles) {
  const relativePath = path.relative(publicDir, filePath).replace(/\\/g, '/');
  const fileName = path.basename(filePath);
  const stat = fs.statSync(filePath);

  // Skip .gitkeep from naming checks and license tracking
  if (fileName === '.gitkeep') {
    continue;
  }

  // Name check
  const nameResult = validateAssetName(fileName);
  if (!nameResult.valid) {
    fail(`Invalid asset name "${relativePath}": ${nameResult.error}`);
  } else {
    pass(`Valid asset name: ${relativePath}`);
  }

  // Size limit per file
  if (stat.size > MAX_SINGLE_FILE_BYTES) {
    warn(`File ${relativePath} exceeds 5 MB warning threshold (${formatBytes(stat.size)})`);
  }

  // Accumulate car / track folder sizes
  const carMatch = relativePath.match(/^assets\/cars\/([^/]+)\//);
  if (carMatch) {
    const carId = carMatch[1];
    carSizes.set(carId, (carSizes.get(carId) || 0) + stat.size);
  }

  const trackMatch = relativePath.match(/^assets\/tracks\/([^/]+)\//);
  if (trackMatch) {
    const trackId = trackMatch[1];
    trackSizes.set(trackId, (trackSizes.get(trackId) || 0) + stat.size);
  }

  // GLB checks
  if (fileName.endsWith('.glb')) {
    try {
      const buffer = fs.readFileSync(filePath);
      const { triangles } = parseGlbTriangles(buffer);
      if (carMatch) {
        const tier = getCarTierFromFilename(fileName);
        const budget = getCarTriangleBudget(tier);
        if (!budget) {
          warn(
            `Car model ${fileName} does not specify recognized tier in filename (-low, -med, -high). Triangles: ${triangles}`,
          );
        } else if (triangles > budget) {
          fail(
            `Car model ${fileName} (${tier} tier) exceeds triangle budget: ${triangles} > ${budget}`,
          );
        } else {
          pass(
            `Car model ${fileName} (${tier} tier) within triangle budget: ${triangles} <= ${budget}`,
          );
        }
      } else {
        pass(`Track/scenery GLB ${fileName}: ${triangles} triangles`);
      }
    } catch (err) {
      fail(`Failed to parse GLB ${relativePath}: ${err.message}`);
    }
  }

  // Texture checks
  if (/\.(ktx2|webp|png|jpg|jpeg|tga|bmp)$/i.test(fileName)) {
    if (!fileName.endsWith('.ktx2') && !fileName.endsWith('.webp')) {
      fail(`Texture ${relativePath} must use .ktx2 or .webp extension.`);
    } else if (fileName.endsWith('.ktx2')) {
      try {
        const buffer = fs.readFileSync(filePath);
        const { width, height } = parseKtx2Dimensions(buffer);
        if (width > MAX_TEXTURE_DIMENSION || height > MAX_TEXTURE_DIMENSION) {
          fail(`Texture ${relativePath} dimensions ${width}x${height} exceed max 2048`);
        } else {
          pass(`Texture ${relativePath} dimension: ${width}x${height}`);
        }
      } catch (err) {
        warn(`KTX2 dimension check for ${relativePath}: ${err.message}`);
      }
    }
  }

  // Data file location check
  if (fileName.endsWith('.json')) {
    const locResult = validateDataFileLocation(relativePath);
    if (!locResult.valid) {
      fail(locResult.error);
    } else {
      pass(`Valid data file location: ${relativePath}`);
    }
  }

  // Track data check
  if (relativePath.includes('assets/tracks/') && relativePath.endsWith('.json')) {
    try {
      const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const trackVal = validateTrackData(jsonContent);
      if (!trackVal.valid) {
        fail(`Invalid track data in ${relativePath}: ${trackVal.error}`);
      } else {
        pass(`Valid track data in ${relativePath}`);
      }
    } catch (err) {
      fail(`Failed to parse track JSON in ${relativePath}: ${err.message}`);
    }
  }
}

// 3. Combined Track + Car size budget (20 MB)
const maxCarSize = Math.max(0, ...Array.from(carSizes.values()));
const maxTrackSize = Math.max(0, ...Array.from(trackSizes.values()));
const budgetResult = checkAssetBudget(maxTrackSize, maxCarSize);

if (!budgetResult.valid) {
  fail(
    `Combined track + car size exceeds 20 MB budget: ${formatBytes(budgetResult.totalBytes)} > ${formatBytes(budgetResult.limitBytes)}`,
  );
} else {
  pass(
    `Combined track + car size within 20 MB budget: max car ${formatBytes(maxCarSize)}, max track ${formatBytes(maxTrackSize)}, total ${formatBytes(budgetResult.totalBytes)}`,
  );
}

// 4. Asset license check in Docs/ASSET_LICENSES.md
let licenseContent = '';
if (fs.existsSync(licenseDocPath)) {
  licenseContent = fs.readFileSync(licenseDocPath, 'utf8');
} else {
  fail(`Missing license document: ${licenseDocPath}`);
}

const thirdPartyFiles = [];
// Fonts in public/fonts
if (fs.existsSync(fontsDir)) {
  const fonts = fs.readdirSync(fontsDir);
  for (const font of fonts) {
    if (font.endsWith('.woff2')) {
      thirdPartyFiles.push(font);
    }
  }
}

// Assets in public/assets (skip authored json and .gitkeep)
for (const filePath of allAssetFiles) {
  const fileName = path.basename(filePath);
  if (fileName === '.gitkeep' || fileName.endsWith('.json')) {
    continue;
  }
  thirdPartyFiles.push(fileName);
}

for (const fileName of thirdPartyFiles) {
  if (!licenseContent.includes(fileName)) {
    fail(`Third-party asset "${fileName}" is not documented in Docs/ASSET_LICENSES.md`);
  } else {
    pass(`Asset license documented: ${fileName}`);
  }
}

// Output report
console.log('\n========================================');
console.log('       ASSET VALIDATION REPORT          ');
console.log('========================================\n');

for (const p of passes) {
  console.log(`[PASS] ${p}`);
}

if (warnings.length > 0) {
  console.log('');
  for (const w of warnings) {
    console.log(`[WARN] ${w}`);
  }
}

if (failures.length > 0) {
  console.log('');
  for (const f of failures) {
    console.log(`[FAIL] ${f}`);
  }
}

console.log('\n----------------------------------------');
console.log(
  `Summary: ${passes.length} passed, ${warnings.length} warnings, ${failures.length} failed.`,
);
console.log('----------------------------------------\n');

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
