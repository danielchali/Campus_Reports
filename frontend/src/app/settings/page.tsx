"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new unified profile page
    router.replace('/profile');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kmuGreen mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to Profile & Settings...
        </p>
      </div>
    </div>
  );
} 