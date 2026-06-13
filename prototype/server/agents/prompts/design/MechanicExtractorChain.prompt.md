Context:
{context}

Extract only the essential player mechanics from the loop. 
These must be atomic (1 action = 1 verb), and no more than 2.

Do NOT include time tracking, scoring, or passive systems.

Respond ONLY with a JSON object matching this schema:
{{
  "mechanics": ["string", ...]
}}

Example:
{{
  "mechanics": ["move", "jump", "avoid"]
}}
