"use client";

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type DialogTone = 'danger' | 'warning' | 'info' | 'success';

type BaseDialogOptions = {
  title: string;
  message: string;
  tone?: DialogTone;
};

type ConfirmDialogOptions = BaseDialogOptions & {
  confirmLabel?: string;
  cancelLabel?: string;
};

type PendingConfirmDialog = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void;
};

type PendingAlertDialog = BaseDialogOptions & {
  closeLabel?: string;
};

const toneStyles: Record<DialogTone, { icon: string; button: string; dot: string }> = {
  danger: {
    icon: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    button: 'bg-red-600 text-white hover:bg-red-700',
    dot: 'bg-red-600',
  },
  warning: {
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    button: 'bg-amber-600 text-white hover:bg-amber-700',
    dot: 'bg-amber-600',
  },
  info: {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    button: 'bg-kmuGreen text-white hover:bg-kmuOrange',
    dot: 'bg-kmuGreen',
  },
  success: {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    button: 'bg-kmuGreen text-white hover:bg-kmuOrange',
    dot: 'bg-kmuGreen',
  },
};

function DialogShell({
  title,
  message,
  tone = 'info',
  children,
}: BaseDialogOptions & { children: ReactNode }) {
  const styles = toneStyles[tone];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[2px]" role="presentation">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{message}</p>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirmDialog | null>(null);

  const confirm = useCallback((options: ConfirmDialogOptions) => (
    new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    })
  ), []);

  const handleClose = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const confirmDialog = useMemo(() => {
    if (!pending) return null;
    const tone = pending.tone || 'warning';
    const styles = toneStyles[tone];

    return (
      <DialogShell title={pending.title} message={pending.message} tone={tone}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {pending.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => handleClose(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${styles.button}`}
          >
            {pending.confirmLabel || 'Confirm'}
          </button>
        </div>
      </DialogShell>
    );
  }, [handleClose, pending]);

  return { confirm, confirmDialog };
}

export function useAlertDialog() {
  const [pending, setPending] = useState<PendingAlertDialog | null>(null);

  const showAlert = useCallback((options: PendingAlertDialog) => {
    setPending(options);
  }, []);

  const alertDialog = useMemo(() => {
    if (!pending) return null;
    const tone = pending.tone || 'info';
    const styles = toneStyles[tone];

    return (
      <DialogShell title={pending.title} message={pending.message} tone={tone}>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setPending(null)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${styles.button}`}
          >
            {pending.closeLabel || 'OK'}
          </button>
        </div>
      </DialogShell>
    );
  }, [pending]);

  return { showAlert, alertDialog };
}
