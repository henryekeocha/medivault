import { useState, useEffect } from 'react';
import { providerClient } from '@/lib/api';
import { useUser } from '@clerk/nextjs';

type Patient = {
  id: string;
  name: string;
};

export function usePatients() {
  const { user } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const userRole = user.publicMetadata.role as string;
        if (userRole !== 'PROVIDER' && userRole !== 'ADMIN') {
          setLoading(false);
          return;
        }
        
        // Only providers can get patients, admins would need to use a different endpoint
        const response = await providerClient.getPatients();
        
        if (response.status === 'success') {
          let mappedPatients: Patient[] = [];
          
          if (Array.isArray(response.data)) {
            mappedPatients = response.data.map((patient: any) => ({
              id: patient.id,
              name: patient.name,
            }));
          } else if (response.data?.data) {
            mappedPatients = response.data.data.map((patient: any) => ({
              id: patient.id,
              name: patient.name,
            }));
          }
          
          setPatients(mappedPatients);
        } else {
          setError('Failed to fetch patients');
        }
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('An error occurred while fetching patients');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user]);

  return { patients, loading, error };
} 