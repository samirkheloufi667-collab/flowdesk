'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

/**
 * Charge une ressource de l'API et expose un rechargement.
 * Une clé nulle suspend le chargement (par exemple tant qu'aucun espace n'est choisi).
 */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, setData, error, loading, reload: load };
}
