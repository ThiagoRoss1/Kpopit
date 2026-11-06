---
# PLACEHOLDER post: copy and images from the design references, replace or delete before launch
title: Moving from SQLite to PostgreSQL
date: 2026-03-27
description: Why the database changed, and what it means for the game.
image: cdn:/images/albums/ad_mare.webp
imageAlt: An album cover
tag: Dev log
pinned: false
ko: 개발
---

KpopIt started on SQLite. It's a great choice for a small project: one file, no server to run, nothing to configure. For the first months, it was all the game needed.

As more players joined, every daily reset meant a lot of people saving games at the same moment. That's where SQLite starts to struggle, so the database moved to PostgreSQL.

# Why PostgreSQL

- It handles many players writing at once without slowing down.
- It scales as the game grows: more modes, more idols, more history.
- It's what accounts, collections and the features coming next are built on.

# What changes for players

Nothing visible. Pages load the same way, your streaks and stats are untouched, and every daily answer stays the same.

This was a behind-the-scenes change, but it's the foundation for everything that comes after it.
