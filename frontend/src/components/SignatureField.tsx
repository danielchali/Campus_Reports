"use client";

import { useEffect, useRef, useState } from "react";
import type SignaturePad from "signature_pad";

type SignatureFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
};

export default function SignatureField({
  label,
  value,
  onChange,
  helperText = "Draw a signature in the pad below.",
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

      const module = await import("signature_pad");
      const SignaturePadClass = module.default;

      if (!mounted || !canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = canvas.offsetWidth || 560;
      const height = 180;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);

      pad = new SignaturePadClass(canvas, {
        backgroundColor: "rgb(255,255,255)",
        penColor: "rgb(17,24,39)",
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

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium">{label}</label>
        <button
          type="button"
          onClick={clearSignature}
          className="text-xs font-medium text-kmuOrange underline"
        >
          Clear
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600">
        <canvas
          ref={canvasRef}
          className="h-[180px] w-full touch-none bg-white"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {ready ? helperText : "Loading signature pad..."}
      </p>
    </div>
  );
}
