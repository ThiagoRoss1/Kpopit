# React Compiler lint warnings

`eslint-plugin-react-hooks` 7 (Major Patch G5 stack update) added the React Compiler rules to its `recommended-latest` preset. The existing code predates them, so they are set to **warn** in `eslint.config.js` (lint still passes) and listed here for the refactor/performance work (T35/T36). The classic `rules-of-hooks` and `exhaustive-deps` checks are unchanged.

Generated from `npx eslint . -f json` on branch `chore/groundwork`, 2026-10-15; line numbers are as of that commit. Regenerate after fixes.

## Summary — 43 warnings in 26 files

| Rule | Count | What it flags |
|---|---|---|
| `react-hooks/set-state-in-effect` | 26 | setState called synchronously inside an effect (extra render; often derivable state or belongs in an event handler) |
| `react-hooks/refs` | 10 | ref `.current` read or written during render |
| `react-hooks/purity` | 3 | impure call during render (e.g. `Date.now()`, `Math.random()`) |
| `react-hooks/immutability` | 3 | value modified after render / outside its owner |
| `react-hooks/preserve-manual-memoization` | 1 | manual `useMemo`/`useCallback` the compiler cannot preserve |

## By file

### `src/components/Albums/AlbumOfCol/AlbumOfCol.tsx` (3)

| Line | Rule | Message |
|---|---|---|
| 430 | `refs` | Error: Cannot access refs during render |
| 542 | `refs` | Error: Cannot access refs during render |
| 545 | `refs` | Error: Cannot access refs during render |

### `src/components/buttons/modals/ExportDataContent.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 31 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/components/buttons/modals/ImportDataContent.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 21 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/components/buttons/modals/ShareContent.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 77 | `purity` | Error: Cannot call impure function during render |
| 78 | `immutability` | Error: This value cannot be modified |

### `src/components/GlassSurface.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 51 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 148 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/components/NavBar/ButtonsListMobile.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 43 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/components/Pixelated/PixelatedCanvas.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 22 | `refs` | Error: Cannot access refs during render |
| 94 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/contexts/AuthProvider.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 22 | `refs` | Error: Cannot access refs during render |
| 114 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/hooks/useResetTimer.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 23 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/hooks/useSharedGameData.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 72 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/hooks/useTransferDataLogic.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 31 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 123 | `purity` | Error: Cannot call impure function during render |

### `src/pages/AuthUser/AuthPage.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 29 | `immutability` | Error: Cannot access variable before it is declared |
| 145 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/AuthUser/ConfirmEmailChange.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 27 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/AuthUser/RevertEmailChange.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 26 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/AuthUser/VerifyEmail.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 33 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/BlurryMode/blurry_mode.tsx` (5)

| Line | Rule | Message |
|---|---|---|
| 101 | `refs` | Error: Cannot access refs during render |
| 101 | `refs` | Error: Cannot access refs during render |
| 160 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 162 | `immutability` | Error: Cannot access variable before it is declared |
| 355 | `preserve-manual-memoization` | Compilation Skipped: Existing memoization could not be preserved |

### `src/pages/ClassicMode/classic_mode.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 151 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/Collection/CollectionAlbum.tsx` (2)

| Line | Rule | Message |
|---|---|---|
| 172 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 261 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/Collection/components/FxPanel.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 349 | `refs` | Error: Cannot access refs during render |

### `src/pages/Collection/components/OnboardingTour.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 170 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/PixelatedMode/PixelatedMode.tsx` (3)

| Line | Rule | Message |
|---|---|---|
| 88 | `refs` | Error: Cannot access refs during render |
| 88 | `refs` | Error: Cannot access refs during render |
| 123 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/User/AvatarModal.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 86 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/User/EditProfile.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 60 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/User/EmailModal.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 37 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/User/PasswordModal.tsx` (1)

| Line | Rule | Message |
|---|---|---|
| 34 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |

### `src/pages/User/UsernameModal.tsx` (3)

| Line | Rule | Message |
|---|---|---|
| 47 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |
| 55 | `purity` | Error: Cannot call impure function during render |
| 75 | `set-state-in-effect` | Error: Calling setState synchronously within an effect can trigger cascading renders |
