import React, { useState } from 'react';
import { Search, Filter, CheckCircle2, AlertCircle, Eye, FileText, Check, DollarSign } from 'lucide-react';
import { CaseDomain } from '../../types';
import { useRouter } from '../../core/router/RouterContext';
import { CasesTable } from '../shared/CasesTable';

interface AdminCasesListViewProps {
  cases: CaseDomain[];
  onSelectCase: (c: CaseDomain) => void;
  onRefreshCases?: () => void;
}

export const AdminCasesListView: React.FC<AdminCasesListViewProps> = ({
  cases,
  onSelectCase,
  onRefreshCases,
}) => {
  const { navigate } = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'READY' | 'ANALYZED'>('ALL');

  const handleSelectCaseWithNavigation = (c: CaseDomain) => {
    onSelectCase(c);
    navigate(`/admin/cases/${c.id}`);
  };

  return (
    <CasesTable
      cases={cases}
      onSelectCase={handleSelectCaseWithNavigation}
      variant="admin"
      showFilters={true}
      showStats={false}
      showNewCaseButton={false}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
    />
  );
};
