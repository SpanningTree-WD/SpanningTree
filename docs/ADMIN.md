# Administrator guide

## Access

Open `/admin` and choose **Google로 로그인**. Only verified accounts whose UID is
enabled in the server-managed `admins` collection can edit. Signing in alone
does not grant permission. An unapproved account sees its email and UID; send
the UID to the club's project operator for approval. No shared password is used.

The login lasts for the browser session. Use **로그아웃** on shared computers.
Permission changes are observed while the page is open; revocation closes the
editor and Firestore/Storage independently deny subsequent private operations.
The first permission check requires a server connection.

## Annual Web Developer handoff

Keep `spanningtree.official@gmail.com` as the permanent club administrator.
Use each developer's own Google account; do not share the club password for
routine content editing.

1. Have the incoming developer sign in at `/admin` and provide the UID shown
   on the access-denied screen.
2. A trusted Firebase project operator checks that UID's email in
   Authentication → Users, then creates `admins/{UID}` in Firestore with
   `enabled: true` (boolean). An optional `email` string helps identify the record.
3. Verify that the new developer can open the editor and save a draft.
4. At handoff, set the outgoing developer's membership to `enabled: false`.
   Keep the club account enabled and retain its account recovery information.

Website membership grants content editing. Firebase Console and GitHub access
are managed separately by the club's project and repository owners. When handing
over infrastructure maintenance, review and transfer those permissions as well.
Membership changes do not require a code change or Hosting deployment.

## Editing

Activities, Mathematics, and Publications share the same workflow:

1. Select the content category and choose **New**.
2. Enter the title, URL slug, type and other required metadata.
3. **Save Draft** stores a private draft in Firestore.
4. **Publish** asks for confirmation, saves the entered content, then publishes.
5. **Unpublish** returns the record to draft; it does not delete the record and
   does not save unsaved form changes.

Saving changes to an already published record updates the public record.
There is no separate working revision of published content in this version.
Mathematics uses Markdown and the existing KaTeX preview.

Saved edits are available on other devices. Public pages use these records
only in Firebase mode; the dashboard warns when the public site is still a
local fixture preview. No admin write is stored only in localStorage.

Slugs must be unique within each category. They are reserved transactionally,
including for drafts. Renaming a slug releases its previous reservation; old
public URLs do not redirect automatically, so avoid changing published URLs.
Related content continues to use stable IDs.

If another editor saves the same record, a stale save is rejected. Copy your
unsaved text, reload, and reconcile the changes. Network/permission failures
show an error instead of a successful save. Reloading or closing a dirty editor
warns before leaving; internal-navigation protection is still future work.

## Files and limits

Image and PDF fields still contain metadata/placeholders. Upload, file selection,
and real download links are not part of the authentication/storage connection
stage. The server's Storage authorization is prepared for the later media UI.
Content deletion, revision history, and automatic local-prototype import are
also not implemented.
