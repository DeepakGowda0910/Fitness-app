import type { Metadata } from 'next';
import { RequireSignIn } from '@/components/require-sign-in';
import { PlanView } from '@/components/plan-view';

export const metadata: Metadata = { title: 'Diet plan' };

export default function PlanPage() {
  return (
    <RequireSignIn>
      <PlanView />
    </RequireSignIn>
  );
}
