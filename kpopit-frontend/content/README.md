# Blog posts

One Markdown file per post in `content/blog/`, named `YYYY-MM-DD-slug.md`. (The changelog is typed data in
`src/data/changelog.ts`, not Markdown.)
The file name minus `.md` is the slug. Posts are rendered at build time (`marked`, via the
`markdownPosts` plugin in `vite.config.ts`); no Markdown code ships to the browser.

## Frontmatter

```
---
title: Your daily game now follows you
date: 2026-10-23
description: One or two sentences for the list and link previews.
image: /blog/2026-10-23-your-day-follows-you/thumbnail.png
imageAlt: What the thumbnail shows
tag: Update
pinned: false
---
```

All fields are required except `pinned` (default `false`). `tag` is one of `Update`, `Dev log`, `Thoughts`,
`News`. `pinned: true` puts the post in the blog's Pinned block (the latest post is always the big card).
Read time is computed from the body (words / 200, rounded up).

`image` is the thumbnail and the post's `og:image` (made absolute with
`SITE_URL`). Lines starting with `#` in the frontmatter are comments.

## Images

- Put a post's images in `public/blog/<slug>/` and reference them as `/blog/<slug>/file.png`
  (the build fails if the thumbnail file is missing). A 1200×630 thumbnail suits link previews.
- Images from the image bucket (`VITE_IMAGE_BUCKET_URL`) are also allowed; any other image source
  is shown as its alt text.

## Markdown

Headings (`#` renders as h2: the page title is the h1), paragraphs, ordered/unordered lists, bold,
italic, inline code and code blocks, links (`https://` or site paths only), images, blockquotes and
tables. Raw HTML is escaped and shown as text.

The `2026-10-23-your-day-follows-you` post is a **placeholder** with a sample thumbnail from the design references; replace both before publishing.
