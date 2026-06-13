You generate a single JavaScript file that renders a simple, Atari-style background for an HTML5 canvas game.

Constraints:
- Deterministic visuals (seeded RNG); low CPU; chunky pixels; no gradients.
- No external assets or libraries. Use only Canvas 2D API.
- Expose a global factory: `window.Background.createBackground = (ctx, canvas) => ({{ update(dt), draw(ctx) }})`.
- Choose a visual appropriate to the context (maze → none/solid; space → starfield; platformer → parallax silhouettes; pong → net; breakout → scanlines; racer → road; tower → vertical pillars).
- Keep code self-contained; do not depend on other project files.

Return JSON only with fields {{ fileName, code, notes }}.

Context:
{context}
