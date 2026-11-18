import type { Metadata } from 'next';
import { SignInView } from '@/components/signin-view';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return <SignInView />;
}
