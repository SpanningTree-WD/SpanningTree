# Spanning Tree Website — Production Architecture Proposal

## 1. Purpose and scope

This document proposes how to turn `reference/spanning_tree_sample.html` into a
maintainable production website without changing its approved visual direction.
It is an architecture proposal only. It does **not** connect Firebase, implement
authentication, or migrate the prototype.

The architecture must support two equally important goals:

1. a public academic archive that remains useful across many student generations;
2. an in-site editing workflow at `/admin`, prototyped first behind the temporary
   session password gate described below and protected by real authentication only
   in a later phase.

The prototype remains the visual source of truth. During implementation, its
typography, colors, spacing, borders, archive layouts, and hierarchy should be
carried over before any optional enhancement is considered.

## 2. Prototype analysis

### 2.1 Current behavior

The prototype is one HTML document containing all CSS, markup, sample content,
inline SVG, and navigation JavaScript. Six page-like `<section>` elements are
mounted at once. A small `showPage` function changes the active section when a
`data-page` control is clicked; the browser URL does not change and there are no
independently addressable detail pages.

This is effective as a visual prototype, but not as a production archive:

- pages cannot be linked to or refreshed at their own URLs;
- content is duplicated directly in presentation markup;
- filtering, sorting, search, PDF actions, and mentorship controls are visual
  placeholders;
- archive records do not yet have detail routes;
- CSS selectors, content, layout, and behavior share one file;
- every public record is available to the UI with no draft/published boundary.

### 2.2 Visual system to preserve

The prototype establishes a restrained “Modern Academic Archive” system:

- warm off-white canvas and paper surfaces;
- near-black type, muted green accents, and gray-green hairline borders;
- Georgia-style serif display headings with a sans-serif body/interface face;
- a `1280px` general container and a planned `780px` reading width;
- editorial grids, compact metadata, archive rows, thin separators, and generous
  whitespace rather than a collection of rounded cards;
- desktop, tablet (`980px`), and mobile (`650px`) layout changes;
- a sticky three-part header and dark green footer shared across pages.

The existing CSS custom properties should be the starting values for production
design tokens, not replaced with a new theme. The tree SVG, generated placeholder
art, publication covers, and inline icon characters should initially be treated
as prototype assets; real managed media can replace placeholders later without
altering their layout roles.

### 2.3 Identified public pages and layouts

| Route | Prototype page | Primary layout and purpose |
| --- | --- | --- |
| `/` | Main | Hero with tree artwork, then a three-column overview of featured activities, latest mathematics, and a publication. |
| `/about` | About | Introduction/photo split, followed by What We Do, History timeline, and Philosophy columns. |
| `/people` | People | Generation rows with person nodes and a visual mentorship-connection toggle. |
| `/activities` | Activities | Faceted archive: year/type sidebar, result controls, image-led activity rows. |
| `/publications` | Publications | Faceted archive: type/year sidebar, cover-led rows, metadata, and PDF action. |
| `/mathematics` | Mathematics | Journal/library-style faceted archive: field/type/year sidebar and cover-led reading rows. |

The production archive also needs routes implied by the content model even though
the prototype does not draw them yet:

| Route | Purpose |
| --- | --- |
| `/activities/:slug` | Activity narrative, gallery, and related mathematics/publications. |
| `/publications/:slug` | Publication metadata, description, contributors, PDF, and related records. |
| `/mathematics/:slug` | Long-form mathematical content, authorship, attachments, and related records. |
| `/people/:slug` | Optional later addition if a person needs a profile; do not add merely for decoration. |
| `/search` | Optional later unified published-content search reached from the existing search control. |
| `*` | A not-found page using the same public shell. |

Detail layouts must be derived from the same type, spacing, border, reading-width,
and metadata patterns at migration time. They should not be independently
redesigned.

### 2.4 Reusable UI components

The following component boundaries come directly from repeated prototype
patterns. Components should remain small and semantic; they should not become a
large generic design-system dependency.

**Site shell**

- `SiteHeader`, `PrimaryNavigation`, `SearchButton`
- `SiteFooter`
- `PageContainer` and `PageHeading`
- `ButtonLink`

**Home and editorial sections**

- `HomeHero` and `TreeArtwork`
- `SectionHeading`
- `FeaturedActivityCard`
- `CompactMathematicsItem`
- `FeaturedPublication`

**Archive patterns**

- `ArchiveLayout`, `FilterSidebar`, `FilterGroup`, `FilterOption`
- `ResultsToolbar` and `ArchiveList`
- content-specific `ActivityArchiveRow`, `MathematicsArchiveRow`, and
  `PublicationArchiveRow`
- `Tag`, `ContentMeta`, `PublicationCover`, `MathematicsCover`
- pagination or “load more” when real query volumes require it

The three row components should share structural primitives, not one component
with many conditional props. Activities are photographic, publications emphasize
their covers and files, and mathematics emphasizes reading metadata; preserving
those distinctions preserves the approved hierarchy.

**About and people**

- `AboutHero`, `FeatureList`, `HistoryTimeline`, `PhilosophyQuote`
- `PeopleToolbar`, `GenerationRow`, `PersonNode`

**Detail content**

- `ContentHeader`, `ContributorList`, `RelatedContent`, `AttachmentList`
- `RichTextRenderer` with a deliberately restricted, sanitized content format
- `MediaGallery`

Loading, empty, error, and not-found states should be first-class components and
use the same quiet editorial language.

## 3. Approved production stack

Use a single repository and a single TypeScript web application. The production
frontend stack is approved as:

- **React + TypeScript** for reusable public and admin interfaces;
- **Vite** for a small, understandable development/build setup;
- **React Router** for real public, detail, and `/admin` URLs;
- **plain CSS with CSS Modules (or consistently scoped feature styles)** for
  component styles, plus one centralized token file;
- **Firebase's modular web SDK**, added only when the relevant integration phase
  begins;
- **Vitest + React Testing Library** for a small number of focused logic and
  component tests where they provide clear value.

This stack gives the admin area reusable form state and routing without introducing
a large framework or styling library. Avoid a state-management library initially:
router state, component state, and small context providers are sufficient. Add a
dependency only when a concrete requirement cannot be met clearly with the
platform and the chosen core stack.

For v1, Firebase Hosting serves the client-rendered build with a rewrite to
`index.html`; SSR and prerendering are explicitly out of scope. Routes remain
genuine client-side URLs. SEO, social previews, and prerendering can be evaluated
later if public Mathematics articles or other pages demonstrate a concrete need.

## 4. Proposed directory structure

```text
/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CONTENT_MODEL.md
│   ├── DESIGN.md
│   └── PROJECT_CONTEXT.md
├── reference/
│   └── spanning_tree_sample.html
├── public/
│   └── static/                    # Stable, non-managed assets
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   ├── components/
│   │   ├── archive/               # Repeated archive primitives
│   │   ├── content/               # Metadata, relationships, rich content
│   │   ├── layout/                # Header, footer, containers
│   │   └── ui/                    # Button, tag, state messages
│   ├── features/
│   │   ├── about/
│   │   ├── activities/
│   │   ├── admin/
│   │   ├── home/
│   │   ├── mathematics/
│   │   ├── people/
│   │   ├── publications/
│   │   └── search/
│   ├── models/                    # Application-level domain types
│   │   ├── activity.ts
│   │   ├── common.ts
│   │   ├── mathematics.ts
│   │   └── publication.ts
│   ├── repositories/              # Interfaces and implementations
│   │   ├── contracts.ts
│   │   ├── local/                 # Fixture-backed implementation first
│   │   └── firebase/              # Firestore adapters later
│   ├── services/
│   │   ├── admin-access/          # Replaceable prototype session gate
│   │   ├── firebase/              # SDK initialization/configuration later
│   │   └── storage/               # Upload/file boundary later
│   ├── content/
│   │   └── fixtures/              # Typed prototype/sample records
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── typography.css
│   ├── test/
│   └── main.tsx
├── firebase.json                  # Hosting/emulator configuration later
├── firestore.rules               # Added with Firestore integration
├── storage.rules                 # Added with Storage integration
└── package.json
```

Feature directories should contain route pages and components unique to that
feature. Reusable visual pieces move to `components` only after they are actually
shared. For v1, only Activities, Mathematics, and Publications need editable
domain models and repositories. About, People, History, and other static site
information remain source-controlled. Domain types must not import Firebase types.
Repository implementations may import domain types; UI components receive domain
objects or view models and must not receive Firestore snapshots.

## 5. Application layers and dependency direction

The application should follow a simple dependency direction:

```text
route page -> feature UI -> application/domain models
                         -> repository contract
repository implementation -> local fixtures OR Firebase services
Firebase services -> Firebase SDK
```

### UI and routes

Route components select filters from URL search parameters, request records from
a repository, and compose presentation components. Presentational components do
not know whether records came from fixtures, Firestore, or an emulator.

### Application/domain models

`Activity`, `Mathematics`, and `Publication` are the v1 application-level models
based on `docs/CONTENT_MODEL.md`. Shared value types should include
`ContentStatus`, media references, attachment metadata, timestamps, and related
record references. Authors and editors are plain string arrays in v1; they do not
reference People records. About, People, History, and other static information
remain ordinary source-controlled content until a real editing need is approved.

The Home page does not have its own CMS model in v1. Its dynamic sections are
derived through documented queries over published Activities, Mathematics, and
Publications—for example, explicitly featured activities, latest mathematics,
and a selected or latest publication. Static hero copy and artwork remain in
source control.

Application models should use predictable values such as ISO date strings or
domain date objects at the UI boundary. Firestore `Timestamp`, `DocumentReference`,
and raw storage paths stay inside Firebase adapters.

### Repository contracts

Use content-specific repository interfaces, for example:

```ts
interface ActivityRepository {
  listPublished(query: ActivityListQuery): Promise<Page<ActivitySummary>>;
  getPublishedBySlug(slug: string): Promise<Activity | null>;
}
```

Admin-only capabilities should be explicit (`listAll`, `getById`, `create`,
`update`, `publish`, `unpublish`) rather than making public code pass a status
flag. Similar contracts apply to mathematics and publications. A home-content
service can compose featured/latest queries across repositories without coupling
the home UI to storage details.

Repository methods must define sorting, filtering, pagination, missing-record,
and error semantics. Relationship resolution belongs in repositories or an
application service, avoiding one query per related item from a rendering loop.

### Initial local implementation

Before Firebase is connected, typed fixture files implement the same repository
contracts. This preserves the prototype's sample content while exercising the
real page and component boundaries. Swapping the repository provider later should
not require rewriting route or presentational components.

## 6. Firebase connection points (later phase)

No Firebase SDK, project configuration, query, authentication, or rules should be
added as part of the architecture-only task.

When integration is approved, Firebase connects at these boundaries:

### Hosting

- deploy the Vite production output;
- rewrite non-file routes to `index.html` so `/mathematics/:slug` and `/admin`
  load directly;
- keep cache rules for hashed assets separate from HTML and managed files.

### Authentication (after the prototype stage)

- Firebase Authentication is not implemented for the initial admin prototype;
- when real access control is required, an authentication service will replace the
  temporary admin-access implementation behind the same small interface;
- a future `AdminRouteGuard` can protect `/admin` routes in the UI;
- route guards are convenience, **not security**—Firestore and Storage Security
  Rules provide the actual authorization boundary once Firebase is connected;
- v1 does not require complex roles, permissions, or custom claims.

### Cloud Firestore

- `repositories/firebase` contains all queries and document converters;
- collections will likely include `activities`, `mathematics`, `publications`,
  and later `people` and site settings, subject to model review;
- converters map documents to application models and back, including timestamps,
  defaults, and relationship IDs;
- public repository methods always constrain records to `status == "published"`;
- composite indexes are documented beside the supported archive filters/sorts;
- rules validate allowed fields and protect draft/admin writes.

Relations should initially store stable record IDs, while slugs remain public URL
identifiers. If denormalized title/cover summaries are introduced for performance,
the canonical ID remains authoritative and the synchronization strategy must be
documented.

### Storage

- `services/storage` owns image/PDF upload, deletion, path construction, progress,
  and metadata;
- v1 accepts JPEG, PNG, and WebP images and PDF documents only;
- image metadata includes required descriptive alt text (or an explicit empty alt
  value only when an image is genuinely decorative);
- simple documented file-size limits are enforced at the form/service and Storage
  Rules boundaries;
- Firestore stores managed file metadata and storage paths/download references,
  not file bytes;
- admin forms upload through this service, then save the resulting media reference
  through a repository;
- rules restrict upload types, locations, and sizes and restrict writes to
  authorized administrators once real authentication exists.

Do not build an advanced media library, retention workflow, or raw-file archive
for v1. Firebase Storage should contain the optimized assets needed by the public
website. Original large/raw activity files may remain in the club's existing
external archive when appropriate.

Use environment variables only for Firebase's public web configuration and commit
an `.env.example`, never service-account credentials, private keys, or passwords.
Local development should eventually use Firebase Emulator Suite and a clearly
separate demo project/configuration to avoid accidental production writes.

## 7. `/admin` architecture

`/admin` should live in the same application and reuse domain models, repository
contracts, validation, tokens, and basic UI primitives. It should have a distinct
`AdminLayout`; the public header/footer and editorial archive presentation are not
appropriate management navigation. This separation also prevents admin controls
from leaking into public components. Only Activities, Mathematics, and
Publications are editable in v1.

Proposed routes:

```text
/admin                               # Password gate, then dashboard
/admin/activities
/admin/activities/new
/admin/activities/:id/edit
/admin/mathematics
/admin/mathematics/new
/admin/mathematics/:id/edit
/admin/publications
/admin/publications/new
/admin/publications/:id/edit
```

### Temporary prototype password gate

The initial prototype deliberately uses a minimal client-side password gate
instead of Google Sign-In or Firebase Authentication:

1. an unauthenticated browser session visiting `/admin` sees a password input;
2. entering the configured prototype password marks that browser session as
   admitted, using session-scoped client state such as `sessionStorage`;
3. admin routes consult a small `AdminAccessService` interface rather than reading
   browser storage or comparing passwords throughout the UI;
4. closing the browser session removes access.

This mechanism provides **no meaningful security**. Client code and client-side
configuration can be inspected or bypassed, so it must never protect real private
data or production writes and must not be described as authentication. It exists
only to prototype admin navigation, content lists, forms, Markdown editing and
preview, and draft/publish workflows. Do not spend time adding hashing, roles,
claims, account management, or other security features to it.

The gate's interface should expose only the session operations the admin shell
needs (for example, `hasAccess`, `grant`, and `clear`). The temporary implementation
stays in `services/admin-access`; the route guard and admin UI depend on the
interface. A future Firebase Authentication implementation can replace it without
rewriting admin pages, editors, repositories, or public UI. The application must
not otherwise be designed around the prototype password.

Admin lists should make draft/published state unmistakable and support title,
updated date, status, and edit actions. Editors should use shared field components
but content-specific forms because each model has different metadata and media.

Form data flows through this sequence:

```text
editor fields -> feature validation -> application input model
              -> admin repository -> Firestore adapter (later)
              -> success/error state in editor
```

Publishing must be an explicit action separate from ordinary draft saving. New
records default to `draft`; publish/unpublish actions require confirmation and
update publication metadata consistently. Unsaved-change warnings, accessible
field errors, upload progress, and retryable failures are required production
behavior. A preview should render the same public content components against
unsaved form state or a draft record rather than maintaining duplicate preview
markup.

Long-form Mathematics content uses Markdown. The v1 editor is a straightforward
Markdown text area with a preview rendered by the same public
`MarkdownRenderer`. It supports headings, paragraphs, lists, links, fenced code
blocks, inline mathematics, and display mathematics. KaTeX renders math notation.
Markdown parsing, HTML sanitization, link behavior, code presentation, and KaTeX
configuration remain centralized in this renderer; unrestricted stored HTML is
not supported. A complex WYSIWYG editor is unnecessary for v1.

## 8. Prototype migration plan

Migration should happen in reviewable stages after this proposal is approved.

### Stage 1 — establish the application shell

1. Scaffold Vite, React, TypeScript, routing, linting, and tests with minimal
   dependencies.
2. Preserve the reference HTML unchanged as a comparison artifact.
3. Move prototype custom properties into `tokens.css`; move resets, typography,
   and shared element rules into global styles.
4. Build `SiteHeader`, route-aware navigation, `SiteFooter`, and public layout.
5. Add the six current routes plus not-found handling. Verify direct navigation,
   keyboard operation, focus states, tablet, and mobile behavior.

### Stage 2 — migrate the approved public pages faithfully

1. Move the Main, About, and People markup into semantic feature components.
2. Move archive primitives and each content-specific row into reusable components.
3. Replace inline style attributes with named scoped classes while retaining their
   exact visual effect.
4. Move the inline tree SVG into a dedicated accessible component.
5. Convert buttons that navigate into links and retain buttons only for actions.
6. Compare each route at desktop/tablet/mobile sizes against the prototype before
   making improvements.

This stage is a faithful decomposition, not a redesign. Small accessibility fixes
(semantic links, labels, focus visibility, reduced-motion behavior, useful alt
text, and real form controls) should preserve the visual language.

The People page and mentorship toggle remain mostly presentational in v1. Do not
build a mentorship graph, database model, or relationship editor for the first
production release; revisit it only when a concrete use case is approved.

### Stage 3 — separate content from presentation

1. Define application models and repository contracts.
2. Convert hard-coded sample records to typed local fixtures.
3. Implement local repositories, filtering, sorting, and URL search parameters.
4. Feed home sections and archive routes through repository contracts.
5. Add activity, mathematics, and publication detail routes using the existing
   editorial vocabulary.
6. Add loading, empty, error, and relationship states.

At this point the site remains Firebase-free but behaves like the production
application. Fixture IDs, slugs, statuses, media metadata, and relations should
exercise the planned content model.

### Stage 4 — prototype the admin workflow locally

1. Add the isolated temporary password gate and session-only access service.
2. Add the admin layout, dashboard, lists, and content-specific editors for
   Activities, Mathematics, and Publications only.
3. Add Markdown editing with shared Markdown/KaTeX preview for Mathematics.
4. Implement validation, draft/publish flows, preview, and fake/local upload
   behavior through service interfaces.
5. Test public exclusion of drafts and the most valuable editor/model mappings
   without Firebase.

The password gate is only workflow scaffolding and must display a concise warning
that it is not secure authentication.

### Stage 5 — connect Firebase after separate approval

1. Add modular Firebase initialization and environment documentation.
2. Implement Firestore converters/repositories behind existing contracts.
3. Implement the simple Storage service and its file constraints.
4. Develop and test Firestore/Storage rules and required indexes with emulators.
5. Seed or import reviewed content, test draft isolation, then configure Hosting.
6. Document deployment, backup/export, account recovery, and student handoff.

Firebase Authentication is a later replacement step when the editing system needs
real access control; it is not required merely to complete the initial workflow
prototype. At that time, replace `AdminAccessService` and add appropriate Security
Rules without changing admin feature components.

Each stage should be a small series of commits and should leave the application
runnable. Manual comparison screenshots at representative desktop, tablet, and
mobile sizes are sufficient for the initial faithful migration; comprehensive
visual-regression infrastructure and a large end-to-end suite are not required.
Because this proposal changes documentation only, no screenshot is required now.

## 9. Content lifecycle and public visibility

The future editing system should enforce a simple lifecycle:

```text
create -> draft -> edit/preview -> publish -> edit or unpublish
```

- Public pages and cross-content relationships resolve published records only.
- Admin lists can see both states after authorization.
- `createdAt` is set once; `updatedAt` changes on writes; `publishedAt` records the
  publication event according to a documented republish policy.
- Slugs must be validated and unique for their content type. Changing a published
  slug should be discouraged or accompanied by a redirect strategy.
- Delete behavior should initially be archive-safe (unpublish rather than hard
  delete). Any later permanent deletion must check relationships and media.
- Relationship editors should store IDs and present searchable record labels.
- Homepage featured content should eventually be explicit site configuration or
  a documented query rule, not an unexplained UI hard-code.

If a later content change requires a data migration, document and implement only
the smallest migration needed at that time. v1 does not introduce schema-version
fields or advanced migration infrastructure speculatively.

## 10. Maintainability rules for future students

- Keep `reference/spanning_tree_sample.html` as the approved comparison artifact
  until the migration is accepted.
- Keep route definitions in one visible location and Firebase initialization in
  one service module.
- Never call Firestore or Storage directly from route/page/component files.
- Prefer named domain concepts over generic abstractions (`MathematicsArchiveRow`
  is clearer than a deeply configurable `Card`).
- Keep tokens centralized and explain intentional deviations from the prototype.
- Co-locate focused tests with feature logic where they protect meaningful model,
  repository, routing, Markdown-rendering, or draft/published behavior. Do not
  create a large end-to-end suite for v1.
- Document setup, emulator use, content operations, deployment, rules, indexes,
  and recovery in the repository before production handoff.
- Pin supported runtime/package-manager versions and commit the lockfile.
- Keep secrets out of Git and use least-privilege Firebase rules.

## 11. Confirmed v1 boundaries

The following decisions are settled and should guide implementation:

1. The frontend is React, Vite, and TypeScript, kept deliberately simple.
2. Only Activities, Mathematics, and Publications are admin-editable. Other site
   information remains source-controlled, and Home derives dynamic sections from
   those three record types.
3. The admin workflow prototype uses an explicitly insecure, session-only password
   gate behind a replaceable service. Firebase Authentication comes later when
   meaningful access control is required.
4. Mathematics long-form content is Markdown rendered with KaTeX, with a Markdown
   editor and shared preview rather than a WYSIWYG editor.
5. Authors and editors are string arrays, not People references.
6. Firebase Storage later accepts website JPEG, PNG, WebP, and PDF assets with alt
   text for images and straightforward size limits. It is not a raw media archive.
7. People mentorship remains presentational; no graph or relationship model is
   built for v1.
8. v1 is a client-rendered application on Firebase Hosting. SSR, prerendering, and
   advanced SEO/social-preview work are deferred until a demonstrated need.

Also out of scope for v1 are comprehensive visual-regression infrastructure,
large end-to-end suites, schema-versioning or advanced migration systems, complex
CMS permissions and roles, custom claims, and advanced media management. These
features should not be added preemptively.

## 12. Implementation priority order

When trade-offs are necessary, work in this order:

1. faithfully migrate the approved prototype UI;
2. extract reusable React components and centralized design tokens;
3. define clear TypeScript domain models in a simple directory structure;
4. keep UI, application logic, data access, and future Firebase adapters separate;
5. provide direct URL routes for public pages;
6. enforce draft/published content states through repository contracts;
7. keep public routes and the `/admin` feature clearly separated; and
8. leave concise setup, content, and architectural documentation for future
   Spanning Tree Web Developers.

## 13. Acceptance criteria for the later migration

The migration can be considered successful when:

- all approved prototype pages retain their visual hierarchy at desktop, tablet,
  and mobile sizes;
- public routes and content detail routes are directly addressable;
- fixture and Firebase repositories can be exchanged without changing public UI
  components;
- no Firestore/Storage query exists in a UI component;
- drafts never appear through public repository methods;
- `/admin` uses the same models and rendering primitives while remaining a
  separate access-gated management surface;
- common editing, deployment, and handoff tasks are documented for a new student;
- focused tests cover the domain mapping, filters, route states, rendering, and
  draft-to-public behavior where regressions would be costly;
- the temporary password gate is isolated and clearly identified as insecure, so
  Firebase Authentication can replace it without rewriting the admin UI.

Implementation should stop at each approved phase boundary. In particular, this
document does not authorize beginning the migration or connecting Firebase.
