import React, { useState } from 'react';
import { HardDrive } from 'lucide-react';
import { GoogleDriveModal } from './GoogleDriveModal';

interface GoogleDriveButtonProps {
  documentToExport?: {
    title: string;
    content: string;
    aitNumber?: string;
    plate?: string;
  };
  variant?: 'primary' | 'secondary' | 'outline' | 'compact';
  className?: string;
}

export const GoogleDriveButton: React.FC<GoogleDriveButtonProps> = ({
  documentToExport,
  variant = 'outline',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-500 text-white border-transparent';
      case 'secondary':
        return 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200';
      case 'compact':
        return 'p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 text-sm';
      case 'outline':
      default:
        return 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300';
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-xl text-sm font-semibold shadow-2xs transition-all cursor-pointer ${getButtonStyles()} ${className}`}
        title="Google Drive — Salvar ou Visualizar Documentos"
      >
        <HardDrive className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Google Drive</span>
      </button>

      <GoogleDriveModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        documentToExport={documentToExport}
      />
    </>
  );
};
