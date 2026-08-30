# Stage 4 local admin prototype

The `/admin` area is a **local workflow prototype**, not a secure content system.
It does not connect Firebase and it does not authenticate users.

## Local access

The disposable password is configured in
`src/services/admin-access/AdminAccessService.ts`. The current development value
is `spanning-tree-prototype`. Never replace it with a real club, Google, GitHub,
or Firebase password. The gate stores only a granted marker in `sessionStorage`,
so **Lock admin** or closing the browser session removes access. Anyone who can
inspect the client can bypass it.

## Local content lifecycle

Activity, Mathematics, and Publication repositories persist prototype edits to
browser `localStorage`. New content is always a draft. **Save Draft** does not
publish it; publishing and unpublishing are separate, confirmed actions. Public
repository methods continue to filter out drafts, while admin methods list both
states. Clearing site data resets edits back to the source-controlled fixtures.

Mathematics content is stored as Markdown. The editor preview and public detail
page both use `MarkdownRenderer`, which centralizes Markdown parsing, HTML
sanitization, and KaTeX rendering. Raw stored HTML should not be used as a content
format.

Media and PDF fields are metadata placeholders only. No upload or remote write is
performed in Stage 4.
