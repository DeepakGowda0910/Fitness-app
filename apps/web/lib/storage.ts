'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AssessmentDraft } from './assessment';

const KEY = 'fitness.assessment.v1';

function read(): AssessmentDraft {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AssessmentDraft) : {};
  } catch {
    return {};
  }
}

function write(d: AssessmentDraft) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // Private mode or storage full: answers last for this visit only.
  }
}

/**
 * The assessment draft, kept in this browser until accounts are connected.
 * `ready` is false until the saved draft has been read, to avoid a flash of empty answers.
 */
export function useAssessmentDraft() {
  const [draft, setDraft] = useState<AssessmentDraft>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(read());
    setReady(true);
  }, []);

  const update = useCallback((next: AssessmentDraft) => {
    setDraft(next);
    write(next);
  }, []);

  const clear = useCallback(() => {
    setDraft({});
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }, []);

  return { draft, ready, update, clear };
}
