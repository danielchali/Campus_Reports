export const PORTAL_MESSAGE_PREFIX = 'campus-reports:';

export type PortalPrefillPayload = {
  category?: string;
  title?: string;
  location?: string;
  incident_date?: string;
  description?: string;
  details?: Record<string, string>;
};

export function postToParent(type: 'ready' | 'submitted' | 'error', payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage(
    {
      source: 'campus-reports-embed',
      type: `${PORTAL_MESSAGE_PREFIX}${type}`,
      ...payload,
    },
    '*',
  );
}

export function subscribePortalPrefill(handler: (payload: PortalPrefillPayload) => void) {
  if (typeof window === 'undefined') return () => undefined;

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== `${PORTAL_MESSAGE_PREFIX}prefill`) return;
    handler((data.payload || data) as PortalPrefillPayload);
  };

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
