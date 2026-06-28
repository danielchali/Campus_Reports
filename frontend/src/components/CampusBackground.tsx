export default function CampusBackground() {
  return (
    <div className="hidden md:block absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
      <img
        src="/kmu_campus.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center opacity-35 dark:opacity-25"
      />
      <div className="absolute inset-0 bg-white/70 dark:hidden" />
      <div className="absolute inset-0 hidden bg-slate-950/55 dark:block" />
    </div>
  );
}
