#!/usr/bin/env node
import console from 'node:console';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

const MAX_FIRST_LOAD_GZIP_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
const WARN_JS_GZIP_BYTES = 400 * 1024; // 400 kB

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

if (!fs.existsSync(indexHtmlPath)) {
  console.error('[FAIL] dist/index.html not found. Run "npm run build" first.');
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Identify entry script(s) and stylesheet(s) in index.html
const entryJsFiles = new Set();
const entryCssFiles = new Set();
const fontFiles = new Set();

// Match script tags with src
const scriptSrcRegex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
let scriptMatch;
while ((scriptMatch = scriptSrcRegex.exec(htmlContent)) !== null) {
  const src = scriptMatch[1].replace(/^\//, '');
  const resolved = path.join(distDir, src);
  if (fs.existsSync(resolved)) {
    entryJsFiles.add(resolved);
  }
}

// Match stylesheet link tags with href
const linkHrefRegex = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
let linkMatch;
while ((linkMatch = linkHrefRegex.exec(htmlContent)) !== null) {
  const tag = linkMatch[0];
  if (/rel=["']stylesheet["']/i.test(tag)) {
    const href = linkMatch[1].replace(/^\//, '');
    const resolved = path.join(distDir, href);
    if (fs.existsSync(resolved)) {
      entryCssFiles.add(resolved);
    }
  }
}

// 2. Scan CSS files for font references (e.g. url(/fonts/name.woff2))
for (const cssFile of entryCssFiles) {
  const cssContent = fs.readFileSync(cssFile, 'utf8');
  const urlRegex = /url\(\s*["']?([^'")]+)["']?\s*\)/g;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(cssContent)) !== null) {
    let fontUrl = urlMatch[1].split('?')[0].split('#')[0];
    if (/\.(woff2|woff|ttf|otf|eot)$/i.test(fontUrl)) {
      fontUrl = fontUrl.replace(/^\//, '');
      const resolved = path.resolve(distDir, fontUrl);
      if (fs.existsSync(resolved)) {
        fontFiles.add(resolved);
      }
    }
  }
}

// 3. Follow static imports in entry JS chunks (exclude dynamic import(...) chunks)
const allJsFiles = new Set();
const jsQueue = Array.from(entryJsFiles);

while (jsQueue.length > 0) {
  const currentJs = jsQueue.shift();
  if (allJsFiles.has(currentJs)) continue;
  allJsFiles.add(currentJs);

  const jsContent = fs.readFileSync(currentJs, 'utf8');
  // Match static ES imports:
  // e.g. import ... from "./chunk.js"; or import "./chunk.js"; or export ... from "./chunk.js";
  // Exclude dynamic imports: import("...")
  const staticImportRegex =
    /(?:^|[;\n])\s*(?:import(?!\s*\()\s*(?:[^'"]*?from\s*)?|export\s*(?:[^'"]*?from\s*))['"](\.[^'"]+)['"]/g;

  let importMatch;
  while ((importMatch = staticImportRegex.exec(jsContent)) !== null) {
    const specifier = importMatch[1];
    const resolved = path.resolve(path.dirname(currentJs), specifier);
    if (fs.existsSync(resolved) && !allJsFiles.has(resolved)) {
      jsQueue.push(resolved);
    }
  }
}

// 4. Calculate file sizes
const items = [];

function recordFile(filePath, type) {
  const buffer = fs.readFileSync(filePath);
  const rawSize = buffer.length;
  const gzipSize = zlib.gzipSync(buffer).length;
  const relPath = path.relative(distDir, filePath).replace(/\\/g, '/');
  items.push({
    file: relPath === '' ? 'index.html' : relPath,
    type,
    rawSize,
    gzipSize,
  });
}

recordFile(indexHtmlPath, 'HTML');

for (const js of allJsFiles) {
  recordFile(js, 'JS');
}

for (const css of entryCssFiles) {
  recordFile(css, 'CSS');
}

for (const font of fontFiles) {
  recordFile(font, 'Font');
}

// 5. Print table
console.log('\n===================================================================');
console.log('                   FIRST PAGE LOAD SIZE REPORT                    ');
console.log('===================================================================\n');

const colFile = 36;
const colType = 8;
const colRaw = 12;
const colGzip = 12;

console.log(
  'File'.padEnd(colFile) +
    'Type'.padEnd(colType) +
    'Raw Size'.padStart(colRaw) +
    'Gzip Size'.padStart(colGzip),
);
console.log('-'.repeat(colFile + colType + colRaw + colGzip));

let totalRaw = 0;
let totalGzip = 0;
let totalJsGzip = 0;

for (const item of items) {
  totalRaw += item.rawSize;
  totalGzip += item.gzipSize;
  if (item.type === 'JS') {
    totalJsGzip += item.gzipSize;
  }
  const displayFile =
    item.file.length > colFile - 2 ? '...' + item.file.slice(-(colFile - 5)) : item.file;

  console.log(
    displayFile.padEnd(colFile) +
      item.type.padEnd(colType) +
      formatBytes(item.rawSize).padStart(colRaw) +
      formatBytes(item.gzipSize).padStart(colGzip),
  );
}

console.log('-'.repeat(colFile + colType + colRaw + colGzip));
console.log(
  'TOTAL'.padEnd(colFile + colType) +
    formatBytes(totalRaw).padStart(colRaw) +
    formatBytes(totalGzip).padStart(colGzip),
);
console.log('===================================================================\n');

let failed = false;

// JS budget warning check
if (totalJsGzip > WARN_JS_GZIP_BYTES) {
  console.log(
    `[WARN] Total JS gzip (${formatBytes(totalJsGzip)}) exceeds early warning threshold (${formatBytes(WARN_JS_GZIP_BYTES)}).\n`,
  );
} else {
  console.log(
    `[PASS] Total JS gzip (${formatBytes(totalJsGzip)}) is within warning threshold (${formatBytes(WARN_JS_GZIP_BYTES)}).\n`,
  );
}

// Total first load check
if (totalGzip > MAX_FIRST_LOAD_GZIP_BYTES) {
  console.log(
    `[FAIL] Total first load compressed size (${formatBytes(totalGzip)}) exceeds 1.5 MB budget (${formatBytes(MAX_FIRST_LOAD_GZIP_BYTES)})!\n`,
  );
  failed = true;
} else {
  console.log(
    `[PASS] Total first load compressed size (${formatBytes(totalGzip)}) is well within 1.5 MB budget (${formatBytes(MAX_FIRST_LOAD_GZIP_BYTES)}).\n`,
  );
}

if (failed) {
  process.exit(1);
} else {
  process.exit(0);
}
