import type { Metadata } from 'next';
import { RequireSignIn } from '@/components/require-sign-in';
import { ResultsView } from '@/components/results-view';

export const metadata: Metadata = { title: 'My targets' };

export default function ResultsPage() {
  return (
    <RequireSignIn>
      <ResultsView />
    </RequireSignIn>
  );
}
