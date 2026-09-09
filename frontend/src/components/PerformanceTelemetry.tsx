'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { API_BASE_URL } from '../config/constants';

type PerformancePayload = {
  path: string;
  navigationDuration?: number;
  domContentLoaded?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  connectionType?: string;
  deviceMemory?: number;
};

function roundMetric(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
}

export default function PerformanceTelemetry() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname || pathname.startsWith('/embed')) return;

    let largestContentfulPaint: PerformanceObserver | undefined;
    let layoutShiftObserver: PerformanceObserver | undefined;
    let cumulativeLayoutShift = 0;
    let firstPaint: number | undefined;
    let firstContentfulPaint: number | undefined;
    let largestContentfulPaintValue: number | undefined;

    const paintEntries = performance.getEntriesByType('paint');
    firstPaint = paintEntries.find((entry) => entry.name === 'first-paint')?.startTime;
    firstContentfulPaint = paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime;

    if ('PerformanceObserver' in window) {
      try {
        largestContentfulPaint = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const latest = entries[entries.length - 1];
          if (latest) {
            largestContentfulPaintValue = latest.startTime;
          }
        });
        largestContentfulPaint.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        largestContentfulPaint = undefined;
      }

      try {
        layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const layoutEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
            if (!layoutEntry.hadRecentInput) cumulativeLayoutShift += layoutEntry.value || 0;
          });
        });
        layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        layoutShiftObserver = undefined;
      }
    }

    const sendMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const connection = (navigator as Navigator & {
        connection?: { effectiveType?: string };
        deviceMemory?: number;
      }).connection;
      const payload: PerformancePayload = {
        path: pathname.split('?')[0].slice(0, 120),
        navigationDuration: roundMetric(navigation?.loadEventEnd || navigation?.duration),
        domContentLoaded: roundMetric(navigation?.domContentLoadedEventEnd),
        firstPaint: roundMetric(firstPaint),
        firstContentfulPaint: roundMetric(firstContentfulPaint),
        largestContentfulPaint: roundMetric(largestContentfulPaintValue),
        cumulativeLayoutShift: roundMetric(cumulativeLayoutShift),
        connectionType: connection?.effectiveType,
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      };

      const body = JSON.stringify(payload);
      const telemetryUrl = `${API_BASE_URL}/telemetry/performance`;
      if (navigator.sendBeacon) {
        navigator.sendBeacon(telemetryUrl, new Blob([body], { type: 'application/json' }));
      } else {
        void fetch(telemetryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => undefined);
      }
    };

    const timer = window.setTimeout(sendMetrics, 3000);
    return () => {
      window.clearTimeout(timer);
      largestContentfulPaint?.disconnect();
      layoutShiftObserver?.disconnect();
    };
  }, [pathname]);

  return null;
}
