You are selecting the most promising game seed for a tiny Atari-like browser game.

Candidate seeds (index : seed):
{{seedsList}}

Compare them **against each other** — do not score them individually. Pick the ONE that is:
1. most fun in the first 10 seconds,
2. most novel (least like an existing classic),
3. feasible as a tiny, full-screen, one-button-ish game.

Return:
- `ranking`: ALL candidate indices, 0-based, ordered best-first (the winner, then the order to fall back to if the winner can't be made fun)
- `reason`: one sentence on why the winner beat the others
