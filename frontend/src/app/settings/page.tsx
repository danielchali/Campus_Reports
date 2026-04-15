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
      <div className="w-full max-w-2xl px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-xl bg-gray-200 dark:bg-gray-700 mx-auto" />
          <div className="h-5 w-72 rounded-lg bg-gray-200 dark:bg-gray-700 mx-auto" />
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow space-y-4">
            <div className="h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
          Redirecting to Profile & Settings...
        </p>
      </div>
    </div>
  );
} 
