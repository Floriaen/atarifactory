import { readFile } from 'node:fs/promises';

const cache = new Map<string, string>();

export async function loadPrompt(file: string): Promise<string> {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;
  const text = await readFile(file, 'utf8');
  cache.set(file, text);
  return text;
}

/** Replaces {{var}} placeholders. Throws if a placeholder has no matching var. */
export function renderPrompt(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in vars)) throw new Error(`prompt: missing variable {{${key}}}`);
    const value = vars[key];
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  });
}
