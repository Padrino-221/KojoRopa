"use client";

import { useEffect, type HTMLAttributes, type ReactNode } from "react";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ open, onClose, children, className = "", ...props }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 animate-fade-in bg-espresso/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-border bg-linen",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export { Modal, type ModalProps };
