# KpopIt web app — UI kit

Click-through recreation of the two surfaces that already follow the retro-pop look:

- **Pixelated mode** (`PixelatedScreen.jsx`) — sleeve + spinning vinyl hero, hint sleeves (Release Year unlocks after 3 misses, Artist after 6), search with autocomplete, guess rows that drop in and wash colour, player count, Caveat "Yesterday's album was…". Answer is **After Like (IVE)**.
- **Victory card** (`VictoryCard.jsx`) — appears 2.4s after the correct guess.
- **Stats modal** (`StatsModal.jsx`) — opened from the pink stats button.
- **Collections** (`CollectionsScreen.jsx`) — newspaper-style header, collection cards with progress box, Coming Soon ThemedCard, day/night toggle.

The floating ink pill at the bottom is kit chrome (not in the product).

Built from `src/pages/PixelatedMode/PixelatedMode.tsx`, `src/components/Pixelated/*`, `src/pages/Collection/Collections.tsx` and `components/CollectionCard.tsx` in ThiagoRoss1/Kpopit. Covers load from `https://cdn.kpopit.net/images/albums/`; `PixelCover` (in `data.jsx`) pixelates them per guess. Collections covers use `idols/yujin.webp` and the CDN LE SSERAFIM group photo.

Not recreated (no source read / out of scope): Home, Classic, Blurry, the album flip-book, sticker cards, card zoom, onboarding tour, FX panel, "Other Game Modes" list.
