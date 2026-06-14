import type { LLMProvider } from './provider.js';
import { ClaudeProvider } from './providers/claude.js';
import { ClaudeCodeProvider } from './providers/claudeCode.js';

/** The provider names a host may select. */
export type ProviderName = 'claude' | 'claude-code';

/**
 * Composition-root switch. Default is the metered API (`ClaudeProvider`); pass
 * `'claude-code'` (or set `PROVIDER=claude-code`) to route through the local Claude
 * Code subscription instead. The pipeline depends only on the `LLMProvider`
 * interface and never sees this choice.
 */
export function selectProvider(name: string | undefined = process.env.PROVIDER): LLMProvider {
  return name === 'claude-code' ? new ClaudeCodeProvider() : new ClaudeProvider();
}
