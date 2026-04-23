import Link from 'next/link';
import Button from '@/components/Button';

export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] py-12">
      <h1 className="text-5xl font-extrabold text-primary-400 mb-6 text-center">
        LeasePilot
      </h1>
      <p className="text-lg text-gray-200 max-w-xl text-center mb-8">
        The premium SaaS platform for intelligent property management.
        Automate maintenance, streamline tenant communication, and harness AI to prioritize issues.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="inline-block">
          <Button variant="primary" className="px-6 py-3">
            Login
          </Button>
        </Link>
        <Link href="/manager/dashboard" className="inline-block">
          <Button variant="secondary" className="px-6 py-3">
            Dashboard
          </Button>
        </Link>
      </div>
    </section>
  );
}
