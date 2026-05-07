# Profile Page Implementation

## Step 0 — Required Reading

Before writing a single line of code:

1. Fetch the design file and read its readme:
   ```
   https://api.anthropic.com/v1/design/h/0QpgfEFoIfGyG6p1h1gLTQ?open_file=Profile+Page+v3.html
   ```
2. Read `CLAUDE.md`
3. Read `DESIGN.md`
4. Read `ModeOptions.tsx` and `ModeOptions.css` — the toggle animation must replicate this pattern exactly.
5. Read `api.ts` — all API calls already exist, do not create new ones.
6. Read existing interface files (`*.ts`) — all types already exist, do not create new ones.

Do not proceed until all of the above are read.

---

## Step 1 — File Scope

Work only inside the existing `/User` folder:
- `UserProfile.tsx` — main component, edit this
- `UserProfile.css` — animations and styles that cannot be done in Tailwind, edit this
- Create additional files only if strictly necessary (e.g. a sub-component that would make `Profile.tsx` too large)

**Do NOT touch:**
- `NavBar.tsx` — the design includes a navbar, ignore it entirely, the existing one is already in place
- `api.ts` — read only
- Any interface/type file — read only

---

## Step 2 — Design Implementation

Implement **Profile Page v3.html** from the design file with the following modifications:

### Keep exactly as designed:
- Profile picture with ribbon/stripe decorations (see Step 4 for ribbon implementation details)
- Name display with marker/highlight styling below the avatar
- Card layout and overall structure
- Dotted border section at the bottom (content changes — see Step 6)
- The 3-stat section on the right (data changes — see Step 5)

### Remove entirely:
- "Verified Stan" badge — no data for this yet
- "Bias" field/section — no data for this yet
- "Profile" heading above the card — unnecessary
- Tags section at the bottom — remove entirely
- **All heavy AI-looking gradients** — radial glows on cards, bloom overlays, excessive background gradients. These look generated and don't fit the project aesthetic
- **Exception:** keep the background glow/gradient as a temporary placeholder — it will be replaced with a proper background component later

### Borders on the profile card:
- Bottom and right: `4px` solid neon pink at 100% opacity
- Top: `1px` or `2px` solid neon pink (thinner)
- Keep the secondary border behind with reduced opacity — the layered effect is intentional
- Left border: minimal or none

---

## Step 3 — Data Fetching Rules

- Use **TanStack Query** (`useQuery`, `useMutation`) for all data operations
- Before writing any `useQuery`, check how other pages in the project use it — match that exact convention
- Set `staleTime` conservatively (e.g. `5 * 60 * 1000` — 5 minutes minimum) to avoid refetches on tab switch
- Set `gcTime` / `cacheTime` similarly — the page should not hammer the server
- **No `invalidateQueries`** — profile picture and status changes reflect on page reload, not instantly. Do not add optimistic updates or cache invalidation unless the pattern already exists in the codebase

---

## Step 4 — Profile Picture Ribbons

The ribbon/stripe decorations on the profile picture must look **exactly as shown in the design**.

Implementation approach — think before deciding:
- If ribbons can be done cleanly in pure CSS/Tailwind: prefer that
- If ribbons require image assets (PNG/SVG): place them in `/public` — this is the Vite + React industry standard for static assets

Do not use a non-conventional approach. Choose whichever is more maintainable.

---

## Step 5 — Stats Section

Show exactly **3 stats**, no more:
- **Current Streak**
- **Max Streak**
- **Wins**

Each stat is the **sum across all game modes** (currently Classic + Blurry):

```ts
// Example aggregation logic
total_wins = classic_wins + blurry_wins
total_current_streak = classic_current_streak + blurry_current_streak
total_max_streak = classic_max_streak + blurry_max_streak
```

Aggregate on the frontend using the data returned by the existing API. Do not create a new endpoint.

---

## Step 6 — Toggle

The toggle (if present in the design) must animate using the **exact same pattern** as `ModeOptions.tsx` and `ModeOptions.css`.

- Replicate the CSS animation approach
- Do not use `framer-motion` or any animation library not already in the project
- Animation logic goes in `Profile.css`, not inline styles

---

## Step 7 — Edit Profile Button

The Edit Profile button must be present in the UI as designed.

For now, the `onClick` handler is only:

```ts
onClick={() => console.log("Edit profile working")}
```

No modal, no drawer, no side panel. This will be implemented in a future task.

---

## Step 8 — Under Construction Section

Keep the dotted border section at the bottom. Replace the content inside with:

- 🚧 emoji + short "under construction" heading
- Below: a brief message explaining the site is in beta and still collecting data
- To the right of the text: an image element as placeholder

For the placeholder image, use the Kpopit logo temporarily:
```tsx
<img src="/kpopit-icon-svg.svg" alt="Coming soon" />
```

Style the image to fit the section — rounded corners or a neon border matching the site aesthetic.

---

## Step 9 — Style Rules

These are non-negotiable:

- **Tailwind only** in `.tsx` — no `style={{}}` props
- **Animations and transitions** that require keyframes or complex logic go in `Profile.css`
- **No `framer-motion`** or any animation library not already in the project
- **Mobile-first** — responsive from `max-xxs` (320px) up through `2xl`
- Follow the neon pink aesthetic from `design.md`
- Use `transform-gpu` on animated elements

---

## Step 10 — Pre-Submit Checklist

Before finishing, verify:

- [ ] Design file and all required docs were read before coding
- [ ] No navbar code included
- [ ] All API calls use existing `api.ts` functions — nothing new created
- [ ] All types use existing interface files — nothing new created
- [ ] `useQuery` config matches codebase conventions (staleTime, gcTime)
- [ ] No `invalidateQueries` added
- [ ] Stats are summed across Classic + Blurry correctly
- [ ] Toggle animation matches `ModeOptions` pattern
- [ ] Edit profile button only has `console.log`
- [ ] Ribbons implemented conventionally (CSS or `/public` assets)
- [ ] Heavy gradients removed, background glow kept as placeholder
- [ ] Under construction section uses Kpopit logo as placeholder image
- [ ] No `style={{}}` in `.tsx`
- [ ] Mobile-first and responsive

---

## Step 11 — Final Note (answer this at the end)

After implementation is complete, answer this question clearly:

> **Where should I place the final "under construction" photo that I'll add manually later?**
> Should it go in `/public` root, `/public/images`, `/src/assets`, or another folder?
> Give a recommendation with a brief reason — I will not use the R2 bucket for a single local image.
