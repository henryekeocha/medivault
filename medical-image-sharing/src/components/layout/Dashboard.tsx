import { useAuth } from '@/lib/clerk/use-auth';
import { useEffect } from 'react';

const { syncUser } = useAuth();

useEffect(() => {
  syncUser().catch(console.error);
}, []); 