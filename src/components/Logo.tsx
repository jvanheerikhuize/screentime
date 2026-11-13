import React from 'react';

/** The Screentime mark: a play button set inside a sweeping clock ring. */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff4d7a" />
          <stop offset="0.55" stopColor="#f43f5e" />
          <stop offset="1" stopColor="#ff8a3d" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="24" y1="2" x2="24" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${id}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${id}-shine)`} />
      {/* clock ring, open at the top-right like a sweeping hand */}
      <path
        d="M33.9 14.1A14 14 0 1 0 38 24"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="38" cy="18" r="2" fill="#fff" opacity="0.9" />
      {/* play */}
      <path d="M21 17.6v12.8c0 1.1 1.2 1.8 2.2 1.2l10-6.4c.9-.6.9-1.8 0-2.4l-10-6.4c-1-.6-2.2.1-2.2 1.2z" fill="#fff" />
    </svg>
  );
};

export const Logo: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="flex items-center gap-2.5 group" aria-label="Screentime home">
    <LogoMark className="w-9 h-9 drop-shadow-[0_6px_18px_rgba(244,63,94,0.45)] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105" />
    <span className="font-display text-[1.35rem] font-bold tracking-tight leading-none text-white">
      screen<span className="bg-gradient-to-r from-rose-400 to-orange-300 bg-clip-text text-transparent">time</span>
    </span>
  </button>
);
