'use client';

import { computeTargets, type DayTargets, type NutritionTargets } from '@fitness/calc-engine';
import { useMemo } from 'react';
import { toTargetsInput, validateStep, type AssessmentDraft } from './assessment';
import { activeDayTargets, stateFor, type CheckinState } from './checkins';
import { useAssessmentDraft, useCheckinState } from './storage';

export type TargetsState =
  | { status: 'loading' }
  | { status: 'incomplete'; draft: AssessmentDraft }
  | {
      status: 'ready';
      draft: AssessmentDraft;
      /** From the assessment. */
      targets: NutritionTargets;
      /** In force now: the assessment's, or the latest check-in's. */
      active: DayTargets;
      checkins: CheckinState;
      /** True when a check-in has changed calories since the assessment. */
      adjusted: boolean;
      saveCheckins: (s: CheckinState) => void;
    };

/** Targets for the saved assessment and check-ins, worked out in the browser by the engine. */
export function useTargets(): TargetsState {
  const { draft, ready } = useAssessmentDraft();
  const { value: saved, ready: checkinsReady, update: saveCheckins } = useCheckinState();
  return useMemo((): TargetsState => {
    if (!ready || !checkinsReady) return { status: 'loading' };
    if (Object.keys(validateStep('review', draft)).length > 0) return { status: 'incomplete', draft };
    let targets: NutritionTargets;
    try {
      targets = computeTargets(toTargetsInput(draft));
    } catch {
      return { status: 'incomplete', draft };
    }
    const checkins = stateFor(saved, targets);
    const active = activeDayTargets(targets, checkins);
    return { status: 'ready', draft, targets, active, checkins, adjusted: active.calories !== targets.calories, saveCheckins };
  }, [draft, ready, saved, checkinsReady, saveCheckins]);
}
