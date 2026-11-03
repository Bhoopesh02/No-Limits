import { describe, expect, it } from 'vitest';
import {
  checkAssetBudget,
  createMockGlbBuffer,
  getCarTierFromFilename,
  getCarTriangleBudget,
  parseGlbTriangles,
  parseKtx2Dimensions,
  validateAssetName,
  validateDataFileLocation,
  validateTrackData,
} from './assetRules.mjs';

describe('assetRules pure logic', () => {
  describe('validateAssetName', () => {
    it('validates model GLB file names', () => {
      expect(validateAssetName('car-kaze-high.glb')).toEqual({ valid: true, kind: 'model' });
      expect(validateAssetName('scenery-coastal-highway.glb')).toEqual({
        valid: true,
        kind: 'model',
      });
      expect(validateAssetName('prop-barrier-01.glb')).toEqual({ valid: true, kind: 'model' });

      // Invalid GLB names
      expect(validateAssetName('CarKazeHigh.glb').valid).toBe(false);
      expect(validateAssetName('car kaze high.glb').valid).toBe(false);
      expect(validateAssetName('car.glb').valid).toBe(false);
    });

    it('validates texture names and enforces .ktx2 or .webp', () => {
      expect(validateAssetName('kaze-body_bc.ktx2')).toEqual({ valid: true, kind: 'texture' });
      expect(validateAssetName('asphalt_n.ktx2')).toEqual({ valid: true, kind: 'texture' });
      expect(validateAssetName('barrier_orm.webp')).toEqual({ valid: true, kind: 'texture' });
      expect(validateAssetName('neon_e.webp')).toEqual({ valid: true, kind: 'texture' });
      expect(validateAssetName('sky-gradient.webp')).toEqual({ valid: true, kind: 'texture' });

      // Disallowed image formats
      expect(validateAssetName('kaze-body.png').valid).toBe(false);
      expect(validateAssetName('kaze-body.jpg').valid).toBe(false);
      expect(validateAssetName('texture.tga').valid).toBe(false);
    });

    it('validates audio file names and prefixes', () => {
      expect(validateAssetName('sfx-nitro-on.ogg')).toEqual({ valid: true, kind: 'audio' });
      expect(validateAssetName('mus-menu-theme.ogg')).toEqual({ valid: true, kind: 'audio' });
      expect(validateAssetName('amb-coastal-wind.ogg')).toEqual({ valid: true, kind: 'audio' });

      expect(validateAssetName('nitro-on.ogg').valid).toBe(false);
      expect(validateAssetName('sound-rev.ogg').valid).toBe(false);
      expect(validateAssetName('sfx-nitro.mp3').valid).toBe(false);
    });

    it('validates data file names', () => {
      expect(validateAssetName('car-kaze.json')).toEqual({ valid: true, kind: 'data' });
      expect(validateAssetName('track-coastal-highway.json')).toEqual({
        valid: true,
        kind: 'data',
      });

      expect(validateAssetName('car.json').valid).toBe(false);
      expect(validateAssetName('CarKaze.json').valid).toBe(false);
    });

    it('validates icon names', () => {
      expect(validateAssetName('icon-nitro.svg')).toEqual({ valid: true, kind: 'icon' });
      expect(validateAssetName('icon-speedometer-dial.svg')).toEqual({ valid: true, kind: 'icon' });

      expect(validateAssetName('nitro.svg').valid).toBe(false);
    });

    it('allows .gitkeep files', () => {
      expect(validateAssetName('.gitkeep')).toEqual({ valid: true, kind: 'keep' });
    });
  });

  describe('GLB triangle parsing', () => {
    it('counts triangles from indexed primitives (mode 4)', () => {
      const mockGltf = {
        meshes: [
          {
            primitives: [{ indices: 0, mode: 4 }],
          },
        ],
        accessors: [
          {
            count: 36, // 36 indices = 12 triangles
          },
        ],
      };

      const buffer = createMockGlbBuffer(mockGltf);
      const result = parseGlbTriangles(buffer);
      expect(result.triangles).toBe(12);
      expect(result.meshCount).toBe(1);
    });

    it('counts triangles from non-indexed primitives (mode 4 default)', () => {
      const mockGltf = {
        meshes: [
          {
            primitives: [
              {
                attributes: { POSITION: 0 },
                // mode omitted, defaults to 4
              },
            ],
          },
        ],
        accessors: [
          {
            count: 24, // 24 vertices = 8 triangles
          },
        ],
      };

      const buffer = createMockGlbBuffer(mockGltf);
      const result = parseGlbTriangles(buffer);
      expect(result.triangles).toBe(8);
    });

    it('counts triangles from triangle strip (mode 5)', () => {
      const mockGltf = {
        meshes: [
          {
            primitives: [{ indices: 0, mode: 5 }],
          },
        ],
        accessors: [
          {
            count: 8, // 8 vertices in strip = 8 - 2 = 6 triangles
          },
        ],
      };

      const buffer = createMockGlbBuffer(mockGltf);
      const result = parseGlbTriangles(buffer);
      expect(result.triangles).toBe(6);
    });

    it('sums triangles across multiple meshes and primitives', () => {
      const mockGltf = {
        meshes: [
          {
            primitives: [
              { indices: 0, mode: 4 }, // 18 / 3 = 6
              { indices: 1, mode: 4 }, // 9 / 3 = 3
            ],
          },
          {
            primitives: [
              { indices: 2, mode: 4 }, // 30 / 3 = 10
            ],
          },
        ],
        accessors: [{ count: 18 }, { count: 9 }, { count: 30 }],
      };

      const buffer = createMockGlbBuffer(mockGltf);
      const result = parseGlbTriangles(buffer);
      expect(result.triangles).toBe(19);
      expect(result.meshCount).toBe(2);
    });

    it('throws on invalid GLB magic header', () => {
      const badBuffer = Buffer.alloc(32);
      badBuffer.writeUInt32LE(0x12345678, 0);
      expect(() => parseGlbTriangles(badBuffer)).toThrow(/magic header/);
    });
  });

  describe('Car tier budget mapping', () => {
    it('extracts tier from filename correctly', () => {
      expect(getCarTierFromFilename('car-kaze-low.glb')).toBe('low');
      expect(getCarTierFromFilename('car-kaze-med.glb')).toBe('med');
      expect(getCarTierFromFilename('car-kaze-medium.glb')).toBe('medium');
      expect(getCarTierFromFilename('car-kaze-high.glb')).toBe('high');
      expect(getCarTierFromFilename('track-scenery.glb')).toBeNull();
    });

    it('enforces tier triangle limits according to Project Structure doc section 14', () => {
      expect(getCarTriangleBudget('low')).toBe(8000);
      expect(getCarTriangleBudget('med')).toBe(20000);
      expect(getCarTriangleBudget('medium')).toBe(20000);
      expect(getCarTriangleBudget('high')).toBe(45000);
      expect(getCarTriangleBudget(null)).toBeNull();
    });
  });

  describe('KTX2 header parsing', () => {
    it('parses pixel dimensions from valid KTX2 header', () => {
      const ktx2Buf = Buffer.alloc(48);
      // Identifier: «KTX 20»\r\n\x1A\n
      const ktx2Id = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < 12; i++) {
        ktx2Buf[i] = ktx2Id[i];
      }
      ktx2Buf.writeUInt32LE(1024, 20); // pixelWidth
      ktx2Buf.writeUInt32LE(512, 24); // pixelHeight

      const dims = parseKtx2Dimensions(ktx2Buf);
      expect(dims.width).toBe(1024);
      expect(dims.height).toBe(512);
    });

    it('throws on invalid KTX2 identifier', () => {
      const badBuf = Buffer.alloc(48);
      expect(() => parseKtx2Dimensions(badBuf)).toThrow(/Invalid KTX2/);
    });
  });

  describe('Track data validation', () => {
    const validTrack = {
      id: 'coastal-highway',
      displayName: 'Coastal Highway',
      lengthMeters: 2500,
      laps: 3,
      checkpointCount: 8,
      scenery: 'coastal',
      timeOfDayStart: 16.5,
      controlPoints: [
        { x: 0, y: 0, z: 0, width: 12 },
        { x: 100, y: 5, z: 200, width: 12 },
        { x: -50, y: 0, z: 350, width: 14 },
      ],
    };

    it('accepts valid track data', () => {
      expect(validateTrackData(validTrack)).toEqual({ valid: true });
    });

    it('rejects track data with fewer than 3 control points', () => {
      const invalid = { ...validTrack, controlPoints: [{ x: 0, y: 0, z: 0, width: 10 }] };
      expect(validateTrackData(invalid).valid).toBe(false);
    });

    it('rejects track data with invalid laps or negative length', () => {
      expect(validateTrackData({ ...validTrack, laps: 0 }).valid).toBe(false);
      expect(validateTrackData({ ...validTrack, lengthMeters: -100 }).valid).toBe(false);
    });
  });

  describe('Asset budget calculations', () => {
    it('passes when combined size is within 20 MB', () => {
      const trackBytes = 8 * 1024 * 1024; // 8 MB
      const carBytes = 5 * 1024 * 1024; // 5 MB
      const result = checkAssetBudget(trackBytes, carBytes);
      expect(result.valid).toBe(true);
      expect(result.totalBytes).toBe(13 * 1024 * 1024);
    });

    it('fails when combined size exceeds 20 MB', () => {
      const trackBytes = 15 * 1024 * 1024; // 15 MB
      const carBytes = 8 * 1024 * 1024; // 8 MB
      const result = checkAssetBudget(trackBytes, carBytes);
      expect(result.valid).toBe(false);
      expect(result.totalBytes).toBe(23 * 1024 * 1024);
    });
  });

  describe('validateDataFileLocation', () => {
    it('fails when a data JSON file sits directly in a car or track folder', () => {
      expect(validateDataFileLocation('assets/cars/kaze/car-kaze.json').valid).toBe(false);
      expect(
        validateDataFileLocation('assets/tracks/coastal-highway/track-coastal-highway.json').valid,
      ).toBe(false);
    });

    it('passes when a data JSON file is inside the data/ subfolder', () => {
      expect(validateDataFileLocation('assets/cars/kaze/data/car-kaze.json').valid).toBe(true);
      expect(
        validateDataFileLocation('assets/tracks/coastal-highway/data/track-coastal-highway.json')
          .valid,
      ).toBe(true);
    });
  });
});
