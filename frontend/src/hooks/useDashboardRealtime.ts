'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config/constants';

type RefreshPayload = {
  resource?: string;
};

export function useDashboardRealtime(
  onRefresh: (resource?: string) => void,
  enabled = true,
  resources: string[] = ['all'],
) {
  const resourcesKey = resources.join('|');

  useEffect(() => {
    if (!enabled) return;
    const isVercelDeployment = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
    const realtimeExplicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';
    if (isVercelDeployment && !realtimeExplicitlyEnabled) return;

    const allowedResources = resourcesKey.split('|').filter(Boolean);

    const socket: Socket = io(SOCKET_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      socket.emit('joinDashboard');
    });

    socket.on('dashboard:refresh', (payload: RefreshPayload = {}) => {
      const resource = payload.resource || 'all';
      if (allowedResources.includes('all') || allowedResources.includes(resource)) {
        onRefresh(resource);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, onRefresh, resourcesKey]);
}
