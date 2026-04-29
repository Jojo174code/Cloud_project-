import '../styles/globals.css';
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
      <body className="min-h-screen bg-transparent text-white">
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <NavBar />
            <main className="mx-auto min-h-[calc(100vh-13rem)] w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
            <footer className="border-t border-white/10 bg-slate-950/60 px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <p className="text-sm font-medium text-slate-200">LeasePilot</p>
                <p className="text-sm text-slate-400">Developed by Josiah Rhodes - cybersecurity student</p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
