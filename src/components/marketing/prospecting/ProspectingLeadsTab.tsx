import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Users,
  Filter,
  Eye,
  ExternalLink,
  Phone,
  MessageSquare,
  Building2,
  Scale,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Globe,
  Mail,
} from 'lucide-react';
import type { Lead } from '../types/prospecting';
import { ProspectingLeadDrawer } from './ProspectingLeadDrawer';

interface ProspectingLeadsTabProps {
  leads: Lead[];
  onLeadClick?: (lead: Lead) => void;
  isLoading?: boolean;
}

export const ProspectingLeadsTab: React.FC<ProspectingLeadsTabProps> = ({
  leads,
  onLeadClick,
  isLoading,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState<number>(0);
  const [activeDrawerLead, setActiveDrawerLead] = useState<Lead | null>(null);

  // Extract distinct cities for dropdown
  const distinctCities = useMemo(() => {
    const citiesSet = new Set<string>();
    leads.forEach((l) => {
      if (l.city && l.city.trim()) {
        citiesSet.add(l.city.trim());
      }
    });
    return Array.from(citiesSet).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  // Extract distinct sources for dropdown (dinâmico, não hardcoded)
  const distinctSources = useMemo(() => {
    const sourcesSet = new Set<string>();
    leads.forEach((l) => {
      if (l.source && l.source.trim()) {
        sourcesSet.add(l.source.trim());
      }
    });
    return Array.from(sourcesSet).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  // Filtering Logic
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // 1. Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = l.name?.toLowerCase().includes(query);
        const matchesCity = l.city?.toLowerCase().includes(query);
        const matchesEmail = l.email?.toLowerCase().includes(query);
        const matchesPhone = l.phone?.toLowerCase().includes(query) || l.whatsapp?.toLowerCase().includes(query);
        if (!matchesName && !matchesCity && !matchesEmail && !matchesPhone) {
          return false;
        }
      }

      // 2. Lead Type
      if (selectedType !== 'all') {
        if (l.lead_type !== selectedType) return false;
      }

      // 3. City
      if (selectedCity !== 'all') {
        if (l.city !== selectedCity) return false;
      }

      // 3b. Source (dinâmico a partir das fontes presentes)
      if (selectedSource !== 'all') {
        if (l.source !== selectedSource) return false;
      }

      // 4. Contact filter
      if (selectedContactFilter === 'has_whatsapp') {
        if (!l.whatsapp && !l.phone) return false;
      } else if (selectedContactFilter === 'has_email') {
        if (!l.email) return false;
      } else if (selectedContactFilter === 'has_website') {
        if (!l.website) return false;
      }

      return true;
    });
  }, [leads, search, selectedType, selectedCity, selectedSource, selectedContactFilter]);

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setPage(0);
  }, [search, selectedType, selectedCity, selectedSource, selectedContactFilter, pageSize]);

  // Pagination Math
  const totalLeads = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize));
  const paginatedLeads = useMemo(() => {
    const startIdx = page * pageSize;
    return filteredLeads.slice(startIdx, startIdx + pageSize);
  }, [filteredLeads, page, pageSize]);

  const startRecord = totalLeads === 0 ? 0 : page * pageSize + 1;
  const endRecord = Math.min((page + 1) * pageSize, totalLeads);

  const handleSelectLead = (lead: Lead) => {
    setActiveDrawerLead(lead);
    if (onLeadClick) {
      onLeadClick(lead);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter and Control Bar (Meta Business Suite Style) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da empresa, advogado, despachante, cidade, telefone ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-sans"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segment Type */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Todos os Segmentos</option>
              <option value="despachante">Despachante de Trânsito</option>
              <option value="advogado_transito">Advogado de Trânsito</option>
              <option value="advogado">Advogado (legado)</option>
            </select>

            {/* City */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer max-w-[160px] truncate"
            >
              <option value="all">Todas as Cidades</option>
              {distinctCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            {/* Source */}
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Todas as Fontes</option>
              {distinctSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>

            {/* Contact Channels */}
            <select
              value={selectedContactFilter}
              onChange={(e) => setSelectedContactFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Qualquer Canal</option>
              <option value="has_whatsapp">Com WhatsApp / Tel</option>
              <option value="has_email">Com E-mail</option>
              <option value="has_website">Com Website</option>
            </select>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-700/80 rounded-xl px-2 py-1">
              <span className="text-[11px] text-slate-400 font-mono">Exibir:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-orange-400 focus:outline-none cursor-pointer"
              >
                <option value={20} className="bg-slate-900 text-slate-200">20 / pág</option>
                <option value={50} className="bg-slate-900 text-slate-200">50 / pág</option>
                <option value={100} className="bg-slate-900 text-slate-200">100 / pág</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Bar & Page Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Exibindo <strong className="text-white font-mono">{startRecord}</strong>–<strong className="text-white font-mono">{endRecord}</strong> de{' '}
              <strong className="text-orange-400 font-mono">{totalLeads}</strong> leads qualificados
            </span>
            {leads.length !== totalLeads && (
              <span className="text-[11px] text-slate-500">
                (filtrados de {leads.length} totais)
              </span>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
              title="Primeira página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <span className="px-2.5 py-1 font-mono text-xs font-bold text-white bg-slate-950 rounded-lg border border-slate-800">
              Página {page + 1} de {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Próxima</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary Leads Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px] tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 font-bold">Nome / Razão Social</th>
                <th className="py-3 px-3 font-bold">Segmento</th>
                <th className="py-3 px-3 font-bold">Localização</th>
                <th className="py-3 px-3 font-bold">Telefone</th>
                <th className="py-3 px-3 font-bold">WhatsApp</th>
                <th className="py-3 px-3 font-bold">E-mail</th>
                <th className="py-3 px-3 font-bold">Website</th>
                <th className="py-3 px-3 font-bold">Fonte</th>
                <th className="py-3 px-3 font-bold">Data Coleta</th>
                <th className="py-3 px-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <span className="text-sm font-semibold">Nenhum lead encontrado com os filtros aplicados.</span>
                      <span className="text-xs text-slate-500">Tente ajustar a busca ou limpar os filtros de categoria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const isDespachante = lead.lead_type === 'despachante';
                  const isAdvogado = lead.lead_type === 'advogado' || lead.lead_type === 'advogado_transito';
                  const rawPhone = lead.whatsapp || lead.phone || '';
                  const digitsOnly = rawPhone.replace(/\D/g, '');
                  const waNumber = digitsOnly.length <= 11 && !digitsOnly.startsWith('55') ? `55${digitsOnly}` : digitsOnly;
                  const waUrl = waNumber.length >= 10 ? `https://wa.me/${waNumber}` : null;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={lead.name}>
                            {lead.name}
                          </span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                            isDespachante
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : isAdvogado
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isDespachante ? 'Despachante' : isAdvogado ? 'Advogado' : lead.lead_type || 'Lead'}
                        </span>
                      </td>

                      {/* City & State */}
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                        {lead.city ? (
                          <span>
                            {lead.city}
                            {lead.state ? ` - ${lead.state}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {lead.phone || <span className="text-slate-600">—</span>}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                            title="Abrir no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{lead.whatsapp || lead.phone}</span>
                          </a>
                        ) : lead.whatsapp ? (
                          <span>{lead.whatsapp}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 text-slate-400 max-w-[150px] truncate" title={lead.email || ''}>
                        {lead.email || <span className="text-slate-600">—</span>}
                      </td>

                      {/* Website */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {lead.website ? (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                            title={lead.website}
                          >
                            <Globe className="w-3 h-3" />
                            <span>Visitar</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {lead.source || 'Google Maps'}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {lead.scraped_at
                          ? new Date(lead.scraped_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLead(lead);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-orange-500 hover:text-white text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 ml-auto transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Pagination Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span>
              Mostrando página <strong className="text-white font-mono">{page + 1}</strong> de{' '}
              <strong className="text-white font-mono">{totalPages}</strong> ({filteredLeads.length} leads correspondentes)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-semibold cursor-pointer"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 font-semibold cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* 3. Lead Detail Drawer */}
      <ProspectingLeadDrawer
        lead={activeDrawerLead}
        onClose={() => setActiveDrawerLead(null)}
      />
    </div>
  );
};
