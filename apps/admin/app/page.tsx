'use client';

import { AdminView } from '@/components/admin-view';
import { SignIn } from '@/components/sign-in';
import { Card } from '@/components/ui';
import { useSession } from '@/lib/session';
import { cloudEnabled } from '@/lib/supabase';

export default function Home() {
  const { state } = useSession();
  if (!cloudEnabled) {
    return (
      <Card title="Not connected">
        <p className="text-muted">This copy of the admin site isn't connected to the app's database.</p>
      </Card>
    );
  }
  if (state.kind === 'loading') return <div className="mx-auto h-72 max-w-md animate-pulse rounded-2xl bg-surface-2" aria-label="Loading" />;
  if (state.kind === 'signed_out') return <SignIn linkError={state.linkError} />;
  if (state.kind === 'not_admin') return <SignIn notAdminEmail={state.email} />;
  return <AdminView role={state.role} email={state.email} />;
}
