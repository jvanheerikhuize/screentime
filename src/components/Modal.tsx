'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Tailwind max-width class for the dialog panel. */
  maxWidth?: string;
  label?: string;
}

/**
 * Shared native <dialog> modal shell: opened in the top layer via showModal() for built-in
 * focus containment, inert background, Esc dismissal, and light-dismiss on backdrop click.
 */
export const Modal: React.FC<ModalProps> = ({ onClose, children, maxWidth = 'max-w-3xl', label }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // Fallback if already open
      }
    }

    const handleClose = () => {
      dialog.returnValue = '';
      onCloseRef.current();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback light-dismiss for browsers without native <dialog closedby="any"> support.
    let cleanupLightDismiss: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupLightDismiss?.();
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-label={label || 'Dialog'}
      className={`m-auto w-[calc(100%-1.5rem)] sm:w-[calc(100%-4rem)] ${maxWidth} max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto p-0 bg-[#111114] text-zinc-100 ring-1 ring-white/10 rounded-3xl shadow-2xl shadow-black/70 outline-none open:animate-[dialog-in_260ms_cubic-bezier(0.16,1,0.3,1)]`}
    >
      <div className="sticky top-0 z-30 h-0 flex justify-end items-start">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="mt-3 mr-3 p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-zinc-100 hover:text-white ring-1 ring-white/15 shadow-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
};
