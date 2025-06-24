# Final Assembler Prompt

Assemble all components into one final gameDef JSON object. No extra logic, no commentary.

Input:
- Title: {title}
- Description: {pitch}
- Mechanics: {mechanics}
- Win Condition: {winCondition}
- Entities: {entities}

Return the result as a valid JSON object with the following structure:

{{
  "gameDef": {{
    "title": "...",
    "description": "...",
    "mechanics": ["...", "..."],
    "winCondition": "...",
    "entities": ["...", "..."]
  }}
}}

Make sure your response is valid JSON and does not include any extra text or explanation.