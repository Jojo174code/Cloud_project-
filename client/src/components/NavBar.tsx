'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="flex items-center justify-between py-4 px-6 bg-gray-900/80 backdrop-blur-md">
      <Link href="/" className="text-2xl font-bold text-primary-400">
        LeasePilot
      </Link>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-gray-200">{user.full_name}</span>
        )}
        {user ? (
          <button
            onClick={logout}
            className="text-sm text-gray-300 hover:text-white"
          >
            Logout
          </button>
        ) : (
          <Link href="/login" className="text-sm text-gray-300 hover:text-white">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
