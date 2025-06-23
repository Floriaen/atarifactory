# Playability Heuristic Prompt

Given a game definition, return a JSON object with the following fields:
- playabilityScore: a number from 1 (unplayable) to 10 (highly playable)
- rationale: a short paragraph explaining the score

Respond ONLY with a valid JSON object in this format:

{{
  "playabilityScore": <number>,
  "rationale": "<reasoning>"
}}

Game Definition:
{{gameDef}}
