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
`/admin` uses Google sign-in, an approved-member allowlist, and Firestore storage.
Admin edits never fall back to browser-local storage. Set `VITE_PUBLIC_DATA_SOURCE=firebase`
after setup to show published Firestore records on the public site.

See [Firebase operations](docs/FIREBASE.md) for account setup, rules, deployment,
emulator tests, and data migration, and [Admin guide](docs/ADMIN.md) for editing.
Image/PDF upload controls remain a separate implementation stage.
