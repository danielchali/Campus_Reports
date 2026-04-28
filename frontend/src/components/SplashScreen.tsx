"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const { theme } = useTheme();
  const DURATION = 1500; // 1.5 seconds

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(nextProgress);
      
      if (nextProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsVisible(false);
          if (onFinish) onFinish();
        }, 200); // Small buffer after progress reaches 100%
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-white dark:bg-slate-950 px-6 py-12 text-center transition-colors duration-300"
        >
          {/* Top spacer to push content to center */}
          <div />

          {/* Main Content (Logo & Title) */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 -mt-12"
          >
            <div className="relative h-40 w-40">
              <img 
                src="/kmu_logo.svg" 
                alt="KMU Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            
            <div className="space-y-4 w-full max-w-[240px]">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#008542]">
                  Campus Reports
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Campus safety and issue reporting platform
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#008542]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
            </div>
          </motion.div>

          {/* Bottom Branding */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-1"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              by
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Daniel Chali & Grace Namonje
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
