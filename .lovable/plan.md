## Goal
Remove the login/signup/forgot-password flow. The auth page becomes a simple landing with one button that goes straight to the dashboard.

## Changes

1. **`src/routes/auth.tsx`** — Strip the form, mode switcher, and all auth handlers. Keep the branded left panel (Shield logo, headline, feature tiles) and replace the right panel with a single primary button "Enter vault" that navigates to `/dashboard`.

2. **`src/lib/store.ts`** — Ensure a default local user exists so dashboard/files/notes render without a signup step. On store init (or on first dashboard visit), if `currentUserId` is null, auto-create and sign in a local "Guest" user. This keeps every downstream feature (files, notes, categories, favorites, settings) working unchanged since they all depend on `currentUserId`.

3. **`src/components/app-shell.tsx`** — Keep the Sign out button but make it route back to `/auth` (the landing). No other changes.

4. **`src/routes/index.tsx`** — Unchanged behavior: redirects to `/dashboard` if signed in, else `/auth`. With auto-guest on, users land on the dashboard immediately after clicking the button.

## Out of scope
No visual redesign, no changes to dashboard/files/notes/categories/favorites/settings logic.