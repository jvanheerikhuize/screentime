import React from 'react';

export const PageHeader: React.FC<{ eyebrow?: string; title: string; description?: string }> = ({
  eyebrow,
  title,
  description,
}) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-rose-400 to-orange-300 bg-clip-text text-transparent">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white mt-1">{title}</h1>
      {description && <p className="text-sm text-zinc-400 mt-2">{description}</p>}
    </div>
  </div>
);
