"use client";

import { useEffect, useRef, useState } from "react";
import type SignaturePad from "signature_pad";

const SIGNATURE_LINE_HEIGHT = 44;

type SignatureFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  /** When true, label and pad sit on one line like a paper form. */
  inline?: boolean;
};

export default function SignatureField({
  label,
  value,
  onChange,
  helperText = "Sign on the line.",
  inline = true,
}: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const latestValueRef = useRef(value);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    let mounted = true;
    let pad: SignaturePad | null = null;

    async function setupPad() {
      if (!canvasRef.current) {
        return;
      }

      const signaturePadModule = await import("signature_pad");
      const SignaturePadClass = signaturePadModule.default;

      if (!mounted || !canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.offsetWidth || 280;
      const height = SIGNATURE_LINE_HEIGHT;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);

      pad = new SignaturePadClass(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(17, 24, 39)",
        minWidth: 0.8,
        maxWidth: 1.8,
      });

      if (latestValueRef.current) {
        try {
          pad.fromDataURL(latestValueRef.current);
        } catch {
          pad.clear();
        }
      }

      pad.addEventListener("endStroke", () => {
        if (!pad) {
          return;
        }

        onChange(pad.isEmpty() ? "" : pad.toDataURL("image/png"));
      });

      signaturePadRef.current = pad;
      setReady(true);
    }

    setupPad();

    return () => {
      mounted = false;
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
    };
  }, [onChange]);

  useEffect(() => {
    const pad = signaturePadRef.current;
    if (!pad) {
      return;
    }

    if (!value) {
      if (!pad.isEmpty()) {
        pad.clear();
      }
      return;
    }

    if (pad.isEmpty()) {
      try {
        pad.fromDataURL(value);
      } catch {
        pad.clear();
      }
    }
  }, [value]);

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    onChange("");
  };

  const pad = (
    <div className="min-w-[10rem] flex-1 border-b border-slate-400 bg-white dark:border-slate-500 dark:bg-white">
      <canvas
        ref={canvasRef}
        className="h-11 w-full touch-none bg-white"
        style={{ height: SIGNATURE_LINE_HEIGHT }}
      />
    </div>
  );

  if (inline) {
    return (
      <div className="text-sm">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          {label ? (
            <label className="shrink-0 font-medium leading-none text-gray-900 dark:text-white">
              {label}
            </label>
          ) : null}
          {pad}
          <button
            type="button"
            onClick={clearSignature}
            className="shrink-0 pb-1 text-xs font-medium text-kmuOrange underline"
          >
            Clear
          </button>
        </div>
        {helperText ? (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {ready ? helperText : "Loading signature pad..."}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        {label ? (
          <label className="block text-sm font-medium">{label}</label>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={clearSignature}
          className="text-xs font-medium text-kmuOrange underline"
        >
          Clear
        </button>
      </div>
      {pad}
      {helperText ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {ready ? helperText : "Loading signature pad..."}
        </p>
      ) : null}
    </div>
  );
}
