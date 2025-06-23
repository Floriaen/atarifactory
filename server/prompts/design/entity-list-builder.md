# Entity List Builder Prompt

Given a set of game mechanics, return a JSON object with the following field:
- entities: an array of strings, each naming a unique entity required by the mechanics

⚠️ Respond ONLY with a valid JSON object in this format. DO NOT use numbered lists, bullet points, or any other format. DO NOT include explanations or extra text.

Example:

{{
  "entities": ["Player", "Enemy", "Goal", "Obstacle"]
}}

Mechanics:
{{mechanics}}
