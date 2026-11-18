import type { Metadata } from 'next';
import { PlanView } from '@/components/plan-view';

export const metadata: Metadata = { title: 'Diet plan' };

export default function PlanPage() {
  return <PlanView />;
}
