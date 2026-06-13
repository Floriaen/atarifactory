# Plan: Capture and Display Game Thumbnails

## Goal
Automate thumbnail capture for each generated game and surface it in the frontend gallery list.

## Steps
1. **Capture Image Post-Build**
   - After `controlBar.js` + art assets are written, launch Playwright (headless Chromium) to load `/games/<id>/index.html` and fully initialize the game once for the capture run.
   - Wait for the game to render one frame, snapshot the canvas to `thumb.png`, and persist it alongside the build.

2. **Persist Metadata**
   - Update `meta.json` (and the SSE manifest entry) with a `thumbnail` property pointing to `/games/<id>/thumb.png`.
   - Ensure older entries retain backward compatibility (fallback to placeholder).

3. **Serve Thumbnail**
   - Expose static serving for `thumb.png` via Express (`server/index.js` already serves `/games/...`).
   - Consider cache headers since thumbnails are immutable per build.

4. **Update Frontend Gallery**
   - In `frontend/src/main.js`, render an `<img>` (or background image) using `game.thumbnail` in each gallery cell.
   - Adjust CSS for consistent sizing and fallback styling.

5. **Validation & Cleanup**
   - Add unit/integration coverage to ensure `meta.json` includes `thumbnail`.
   - Optional: Provide a CLI/cron job to regenerate thumbnails for legacy games.

## Risks / Notes
- Headless preview must handle games that rely on real time; consider a deterministic seed or pre-scripted events.
- Avoid blocking the main generation flow—snapshot can run async but must finish before manifest update.
