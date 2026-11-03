# Automated CI Checks

This document lists every automated safeguard and continuous integration check configured for the No Limits project, including what each check protects and the command to run it locally.

| Check                       | Command                                   | What it protects                                                                                                                                                                                                                                                     |
| --------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type Check**              | `npm run typecheck`                       | Strict TypeScript types, null safety, export/import contracts across all modules.                                                                                                                                                                                    |
| **Lint**                    | `npm run lint`                            | Code quality, formatting guidelines, and architectural module import boundaries.                                                                                                                                                                                     |
| **Tests**                   | `npm test`                                | Deterministic vehicle simulation, spline math, lap timing, UI pure functions, and safeguards.                                                                                                                                                                        |
| **Build**                   | `npm run build`                           | Full production build compilation via TypeScript and Vite/Rollup.                                                                                                                                                                                                    |
| **Bundle Size Budget**      | `npm run check:size`                      | First-page-load payload (HTML, JS, CSS, fonts) remains under 1.5 MB gzip; early warning if JS exceeds 400 kB gzip.                                                                                                                                                   |
| **Asset Validation**        | `npm run validate:assets`                 | Asset naming conventions (lowercase kebab-case), required folder structure (`model`, `textures`, `audio`, `data`), GLB triangle budgets by tier (low 8k, med 20k, high 45k), texture formats/dimensions, track data integrity, and licensing in `ASSET_LICENSES.md`. |
| **Architecture Size Guard** | `npm test` (`Tools/architecture.test.ts`) | Codebase maintainability by capping files at 500 lines (with console warnings > 300 lines) and enforcing a shrinking ceiling on `App.ts` toward its 400-line target.                                                                                                 |

## Running All Checks Locally

Before submitting changes, run the full verification pipeline:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:size
npm run validate:assets
npx prettier --check .
```
