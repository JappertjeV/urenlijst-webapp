"use client";

import { useEffect } from "react";
import { Icon } from "@/ui/icons";

// Bottom-sheet op mobiel (< 640px), gecentreerde dialoog daarboven.
// Eén scroller binnenin (max-h in svh), backdrop en Escape sluiten.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-(--shadow-float) sm:max-h-[85svh] sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="-mr-1 rounded-full p-1.5 text-ink-faint transition active:bg-canvas lg:hover:bg-canvas"
          >
            <Icon name="kruis" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
