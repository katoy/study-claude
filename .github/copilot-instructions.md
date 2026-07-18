# Copilot instructions

## Scope

These instructions describe the `pdflabel/` project. Run project commands from `pdflabel/` unless a command explicitly uses the repository root.

## Build, test, and lint

- The application has no runtime build step or local server. Open `pdflabel/index.html` directly; the production copy is deployed through GitHub Pages.
- Use Node.js 20, matching `.github/workflows/pdflabel-ci.yml`.
- Install development dependencies: `npm ci`
- Run the test suite once: `npm run test`
- Run tests in watch mode: `npm run test:watch`
- Run the required 100% coverage check: `npm run test:coverage`
- Run HTMLHint after changing `index.html`: `npm run lint:html`
- Run one test by name: `npm run test -- test/index.test.js -t "should calculate layout correctly for standard parameters"`

The `pretest*` scripts extract the final inline script from `index.html` into temporary `index.js`; the corresponding `posttest*` scripts remove it. Never edit or commit generated `pdflabel/index.js` or `pdflabel/coverage/`.

## Architecture

- `pdflabel/index.html` is intentionally the complete client application: markup, CSS, DOM behavior, layout calculation, preview interaction, and jsPDF generation remain together so the app works without a build process.
- `pdflabel/labellist.js` is the only application-owned runtime JavaScript kept outside `index.html`. It defines the global `const labelList = [...]` preset data and is loaded as a classic script to preserve direct `file://` use; do not convert it to JSON or an ES module.
- Preview and PDF generation share `calculateLayout()` and label-cell traversal logic. Keep layout formulas and validation centralized rather than implementing separate preview/PDF calculations.
- `scripts/extract-script.js` creates the testable `index.js` and exposes selected functions on `window`. `test/index.test.js` reloads that generated script into JSDOM for each test and mocks jsPDF, font fetching, `FileReader`, Blob URLs, and popup opening.
- Runtime dependencies are loaded from CDNs: jsPDF, UI fonts, and the Noto Sans JP font embedded in generated PDFs. The application must surface CDN/font loading failures to the user.
- `.github/workflows/pdflabel-ci.yml` runs HTMLHint and coverage for `pdflabel/**`. The parent Pages workflow deploys the repository contents after changes reach `main`.

## Project conventions

- Keep application HTML, CSS, and JavaScript in `index.html`; do not split them into new application-owned files. Keep only preset data in `labellist.js`.
- Use camelCase for JavaScript identifiers. Write comments in Japanese, and only where intent is not clear from the code.
- Preserve A4 portrait dimensions in millimeters and the shared layout formulas:
  `columns = floor((availableWidth + columnSpacing) / (labelWidth + columnSpacing))` and
  `rows = floor((availableHeight + rowSpacing) / (labelHeight + rowSpacing))`.
- Invalid or impossible dimensions produce zero rows/columns and a visible warning; preview and PDF behavior must remain consistent.
- Layouts exceeding 1,000 labels are treated as unplaceable to prevent excessive DOM and PDF work.
- When changing preset fields, preserve compatibility with existing entries and update the preset-card miniature SVG behavior, including margins, spacing, rounded corners, counts, and active-layout comparison.
- When adding a CDN runtime dependency, implement and test its load-failure path.
- Feature or test changes must keep statement, branch, function, and line coverage at 100%. HTML changes also require HTMLHint.
- Check `git status --short` from the parent repository before editing. Do not overwrite unrelated work, create a nested `.git` directory under `pdflabel/`, or commit/push unless explicitly requested.
