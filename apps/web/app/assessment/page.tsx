import type { Metadata } from 'next';
import { AssessmentWizard } from '@/components/assessment-wizard';

export const metadata: Metadata = { title: 'Assessment' };

export default function AssessmentPage() {
  return <AssessmentWizard />;
}
