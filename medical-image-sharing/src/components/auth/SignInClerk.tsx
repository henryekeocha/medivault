import React from 'react';
import { useRouter } from 'next/router';
import { SignIn } from '@clerk/nextjs';
import { useColorScheme } from '@mui/material/styles';
import { Box, useTheme } from '@mui/material';

interface SignInClerkProps {
  redirectUrl?: string;
}

export const SignInClerk: React.FC<SignInClerkProps> = ({
  redirectUrl = '/dashboard'
}) => {
  const router = useRouter();
  const { mode } = useColorScheme();
  const theme = useTheme();

  return (
    <Box
      sx={{
        maxWidth: '100%',
        width: '400px',
        margin: '0 auto',
        padding: theme.spacing(2),
      }}
    >
      <SignIn
        appearance={{
          elements: {
            rootBox: {
              margin: '0 auto',
            },
            card: {
              backgroundColor: theme.palette.background.paper,
              boxShadow: theme.shadows[3],
            },
          },
        }}
        afterSignInUrl={redirectUrl}
        afterSignUpUrl={redirectUrl}
        signUpUrl="/sign-up"
        redirectUrl={redirectUrl}
        routing="path"
        path="/auth/login"
      />
    </Box>
  );
};

export default SignInClerk; 