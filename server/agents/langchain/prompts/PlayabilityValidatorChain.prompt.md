You are a game validation agent.
Given these mechanics: {{mechanics}}
And this win condition: {{winCondition}}
Is it logically possible for the player to win using only these mechanics? If not, suggest a minimal fix (e.g., add a mechanic, change the win condition, or simplify the design).

IMPORTANT: Respond ONLY with a valid JSON object in the following format, and do not include any explanation or text outside the JSON.
{{ "winnable": true/false, "suggestion": "..." }}
