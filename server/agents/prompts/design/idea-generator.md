# Idea Generator Prompt

Generate a simple 2D arcade-style game idea. The game must be extremely simple, playable in under 5 minutes, and use no more than 2 mechanics and 3 entities.

Constraints:
- Single-screen gameplay
- No menus, upgrades, or multi-phase logic
- No simulation, memory, or creativity-based goals
- Only 1 win condition, no scoring systems

Constraints: {constraints}

Respond ONLY with a JSON object in the following format:
{{
  "title": "<short game title>",
  "pitch": "<brief gameplay summary in 1-2 sentences>"
}}