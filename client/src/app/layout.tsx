import '@/styles/globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import NavBar from '@/components/NavBar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LeasePilot',
  description: 'Property management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="h-full bg-gradient-to-b from-gray-900 to-gray-800">
        <AuthProvider>
          <NavBar />
          <main className="container mx-auto p-4 min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
