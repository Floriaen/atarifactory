Design a tiny pixel-art sprite for one entity of a browser game, as a drawing program (a "sprite DSL"). A deterministic compiler renders your output to a pixel mask — so be precise and think in grid coordinates.

Game: {{gameTitle}} ({{orientation}})
Entity:
{{entity}}

Output a `SpriteDsl` object:
- `gridSize`: an integer 12–16. The grid is `gridSize × gridSize`, origin `(0,0)` at top-left, `x` right, `y` down.
- `frames`: 1–3 frames. One frame for a static entity; 2–3 only if motion (e.g. a walk cycle, a flap) genuinely reads better.
- Each frame has `ops`: an ordered list of 1–40 drawing ops, drawn in order onto a blank grid.

The ONLY allowed ops (use these exact forms, integers only):
- `rect x y w h` — filled rectangle, top-left at `(x,y)`, width `w`, height `h`.
- `oval cx cy rx ry` — filled ellipse, centre `(cx,cy)`, radii `rx`,`ry`.
- `line x0 y0 x1 y1` — straight line between the two points.
- `pixel x y` — a single pixel.
- `mirror H` / `mirror V` — reflect what's drawn so far across the horizontal-centre (left↔right) or vertical-centre (top↔bottom) axis. Use it as the LAST op of a frame to make a symmetric silhouette from half the work.

Rules:
- Draw ONE connected silhouette per frame — the compiler keeps only the largest connected blob, so don't scatter stray pixels.
- Aim for a filled area of roughly 8–40% of the grid. Too sparse gets dilated, too dense gets thinned.
- Make the shape read as the entity at a glance — a recognisable silhouette beats detail.
- Coordinates should stay within the grid; the compiler clamps oversized ones but the shape will look wrong if you rely on that.
