"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfilePageSkeleton } from '../../components/PageSkeleton';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified profile page
    router.replace('/profile');
  }, [router]);

  return (
    <section className="w-full">
      <ProfilePageSkeleton />
    </section>
  );
} 
