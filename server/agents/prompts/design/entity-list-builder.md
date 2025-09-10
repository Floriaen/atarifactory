# Entity List Builder Prompt

Context:
{context}

List only the entities the player sees or interacts with. 
Do not include abstract or logic-only entities.

Limit to a maximum of 3.

Spatial consideration: Entities should naturally spread across the full canvas via movement, spawn positions, or interaction zones.

Return your answer as a JSON object matching this schema:

{{
  "entities": ["entity1", "entity2", "entity3"]
}}

For example, if the mechanics are ["jump", "dodge"], the output should be:

{{
  "entities": ["player", "obstacle", "platform"]
}}
