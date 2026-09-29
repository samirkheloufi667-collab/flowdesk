'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, refreshSession, setAccessToken } from './api';
import type { Me, WorkspaceRef } from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  me: Me | null;
  workspace: WorkspaceRef | null;
  selectWorkspace: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; workspaceName?: string }) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const WORKSPACE_KEY = 'flowdesk.workspace';

/**
 * Simple indice « une session a été ouverte sur ce navigateur » — pas un secret :
 * le jeton reste dans le cookie httpOnly. Il évite d'appeler /auth/refresh (et
 * d'afficher un 401 en console) pour un visiteur qui ne s'est jamais connecté.
 */
const SESSION_HINT_KEY = 'flowdesk.session';

function setSessionHint(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Stockage indisponible (navigation privée) : on tentera le rafraîchissement.
  }
}

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function readStoredWorkspace(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    const profile = await api<Me>('/auth/me');
    setMe(profile);
    const stored = readStoredWorkspace();
    const chosen = profile.workspaces.find((w) => w.id === stored) ?? profile.workspaces[0];
    setWorkspaceId(chosen?.id ?? null);
    setStatus('authenticated');
  }, []);

  // Au chargement, le cookie de rafraîchissement suffit à retrouver la session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = hasSessionHint() && (await refreshSession());
      if (cancelled) return;
      if (!ok) {
        setSessionHint(false);
        setStatus('anonymous');
        return;
      }
      try {
        await loadMe();
      } catch {
        if (!cancelled) setStatus('anonymous');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        json: { email, password },
      });
      setAccessToken(accessToken);
      setSessionHint(true);
      await loadMe();
    },
    [loadMe],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; workspaceName?: string }) => {
      const { accessToken } = await api<{ accessToken: string }>('/auth/register', {
        method: 'POST',
        json: input,
      });
      setAccessToken(accessToken);
      setSessionHint(true);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setAccessToken(null);
    setSessionHint(false);
    setMe(null);
    setStatus('anonymous');
  }, []);

  const selectWorkspace = useCallback((id: string) => {
    setWorkspaceId(id);
    try {
      localStorage.setItem(WORKSPACE_KEY, id);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la session.
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      me,
      workspace: me?.workspaces.find((w) => w.id === workspaceId) ?? null,
      selectWorkspace,
      login,
      register,
      logout,
      reload: loadMe,
    }),
    [status, me, workspaceId, selectWorkspace, login, register, logout, loadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
