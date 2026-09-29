# Spanning Tree — Content Model

The following models are preliminary.
They may change as the website develops.

## Activity

- id
- slug
- title
- summary
- description
- date
- type
- coverImage
- gallery
- tags
- relatedMathematics
- relatedPublications
- status
- createdAt
- updatedAt

status:
- draft
- published

## Mathematics

- id
- slug
- title
- summary
- content
- authors
- field
- type
- year
- tags
- coverImage
- attachments
- relatedActivities
- relatedPublications
- relatedMathematics
- status
- createdAt
- updatedAt
- publishedAt

Possible types:

- Lecture Note
- Article
- Problem Set
- Poster
- Slides

## Publication

- id
- slug
- title
- summary
- description
- year
- type
- coverImage
- pdfUrl
- authors
- editors
- relatedActivities
- relatedMathematics
- status
- createdAt
- updatedAt

## Implemented uploaded media

`MediaReference` retains `alt`, `variant`, optional `caption`, and adds optional
`url` for a GitHub-uploaded JPEG/PNG/WebP file. `variant` remains the prototype
fallback when no image has been attached.

PDF attachment metadata is `{ label, fileName, mediaType, sizeLabel, url? }`.
Mathematics uses `attachments[]`; Activity adds optional `attachments[]`;
Publication uses optional `pdf` (the earlier `pdfUrl` proposal is not used).
Uploaded URLs are site-relative `/uploads/{sha256}.{extension}`. Files are public
independently of the parent record's publication status.

The private `uploadRequests/{uid}` processing model is separate from content.
See [GitHub upload operations](GITHUB_UPLOADS.md).

## Separation

UI code should not depend directly on Firestore document structure.

Create application-level types/models and a separate data/service layer.
