"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TenantRoot() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tenant/dashboard');
  }, [router]);
  return null;
}
