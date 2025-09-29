# Idea Generator Prompt

Context:
{context}

Generate a simple 2D arcade-style game idea. The game must be extremely simple, playable in under 5 minutes, and use no more than 2 mechanics and 3 entities — but still feel fun and challenging.

Before generating the idea, invent a focused constraint or theme (e.g., required mechanic, setting, entity type, or win style). You may also incorporate any existing constraints from the context.

Mandatory constraints:
- Single-screen gameplay (portrait canvas)
- No menus, upgrades, or multi-phase logic
- No simulation, memory, or creativity-based goals
- Only 1 win condition, no scoring systems
- Spatial: Encourage full-screen usage via movement, navigation, or spatial objectives

Challenge requirements:
- Include a clear, skill-expressive action beyond movement/deflection (e.g., "shoot", "tag").
- Prefer “discover then act” loops (e.g., reveal targets, then shoot) with ≤ 2 mechanics.
- Quantify goal and time pressure in the pitch (e.g., "reveal 10 targets and shoot them within 60 seconds").
- Include non-timeout failure pressure in spirit (e.g., hazards), without adding mechanics beyond the two allowed.

Respond ONLY with a JSON object:
{{
  "title": "<short game title>",
  "pitch": "<brief gameplay summary in 1-2 sentences>"
}}
