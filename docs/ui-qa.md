# UI checks with Playwright MCP

A browser walkthrough for changes that affect how a page looks or behaves. It runs at the end of a phase, after `scripts/check.sh` and `npm run test:e2e`, and complements the E2E specs (it never replaces them). Skip it for backend-only and type-only changes.

No dedicated agent or skill for now: the rules in `CLAUDE.md` plus this checklist are enough. Revisit if the walkthrough grows past one page of steps or needs its own tooling.

## Setup (local only)
- Frontend: `kpopit-frontend` dev server on `http://localhost:5173` (or `npm run preview` for the production build).
- Backend: a local test backend (`kpopit-backend-build-mac` / `-windows`, or the E2E backend) on a local test DB. Turn on the flags the change needs in that process only.
- Never kpopit.net, never the production API.

## Checklist
1. **Viewports** — set each one explicitly: 360×800, 390×844, 430×932, 1280×800, 1440×900, 1920×1080, 2560×1440.
2. **Themes** — Day and Night on new pages; old pages stay in their own look with the navbar forced to night.
3. **Controls** — click every control the change touched: links, buttons, tabs, filters, menus, dropdowns, the mobile sheet. Keyboard: Tab order, visible focus, Escape closes overlays.
4. **Layout** — no horizontal page scroll, nothing clipped or overlapping, titles don't wrap where the design says they don't.
5. **States** — loading, empty, error, guest vs signed in, flag on vs off (a disabled feature's link is absent and its route shows the 404).
6. **Console and network** — read console errors/warnings and failed requests after each page; any request to a non-local host is a failure.
7. **Design** — compare against the handoff file and its screenshot; note every difference and whether it was on purpose.
8. **Report** — per page: viewports checked, findings, fixes, and screenshots (described or attached).

## Example prompts
- "Walk through `/blog` and one post at 360, 430 and 1440 px, Day and Night. Click every filter pill and the Read next cards. Report console errors, failed requests and anything that differs from `Blog v2.dc.html`."
- "Open `/` and `/classic` at 390×844 and 1920×1080. Open the mobile sheet and each desktop dropdown; check the navbar is forced to night with the toggle space kept, and the current section is highlighted."
- "With `CALENDAR_ENABLED=false` on the local backend, check that the Calendar link is gone from the navbar (desktop and mobile sheet) and that `/calendar` shows the 404 page."
- "Reload `/about` in Night mode with a throttled CPU and confirm there's no Day flash before the page paints. Then switch to Day and reload again."
- "On `/idols`, apply two filters, reload, and check that the filters come back from the URL; then open an idol and go back, at 360 and 1280 px."
