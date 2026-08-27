import React from 'react';

export interface AdeusMultasLogoProps {
  variant?: 'full' | 'icon' | 'compact';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  showSubtitle?: boolean;
  showBadge?: boolean;
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Componente Canônico Oficial do Logo Adeus Multas
 * Identidade visual unificada para web, mobile, sidebar e cabeçalhos
 */
export const AdeusMultasLogo: React.FC<AdeusMultasLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  showSubtitle = true,
  showBadge = true,
  iconSize = 'md',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  }[iconSize];

  // SVG Shield Emblem
  const ShieldEmblem = (
    <div
      className={`relative ${iconDimensions} rounded-xl bg-gradient-to-br from-[#071D41] via-[#0C326F] to-[#155BCB] flex items-center justify-center shadow-xs border border-[#FFD027]/40 shrink-0 select-none`}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-5/6 h-5/6 drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 4 L26 8 C26 19 21 24 16 28 C11 24 6 19 6 8 Z"
          fill="#071D41"
          stroke="url(#reactLogoGold)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <line
          x1="16"
          y1="10"
          x2="16"
          y2="21"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="10.5"
          y1="13"
          x2="21.5"
          y2="13"
          stroke="url(#reactLogoGold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M9.5 16 Q12 19 14.5 16 Z" fill="url(#reactLogoGold)" />
        <path d="M17.5 16 Q20 19 22.5 16 Z" fill="url(#reactLogoGold)" />
        <defs>
          <linearGradient id="reactLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD027" />
            <stop offset="100%" stopColor="#FF7A00" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {ShieldEmblem}
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {ShieldEmblem}

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 leading-tight">
          <span
            className={`font-black text-lg sm:text-xl tracking-tight font-sans ${
              isDark ? 'text-white' : 'text-[#071D41]'
            }`}
          >
            Adeus
          </span>
          <span className="font-black text-lg sm:text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#EA580C] font-sans">
            Multas
          </span>

          {showBadge && (
            <span
              className={`text-[9px] sm:text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                isDark
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              CTB
            </span>
          )}
        </div>

        {showSubtitle && variant === 'full' && (
          <span
            className={`text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase font-mono truncate ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Defesa Pericial de Trânsito
          </span>
        )}
      </div>
    </div>
  );
};
