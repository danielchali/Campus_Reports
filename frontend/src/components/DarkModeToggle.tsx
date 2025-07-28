import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function DarkModeToggle() {
  const { toggleTheme } = useTheme();
  return (
    <button
      className="rounded p-2 bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
    >
      {/* ...icon... */}
    </button>
  );
}