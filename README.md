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

Open the URL printed by Vite. Public routes are `/`, `/about`, `/people`, `/activities`, `/publications`, and `/mathematics`. The three archives support linkable URL filters and local fixture-backed detail routes such as `/activities/ksa-spanning-tree-forum`.

## Checks

```bash
npm run lint
npm test
npm run build
npm run preview
```

Stage 3 uses typed local fixtures behind repository contracts. Public repository methods exclude drafts. Firebase, real files, authentication, and admin tools remain deferred to later approved stages.
