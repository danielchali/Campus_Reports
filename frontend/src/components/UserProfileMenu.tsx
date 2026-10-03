"use client";

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings } from '@/components/icons';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { getDisplayFullName } from '../utils/userDisplay';

export default function UserProfileMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open profile menu"
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 hover:bg-slate-100 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-left"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-kmuGreen/10 text-xs font-semibold text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300">
          {getDisplayFullName(user.name, user.username, 'U').charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight hidden sm:block">
          <p className="text-xs font-medium text-slate-900 dark:text-white max-w-[100px] truncate">{getDisplayFullName(user.name, user.username)}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {user.role.replaceAll('_', ' ')}
          </p>
        </div>
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-[70] p-2 flex flex-col gap-1">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 sm:hidden">
             <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{getDisplayFullName(user.name, user.username)}</p>
             <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mt-1">
               {user.role.replaceAll('_', ' ')}
             </p>
          </div>
          
          <Link
            role="menuitem"
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-2">
              <User size={16} className="text-slate-400" />
              <Settings size={16} className="text-slate-400" />
            </div>
            Profile & Settings
          </Link>
          
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
          
          <button
            type="button"
            role="menuitem"
            onClick={() => { setIsOpen(false); logout(); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
