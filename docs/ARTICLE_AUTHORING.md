# Article authoring and content relationships

## Data compatibility

The Markdown body remains a string. CodeMirror supplies image paste, drop, native text editing and undo. Upload completion changes asset metadata, not the body text or selection. Images and PDFs use stable `{{asset:ID}}` blocks; deleting a body block keeps the file in the article attachment list. An explicit attachment delete removes that article's matching blocks and legacy cover/PDF reference. Stored objects are immutable and content-addressed, so removing or replacing one article's reference cannot delete a file used by another article.

`assets`, `diagrams`, `references`, `authorIds` and `participantIds` are optional fields. Legacy articles remain readable. Managed cover/PDF URLs receive deterministic `legacy-HASH` asset IDs when opened for editing, while their original fields remain intact. Legacy names are preserved verbatim; no uncertain name matching is performed. People use Firestore document IDs. A rename therefore preserves connections, and deleted People IDs are omitted from public links.

Citations contain reference IDs (`[@first; @second]`), never display numbers. Rendering derives numbers from the current reference order. Removing a cited reference requires confirmation and removes its IDs from citations; remaining references in a multi-citation survive.

The canonical Activity–Mathematics relationship is `mathematics.relatedActivities`. Records with `relationshipVersion: 2` ignore legacy Activity-side copies. Older records use the union of both legacy arrays, so one-sided links are not lost. Activity saves update affected Mathematics documents in one Firestore transaction, preserve other Activity links, and detect stale editing sessions. Public relationship and People pages only query published content; private or deleted records are not resolved to titles or links.

An optional bulk migration is available in `scripts/migrate-authoring-relations.ts`. It is **not needed before using the new reader**. Use a maintenance window if applying it so open editor sessions can be reloaded. With the existing authorized Admin SDK credential and `GOOGLE_CLOUD_PROJECT=spanningtree-math`, run `npx tsx scripts/migrate-authoring-relations.ts` first. This writes a local timestamp-preserving JSON backup and reports the proposed count without database writes. Inspect that backup and output, set `CONFIRM_AUTHORING_MIGRATION=spanningtree-math`, and rerun with `--apply` only when ready. The migration is idempotent and retains legacy fields, names, files and body content. Backups contain content and must stay outside the repository. Restore only reviewed affected fields with fresh conflict checks; do not overwrite concurrent edits with an entire old export.

## Production release order

The existing GitHub deployment service account can deploy Hosting but cannot validate or publish Firebase Rules (the Rules API returns 403). Keep its permissions unchanged. Before releasing changes that require new rules, an authorized project administrator must publish the tested repository `firestore.rules` through the Firebase console and verify the active version. Then release the main-branch worker and frontend. The Hosting workflow still runs all application and emulator checks; it does not deploy rules. Do not treat a successful Hosting deployment as proof that rules were updated.

## Upload lifecycle

The existing Firestore chunk queue → GitHub immutable file → Firebase Hosting pipeline is retained. A new unsaved article reserves a UUID and creates a private `uploadSessions/{uid}/records/{recordId}` record expiring in 24 hours. This permits immediate uploads without creating a placeholder article. Saving creates the article at the reserved ID; reopening reads the saved asset metadata. A queued or failed attachment blocks saving/publishing with a retry/remove explanation.

The account-wide worker slot is sequential, while the writing UI owns a queue per article and editor visit. Aborting a visit cancels active transfer/watch operations and ignores late callbacks. Canceling an edit never writes article metadata. Cancelled/abandoned upload chunks are cleaned by the worker (abandoned transfers after one hour), and expired private writing sessions are cleaned by the scheduled workflow. Successfully committed immutable files are deliberately retained, including if a user subsequently cancels writing: they may already be shared by another article. There is no destructive automatic garbage collection of committed files in this change. A future collector must inventory every published/draft body, legacy cover/gallery/PDF reference, asset and diagram, include a grace period, and recheck references before deletion.

Accepted files: JPEG, PNG and WebP up to 8 MB, PDF up to 20 MB; the backend verifies bytes and hashes. Files on Hosting are public to anyone with their URL, including files selected in an unpublished draft. This pre-existing storage property is stated next to the attachment drop area. This feature does not make Hosting files private. Scheduled processing runs every five minutes, and deployment can add delay; typing remains available throughout.

## MathJax, TikZ and Asymptote

The common Markdown renderer uses locally bundled **MathJax 4**, its TeX input and SVG output/font. Supported delimiters are `$…$`, `\(…\)`, `$$…$$` and `\[…\]`. Code spans/fences are left as code. No CDN, remote extension loader, `require`, or MathJax HTML extension is enabled. Equation failures remain local to the equation. The same renderer is used for the public article and writing preview, including images, files, citations and reference lists. SVG/HTML output is sanitized; long equations scroll within their own area.

TikZ and Asymptote now render locally in Web Workers. The editor, CodeMirror blocks,
article preview and public reader share the same renderer. A new diagram stores
`renderer: "browser-v1"`, language, source, source hash, alt text and caption, with
no uploaded image URL or SVG in Firestore. Authors render/review before inserting;
a source edit invalidates the reviewed result. Rendering never writes a diagram
request or dispatches GitHub Actions, so a stale legacy request cannot block it.

Runtime versions are pinned in package-lock.json and copied to same-origin,
versioned `/vendor/diagrams/` URLs by `npm run diagrams:assets` (predev/prebuild).
Pages without browser diagrams do not load either runtime. Reader diagrams are
rendered near the viewport; workers are created on demand, one per language.
Each load/compile operation is bounded to 30 seconds. On timeout, abort, or error,
the worker is terminated; a retry creates a fresh instance. Failed results are
never cached. Successful SVG is sanitized, stored in a bounded browser cache
(memory + IndexedDB), and checked again when read. Engine versions, preamble,
language and source all contribute to the cache key. Cache failure falls back to
rendering. IndexedDB holds at most 32 results / approximately 8 MB.

TikZ uses the pinned TikZJax TeX worker with `amsmath`, `amssymb`, and libraries
`arrows.meta`, `calc`, `positioning`, `decorations.pathmorphing`, `cd`. Enter a
`tikzpicture`, `tikzcd`, or compatible body fragment. This is not a full arbitrary
TeX installation: custom fonts, XeLaTeX/CJK packages, shell commands, external
files and arbitrary packages are unsupported. Compiler diagnostics stay local
to the failed diagram. The asset preparation script changes compressed-file
suffixes from `.gz` to `.bin` to prevent HTTP servers decoding gzip twice; bytes
remain compressed. Its pinned worker RPC and transformation are covered by the
real browser tests; upgrading TikZJax requires rerunning them.

Asymptote uses asymptote-web 0.3.3 in safe mode for 2D SVG output. Its native
browser build lacks TeX; our small, checked build-time patch to `plain_Label.asy`
preserves evaluated label text in EPS markers. The upstream converter carries
these into SVG, and the existing local MathJax renderer draws text and `$...$`
math at the computed positions. Label metrics/layout are approximate, so review
complex labels and tight alignments. TeX preambles/custom fonts, `texpath`, native
PDF/PRC, interactive 3D, animation and external programs are not supported by this
integration. Both runtimes remain inside the browser; source is never sent to a
third-party rendering service. See [runtime notices](BROWSER_DIAGRAMS.md).

Existing PNG diagrams keep rendering from their immutable URLs. Opening and
applying an old diagram converts only that edited diagram to browser rendering;
no bulk content migration or file deletion happens. The legacy sandbox and queue
remain for already queued jobs and old clients. File/PDF uploads keep their
existing GitHub workflow. This frontend change needs no new Firebase rules,
Cloudflare deployment, secret, paid service, or database migration.

`npm run test:browser-diagrams` runs actual Chromium and mobile-layout WebKit
checks for both engines, source-only saving and reading, math labels, libraries,
cache reuse, invalid input and terminating/restarting infinite loops. Tests use
local fixtures, never production writes. Unit tests verify validation and SVG
sanitization; emulator tests verify source-only draft/publish/read persistence.
