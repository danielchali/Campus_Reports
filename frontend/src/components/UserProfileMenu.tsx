"use client";

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

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
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 text-left"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-kmuGreen/10 font-semibold text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300">
          {(user.name || user.username).charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight hidden sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-white max-w-[120px] truncate">{user.name || user.username}</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {user.role.replaceAll('_', ' ')}
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 flex flex-col gap-1">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1 sm:hidden">
             <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name || user.username}</p>
             <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mt-1">
               {user.role.replaceAll('_', ' ')}
             </p>
          </div>
          
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <User size={16} className="text-slate-400" />
            My Profile
          </Link>
          
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Settings size={16} className="text-slate-400" />
            Account Settings
          </Link>
          
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
          
          <button 
            onClick={() => { setIsOpen(false); logout(); }}
            className="flex items-center w-full gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
