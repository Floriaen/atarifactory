# Entity List Builder Prompt

Given the following mechanics, generate a list of entities required for the game.

Mechanics: {mechanics}

Return your answer as a JSON object matching this schema:

{{
  "entities": ["entity1", "entity2", "entity3"]
}}

For example, if the mechanics are ["jump", "dodge"], the output should be:

{{
  "entities": ["player", "obstacle", "platform"]
}}
