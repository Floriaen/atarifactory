import { z } from 'zod';

export const designContextSchema = z.object({
  version: z.literal('v1'),
  title: z.string().optional(),
  pitch: z.string().optional(),
  constraints: z.string().optional(),
  loop: z.string().optional(),
  mechanics: z.array(z.string()).optional(),
  winCondition: z.string().optional(),
  entities: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
});

export function createInitialContext(input = {}) {
  const ctx = {
    version: 'v1',
  };
  if (input.title) ctx.title = String(input.title);
  if (input.pitch) ctx.pitch = String(input.pitch);
  if (input.constraints) ctx.constraints = String(input.constraints);
  return validateContext(ctx);
}

export function mergeContext(base, delta) {
  const merged = { ...(base || { version: 'v1' }), ...(delta || {}) };
  // Ensure version stays v1
  merged.version = 'v1';
  return validateContext(merged);
}

export function validateContext(ctx) {
  const parsed = designContextSchema.safeParse(ctx);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid DesignContext: ${msg}`);
  }
  return parsed.data;
}

// Deterministic ordered, size-limited textual capsule for prompts/trace
export function contextToPrompt(ctx, limit = Number(process.env.CONTEXT_CAPSULE_LIMIT || 600)) {
  if (!ctx) return '';
  const parts = [];
  if (ctx.title) parts.push(`Title: ${ctx.title}`);
  if (ctx.pitch) parts.push(`Pitch: ${ctx.pitch}`);
  if (ctx.constraints) parts.push(`Constraints: ${ctx.constraints}`);
  if (ctx.loop) parts.push(`Loop: ${ctx.loop}`);
  if (Array.isArray(ctx.mechanics)) parts.push(`Mechanics: ${ctx.mechanics.join(', ')}`);
  if (ctx.winCondition) parts.push(`WinCondition: ${ctx.winCondition}`);
  if (Array.isArray(ctx.entities)) parts.push(`Entities: ${ctx.entities.join(', ')}`);
  const text = parts.join('\n');
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 1)) + '…';
}

export default {
  designContextSchema,
  createInitialContext,
  mergeContext,
  validateContext,
  contextToPrompt,
};

