import { redirect } from 'next/navigation';

import { getCurrentAccessDecision } from '@/lib/access-control';

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, decision } = await getCurrentAccessDecision();

  if (!user) {
    redirect('/sign-in?redirect_url=/app');
  }

  if (!decision.hasAccess) {
    redirect('/account?access=required');
  }

  return children;
}
