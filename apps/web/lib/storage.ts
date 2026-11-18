'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AssessmentDraft } from './assessment';
import type { CheckinState } from './checkins';

export const ASSESSMENT_KEY = 'fitness.assessment.v1';
export const CHECKINS_KEY = 'fitness.checkins.v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: data lasts for this visit only.
  }
}

/**
 * A value kept in this browser until accounts are connected.
 * `ready` is false until the saved value has been read, to avoid a flash of empty content.
 */
export function useLocalValue<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(read(key, fallback));
    setReady(true);
    // fallback is a constant per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      write(key, next);
    },
    [key],
  );

  return { value, ready, update };
}

const EMPTY_DRAFT: AssessmentDraft = {};

export function useAssessmentDraft() {
  const { value, ready, update } = useLocalValue<AssessmentDraft>(ASSESSMENT_KEY, EMPTY_DRAFT);
  return { draft: value, ready, update };
}

export function useCheckinState() {
  return useLocalValue<CheckinState | null>(CHECKINS_KEY, null);
}
