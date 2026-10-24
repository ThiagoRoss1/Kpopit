# Posts (changelog / blog)

One Markdown file per post in `content/<kind>/` (today only `changelog/`), named `YYYY-MM-DD-slug.md`.
The file name minus `.md` is the slug. Posts are rendered at build time (`marked`, via the
`markdownPosts` plugin in `vite.config.ts`); no Markdown code ships to the browser.

## Frontmatter (all required)

```
---
title: Your daily game now follows you
date: 2026-10-23
description: One or two sentences for the list and link previews.
image: /blog/2026-10-23-your-day-follows-you/thumbnail.png
imageAlt: What the thumbnail shows
---
```

`image` is the thumbnail and, once the post route ships, the post's `og:image` (made absolute with
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

The `2026-10-23-your-day-follows-you` post uses a **sample** thumbnail; replace it before publishing.
