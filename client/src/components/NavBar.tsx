"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import LeasePilotMark from "@/components/LeasePilotMark";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex flex-col gap-4 border-b border-white/10 bg-gray-900/80 px-6 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <Link href="/" className="flex items-center gap-3 text-primary-400">
        <LeasePilotMark compact />
        <div>
          <div className="text-2xl font-bold text-primary-400">LeasePilot</div>
          <div className="text-xs text-gray-400">Property operations, simplified</div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {user && (
          <>
            <Link
              href={user.role === 'MANAGER' ? '/manager/dashboard' : '/tenant/dashboard'}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Dashboard
            </Link>
            {user.role === 'MANAGER' ? (
              <Link
                href="/manager/finance"
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Finance
              </Link>
            ) : null}
          </>
        )}
        {!user ? (
          <>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-400"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            <span className="text-sm text-gray-300">
              {user.full_name} ({user.role})
            </span>
            <button
              onClick={logout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-400"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
