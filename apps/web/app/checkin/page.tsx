import type { Metadata } from 'next';
import { RequireSignIn } from '@/components/require-sign-in';
import { CheckinView } from '@/components/checkin-view';

export const metadata: Metadata = { title: 'Check-in' };

export default function CheckinPage() {
  return (
    <RequireSignIn>
      <CheckinView />
    </RequireSignIn>
  );
}
