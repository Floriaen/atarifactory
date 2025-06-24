# Playability Heuristic Prompt

Given the following game definition, assess whether it is truly simple and playable within 5 minutes.

Reject or reduce score if:
- More than 2 mechanics
- More than 3 entities
- Win condition uses score, creativity, or memory
- Game includes simulation, color theory, or indirect logic

Game Definition: {gameDef}

Return your assessment as a JSON object matching this schema:

{{
  "playabilityAssessment": "<short summary of playability (1-2 sentences)>",
  "strengths": ["<strength 1>", "<strength 2>", "..."],
  "potentialIssues": ["<issue 1>", "<issue 2>", "..."],
  "score": <number from 1 (unplayable) to 10 (highly playable)>
}}

For example:

{{
  "playabilityAssessment": "The game is engaging and easy to understand, but may become repetitive without more variety.",
  "strengths": ["Clear core loop", "Accessible to new players"],
  "potentialIssues": ["Limited replayability", "Difficulty may not scale well"],
  "score": 7
}}
