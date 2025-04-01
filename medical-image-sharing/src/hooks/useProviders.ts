import { useState, useEffect } from 'react';
import { patientClient, providerClient, adminClient } from '@/lib/api';
import { useUser } from '@clerk/nextjs';

type Provider = {
  id: string;
  name: string;
  specialty?: string;
};

export function useProviders() {
  const { user } = useUser();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProviders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userRole = user.publicMetadata.role as string;
        const client = userRole === 'ADMIN' ? adminClient : 
                      userRole === 'PROVIDER' ? providerClient : patientClient;
        
        const response = await client.getProviders();
        
        if (response.status === 'success') {
          let mappedProviders: Provider[] = [];
          
          if (Array.isArray(response.data)) {
            mappedProviders = response.data.map((provider: any) => ({
              id: provider.id,
              name: provider.name,
              specialty: provider.specialty || 'General',
            }));
          } else if (response.data?.data) {
            mappedProviders = response.data.data.map((provider: any) => ({
              id: provider.id,
              name: provider.name,
              specialty: provider.specialty || 'General',
            }));
          }
          
          setProviders(mappedProviders);
        } else {
          setError('Failed to fetch providers');
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('An error occurred while fetching providers');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [user]);

  return { providers, loading, error };
} 