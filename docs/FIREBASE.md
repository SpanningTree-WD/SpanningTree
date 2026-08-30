# Stage 5 Firebase operations

## Project and safe defaults

The canonical project is `spanningtree-math`, using regular Firebase Hosting.
The build deliberately defaults to reviewed local fixtures, so an unseeded
Firestore database cannot make the first website empty. Analytics and Firebase
Authentication are not initialized in Stage 5.

## Local setup and environment

Use Node 20.19 or newer, then run `npm install`, copy `.env.example` to
`.env.local`, and run `npm run dev` or `npm run build`. Fill `.env.local` with the
registered Web App values. Firebase configuration is read only by
`src/services/firebase/firebase.ts`. Set `VITE_PUBLIC_DATA_SOURCE=local` (the
default) for fixtures or `firebase` only after the import has been reviewed.

GitHub Actions reads the six Web App values from GitHub Actions **variables**
with the matching `VITE_FIREBASE_*` names. Hosting does not inject runtime
variables; Vite embeds them during the build. Both workflows currently force
fixture mode. Intentionally change both to `firebase` only after reviewing the
import and rules.

## Firestore repositories and rules

Only `activities`, `mathematics`, and `publications` are used. Firebase adapters
issue a `status == "published"` query and map SDK timestamps to ISO strings before
returning application models. Filters, details, and relationships operate only
on that published result. Rules independently allow reads only for published
documents, deny every write, and deny every other collection. Queries must carry
the published constraint because Firestore rules are not result filters.

No composite indexes are required by the current status-only query; archive
sorting/filtering occurs inside the repository. Admin components intentionally
continue using local repositories.

## Controlled fixture import

The import is never run at application startup. Review fixtures and authenticate
Application Default Credentials externally (never copy credentials into this
repository), then intentionally run:

```sh
gcloud auth application-default login
GOOGLE_CLOUD_PROJECT=spanningtree-math \
CONFIRM_FIRESTORE_IMPORT=spanningtree-math npm run seed:firestore
```

The script preflights every stable document ID and cancels before writing if any
target exists. It then uses one atomic create-only batch, preserving IDs, slugs,
statuses, dates, Markdown, media metadata, and relationships. The operator needs
Firestore IAM permission; browser rules are not weakened for importing.

## Storage

`FirebaseStorageService` provides upload, metadata/download URL, delete, and
replace operations for JPEG, PNG, WebP, and PDF. It is not connected to admin and
is not a raw-photo archive. Storage rules deny all access until managed public
assets and real Authentication are designed. If Storage is not enabled, enable
the default bucket in Firebase Console later; Hosting and placeholders still work.

## Hosting and GitHub deployment

`firebase.json` publishes `dist/`, rewrites client routes to `index.html`, avoids
caching HTML, and long-caches hashed assets. An authenticated local deployment is:

```sh
npm run build
npx firebase-tools deploy --only hosting --project spanningtree-math
```

Pull requests receive seven-day preview channels and pushes to `main` deploy live
through `FirebaseExtended/action-hosting-deploy`. Both install Node 20, install the pinned direct dependency versions, build, and deploy.

### One-time GitHub/Firebase authorization

On a trusted machine authenticated to the club project, run
`npx firebase-tools init hosting:github`, select `spanningtree-math` and this
repository, and authorize creation of the least-privilege service account. Store
its JSON in the repository secret named exactly
`FIREBASE_SERVICE_ACCOUNT_SPANNINGTREE_MATH`; keep the checked-in workflows rather
than regenerating them. Add the six public Web App values as Actions variables.
Never paste a deployment credential into YAML.

## Security, recovery, and limitations

`/admin` remains an insecure, browser-local prototype. It can create, edit,
preview, publish, and unpublish local records only. It has no Firebase authority;
Firestore and Storage writes remain denied. Firebase Authentication is the next
stage and must precede remote editing. Configure managed scheduled Firestore
exports (or documented manual exports to a protected project bucket) before
Firestore becomes live, with recovery access retained by the club account.
