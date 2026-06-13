Context:
{context}

Describe a clear, simple win condition. It must be binary (achieved or not), short, and reachable in under 5 minutes.

Avoid scoring systems, creative evaluations, or memory tests.

Respond ONLY with a JSON object matching this schema:

{{
  "winCondition": string // A clear and specific win condition for the game
}}

Example:

{{
  "winCondition": "Catch 5 critters before the timer ends."
}}
