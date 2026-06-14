import type { Models } from '../lib/types';

interface Props {
  models?: Models;
  provider: string;
  tier: string;
  onProvider: (p: string) => void;
  onTier: (t: string) => void;
  disabled?: boolean;
}

export function ModelSelect({ models, provider, tier, onProvider, onTier, disabled }: Props) {
  return (
    <div className="model-select">
      <label>
        Provider
        <select value={provider} onChange={(e) => onProvider(e.target.value)} disabled={disabled}>
          {(models?.providers ?? ['claude']).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Model
        <select value={tier} onChange={(e) => onTier(e.target.value)} disabled={disabled}>
          {(models?.tiers ?? [{ id: 'default', label: 'Default' }]).map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
