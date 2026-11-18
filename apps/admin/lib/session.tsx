'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { myAdminRole, type AdminRole } from './admin';
import { supabase } from './supabase';

export type SessionState =
  | { kind: 'loading' }
  | { kind: 'signed_out'; linkError: string | null }
  | { kind: 'not_admin'; email: string }
  | { kind: 'admin'; email: string; role: AdminRole };

interface Session {
  state: SessionState;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

/** Supabase puts the reason a sign-in link failed in the address. Read it before the client tidies the address up. */
function linkErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const described = params.get('error_description') ?? hash.get('error_description');
  if (described) return described.replaceAll('+', ' ');
  // A one-time code in the address that didn't turn into a session: usually opened in another browser.
  return params.has('code') ? 'code' : null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ kind: 'loading' });

  useEffect(() => {
    const db = supabase();
    if (!db) return;
    const urlError = linkErrorFromUrl();
    let cancelled = false;

    const check = async (email: string | undefined) => {
      if (!email) {
        if (!cancelled) {
          setState({
            kind: 'signed_out',
            linkError:
              urlError === 'code'
                ? 'That sign-in link could not be used. Open it in the same browser you asked for it from, or ask for a new one.'
                : urlError,
          });
        }
        return;
      }
      const role = await myAdminRole(db);
      if (cancelled) return;
      if (role) {
        setState({ kind: 'admin', email, role });
      } else {
        // Not an admin: drop the session on this site only (scope local), leaving their app sign-in alone.
        await db.auth.signOut({ scope: 'local' });
        setState({ kind: 'not_admin', email });
      }
    };

    void db.auth.getSession().then(({ data }) => check(data.session?.user.email));
    const sub = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') void check(session?.user.email);
      if (event === 'SIGNED_OUT') setState((s) => (s.kind === 'not_admin' ? s : { kind: 'signed_out', linkError: null }));
    });
    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut({ scope: 'local' });
    setState({ kind: 'signed_out', linkError: null });
  }, []);

  return <Ctx.Provider value={{ state, signOut }}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
