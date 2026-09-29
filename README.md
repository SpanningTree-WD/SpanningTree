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

Open the URL printed by Vite. Public routes are `/`, `/about`, `/people`, `/activities`, `/publications`, and `/mathematics`. The three archives support linkable URL filters. Local fixture mode includes example detail routes such as `/activities/ksa-spanning-tree-forum`.

## Checks

```bash
npm run lint
npm test
npm run build
npm run preview
```

Hosted public routes use typed Firestore repositories and start with an empty archive.
Local development defaults to fixtures unless `.env.local` selects Firebase mode.
`/admin` uses Google sign-in, an approved-member allowlist, and Firestore storage.
Admin edits never fall back to browser-local storage. Both Hosting workflows set
`VITE_PUBLIC_DATA_SOURCE=firebase` to display published records.

See [Firebase operations](docs/FIREBASE.md) for account setup, rules, deployment,
emulator tests, and data migration, and [Admin guide](docs/ADMIN.md) for editing.
Image/PDF upload controls remain a separate implementation stage.

Google 검색 설정, 사이트맵 자동 갱신 및 Search Console 등록은
[검색 운영 가이드](docs/SEO.md)를 참고하세요.
