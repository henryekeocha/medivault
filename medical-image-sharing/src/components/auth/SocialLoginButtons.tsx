'use client';

import React from 'react';
import { Button, Stack, Typography, Divider, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { signIn } from 'next-auth/react';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onSuccess,
  onError,
}) => {
  const handleSocialLogin = async (provider: string) => {
    try {
      const result = await signIn(provider, {
        redirect: false,
      });
      
      if (result?.error) {
        onError?.(result.error);
      } else if (result?.ok && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`${provider} login error:`, error);
      onError?.(`Error signing in with ${provider}`);
    }
  };

  return (
    <>
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          OR
        </Typography>
      </Divider>
      
      <Stack spacing={2} sx={{ mt: 2, width: '100%' }}>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<GoogleIcon />}
          onClick={() => handleSocialLogin('google')}
          sx={{
            justifyContent: 'flex-start',
            px: 3,
            py: 1,
            color: '#757575',
            borderColor: '#dadce0',
            '&:hover': {
              borderColor: '#bdc1c6',
              backgroundColor: 'rgba(66, 133, 244, 0.04)',
            },
          }}
        >
          Continue with Google
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          startIcon={<FacebookIcon />}
          onClick={() => handleSocialLogin('facebook')}
          sx={{
            justifyContent: 'flex-start',
            px: 3,
            py: 1,
            color: '#1877f2',
            borderColor: '#1877f2',
            '&:hover': {
              borderColor: '#166fe5',
              backgroundColor: 'rgba(24, 119, 242, 0.04)',
            },
          }}
        >
          Continue with Facebook
        </Button>
      </Stack>
    </>
  );
};

export default SocialLoginButtons; 