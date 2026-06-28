"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "@/components/icons";
import type SignaturePad from "signature_pad";
import { isSignatureDataUrl } from "../utils/signatures";

const SIGNATURE_LINE_HEIGHT = 44;

type SignatureFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  inline?: boolean;
  /** When true, drawing is locked until the user taps the pen icon. */
  requireEditToSign?: boolean;
  /** Role lock — shows the value but prevents signing. */
  disabled?: boolean;
};

export default function SignatureField({
  label,
  value,
  onChange,
  helperText = "Tap the pen icon to sign on the line.",
  inline = true,
  requireEditToSign = true,
  disabled = false,
}: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const latestValueRef = useRef(value);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const shouldMountPad = !disabled && (!requireEditToSign || editing);

  useEffect(() => {
    if (!shouldMountPad) {
      signaturePadRef.current?.off();
      signaturePadRef.current = null;
      setReady(false);
      return;
    }

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
  }, [shouldMountPad, onChange]);

  useEffect(() => {
    const pad = signaturePadRef.current;
    if (!pad || !editing) {
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
  }, [editing, value]);

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    onChange("");
  };

  const finishEditing = () => {
    setEditing(false);
  };

  const startEditing = () => {
    if (!disabled) {
      setEditing(true);
    }
  };

  const showPad = shouldMountPad;

  const viewLine = (
    <div
      className={`min-w-[10rem] flex-1 border-b border-slate-400 bg-white dark:border-slate-500 dark:bg-white ${
        disabled ? "opacity-70" : ""
      }`}
    >
      {isSignatureDataUrl(value) ? (
        <img
          src={value}
          alt={label || "Signature"}
          className="inline-block h-11 max-w-full object-contain px-1"
        />
      ) : (
        <div className="flex h-11 items-end px-1 pb-1 text-sm text-slate-400">
          {value?.trim() || "____________________"}
        </div>
      )}
    </div>
  );

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-1 pb-1">
      {requireEditToSign && !disabled && !editing ? (
        <button
          type="button"
          onClick={startEditing}
          className="rounded-md border border-slate-300 p-1.5 text-slate-600 transition hover:border-kmuOrange hover:text-kmuOrange dark:border-slate-600 dark:text-slate-300"
          aria-label={`Edit ${label || "signature"}`}
          title="Tap to sign"
        >
          <Pencil size={14} />
        </button>
      ) : null}
      {showPad ? (
        <>
          <button
            type="button"
            onClick={clearSignature}
            className="text-xs font-medium text-kmuOrange underline"
          >
            Clear
          </button>
          {requireEditToSign ? (
            <button
              type="button"
              onClick={finishEditing}
              className="rounded-md border border-kmuGreen p-1.5 text-kmuGreen transition hover:bg-kmuGreen/10"
              aria-label="Done signing"
              title="Done"
            >
              <Check size={14} />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );

  const pad = showPad ? (
    <div className="min-w-[10rem] flex-1 border-b border-kmuOrange bg-white dark:bg-white">
      <canvas
        ref={canvasRef}
        className="h-11 w-full touch-none bg-white"
        style={{ height: SIGNATURE_LINE_HEIGHT }}
      />
    </div>
  ) : (
    viewLine
  );

  const resolvedHelper = disabled
    ? "You are not authorised to sign this section."
    : requireEditToSign && !editing
      ? helperText
      : ready
        ? "Sign on the line."
        : "Loading signature pad...";

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
          {actionButtons}
        </div>
        {resolvedHelper ? (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {resolvedHelper}
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
        {actionButtons}
      </div>
      {pad}
      {resolvedHelper ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {resolvedHelper}
        </p>
      ) : null}
    </div>
  );
}
