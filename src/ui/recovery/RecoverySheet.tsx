import { useState } from 'react';
import type { RecoveryState } from '../../recovery/recoveryService';

export function RecoverySheet({
  state,
  onRetry,
  onReconnect,
  onClose,
}: {
  state: RecoveryState;
  onRetry: () => void | Promise<void>;
  onReconnect: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<'retry' | 'reconnect'>();
  const [error, setError] = useState<string>();

  const run = async (kind: 'retry' | 'reconnect', fn: () => void | Promise<void>) => {
    setBusy(kind);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <section className="sheet recovery-sheet" role="dialog" aria-label="Recovery">
      <header className="sheet-head">
        <div>
          <span className="eyebrow">Recovery</span>
          <strong>Offene Vorgänge</strong>
        </div>
        <button className="ghost" aria-label="Schließen" onClick={onClose}>×</button>
      </header>

      {error && <div className="operation-error">{error}</div>}

      <div className="recovery-stats">
        <div aria-label={`${state.failedJobs} fehlgeschlagen`}>
          <strong>{state.failedJobs}</strong>
          <span>fehlgeschlagen</span>
        </div>
        <div aria-label={`${state.resumableJobs} fortsetzbar`}>
          <strong>{state.resumableJobs}</strong>
          <span>fortsetzbar</span>
        </div>
        <div aria-label={`${state.unavailableAssets} Quelle offline`}>
          <strong>{state.unavailableAssets}</strong>
          <span>Quelle offline</span>
        </div>
      </div>

      {state.failedJobs + state.resumableJobs > 0 && (
        <button
          className="cta recovery-action"
          aria-label="Verarbeitung fortsetzen"
          disabled={!!busy}
          onClick={() => run('retry', onRetry)}
        >
          {busy === 'retry' ? 'Verarbeite …' : 'Verarbeitung fortsetzen'}
        </button>
      )}

      {state.unavailableAssets > 0 && (
        <button
          className="secondary recovery-action"
          aria-label="Quelle neu verbinden"
          disabled={!!busy}
          onClick={() => run('reconnect', onReconnect)}
        >
          Quelle neu verbinden
        </button>
      )}
    </section>
  );
}
