# Authoring verification

This change uses MathJax 4.1.3 for shared preview/public rendering. It preserves Markdown strings and legacy content fields; see [the data and deployment notes](ARTICLE_AUTHORING.md).

## Automated checks

- Unit/integration suite: 203 tests covering the existing site plus image clipboard paste, typing and selection during upload, plain-text paste/undo, attachment queues across article sessions, upload retry, cancellation, draft creation/reopening, references, People and shared MathJax output, including mathematical font variants used by existing articles.
- Firestore emulators: 28 tests, including administrator enforcement, private draft/upload sessions, protected worker completion, canonical Activity–Mathematics add/remove/persistence, legacy relation conversion/conflict detection and published-only resolution. These tests use the real repository implementation and rules without production writes.
- Real Linux Docker verification: successful TikZ and Asymptote compilation, invalid source, blocked arbitrary file access/system commands, bounded infinite-loop termination and stable cache keys. Worker tests additionally verify cache reuse, revoked administrators, forged ownership/hashes, expired sessions and isolated compilation failures.
- TypeScript, production build and lint pass. Lint has nine warnings (React hook dependency and Fast Refresh export checks), no errors. MathJax and authoring are loaded with detail/editor routes instead of the homepage's initial JavaScript. The article-rendering bundle remains large because SVG fonts are bundled locally.

## Browser checks

The browser uses the actual app, editor and renderer with isolated local repository/upload adapters. Article metadata persists in a separate test-only localStorage key; image/PDF bytes use a loopback upload endpoint. This does **not** exercise the production Firebase-to-GitHub-to-Hosting upload delivery path.

- Clipboard image → inline pending state → type while uploading → completion → set alt/caption/65% width → shared MathJax preview → save → reload: text, image and settings retained.
- Multi-file attachment chooser: image with a long Korean filename and PDF, individual status/size/type, PDF insertion from the list, save/reload.
- Stable-ID citation changes from [2] to [1] after moving its reference above another entry; the same reference remains linked.
- Mathematics-side connection appears on Activity; Activity-side removal disappears from Mathematics.
- Registered author and participant appear on the person's separate detail page in authored content and participated activities.
- Korean and English, at 375, 768 and 1280 pixel viewports: homepage, Mathematics list/detail, Activity list/detail, People list/detail, admin dashboard, Mathematics editor and homepage editor. All 60 route/size/language combinations fit the page width.
- Additional mobile preview with a long title, multiple author names, image/PDF filenames, a 45-term equation and a long code line: text wraps, while equation/code scroll within their own regions. The English admin navigation's minimum grid width was fixed after this check exposed horizontal overflow.
- Read-only review of the existing public Riemann–Hurwitz article caught a font-selection error that requested asynchronous font data. The renderer now selects the bundled MathJax-TeX class through `fontData`; all 190 expressions read from that article pass a separate compatibility check. Font-variant regression cases cover blackboard bold, script/fraktur, matrices, arrows and geometry formulas.

Browser zoom keyboard input was unavailable in the verification tool. Actual Safari, Firefox, touch-device drag/drop, and OS screenshot-copy differences have not been exercised; clipboard/file/drop handling also has automated coverage.

## Deployment boundary

Production data has not been migrated or altered by these tests. The PR preview is read-only for verification because it uses the production backend. Before production use, deploy the updated Firestore rules and main-branch upload/diagram workflow together with the frontend, using the existing Firebase/GitHub credentials. No additional server or secret is required. The optional migration is dry-run by default and is unnecessary for compatibility reads.

After deployment, a controlled real administrator check is still needed for image upload and diagram queue → worker → Hosting delivery. Scheduled processing may take several minutes. Committed immutable files remain public by URL and are retained to protect cross-article references; only abandoned chunks and expired temporary writing sessions are automatically cleaned.
