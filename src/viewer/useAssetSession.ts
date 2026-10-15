import { useCallback, useEffect, useRef, useState } from 'react';
import type { LibraryDb } from '../db/libraryDb';
import type { StorageGateway } from '../native/storageGateway';
import { AssetSession } from './AssetSession';

export type AssetSessionState = {
  status: 'loading' | 'ready' | 'error';
  session?: AssetSession;
  error?: string;
};

export function useAssetSession(assetId: string, db: LibraryDb, gateway: StorageGateway) {
  const [state, setState] = useState<AssetSessionState>({ status: 'loading' });
  const active = useRef<AssetSession | undefined>(undefined);
  const generation = useRef(0);

  useEffect(() => {
    const gen = ++generation.current;
    let cancelled = false;
    const previous = active.current;
    active.current = undefined;
    if (previous) void previous.dispose();
    setState({ status: 'loading' });

    void AssetSession.open(db, gateway, assetId)
      .then(async (session) => {
        if (cancelled || gen !== generation.current) {
          await session.dispose();
          return;
        }
        active.current = session;
        setState({ status: 'ready', session });
      })
      .catch((error) => {
        if (!cancelled && gen === generation.current) {
          setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
        }
      });

    return () => {
      cancelled = true;
      generation.current++;
      const current = active.current;
      active.current = undefined;
      if (current) void current.dispose();
    };
  }, [assetId, db, gateway]);

  const close = useCallback(async () => {
    generation.current++;
    const current = active.current;
    active.current = undefined;
    setState((s) => ({ ...s, session: undefined }));
    if (current) await current.dispose();
  }, []);

  return { ...state, close };
}
