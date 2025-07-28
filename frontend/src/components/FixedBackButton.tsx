"use client";

import { useRouter } from 'next/navigation';

export default function FixedBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="fixed top-20 right-4 z-40 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition flex items-center gap-2 shadow-lg"
      aria-label="Go back"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
} 