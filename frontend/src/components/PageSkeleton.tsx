/**
 * PageSkeleton — full-page skeleton shown while redirecting or loading auth.
 * InlineSkeleton — compact skeleton for inline content areas.
 */
export function PageSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse" aria-hidden="true">
      {/* Header area */}
      <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-6 md:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-52 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-44 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="mb-4 h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mt-3 h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Content panels */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="mb-6 space-y-2">
            <div className="h-5 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-[320px] rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="mb-4 space-y-2">
            <div className="h-5 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-44 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-950 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2.5 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InlineSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse" aria-hidden="true">
      <div className="space-y-3">
        <div className="h-5 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-pulse" aria-hidden="true">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-600" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-3 flex gap-4 border-t border-gray-100 dark:border-gray-700">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className={`h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700 ${colIdx === 0 ? 'w-16' : colIdx === cols - 1 ? 'w-20' : ''}`} style={{ opacity: 0.4 + Math.random() * 0.4 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse" aria-hidden="true">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2">
            <div className="h-8 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
      {/* Main content card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="h-6 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
      {/* Secondary card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
        <div className="h-6 w-36 rounded-lg bg-slate-200 dark:bg-slate-700" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <section className="w-full space-y-8 animate-pulse" aria-hidden="true">
      {/* Title */}
      <div className="text-center mb-8 space-y-3">
        <div className="h-10 w-64 mx-auto rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-5 w-96 max-w-full mx-auto rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      {/* Two-column cards */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-700" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
          <div className="h-10 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-700" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
          <div className="h-10 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </section>
  );
}
