<p align="center">
  <img src="kpopit-frontend/public/kpopit-icon.png" alt="KpopIt logo" width="96" />
</p>

<h1 align="center">KpopIt</h1>

<p align="center">
  A daily K-pop guessing game for fans everywhere. Play it at <a href="https://www.kpopit.net/">kpopit.net</a>.
</p>

---

## What it is

[KpopIt](https://www.kpopit.net/) takes the Wordle idea and points it at K-pop. Every day there's a new secret idol (or album) per mode, the same one for every player in the world. You guess, the game tells you how close you got, and you narrow it down. The challenge resets at **midnight Eastern Time (UTC-5)**.

It launched at the end of 2025 with Classic mode and has grown since.

## Modes

- **Classic** — guess the idol of the day. Each guess shows how it compares: group (current and past), company, nationality, debut year, height and position. Higher/lower arrows point you toward the answer, and hints unlock after 6 guesses (member count of the current group, or "Soloist") and 8 guesses (the current group).
- **Blurry** — the idol's photo starts heavily blurred and gets sharper with every guess.
- **Pixelated** — guess the album from its cover art, which starts fully pixelated and clears up with every guess.

## Features

- **Accounts** (optional): play anonymously, or sign up to keep your stats, streaks and history across devices. Signing up keeps the games you already played.
- **Stats**: wins, streaks, guess distribution and history per mode.
- **Idols page**: a profile for every idol in the game.
- **Album collection**: winning Classic or Blurry gives you that idol's card in a page-turning sticker album grouped by K-pop group. Repeat wins level a card up (group frame → gold → animated holo).

## Stack

| Part | Tech |
|---|---|
| Frontend | React 19, TypeScript, React Router 8 (prerendered static site), Vite, Tailwind CSS 4, TanStack Query, Motion |
| Backend | Python, Flask 3, psycopg, PostgreSQL |
| Images | Cloudflare R2 |
| Hosting | Vercel (frontend), Railway (backend) |
| Tests | pytest, Node test runner, Playwright, Lighthouse CI |

## Run it locally

You need Node 24, Python 3.13 and a local PostgreSQL.

**Backend**

```bash
cd kpopit-backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt     # Windows: .venv\Scripts\pip
cp .env.example .env                           # fill in your own local values
.venv/bin/python scripts/bootstrap_db.py       # creates the schema and seeds the game data
.venv/bin/python app.py                        # http://127.0.0.1:5000
```

**Frontend**

```bash
cd kpopit-frontend
npm install
cp .env.example .env                           # point VITE_API_URL at your local backend
npm run dev                                    # http://localhost:5173
```

`npm run build` prerenders the idol pages, so it needs the backend running (it reads `PRERENDER_API_URL`, `http://127.0.0.1:5000` by default).

**Checks**

```bash
TEST_DB_URL=postgresql://localhost/kpopit_test scripts/check.sh   # lint, types, unit tests and build
cd kpopit-frontend && npm run test:e2e                            # end-to-end tests (Playwright)
```

More on the test databases in [`kpopit-backend/tests/README.md`](kpopit-backend/tests/README.md).

## Contributing

KpopIt is a personal project, but bug reports, wrong idol data and ideas are very welcome: open an issue, write to `contact@kpopit.net`, or find me on X at [@TgoRoss1](https://x.com/TgoRoss1). If you want to send code, open an issue first so we can talk about it. Never commit `.env` files or credentials.

---

<p align="center">Made with ❤️ for K-pop fans worldwide.</p>
