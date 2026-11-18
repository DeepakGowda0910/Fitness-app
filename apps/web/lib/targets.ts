'use client';

import { computeTargets, type NutritionTargets } from '@fitness/calc-engine';
import { useMemo } from 'react';
import { toTargetsInput, validateStep, type AssessmentDraft } from './assessment';
import { useAssessmentDraft } from './storage';

export type TargetsState =
  | { status: 'loading' }
  | { status: 'incomplete'; draft: AssessmentDraft }
  | { status: 'ready'; draft: AssessmentDraft; targets: NutritionTargets };

/** Targets for the saved assessment, worked out in the browser by the engine. */
export function useTargets(): TargetsState {
  const { draft, ready } = useAssessmentDraft();
  return useMemo((): TargetsState => {
    if (!ready) return { status: 'loading' };
    if (Object.keys(validateStep('review', draft)).length > 0) return { status: 'incomplete', draft };
    try {
      return { status: 'ready', draft, targets: computeTargets(toTargetsInput(draft)) };
    } catch {
      return { status: 'incomplete', draft };
    }
  }, [draft, ready]);
}
