export default function CampusBackground() {
  return (
    <div className="hidden md:block absolute inset-0 z-0 pointer-events-none" aria-hidden>
      <img
        src="/kmu_campus.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.18] dark:opacity-[0.14]"
      />
      <div className="absolute inset-0 bg-slate-100/70 dark:bg-slate-950/75" />
    </div>
  );
}
