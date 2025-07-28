"use client";

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment and Service Worker is supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        setIsRegistered(true);
        console.log('Service Worker registered successfully:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Handle controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed');
          window.location.reload();
        });

        // Handle messages from Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SKIP_WAITING') {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const updateApp = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Update Available</h3>
              <p className="text-sm opacity-90">A new version is available</p>
            </div>
            <button
              onClick={updateApp}
              className="ml-4 bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </>
  );
} 