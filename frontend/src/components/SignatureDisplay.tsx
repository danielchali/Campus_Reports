import { isSignatureDataUrl } from "../utils/signatures";

type SignatureDisplayProps = {
  label?: string;
  value?: string | null;
  className?: string;
  imageClassName?: string;
  placeholder?: string;
};

export default function SignatureDisplay({
  label,
  value,
  className = "",
  imageClassName = "h-16 max-w-full object-contain",
  placeholder = "____________________",
}: SignatureDisplayProps) {
  return (
    <div className={className}>
      {label ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {label}
        </p>
      ) : null}
      {isSignatureDataUrl(value) ? (
        <img src={value} alt={label || "Signature"} className={imageClassName} />
      ) : (
        <div className="min-h-[4rem] border-t border-black pt-2 text-center text-sm">
          {value?.trim() || placeholder}
        </div>
      )}
    </div>
  );
}
