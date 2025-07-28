import { ReactNode } from 'react';
import DarkModeToggle from './DarkModeToggle';

export default function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col py-6 px-4">
      {/* Sidebar navigation links */}
      {/* ...existing sidebar links... */}
      {/* Only one dark mode toggle button */}
      <div className="mt-auto">
        <DarkModeToggle />
      </div>
      {/* ...existing code... */}
    </aside>
  );
}