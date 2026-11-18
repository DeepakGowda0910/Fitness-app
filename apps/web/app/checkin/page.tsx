import type { Metadata } from 'next';
import { CheckinView } from '@/components/checkin-view';

export const metadata: Metadata = { title: 'Check-in' };

export default function CheckinPage() {
  return <CheckinView />;
}
