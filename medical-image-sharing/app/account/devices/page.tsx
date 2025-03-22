'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { routes } from '@/config/routes';

export default function DevicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    router.push(routes.root.login);
    return null;
  }

  return (
    <div>
      <h1>Devices</h1>
      {/* Add your devices content here */}
    </div>
  );
} 