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
  imageClassName = "inline-block h-[1.1em] max-w-[10rem] align-middle object-contain",
  placeholder = "____________________",
}: SignatureDisplayProps) {
  const line = isSignatureDataUrl(value) ? (
    <img
      src={value}
      alt={label || "Signature"}
      className={imageClassName}
    />
  ) : (
    <span className="inline-block min-w-[8rem] border-b border-black align-bottom leading-none">
      {value?.trim() || placeholder}
    </span>
  );

  return (
    <div className={`flex flex-wrap items-end gap-x-1 text-sm leading-snug ${className}`}>
      {label ? (
        <span className="shrink-0 font-semibold">{label}:</span>
      ) : null}
      {line}
    </div>
  );
}
