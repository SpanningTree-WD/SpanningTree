# Language and homepage settings

The header and administrator sign-in screen offer Korean / English. Only the browser's localStorage key `spanning-tree.language` stores this preference. No account, Firestore, or site-wide language is changed. A first visit uses the primary browser language (Korean -> ko; English or any unsupported language -> en). Storage restrictions still allow a session-only choice.

`src/i18n/messages.ts` contains interface copy. Missing interface translations fall back to the supplied source. Article titles, bodies, names, custom fields, and attachment names are not automatically translated. Homepage text has explicit ko/en versions; an empty version falls back to the other original version.

## Administrator workflow

Open **Administration -> Edit homepage**. Edit the two titles and introductions, and select the homepage introduction font. Font stacks support Korean and English; the exact installed typeface can vary by device. The font applies only to the homepage hero title and introduction.

**Save draft** preserves work privately without changing the public homepage. **Discard unsaved changes** restores the last loaded/saved draft. **Restore defaults** only changes the form until the administrator explicitly publishes. Check the Korean/English and 375px mobile/1280px desktop previews, acknowledge the preview, then choose **Publish homepage** and confirm. The preview renders the same HomeHero component and CSS as the public page in an isolated iframe viewport.

Public readers subscribe only to `siteSettings/homepage`. Admin drafts use `siteDrafts/homepage`. Both documents contain `settings`, a revision number, and a server timestamp. Transactions reject stale versions rather than overwrite another administrator's work. Publishing atomically updates both documents. Public settings survive reconnects; a missing or temporarily unavailable document leaves the built-in homepage readable.

## Authorization and deployment

Firestore rules require a verified Google account with `admins/{uid}.enabled == true` for every draft read and settings write. Hiding the editor is not the authorization boundary. Readers cannot access drafts. Server validation bounds bilingual text, accepts only supported fonts/schema keys, enforces revision increments and server timestamps, and requires the matching draft in a publication transaction.

Deploy the updated Firestore rules as well as Hosting. The existing Hosting workflow does not deploy rules. Run `npm run lint`, `npm test`, `npm run test:rules`, and `npm run build`. Emulator tests use a demo project and cover reconnects, private drafts, unauthenticated/unverified/revoked writes, concurrent edits, and malformed values. Never use production content for write tests.

## Extension points

The current version intentionally implements title, introduction, font, draft, preview, and publication first. `HomepageSettings.schemaVersion` and its nested `hero` object are the common contract shared by the editor, preview, public renderer, repository, and server rules.

Future image/logo fields should use the existing validated upload references; typography/colors should use bounded values rather than arbitrary CSS; buttons should have localized labels and validated URLs; sections should have stable IDs, visibility and an ordered list. Extend this contract, validation, rules, and shared renderer together. Do not mix visitor language preferences into published settings.
