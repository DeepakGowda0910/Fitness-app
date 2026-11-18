import type { Metadata } from 'next';
import { RequireSignIn } from '@/components/require-sign-in';
import { WorkoutsView } from '@/components/workouts-view';

export const metadata: Metadata = { title: 'Workouts' };

export default function WorkoutsPage() {
  return (
    <RequireSignIn>
      <WorkoutsView />
    </RequireSignIn>
  );
}
