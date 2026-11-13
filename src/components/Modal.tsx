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
 * Shared dialog shell: closes on Esc, backdrop click and a close button that stays visible while
 * scrolling. Locks page scroll while open so only one scrollbar (the dialog's) is ever shown.
 */
export const Modal: React.FC<ModalProps> = ({ onClose, children, maxWidth = 'max-w-3xl', label }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    // Keep layout from jumping when the page scrollbar disappears.
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const closeOnBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/75 backdrop-blur-md animate-[fade-in_200ms_ease-out]"
      onMouseDown={closeOnBackdrop}
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-8" onMouseDown={closeOnBackdrop}>
        <div className={`relative w-full ${maxWidth} bg-[#111114] ring-1 ring-white/10 rounded-3xl shadow-2xl shadow-black/70 animate-[dialog-in_260ms_cubic-bezier(0.16,1,0.3,1)]`}>
          <div className="sticky top-0 z-30 h-0 flex justify-end items-start">
            <button
              onClick={onClose}
              aria-label="Close"
              className="mt-3 mr-3 p-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-zinc-100 hover:text-white ring-1 ring-white/15 shadow-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
