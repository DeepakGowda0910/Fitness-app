'use client';

import { computeTargets } from '@fitness/calc-engine';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toTargetsInput, validateStep, type AssessmentDraft } from './assessment';
import { emptySnapshot, type Backend, type Snapshot } from './backend';
import { baseKeyOf, newCheckin, withWeighIn, type StoredWeighIn, type WeekAnswers } from './checkins';
import { cloudBackend } from './cloud-backend';
import { localBackend } from './local-backend';
import { cloudEnabled, supabase } from './supabase';

export interface AppData {
  ready: boolean;
  /** Where data is saved right now. */
  mode: 'local' | 'cloud';
  /** Signed-in email, in cloud mode. */
  email: string | null;
  draft: AssessmentDraft;
  tracking: Snapshot['tracking'];
  /** Last save problem, shown to the user; cleared on the next successful save. */
  syncError: string | null;
  saveDraft: (d: AssessmentDraft) => void;
  addWeighIn: (date: string, weightKg: number) => void;
  removeWeighIn: (date: string) => void;
  submitCheckin: (answers: WeekAnswers, today: string, cycleAware: boolean) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

/** Key of the targets these answers give, or null while they are incomplete. */
function completeKey(d: AssessmentDraft): string | null {
  if (Object.keys(validateStep('review', d)).length > 0) return null;
  try {
    return baseKeyOf(computeTargets(toTargetsInput(d)));
  } catch {
    return null;
  }
}

/** Answer edits are saved to the account after a short pause, not on every keystroke. */
const DRAFT_SAVE_DELAY_MS = 800;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [email, setEmail] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const backend = useRef<Backend>(localBackend());
  const lastKey = useRef<string | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const pendingSince = useRef<string | undefined>(undefined);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;

  const run = useCallback((p: Promise<unknown>) => {
    p.then(
      () => setSyncError(null),
      (err: unknown) => setSyncError(err instanceof Error ? err.message : 'Could not save. Check your connection.'),
    );
  }, []);

  const use = useCallback(async (b: Backend, nextMode: 'local' | 'cloud', nextEmail: string | null) => {
    const s = await b.load();
    backend.current = b;
    lastKey.current = completeKey(s.draft);
    setSnapshot(s);
    setMode(nextMode);
    setEmail(nextEmail);
    setReady(true);
  }, []);

  // Start in this browser; switch to the account whenever someone is signed in.
  useEffect(() => {
    let cancelled = false;
    const local = localBackend();
    const db = supabase();

    const connect = async (authUserId: string, userEmail: string) => {
      try {
        const cloud = await cloudBackend(db!, authUserId, userEmail);
        const remote = await cloud.load();
        // First sign-in: bring this browser's answers and history into the new account.
        if (Object.keys(remote.draft).length === 0 && remote.tracking.weighIns.length === 0) {
          const here = await local.load();
          if (Object.keys(here.draft).length > 0 || here.tracking.weighIns.length > 0) await cloud.importAll(here);
        }
        if (!cancelled) await use(cloud, 'cloud', userEmail);
        setSyncError(null);
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err.message : 'Could not reach your account.');
          await use(local, 'local', null);
        }
      }
    };

    void (async () => {
      if (!db) return use(local, 'local', null);
      const { data } = await db.auth.getSession();
      const user = data.session?.user;
      if (user) await connect(user.id, user.email ?? '');
      else await use(local, 'local', null);
    })();

    const sub = db?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && backend.current === local) {
        void connect(session.user.id, session.user.email ?? '');
      } else if (event === 'SIGNED_OUT') {
        void use(localBackend(), 'local', null);
      }
    });
    return () => {
      cancelled = true;
      sub?.data.subscription.unsubscribe();
    };
  }, [use]);

  const saveDraft = useCallback(
    (d: AssessmentDraft) => {
      const key = completeKey(d);
      let since: string | undefined;
      if (key && key !== lastKey.current) {
        // New targets: check-ins from earlier answers stop adjusting them.
        since = new Date().toISOString();
        lastKey.current = key;
      }
      if (since) pendingSince.current = since;
      setSnapshot((s) => ({ draft: d, tracking: since ? { ...s.tracking, since } : s.tracking }));
      window.clearTimeout(draftTimer.current);
      draftTimer.current = window.setTimeout(() => {
        const sinceToSave = pendingSince.current;
        pendingSince.current = undefined;
        run(backend.current.saveDraft(d, sinceToSave));
      }, DRAFT_SAVE_DELAY_MS);
    },
    [run],
  );

  const addWeighIn = useCallback(
    (date: string, weightKg: number) => {
      const w: StoredWeighIn = { date, weightKg, recordedAt: new Date().toISOString() };
      setSnapshot((s) => ({ ...s, tracking: { ...s.tracking, weighIns: withWeighIn(s.tracking.weighIns, w) } }));
      run(backend.current.putWeighIn(date, weightKg, w.recordedAt));
    },
    [run],
  );

  const removeWeighIn = useCallback(
    (date: string) => {
      setSnapshot((s) => ({ ...s, tracking: { ...s.tracking, weighIns: s.tracking.weighIns.filter((w) => w.date !== date) } }));
      run(backend.current.deleteWeighIn(date));
    },
    [run],
  );

  const submitCheckin = useCallback(
    (answers: WeekAnswers, today: string, cycleAware: boolean) => {
      const tracking = snapRef.current.tracking;
      const c = newCheckin(tracking, answers, today, new Date().toISOString(), cycleAware);
      setSnapshot((s) => ({ ...s, tracking: { ...s.tracking, checkins: [...s.tracking.checkins, c] } }));
      run(backend.current.addCheckin(c, tracking.checkins.length + 1));
    },
    [run],
  );

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut();
  }, []);

  const value = useMemo<AppData>(
    () => ({
      ready,
      mode,
      email,
      draft: snapshot.draft,
      tracking: snapshot.tracking,
      syncError,
      saveDraft,
      addWeighIn,
      removeWeighIn,
      submitCheckin,
      signOut,
    }),
    [ready, mode, email, snapshot, syncError, saveDraft, addWeighIn, removeWeighIn, submitCheckin, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used inside AppDataProvider');
  return v;
}

export { cloudEnabled };
