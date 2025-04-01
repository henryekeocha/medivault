import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import PageStatusCheck from '@/components/PageStatusCheck';
import ClientLayout from './components/ClientLayout';
import '@/styles/home.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Medical Image Sharing Platform',
  description: 'Secure and HIPAA-compliant medical image sharing platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <ClerkProvider>
          <Providers>
            <ClientLayout>
              {children}
            </ClientLayout>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
