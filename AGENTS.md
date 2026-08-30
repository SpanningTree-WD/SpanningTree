# Spanning Tree Website — Agent Instructions

Before modifying the project:

1. Read `docs/PROJECT_CONTEXT.md`.
2. Read `docs/DESIGN.md`.
3. Read `docs/CONTENT_MODEL.md` when working with content or data.
4. Inspect `reference/spanning_tree_sample.html` before modifying UI.

## Core rules

The existing sample HTML is the approved UI prototype.

Do not redesign the website unless explicitly requested.

Preserve:
- typography
- color system
- spacing
- borders
- archive-oriented layouts
- overall visual hierarchy

The website must remain easy for future Spanning Tree Web Developers
to understand and modify.

Prefer:
- reusable components
- centralized design tokens
- simple directory structures
- clear names
- minimal dependencies

Separate:
- UI
- application logic
- data access
- Firebase services

Do not put Firestore queries directly throughout UI components.

Never commit:
- API secrets
- service-account credentials
- private keys
- passwords

Firebase is the long-term infrastructure platform.

GitHub is the source-code and version-control platform.
