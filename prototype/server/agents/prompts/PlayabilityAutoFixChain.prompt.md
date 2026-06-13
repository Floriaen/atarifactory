# PlayabilityAutoFixAgent LLM Prompt Template

You are an expert game designer. Given the following unplayable game definition and suggestion, return a fixed, playable JSON game definition.

Original gameDef:
{{gameDef}}

Suggestion for improvement:
{{suggestion}}

Respond ONLY with the fixed JSON object. Do not include any explanation, markdown, or text outside the JSON.

Example output:
{{
  "name": "Coin Collector",
  "description": "Collect all coins while avoiding obstacles.",
  "mechanics": ["move left/right", "jump"],
  "winCondition": "All coins collected.",
  "entities": ["player", "coin", "obstacle"]
}}
