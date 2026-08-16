"use client";

import { useEffect, type HTMLAttributes, type ReactNode } from "react";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** sm = narrow dialog, md = default, lg = wide form */
  size?: "sm" | "md" | "lg";
}

const modalSizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

function Modal({ open, onClose, children, className = "", size = "lg", ...props }: ModalProps) {
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 animate-fade-in bg-espresso/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          "relative z-10 flex max-h-[90vh] w-full flex-col rounded-3xl border border-border bg-linen",
          modalSizeClasses[size],
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
