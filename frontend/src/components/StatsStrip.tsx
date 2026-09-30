import type { ReactNode } from "react";

type StatsStripProps = {
  children: ReactNode;
  desktopColumnsClass?: string;
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  iconClassName?: string;
  className?: string;
  valueClassName?: string;
};

export function StatsStrip({
  children,
  desktopColumnsClass = "md:grid-cols-4",
}: StatsStripProps) {
  return (
    <section
      className={`flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:gap-4 md:overflow-visible md:pb-0 ${desktopColumnsClass}`}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  icon,
  iconClassName = "bg-slate-50 text-kmuGreen dark:bg-slate-950",
  className = "border-slate-200 dark:border-slate-800",
  valueClassName = "text-slate-900 dark:text-white",
}: StatCardProps) {
  return (
    <article
      className={`stat-card min-w-[5.6rem] rounded-lg border bg-white p-2 shadow-sm dark:bg-slate-900 md:min-w-0 md:rounded-xl md:p-3 ${className}`}
    >
      <div className="flex h-full items-center gap-2 md:justify-between md:gap-3">
        {icon && (
          <div
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg md:flex ${iconClassName}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold uppercase leading-tight text-slate-500 dark:text-slate-400 md:text-[10px] md:tracking-wider">
            {label}
          </p>
          <p className={`stat-card-value mt-0.5 text-base font-bold leading-none md:mt-1 md:text-lg ${valueClassName}`}>
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}
