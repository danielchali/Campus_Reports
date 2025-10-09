"use client";
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.replace('/admin');
      else if (user.role === 'chief_security_officer') router.replace('/chief-security-officer-dashboard');
      else if (user.role === 'dean_of_students') router.replace('/dean-of-students-dashboard');
      else if (user.role === 'assistant_dean') router.replace('/assistant-dean-dashboard');
      else if (user.role === 'secretary') router.replace('/secretary-dashboard');
      else if (user.role === 'security_officer') router.replace('/security-dashboard');
      else router.replace('/login');
    }
  }, [user, router]);

  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-extrabold text-kmuGreen mb-4">404</h1>
      <p className="text-lg text-gray-700 mb-8">Sorry, the page you are looking for does not exist.</p>
      {user ? (
        <span className="text-kmuGreen">Redirecting to your dashboard...</span>
      ) : (
        <Link href="/login" className="bg-kmuGreen text-white px-6 py-2 rounded hover:bg-kmuOrange transition font-semibold">Go to Login</Link>
      )}
    </section>
  );
} 