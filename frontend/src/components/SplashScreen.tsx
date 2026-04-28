"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, 3000); // 3 seconds duration

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-white px-6 py-12 text-center"
        >
          {/* Top spacer to push content to center */}
          <div />

          {/* Main Content (Logo & Title) */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative h-40 w-40">
              <img 
                src="/kmu_logo.png" 
                alt="KMU Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#008542]">
                Campus Reports
              </h1>
              <p className="text-slate-500 font-medium">
                Campus Safety and Issue Reporting Platform
              </p>
            </div>
          </motion.div>

          {/* Bottom Branding (Facebook-like style) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-1"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              from
            </p>
            <p className="text-sm font-bold text-slate-700">
              Daniel Chali & Grace Namonje
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
