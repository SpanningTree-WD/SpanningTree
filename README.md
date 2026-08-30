# Spanning Tree Website

Production application shell for the Spanning Tree academic archive. The approved visual prototype remains unchanged at `reference/spanning_tree_sample.html`.

## Requirements

- Node.js 20.19 or newer
- npm

## Local development

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Public routes are `/`, `/about`, `/people`, `/activities`, `/publications`, and `/mathematics`.

## Checks

```bash
npm run lint
npm test
npm run build
npm run preview
```

Stage 1 intentionally contains minimal page bodies. Full prototype content, archive records, Firebase, and admin tools are deferred to later approved stages.
