export default function SiteFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`text-center text-[10px] font-medium text-slate-500 dark:text-slate-400 ${className}`}>
      by Chali Daniel and Namonje Grace
    </footer>
  );
}
