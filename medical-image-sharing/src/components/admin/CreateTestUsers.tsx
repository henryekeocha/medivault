import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Card, 
  CardContent, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import { Role, ProviderSpecialty } from '@prisma/client';
import { authClient } from '@/lib/api/authClient';
import { RegisterRequest } from '@/lib/api/types';

// Test users data
interface TestUser {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
  specialty?: ProviderSpecialty;
}

const testUsers: TestUser[] = [
  {
    name: 'Test Patient',
    email: 'patient@test.com',
    username: 'testpatient',
    password: 'Password123!',
    role: Role.PATIENT
  },
  {
    name: 'Test Provider',
    email: 'provider@test.com',
    username: 'testprovider',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.RADIOLOGY
  },
  {
    name: 'Test Admin',
    email: 'admin@test.com',
    username: 'testadmin',
    password: 'Password123!',
    role: Role.ADMIN
  },
  {
    name: 'Test Cardiologist',
    email: 'cardio@test.com',
    username: 'testcardio',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.CARDIOLOGY
  },
  {
    name: 'Test Neurologist',
    email: 'neuro@test.com',
    username: 'testneuro',
    password: 'Password123!',
    role: Role.PROVIDER,
    specialty: ProviderSpecialty.NEUROLOGY
  }
];

export const CreateTestUsers: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: string[];
    errors: string[];
  }>({
    success: [],
    errors: []
  });

  const createAllTestUsers = async () => {
    setLoading(true);
    setResults({ success: [], errors: [] });
    
    try {
      for (const userData of testUsers) {
        try {
          const registerData: RegisterRequest = {
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            specialty: userData.specialty
          };
          
          const response = await authClient.register(registerData);
          
          if (response.status === 'success') {
            setResults(prev => ({
              ...prev,
              success: [...prev.success, `Created: ${userData.name} (${userData.role})`]
            }));
          } else {
            setResults(prev => ({
              ...prev,
              errors: [...prev.errors, `Error creating ${userData.name}: ${response.error?.message || 'Unknown error'}`]
            }));
          }
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error';
          setResults(prev => ({
            ...prev,
            errors: [...prev.errors, `Error creating ${userData.name}: ${errorMessage}`]
          }));
        }
      }
    } catch (error) {
      console.error('Error creating test users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create Test Users
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          This will attempt to create the following test users:
        </Typography>
        
        <List dense>
          {testUsers.map((user, index) => (
            <ListItem key={index}>
              <ListItemText 
                primary={`${user.name} (${user.role}${user.specialty ? `, ${user.specialty}` : ''})`}
                secondary={`Username: ${user.username}, Email: ${user.email}`}
              />
            </ListItem>
          ))}
        </List>

        <Button 
          variant="contained" 
          color="primary" 
          onClick={createAllTestUsers}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Create Test Users'}
        </Button>

        {(results.success.length > 0 || results.errors.length > 0) && (
          <Box sx={{ mt: 3 }}>
            {results.success.length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body1">Successfully created users:</Typography>
                <List dense>
                  {results.success.map((message, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={message} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}

            {results.errors.length > 0 && (
              <Alert severity="error">
                <Typography variant="body1">Errors:</Typography>
                <List dense>
                  {results.errors.map((error, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={error} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateTestUsers; 