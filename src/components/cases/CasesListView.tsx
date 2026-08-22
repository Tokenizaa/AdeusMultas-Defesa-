import React, { useState } from 'react';
import { FileText, PlusCircle, Search, CheckCircle2, Clock, ArrowRight, ShieldCheck, AlertTriangle, Car, Calendar } from 'lucide-react';
import { CaseDomain } from '../../types';
import { CasesTable } from '../shared/CasesTable';

interface CasesListViewProps {
  cases: CaseDomain[];
  onSelectCase: (caseItem: CaseDomain) => void;
  onNewCase: () => void;
}

export const CasesListView: React.FC<CasesListViewProps> = ({
  cases,
  onSelectCase,
  onNewCase,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <CasesTable
      cases={cases}
      onSelectCase={onSelectCase}
      onNewCase={onNewCase}
      variant="user"
      showFilters={false} // User variant uses search input, not filter bar
      showStats={true}
      showNewCaseButton={true}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
    />
  );
};
