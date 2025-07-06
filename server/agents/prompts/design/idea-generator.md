# Idea Generator Prompt

Generate a simple 2D arcade-style game idea. The game must be extremely simple, playable in under 5 minutes, and use no more than 2 mechanics and 3 entities.

Before generating the idea, invent a random constraint or theme (for example: a required mechanic, a setting, a type of entity, or a win condition style). Use this invented constraint or theme to make the game idea more unique and creative.

Constraints:
- Single-screen gameplay
- No menus, upgrades, or multi-phase logic
- No simulation, memory, or creativity-based goals
- Only 1 win condition, no scoring systems

Respond ONLY with a JSON object in the following format:
{{
  "title": "<short game title>",
  "pitch": "<brief gameplay summary in 1-2 sentences>"
}}