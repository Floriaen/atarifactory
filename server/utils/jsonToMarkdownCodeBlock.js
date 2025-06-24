/**
 * Convert a JS object to a markdown JSON code block string.
 * @param {object} obj - The object to stringify.
 * @returns {string} Markdown code block with JSON.
 */
export function jsonToMarkdownCodeBlock(obj) {
  return '```json\n' + JSON.stringify(obj, null, 2) + '\n```';
}
