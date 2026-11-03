// Pure logic for asset rules, limits, and parsing (used by Tools/validateAssets.mjs and Vitest).
import { Buffer } from 'node:buffer';

export const TIER_TRIANGLE_LIMITS = {
  low: 8000,
  med: 20000,
  medium: 20000,
  high: 45000,
};

export const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB warning threshold
export const MAX_TRACK_PLUS_CAR_BYTES = 20 * 1024 * 1024; // 20 MB budget
export const MAX_TEXTURE_DIMENSION = 2048;

/**
 * Validates that data JSON files for cars and tracks reside inside a "data" subfolder,
 * not directly in the car or track folder.
 * Example invalid: assets/cars/kaze/car-kaze.json
 * Example valid: assets/cars/kaze/data/car-kaze.json
 */
export function validateDataFileLocation(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const directUnderCategoryRegex = /^assets\/(?:cars|tracks)\/[^/]+\/[^/]+\.json$/;
  if (directUnderCategoryRegex.test(normalized)) {
    return {
      valid: false,
      error: `Data file "${normalized}" must be in a "data/" subfolder, not sitting directly in the parent folder.`,
    };
  }
  return { valid: true };
}

/**
 * Validates whether an asset file name conforms to project naming rules.
 * Allowed patterns from AGENTS.md Naming table:
 * - Model (GLB): kind-name-tier.glb or kind-name.glb (e.g. car-kaze-high.glb, scenery-coastal.glb)
 * - Texture: name_bc, _n, _orm, _e (.ktx2 or .webp)
 * - Audio: sfx-, mus-, amb- prefix (.ogg)
 * - Data: kind-name.json (e.g. car-kaze.json, track-coastal-highway.json)
 * - UI icon: icon-name.svg
 * - .gitkeep
 */
export function validateAssetName(fileName) {
  if (fileName === '.gitkeep') {
    return { valid: true, kind: 'keep' };
  }

  // Check no spaces, no uppercase
  if (/[A-Z\s]/.test(fileName)) {
    return {
      valid: false,
      error: `Asset file "${fileName}" must be lowercase and contain no spaces.`,
    };
  }

  // Model GLB: kind-name-tier.glb or kind-name.glb
  if (fileName.endsWith('.glb')) {
    const base = fileName.slice(0, -4);
    const glbRegex = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
    if (!glbRegex.test(base)) {
      return {
        valid: false,
        error: `GLB model "${fileName}" must follow kebab-case pattern like kind-name-tier.glb (e.g. car-kaze-high.glb).`,
      };
    }
    return { valid: true, kind: 'model' };
  }

  // Textures: name_bc.ktx2, name_n.ktx2, etc. (or .webp)
  if (fileName.endsWith('.ktx2') || fileName.endsWith('.webp')) {
    const ext = fileName.endsWith('.ktx2') ? '.ktx2' : '.webp';
    const base = fileName.slice(0, -ext.length);
    // May have suffix _bc, _n, _orm, _e, or simply kebab-case name
    const textureRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:_(?:bc|n|orm|e))?$/;
    if (!textureRegex.test(base)) {
      return {
        valid: false,
        error: `Texture "${fileName}" must follow kebab-case with optional _bc, _n, _orm, _e suffix.`,
      };
    }
    return { valid: true, kind: 'texture' };
  }

  // Image files with unapproved extensions (must be .ktx2 or .webp)
  if (/\.(png|jpg|jpeg|tga|bmp|gif)$/i.test(fileName)) {
    return {
      valid: false,
      error: `Texture "${fileName}" has unapproved image extension. Textures must be .ktx2 or .webp.`,
    };
  }

  // Audio: (sfx|mus|amb)-name.ogg
  if (fileName.endsWith('.ogg')) {
    const base = fileName.slice(0, -4);
    const audioRegex = /^(?:sfx|mus|amb)-[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!audioRegex.test(base)) {
      return {
        valid: false,
        error: `Audio file "${fileName}" must start with sfx-, mus-, or amb- prefix and be lowercase kebab-case.`,
      };
    }
    return { valid: true, kind: 'audio' };
  }

  // Data: kind-name.json
  if (fileName.endsWith('.json')) {
    const base = fileName.slice(0, -5);
    const dataRegex = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
    if (!dataRegex.test(base)) {
      return {
        valid: false,
        error: `Data file "${fileName}" must follow kind-name.json pattern (e.g. car-kaze.json).`,
      };
    }
    return { valid: true, kind: 'data' };
  }

  // Icons: icon-name.svg
  if (fileName.endsWith('.svg')) {
    const base = fileName.slice(0, -4);
    const iconRegex = /^icon-[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!iconRegex.test(base)) {
      return {
        valid: false,
        error: `Icon "${fileName}" must follow icon-name.svg pattern.`,
      };
    }
    return { valid: true, kind: 'icon' };
  }

  // Fonts in public/fonts: name-variant-weight.woff2
  if (fileName.endsWith('.woff2')) {
    const base = fileName.slice(0, -6);
    const fontRegex = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
    if (!fontRegex.test(base)) {
      return {
        valid: false,
        error: `Font file "${fileName}" must follow lowercase kebab-case.`,
      };
    }
    return { valid: true, kind: 'font' };
  }

  return {
    valid: false,
    error: `File "${fileName}" does not match any recognized project asset pattern.`,
  };
}

/**
 * Extracts car tier from GLB filename (e.g. car-kaze-low.glb -> 'low').
 */
export function getCarTierFromFilename(fileName) {
  if (fileName.endsWith('-low.glb')) return 'low';
  if (fileName.endsWith('-med.glb')) return 'med';
  if (fileName.endsWith('-medium.glb')) return 'medium';
  if (fileName.endsWith('-high.glb')) return 'high';
  return null;
}

/**
 * Returns the triangle limit for a given tier.
 */
export function getCarTriangleBudget(tier) {
  return tier ? (TIER_TRIANGLE_LIMITS[tier] ?? null) : null;
}

/**
 * Parses GLB header and JSON chunk to count triangles without external dependencies.
 */
export function parseGlbTriangles(buffer) {
  if (!buffer || buffer.length < 20) {
    throw new Error('Invalid GLB: buffer is too short.');
  }

  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error(`Invalid GLB: magic header 0x${magic.toString(16)} is not 'glTF'.`);
  }

  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version ${version}. Only glTF 2.0 is supported.`);
  }

  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) {
    throw new Error('Invalid GLB: first chunk is not JSON.');
  }

  if (buffer.length < 20 + jsonChunkLength) {
    throw new Error('Invalid GLB: buffer is truncated.');
  }

  const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength);
  const gltf = JSON.parse(jsonString);

  let totalTriangles = 0;
  const meshes = gltf.meshes || [];

  for (const mesh of meshes) {
    for (const primitive of mesh.primitives || []) {
      const mode = primitive.mode !== undefined ? primitive.mode : 4; // 4 = TRIANGLES
      let count = 0;
      if (primitive.indices !== undefined) {
        count = gltf.accessors?.[primitive.indices]?.count ?? 0;
      } else if (primitive.attributes?.POSITION !== undefined) {
        count = gltf.accessors?.[primitive.attributes.POSITION]?.count ?? 0;
      }

      if (mode === 4) {
        // TRIANGLES
        totalTriangles += Math.floor(count / 3);
      } else if (mode === 5 || mode === 6) {
        // TRIANGLE_STRIP or TRIANGLE_FAN
        totalTriangles += Math.max(0, count - 2);
      }
    }
  }

  return {
    triangles: totalTriangles,
    meshCount: meshes.length,
  };
}

/**
 * Parses KTX2 header to extract texture dimensions.
 * KTX2 format: 12-byte identifier, followed by header fields.
 * pixelWidth is uint32 LE at offset 20, pixelHeight is uint32 LE at offset 24.
 */
export function parseKtx2Dimensions(buffer) {
  if (!buffer || buffer.length < 28) {
    throw new Error('Invalid KTX2: buffer too short.');
  }

  // 12-byte identifier: «KTX 20»\r\n\x1A\n
  const ktx2Id = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 12; i++) {
    if (buffer[i] !== ktx2Id[i]) {
      throw new Error('Invalid KTX2 identifier.');
    }
  }

  const width = buffer.readUInt32LE(20);
  const height = buffer.readUInt32LE(24);
  return { width, height };
}

/**
 * Validates track data structure according to parseTrackData rules.
 */
export function validateTrackData(json) {
  if (typeof json !== 'object' || json === null) {
    return { valid: false, error: 'TrackData must be a non-null object' };
  }

  const data = json;

  if (typeof data.id !== 'string' || data.id.trim() === '') {
    return { valid: false, error: 'TrackData.id must be a non-empty string' };
  }

  if (typeof data.displayName !== 'string' || data.displayName.trim() === '') {
    return { valid: false, error: 'TrackData.displayName must be a non-empty string' };
  }

  if (
    typeof data.lengthMeters !== 'number' ||
    !Number.isFinite(data.lengthMeters) ||
    data.lengthMeters <= 0
  ) {
    return { valid: false, error: 'TrackData.lengthMeters must be a positive finite number' };
  }

  if (typeof data.laps !== 'number' || !Number.isInteger(data.laps) || data.laps <= 0) {
    return { valid: false, error: 'TrackData.laps must be a positive integer' };
  }

  if (
    typeof data.checkpointCount !== 'number' ||
    !Number.isInteger(data.checkpointCount) ||
    data.checkpointCount <= 0
  ) {
    return { valid: false, error: 'TrackData.checkpointCount must be a positive integer' };
  }

  if (typeof data.scenery !== 'string') {
    return { valid: false, error: 'TrackData.scenery must be a string' };
  }

  if (
    typeof data.timeOfDayStart !== 'number' ||
    !Number.isFinite(data.timeOfDayStart) ||
    data.timeOfDayStart < 0 ||
    data.timeOfDayStart > 24
  ) {
    return { valid: false, error: 'TrackData.timeOfDayStart must be a number between 0 and 24' };
  }

  if (!Array.isArray(data.controlPoints) || data.controlPoints.length < 3) {
    return {
      valid: false,
      error: 'TrackData.controlPoints must be an array of at least 3 points for a closed loop',
    };
  }

  for (let i = 0; i < data.controlPoints.length; i++) {
    const pt = data.controlPoints[i];
    if (typeof pt !== 'object' || pt === null) {
      return { valid: false, error: `TrackData.controlPoints[${i}] must be a non-null object` };
    }

    if (typeof pt.x !== 'number' || !Number.isFinite(pt.x)) {
      return { valid: false, error: `TrackData.controlPoints[${i}].x must be a finite number` };
    }
    if (typeof pt.y !== 'number' || !Number.isFinite(pt.y)) {
      return { valid: false, error: `TrackData.controlPoints[${i}].y must be a finite number` };
    }
    if (typeof pt.z !== 'number' || !Number.isFinite(pt.z)) {
      return { valid: false, error: `TrackData.controlPoints[${i}].z must be a finite number` };
    }
    if (typeof pt.width !== 'number' || !Number.isFinite(pt.width) || pt.width <= 0) {
      return {
        valid: false,
        error: `TrackData.controlPoints[${i}].width must be a positive finite number`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates budget for track + car combined size (under 20 MB).
 */
export function checkAssetBudget(trackBytes, carBytes) {
  const total = trackBytes + carBytes;
  return {
    valid: total <= MAX_TRACK_PLUS_CAR_BYTES,
    totalBytes: total,
    limitBytes: MAX_TRACK_PLUS_CAR_BYTES,
  };
}

/**
 * Creates a mock GLB binary buffer for unit tests without external tools.
 */
export function createMockGlbBuffer(gltfJson) {
  const jsonStr = JSON.stringify(gltfJson);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  // GLB chunk length must be 4-byte aligned; pad with spaces (0x20)
  const remainder = jsonBuf.length % 4;
  const padding = remainder === 0 ? 0 : 4 - remainder;
  const paddedJsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(padding, 0x20)]);

  const totalLength = 12 + 8 + paddedJsonBuf.length;
  const buffer = Buffer.alloc(totalLength);

  // Header (12 bytes)
  buffer.writeUInt32LE(0x46546c67, 0); // 'glTF'
  buffer.writeUInt32LE(2, 4); // version 2
  buffer.writeUInt32LE(totalLength, 8); // total length

  // Chunk 0: JSON
  buffer.writeUInt32LE(paddedJsonBuf.length, 12); // chunk length
  buffer.writeUInt32LE(0x4e4f534a, 16); // 'JSON'
  paddedJsonBuf.copy(buffer, 20);

  return buffer;
}
