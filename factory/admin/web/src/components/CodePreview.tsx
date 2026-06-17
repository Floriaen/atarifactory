import { useMemo } from 'react';
import { inlineBundle } from '../lib/bundle';
import type { CodeArtifact, CodeChecks } from '../lib/types';

const FLOOR: Array<keyof CodeChecks> = ['syntax', 'lint', 'smoke'];
const SOFT: Array<keyof CodeChecks> = ['interaction', 'progression', 'faithful'];

function Check({ name, ok }: { name: string; ok: boolean }) {
  return (
    <span className={`check ${ok ? 'ok' : 'bad'}`}>
      {ok ? '✓' : '✗'} {name}
    </span>
  );
}

export function CodePreview({ artifact }: { artifact: CodeArtifact }) {
  const { report, bundle } = artifact;
  const srcDoc = useMemo(() => inlineBundle(bundle), [bundle]);

  return (
    <div className="code-preview">
      <div className={`code-verdict ${report.passed ? 'pass' : 'fail'}`}>
        {report.passed ? 'PASSED' : 'SUB-BAR (runs, but below the bar)'}
      </div>

      <div className="checks">
        <div className="check-group">
          <span className="check-tier">floor</span>
          {FLOOR.map((k) => (
            <Check key={k} name={k} ok={report.checks[k]} />
          ))}
        </div>
        <div className="check-group">
          <span className="check-tier">soft</span>
          {SOFT.map((k) => (
            <Check key={k} name={k} ok={report.checks[k]} />
          ))}
        </div>
      </div>

      {report.issues.length > 0 && (
        <details className="issues" open={!report.passed}>
          <summary>
            {report.issues.length} issue{report.issues.length > 1 ? 's' : ''}
          </summary>
          <ul>
            {report.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="game-frame-wrap" onMouseEnter={(e) => e.currentTarget.querySelector('iframe')?.focus()}>
        <iframe
          className="game-frame"
          title="game preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          tabIndex={0}
          onLoad={(e) => e.currentTarget.focus()}
        />
      </div>
    </div>
  );
}
