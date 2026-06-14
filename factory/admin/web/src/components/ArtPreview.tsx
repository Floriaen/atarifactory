import { useEffect, useRef } from 'react';
import { drawSprite } from '../lib/sprite';
import type { SpriteItem, SpritePack } from '../lib/types';

function SpriteCanvas({ item }: { item: SpriteItem }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawSprite(ref.current, item.frames, item.gridSize);
  }, [item]);
  return <canvas ref={ref} className="sprite-canvas" />;
}

export function ArtPreview({ pack }: { pack: SpritePack }) {
  const entries = Object.entries(pack.items);
  return (
    <div className="art-grid">
      {entries.map(([id, item]) => (
        <div key={id} className="sprite-row">
          <div className="sprite-label">
            <b>{id}</b>
            <span className="muted">
              {item.gridSize}×{item.gridSize} · {item.frames.length}f
            </span>
          </div>
          <SpriteCanvas item={item} />
        </div>
      ))}
    </div>
  );
}
