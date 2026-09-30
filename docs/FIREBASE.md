# Firebase operations

The canonical production project is `spanningtree-math` on regular Firebase
Hosting. Hosted builds read Firestore; local development can use fixtures via
`.env.example`. Admin editing always uses Firestore.

## Production setup (2026-09-29)

- Google sign-in is enabled, with the club account as the support contact.
- Both default Hosting domains are authorized for sign-in.
- Firestore rules and indexes are deployed. The archive starts empty by choice;
  sample records have not been imported.
- The club account and the current Web Developer have enabled UID memberships.
  Personal account identifiers are managed in Firebase, not in source code.
- Both Hosting workflows explicitly build with `VITE_PUBLIC_DATA_SOURCE=firebase`.
  A repository variable is no longer needed to select the public data source.
- Browser sign-in must be completed by the account holder. Pre-created accounts
  have no password and are not marked verified by the setup operator; Google
  verifies their Gmail addresses when they sign in.
- Cloud billing is not enabled and the Firebase Storage API is disabled.
  Storage rules are tested locally but have not been deployed to a live bucket.
  File uploads now use the [GitHub Actions queue](GITHUB_UPLOADS.md) without Storage.
  A future move to Firebase Storage would require enabling Blaze and creating a bucket.
  See [Firebase's Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

## First-time setup

1. Deploy the Google provider configuration in `firebase.json` with
   `npx firebase-tools@15.32.0 deploy --only auth --project spanningtree-math`.
   Alternatively, enable Authentication → Sign-in method → **Google** in Console.
   Set the club's support email and register any additional custom domains in
   Authentication → Settings → Authorized domains. Add `localhost` for local
   Google sign-in if needed.
2. Copy `.env.example` to `.env.local` and fill the six registered Web App
   `VITE_FIREBASE_*` values. These identify the public web app, not a service account.
   Keep private keys and deployment credentials outside this repository.
3. Review/import the initial records, or start with empty collections and use
   the admin UI. If records were imported before slug reservations existed, run
   the migration below before enabling remote editing.
4. Deploy the rules intentionally from an authenticated operator machine:
   `npx firebase-tools@14.14.0 deploy --only firestore:rules,firestore:indexes,storage --project spanningtree-math`.
   Enable the default Storage bucket first if needed. Storage rules access
   Firestore; allow Firebase to provision the required cross-service permission
   when prompted. If Storage is not yet enabled, deploy only Firestore rules
   first and keep Storage closed until its rules can be deployed.
5. Have the intended administrator sign in at `/admin`. Copy their Firebase
   Authentication UID (shown on the access-denied screen or in the Console).
   Using **Firestore Console**, create `admins/{UID}` with `enabled: true`
   (boolean). Do not use an email address as the document ID.
6. Set `VITE_PUBLIC_DATA_SOURCE=firebase` in `.env.local` when local development
   should use the live archive. The Hosting workflows already set this value.
   A local build with `local` still displays fixtures.

Membership changes are restricted to trusted Console/Admin SDK operators.
Even approved browser administrators cannot create, enumerate or edit membership
documents. Revoke a member by setting `enabled: false` or deleting their document.
A user can read only their own membership document. Grant the minimum club
operators access to the Firebase project and document annual account handoff.

## Data and authorization

- `activities`, `mathematics`, `publications`: public clients may read only
  published records. Verified approved members may also read drafts and create/
  update content. New client-created records must be drafts. Deletes are denied.
- `admins/{uid}`: trusted operator-managed membership.
- `contentSlugs/{collection}:{slug}`: private URL reservations updated atomically
  with content. Rules enforce the record/reservation relationship, preventing
  duplicate slugs even when two editors create records simultaneously.
- Admin repositories use server reads, transactions and server timestamps.
  Domain models receive ISO strings. Content update rejects a stale `updatedAt`;
  ordinary save preserves status, while publish/unpublish are explicit operations.
- Imported legacy ISO creation timestamps are preserved; new timestamps use
  Firestore Timestamp. The first Mathematics publication timestamp is retained.
- No offline admin persistence or fallback writes are enabled. Public repositories
  still query `status == published`; filtering/sorting is currently in memory.
  No composite indexes are needed by these queries.

Storage accepts only `content/{activities|mathematics|publications}/{recordId}/{fileName}`.
Approved members can manage files for existing records. Public SDK reads require
the parent record to be published. Limits: JPEG/PNG/WebP up to 10 MiB; PDF up to
25 MiB; empty files and other paths/types are denied. These unused Storage rules are
separate from the active GitHub upload limits (8 MiB images / 20 MiB PDFs).
When connecting Storage downloads later, do not treat token-bearing
download URLs as private: an issued URL is a bearer link and must not be used to
promise draft confidentiality merely by changing Firestore status.

## Reviewed import and existing-data migration

Authenticate Application Default Credentials externally; never put service-account
JSON in the repository. Review fixture records before running the import. In
PowerShell:

```powershell
$env:GOOGLE_CLOUD_PROJECT = 'spanningtree-math'
$env:CONFIRM_FIRESTORE_IMPORT = 'spanningtree-math'
npm run seed:firestore
```

The import creates content and slug reservations in one create-only atomic batch.
It cancels if any target exists. It is never called by the website or deployment.
Existing localStorage edits are not part of this fixture import.

For records already in Firestore, take a backup and suspend editing, then run:

```powershell
$env:GOOGLE_CLOUD_PROJECT = 'spanningtree-math'
$env:CONFIRM_FIRESTORE_SLUG_MIGRATION = 'spanningtree-math'
npm run migrate:slugs
```

The migration checks duplicate/invalid slugs and conflicting reservations before
writing. It creates missing reservations in retryable batches and never rewrites
content. Rerunning is safe. Complete it before exposing admin creation, or an old
unreserved slug could be claimed by a new record.

## Multiple mathematics fields rollout

The optional `mathematics.fields` array supports 1–16 distinct, nonblank field
names of at most 100 characters. It includes custom names and keeps its first
entry in the existing `field` string. Legacy records without the array remain
valid; no seed or data migration is needed. Existing authentication and draft
read/write boundaries remain unchanged.

Deploy the reviewed additive Firestore rules **before** merging/deploying the
new editor, because Hosting workflows do not deploy rules:

```sh
npx firebase-tools@14.14.0 deploy --only firestore:rules --project spanningtree-math
```

Use the reviewed branch checkout when deploying the rules. PR Hosting previews
share the production Firebase project: test save behavior in the demo emulators,
not by creating live records in a preview. Before a production rules deployment,
compare the currently deployed rules with the repository version so unrelated
operator changes are preserved.

Older browser tabs can still read the retained primary `field`. Once a record
has multiple fields, refresh an older editor before changing its primary field;
rules reject mismatched `field`/`fields` values instead of silently losing
selections. If reverting the frontend after multiple-field records exist, retain
the additive rules so those records remain editable. Do not roll back the rules
to the old schema or delete the new arrays.

## Local verification

Use Node 20.19+ and Java 21+ (on PATH or JAVA_HOME) for the Firebase emulators:

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:rules
```

Rules tests start Auth, Firestore and Storage emulators using
`demo-spanning-tree`; they refuse to run without emulator endpoints. They exercise
public/draft reads, unauthorized writes, membership escalation/revocation, schema
checks, all three repository lifecycles, conflicting edits, slug uniqueness and
Storage authorization. Never point these tests at a real Firebase project.

For manual local work, start the same emulators, use a demo Web App configuration
(project ID `demo-spanning-tree`, matching demo bucket/auth domain and nonempty
dummy Web App values), and set both `VITE_PUBLIC_DATA_SOURCE=firebase` and
`VITE_USE_FIREBASE_EMULATORS=true`. Emulator routing is disabled in production builds.
Create a demo Auth user and matching enabled membership in the emulator, not in
production. No real Google credentials are needed for emulator sign-in.

## GitHub deployment and recovery

`github-uploads.yml` processes private `uploadRequests/{uid}` records with the
existing deployment service account and commits verified bytes using `GITHUB_TOKEN`.
That service account requires an operator-approved `roles/datastore.user` grant,
which covers project-wide Firestore data, not just the upload queue. Browser
rules do not constrain Admin SDK access. See [upload operations](GITHUB_UPLOADS.md).

The `chunks.data` field is exempt from indexing. Deploy `firestore.indexes.json`
along with rules. Only the verified owner can submit/read a request; only the
worker can mark it processing or complete. Files themselves are public once committed.

The Hosting workflows run npm ci, lint, unit tests, emulator rules tests and build. They read Web App values
from Actions variables, deployment credentials from
`FIREBASE_SERVICE_ACCOUNT_SPANNINGTREE_MATH`, and explicitly select the `firebase`
public data mode. Values are embedded at build time.
Rules are deployed separately by an operator; Hosting deploys do not deploy rules.

Before launch, verify Google sign-in on the actual domain, one approved and one
unapproved account, cross-browser create/edit/publish/unpublish, and draft isolation.
Confirm project authorization and preview/live deployments in GitHub.

Set up scheduled or documented manual Firestore exports before using it as the
live archive. Back up content, membership and slug reservations together, document
restore access, and verify restoration. Retain account recovery with the club.
The original `docs/ARCHITECTURE.md` is a historical plan; this document describes
the implemented behavior.

## Firebase references

- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Configure providers with the CLI](https://firebase.google.com/docs/auth/configure-providers-cli)
- [Authentication persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Transactions and getAfter rules](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Storage rules and Firestore authorization](https://firebase.google.com/docs/storage/security/rules-conditions)
