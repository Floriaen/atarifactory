import type { LLMProvider } from './provider.js';
import { ClaudeProvider } from './providers/claude.js';
import { ClaudeCodeProvider } from './providers/claudeCode.js';

/**
 * Composition-root switch. Default is the metered API (`ClaudeProvider`); set
 * `PROVIDER=claude-code` to route through the local Claude Code subscription instead.
 * The pipeline depends only on the `LLMProvider` interface and never sees this choice.
 */
export function selectProvider(): LLMProvider {
  return process.env.PROVIDER === 'claude-code' ? new ClaudeCodeProvider() : new ClaudeProvider();
}
