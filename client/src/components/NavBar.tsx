"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between py-4 px-6 bg-gray-900/80 backdrop-blur-md border-b border-white/10">
      <Link href="/" className="text-2xl font-bold text-primary-400">
        LeasePilot
      </Link>

      <div className="flex items-center gap-4">
        {!user ? (
          <>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-400 transition"
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
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 transition"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
