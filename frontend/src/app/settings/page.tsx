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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-2xl px-6">
        <ProfilePageSkeleton />
      </div>
    </div>
  );
} 
