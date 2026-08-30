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

## Principle

UI code should not depend directly on Firestore document structure.

Create application-level types/models and a separate data/service layer.
