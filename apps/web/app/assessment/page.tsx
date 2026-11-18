import type { Metadata } from 'next';
import { RequireSignIn } from '@/components/require-sign-in';
import { AssessmentWizard } from '@/components/assessment-wizard';

export const metadata: Metadata = { title: 'Assessment' };

export default function AssessmentPage() {
  return (
    <RequireSignIn>
      <AssessmentWizard />
    </RequireSignIn>
  );
}
