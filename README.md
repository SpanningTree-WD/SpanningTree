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

Public routes use typed repositories and default to reviewed local fixtures.
Stage 5 prepares secure Firebase repositories and Hosting while `/admin` remains
a browser-local prototype. See [Firebase operations](docs/FIREBASE.md) for setup,
deployment, import, rules, and handoff instructions.
