# Entity List Builder Prompt

List only the entities the player sees or interacts with. 
Do not include abstract or logic-only entities.

Limit to a maximum of 3.

**Spatial consideration**: Entities should be designed to naturally spread across the full canvas through movement patterns, spawning locations, or interaction zones.

Mechanics: {mechanics}

Return your answer as a JSON object matching this schema:

{{
  "entities": ["entity1", "entity2", "entity3"]
}}

For example, if the mechanics are ["jump", "dodge"], the output should be:

{{
  "entities": ["player", "obstacle", "platform"]
}}
