Turn this seed into a complete, tiny game design. Anchor EVERY decision to the hook.
If a previous attempt and feedback appear below, REVISE that attempt to fix the issues — keep what works, change only what's flagged. Otherwise design fresh from the seed.

Seed:
{{seed}}
{{feedbackBlock}}
Constraints:
- Keep it small: 1–2 mechanics, 1–3 entities.
- Entity `id`s are lowercase letters only (e.g. "player", "rock", "wall").
- `goal.type` MUST match the seed's `goalMode`.
- Full-screen; choose an `orientation` (portrait or landscape).
- Input is a fixed virtual gamepad ONLY: a 4-way D-pad (`up`/`down`/`left`/`right`) plus two buttons (`btn1`, `btn2`), discrete press/release. NO tap, swipe, drag, aim, pointer, or analog. Every action must map to those buttons.

Return a complete draft:
- `title`, `description`
- `coreVerb`, `hook` (carry from the seed, refine wording if needed)
- `loop`: the 10-second core loop in one or two sentences
- `mechanics`: 1–2 (each: name + description)
- `entities`: 1–3 (each: id + role + description)
- `goal`: matching the seed's goalMode
- `controls`: `{ scheme: "gamepad", bindings: [{ input, action }] }` — `input` is one of `up`/`down`/`left`/`right`/`btn1`/`btn2` (each used at most once), `action` is what it does in-game. Use only the buttons the game needs.
- `orientation`, `estimatedPlaytimeSec`
