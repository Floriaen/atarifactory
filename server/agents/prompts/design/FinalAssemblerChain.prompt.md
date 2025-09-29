# Final Assembler Prompt

Context:
{context}

Assemble all components into one final gameDef JSON object. No extra logic, no commentary.

Spatial validation: Ensure the assembled game naturally requires full canvas utilization through entity placement, movement patterns, or player navigation.

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
