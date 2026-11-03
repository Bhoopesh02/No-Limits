import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Files currently grandfathered above the 500-line ceiling.
 * Each entry must have an explicit TODO explaining the planned refactor.
 */
const ALLOWED_OVER_500_LINES = new Map<string, string>([
  ['src/ui/styleguide/Styleguide.ts', 'TODO: split styleguide into modular section components'],
  [
    'src/render/createKazeCar.ts',
    'TODO: split procedural car creation into body, wheels, interior, and lighting modules',
  ],
  [
    'src/render/TrackView.ts',
    'TODO: split track view into road geometry, barrier generation, and marker subsystems',
  ],
  [
    'src/app/App.ts',
    'TODO: state machine and screen manager in Week 3 roadmap will absorb bootstrap responsibilities',
  ],
]);

/**
 * Target line count for App.ts is under 400 lines.
 * Because App.ts is currently at 518 lines during Week 2/Task 7, its limit is set to
 * 550 (current size rounded up to the next 50) so it cannot grow further and can only shrink
 * as Week 3 StateMachine and ScreenManager extract logic from it.
 */
const APP_TS_MAX_LINES = 550;

function walkTsFiles(dir: string): string[] {
  let results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }

  return results;
}

describe('Architecture file size safeguards', () => {
  const rootDir = path.resolve(__dirname, '..');
  const srcRoot = path.join(rootDir, 'src');
  const tsFiles = walkTsFiles(srcRoot);

  it('enforces that no unapproved file exceeds 500 lines and warns over 300 lines', () => {
    const violations: string[] = [];

    for (const filePath of tsFiles) {
      const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf8');
      const lineCount = content.split('\n').length;

      // Warn (console only) if file exceeds 300 lines
      if (lineCount > 300) {
        console.warn(
          `[ARCH-WARN] File ${relativePath} is over 300 lines (${lineCount} lines). Consider splitting.`,
        );
      }

      // Hard fail if file exceeds 500 lines and is not allowlisted
      if (lineCount > 500 && !ALLOWED_OVER_500_LINES.has(relativePath)) {
        violations.push(`${relativePath} (${lineCount} lines)`);
      }
    }

    expect(
      violations,
      `The following files exceed the 500-line architecture limit without an approved exemption:\n${violations.join('\n')}`,
    ).toEqual([]);
  });

  it('enforces that App.ts stays within its shrinking ceiling toward 400 lines', () => {
    const appTsPath = path.join(srcRoot, 'app', 'App.ts');
    expect(fs.existsSync(appTsPath)).toBe(true);

    const content = fs.readFileSync(appTsPath, 'utf8');
    const lineCount = content.split('\n').length;

    expect(
      lineCount,
      `App.ts has ${lineCount} lines, which exceeds the temporary 550-line ceiling toward the 400-line target.`,
    ).toBeLessThanOrEqual(APP_TS_MAX_LINES);
  });
});

