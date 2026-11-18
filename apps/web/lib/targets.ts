'use client';

import { computeTargets, type DayTargets, type NutritionTargets } from '@fitness/calc-engine';
import { useMemo } from 'react';
import { useAppData } from './app-data';
import { toTargetsInput, validateStep, type AssessmentDraft } from './assessment';
import { activeDayTargets, replay, type CheckinResult } from './checkins';

export type TargetsState =
  | { status: 'loading' }
  | { status: 'incomplete'; draft: AssessmentDraft }
  | {
      status: 'ready';
      draft: AssessmentDraft;
      /** From the assessment. */
      targets: NutritionTargets;
      /** Every check-in for the current assessment, replayed through the engine. */
      results: CheckinResult[];
      /** In force now: the assessment's, or the latest check-in's. */
      active: DayTargets;
      /** True when a check-in has changed calories since the assessment. */
      adjusted: boolean;
    };

/** Targets for the saved assessment and check-ins, worked out in the browser by the engine. */
export function useTargets(): TargetsState {
  const { draft, tracking, ready } = useAppData();
  return useMemo((): TargetsState => {
    if (!ready) return { status: 'loading' };
    if (Object.keys(validateStep('review', draft)).length > 0) return { status: 'incomplete', draft };
    let targets: NutritionTargets;
    try {
      targets = computeTargets(toTargetsInput(draft));
    } catch {
      return { status: 'incomplete', draft };
    }
    const results = replay(targets, tracking);
    const active = activeDayTargets(targets, results);
    return { status: 'ready', draft, targets, results, active, adjusted: active.calories !== targets.calories };
  }, [draft, tracking, ready]);
}
