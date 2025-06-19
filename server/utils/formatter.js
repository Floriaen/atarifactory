const { marked } = require('marked');

// This utility extracts JavaScript code blocks from markdown text, using the marked library to parse and identify code blocks.

function extractJsCodeBlocks(md) {
  const codeBlocks = [];
  marked(md, {
    walkTokens(token) {
      if (token.type === 'code' && (!token.lang || token.lang.startsWith('js'))) {
        codeBlocks.push(token.text);
      }
    }
  });
  if (codeBlocks.length > 0) {
    return codeBlocks.join('\n\n').trim();
  }
  return md.trim();
}

// Robustly extract the first JSON object from markdown code blocks or plain text
function extractJsonCodeBlock(text) {
  // Try to extract a ```json ... ``` code block
  const jsonBlock = text.match(/```json\s*([\s\S]+?)```/i);
  if (jsonBlock) {
    try {
      return JSON.parse(jsonBlock[1]);
    } catch {}
  }
  // Try to extract a generic code block
  const codeBlock = text.match(/```[a-zA-Z]*\s*([\s\S]+?)```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1]);
    } catch {}
  }
  // Try to find the first {...} in the text
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {}
  }
  throw new Error('No valid JSON object found in LLM output');
}

module.exports = { extractJsCodeBlocks, extractJsonCodeBlock }; 