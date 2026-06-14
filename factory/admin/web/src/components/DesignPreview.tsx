import type { GameDefinition } from '../lib/types';

function goalText(g: GameDefinition['goal']): string {
  const extra = g.target != null ? ` → ${g.target}` : g.forSeconds != null ? ` → ${g.forSeconds}s` : '';
  return `${g.type}${extra} · ${g.description}`;
}

export function DesignPreview({ game }: { game: GameDefinition }) {
  return (
    <div className="design-card">
      <h3>{game.title}</h3>
      <p className="muted">{game.description}</p>

      <dl>
        <dt>verb</dt>
        <dd>{game.coreVerb}</dd>
        <dt>hook</dt>
        <dd>{game.hook}</dd>
        <dt>loop</dt>
        <dd>{game.loop}</dd>
        <dt>goal</dt>
        <dd>{goalText(game.goal)}</dd>
        <dt>spatial</dt>
        <dd>
          {game.spatial.orientation} · ~{game.estimatedPlaytimeSec}s
        </dd>
      </dl>

      <section>
        <h4>Mechanics</h4>
        <ul>
          {game.mechanics.map((m) => (
            <li key={m.name}>
              <b>{m.name}</b> — {m.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Entities</h4>
        <ul>
          {game.entities.map((e) => (
            <li key={e.id}>
              <b>{e.id}</b> <span className="tag">{e.role}</span> — {e.description}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>Controls ({game.controls.scheme})</h4>
        <ul>
          {game.controls.bindings.map((b) => (
            <li key={b.input}>
              <code>{b.input}</code> → {b.action}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
