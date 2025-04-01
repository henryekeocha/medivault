import { ClerkProvider as BaseClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ClerkProviderProps {
  children: ReactNode;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  return (
    <BaseClerkProvider
      appearance={{
        elements: {
          rootBox: 'mx-auto',
          card: 'bg-white shadow-xl',
        },
      }}
    >
      {children}
    </BaseClerkProvider>
  );
} 