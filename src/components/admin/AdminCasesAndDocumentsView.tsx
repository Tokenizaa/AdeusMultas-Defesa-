import React, { useState } from 'react';
import { FileText, Folders } from 'lucide-react';
import { CaseDomain } from '../../types';
import { AdminCasesListView } from './AdminCasesListView';
import { AdminDocumentsView } from './AdminDocumentsView';

interface AdminCasesAndDocumentsViewProps {
  cases: CaseDomain[];
  onSelectCase: (c: CaseDomain) => void;
  onRefreshCases?: () => void;
}

type OperationalTab = 'cases' | 'documents';

export const AdminCasesAndDocumentsView: React.FC<AdminCasesAndDocumentsViewProps> = ({
  cases,
  onSelectCase,
  onRefreshCases,
}) => {
  const [activeTab, setActiveTab] = useState<OperationalTab>('cases');

  return (
    <section className="space-y-5">
      <div className="border-b border-slate-800">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Operação de casos e documentos">
          <button
            type="button"
            onClick={() => setActiveTab('cases')}
            aria-pressed={activeTab === 'cases'}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'cases'
                ? 'border-orange-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Folders className="w-4 h-4" />
            Casos e atuações
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            aria-pressed={activeTab === 'documents'}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'documents'
                ? 'border-orange-400 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos e petições
          </button>
        </nav>
      </div>

      {activeTab === 'cases' ? (
        <AdminCasesListView
          cases={cases}
          onSelectCase={onSelectCase}
          onRefreshCases={onRefreshCases}
        />
      ) : (
        <AdminDocumentsView />
      )}
    </section>
  );
};
