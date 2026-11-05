"use client";

import type { MouseEvent, ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="ui-modal-backdrop" onMouseDown={closeOnBackdrop}>
      <section
        aria-labelledby="ui-modal-title"
        aria-modal="true"
        className="ui-modal"
        role="dialog"
      >
        <div className="ui-modal-header">
          <h2 id="ui-modal-title">{title}</h2>
          <button
            aria-label="Tutup dialog"
            className="ui-modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
