# Blog posts

Posts live here as plain markdown files (`.md` or `.mdx`). Drop a new file
in this directory, push, and it shows up at `/blog/<slug>`.

## Frontmatter

```yaml
---
title: "Selznick is here."
slug: launch
date: 2026-04-28
summary: "What changed and why it matters."
author: "Anuj Kommareddy"
og_image: /og/blog-launch.png   # optional
draft: false                     # optional; true hides from index + sitemap
---
```

- `slug` — required. URL becomes `/blog/<slug>`. Doesn't have to match
  the filename, but matching is a good convention.
- `date` — required. ISO `yyyy-mm-dd`. Sort order on the index uses this.
- `og_image` — optional. Defaults to `/og/blog-default.png` if you don't
  drop a custom one in `/public/og/`.
- `draft: true` — keeps a post out of the listing AND the sitemap. Useful
  for staging a post you're still editing.

## Conventions

- Filename: `YYYY-MM-DD-short-slug.md` (date prefix keeps the directory
  sortable in the IDE; the URL uses the `slug` field, not the filename).
- Images: stash in `/public/blog/` (referenced as `/blog/your-image.png`
  in markdown).
- One post per file. No nested directories — keep the directory flat so
  `getAllPosts` stays O(n) over a `readdir`.

## Programmatic posts (later)

If we want to script-generate posts (top-N lists, periodic recaps),
write a script that emits `.md` files into this directory using the same
frontmatter contract. The blog renderer doesn't care whether a post was
hand-written or machine-generated.
