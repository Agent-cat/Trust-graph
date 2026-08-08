"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  type?: "success" | "error" | "confirm" | "info";
  message?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const typeStyles: Record<
  NonNullable<ModalProps["type"]>,
  { icon: string; iconBg: string; iconColor: string }
> = {
  success: { icon: "✓", iconBg: "bg-green-100", iconColor: "text-green-600" },
  error: { icon: "✕", iconBg: "bg-red-100", iconColor: "text-red-600" },
  confirm: { icon: "?", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  info: { icon: "!", iconBg: "bg-gray-100", iconColor: "text-gray-600" },
};

export default function Modal({
  open,
  title,
  type = "info",
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  onClose,
}: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const style = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          {title && (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${style.iconBg} ${style.iconColor}`}
            >
              {style.icon}
            </div>
          )}
          {title && (
            <h2 className="mt-4 text-lg font-bold text-black">{title}</h2>
          )}
          {message && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
          )}
          {children && <div className="w-full mt-4">{children}</div>}
        </div>

        {(onConfirm || onCancel || onClose) && (
          <div className="flex gap-3 mt-6">
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                {confirmText}
              </button>
            )}
            {(onCancel || onClose) && (
              <button
                onClick={onCancel || onClose}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                {cancelText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}