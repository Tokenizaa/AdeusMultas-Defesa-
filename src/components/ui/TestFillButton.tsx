import React from 'react';

interface TestFillButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  isAdmin?: boolean;
}

export const TestFillButton: React.FC<TestFillButtonProps> = ({
  onClick,
  label = '🧪 Preencher com dados de teste',
  className = '',
  isAdmin = false,
}) => {
  if (!isAdmin || !import.meta.env.DEV) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`border border-dashed border-blue-300 bg-blue-50 text-[#155BCB] font-semibold text-xs px-3.5 py-2 rounded-lg hover:bg-blue-100/80 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs ${className}`}
    >
      {label}
    </button>
  );
};
