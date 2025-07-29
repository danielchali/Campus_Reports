// Performance optimization utilities
// Updated for TypeScript compatibility and cross-browser support

// Extend Performance interface for memory API
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

// Extend Navigator interface for connection API
interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

interface ExtendedNavigator extends Navigator {
  connection?: NetworkInformation;
}

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Preload critical resources
export function preloadResource(href: string, as: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

// Prefetch resources
export function prefetchResource(href: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

// DNS prefetch
export function dnsPrefetch(domain: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = `//${domain}`;
  document.head.appendChild(link);
}

// Preconnect to domain
export function preconnect(domain: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = `https://${domain}`;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

// Image lazy loading utility
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  placeholder?: string
): void {
  if (typeof window === 'undefined') return;

  // Set placeholder if provided
  if (placeholder) {
    img.src = placeholder;
  }

  // Create intersection observer
  const observer = createIntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement;
        target.src = src;
        target.classList.remove('lazy');
        observer.unobserve(target);
      }
    });
  });

  observer.observe(img);
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string): void {
    if (typeof performance === 'undefined') return;
    performance.mark(`${name}-start`);
  }

  endTimer(name: string): number {
    if (typeof performance === 'undefined') return 0;

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name)[0];
    const duration = measure.duration;

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);

    // Clean up marks
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);

    return duration;
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  logMetrics(): void {
    console.group('Performance Metrics');
    this.metrics.forEach((values, name) => {
      const avg = this.getAverageMetric(name);
      const min = Math.min(...values);
      const max = Math.max(...values);
      console.log(`${name}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

// Memory usage monitoring
export function getMemoryUsage(): { used: number; total: number; limit: number } | null {
  if (typeof performance === 'undefined' || !('memory' in performance)) {
    return null;
  }

  const extendedPerformance = performance as ExtendedPerformance;
  const memory = extendedPerformance.memory;
  
  if (!memory) {
    return null;
  }

  return {
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
  };
}

// Network information
export function getNetworkInfo(): { effectiveType: string; downlink: number; rtt: number } | null {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return null;
  }

  const extendedNavigator = navigator as ExtendedNavigator;
  const connection = extendedNavigator.connection;
  
  if (!connection) {
    return null;
  }

  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
  };
}

// Optimize images based on network conditions
export function getOptimizedImageUrl(
  baseUrl: string,
  width: number,
  quality: number = 80
): string {
  const networkInfo = getNetworkInfo();
  
  if (networkInfo) {
    // Reduce quality for slow connections
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      quality = Math.max(quality - 30, 30);
      width = Math.min(width, 800);
    } else if (networkInfo.effectiveType === '3g') {
      quality = Math.max(quality - 15, 50);
      width = Math.min(width, 1200);
    }
  }

  // Add quality parameter if supported
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}w=${width}&q=${quality}`;
}

// Cache warming utility
export function warmCache(urls: string[]): void {
  if (typeof window === 'undefined') return;

  urls.forEach(url => {
    // Use fetch with cache: 'force-cache' to warm the cache
    fetch(url, { cache: 'force-cache' }).catch(() => {
      // Silently fail for cache warming
    });
  });
}

// Resource hints for better performance
export function addResourceHints(): void {
  if (typeof window === 'undefined') return;

  // DNS prefetch for external domains
  dnsPrefetch('kmu-disciplinedesk.onrender.com');
  
  // Preconnect to API
  preconnect('kmu-disciplinedesk.onrender.com');
  
  // Preload critical resources
  preloadResource('/kmu_logo.svg', 'image');
  preloadResource('/manifest.json', 'fetch');
}

// Optimize scroll performance
export function optimizeScroll(element: HTMLElement): void {
  if (typeof window === 'undefined') return;

  // Use passive event listeners for better scroll performance
  element.addEventListener('scroll', () => {}, { passive: true });
  
  // Add will-change for smooth animations
  element.style.willChange = 'transform';
  
  // Use transform instead of top/left for animations
  element.style.transform = 'translateZ(0)';
}

// Clean up performance optimizations
export function cleanupPerformance(element: HTMLElement): void {
  if (typeof window === 'undefined') return;

  element.style.willChange = 'auto';
  element.style.transform = '';
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance(); 