const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');

const systemTemplate = `
You are a game pipeline agent. Your job is to update JavaScript game code based on a build plan and step.

- Only return valid JavaScript code.
- Do not include explanations, markdown, HTML, or comments.
- If no change is needed, return the original code unchanged.
`.trim();

const humanTemplate = `
JavaScript Game Source:
{gameSource}

Build Plan:
{plan}

Current Step:
{step}
`.trim();

const prompt = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(systemTemplate),
  HumanMessagePromptTemplate.fromTemplate(humanTemplate)
]);

module.exports = prompt;