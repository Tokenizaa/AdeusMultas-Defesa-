import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import type { Lead, AutomationStatus } from '../types/prospecting';
import { ProspectingLayout } from './ProspectingLayout';
import { ProspectingLeadDrawer } from '../prospecting/ProspectingLeadDrawer';

export const ProspectingLeadsPage: React.FC = () => {
  const authFetch = useAuthFetch();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [status, setStatus] = useState<AutomationStatus>('STOPPED');

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedContactFilter, setSelectedContactFilter] = useState<string>('all');

  // Dynamic lists from backend
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeDrawerLead, setActiveDrawerLead] = useState<Lead | null>(null);

  // Server-side Fetch
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        paginated: 'true',
      });

      if (search.trim()) params.append('search', search.trim());
      if (selectedType !== 'all') params.append('lead_type', selectedType);
      if (selectedCity !== 'all') params.append('city', selectedCity);
      if (selectedSource !== 'all') params.append('source', selectedSource);
      if (selectedContactFilter !== 'all') params.append('contact_filter', selectedContactFilter);

      const res = await authFetch(`/api/marketing/automation/leads?${params.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.data) {
        setLeads(data.data);
        setTotalLeads(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.availableCities) setAvailableCities(data.availableCities);
        if (data.availableSources) setAvailableSources(data.availableSources);
      } else if (Array.isArray(data)) {
        setLeads(data);
        setTotalLeads(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / pageSize)));
      }
    } catch (err) {
      console.warn('Erro ao buscar leads com paginação server-side:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch, page, pageSize, search, selectedType, selectedCity, selectedSource, selectedContactFilter]);

  // Load Status once
  useEffect(() => {
    authFetch('/api/marketing/automation/status')
      .then((r) => r.json())
      .then((data) => {
        if (data?.status) setStatus(data.status);
      })
      .catch(() => {});
  }, [authFetch]);

  // Debounced search / filter trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchLeads]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  return (
    <ProspectingLayout
      activeTab="leads"
      status={status}
      leadCount={totalLeads}
      onRefresh={fetchLeads}
      isRefreshing={isLoading}
    >
      <div className="space-y-4">
        {/* Filter Controls Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nome da empresa, advogado, cidade, telefone ou email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-all font-sans"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
            </div>

            {/* Filter Selectors Grid */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type / Segment Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedType}
                  onChange={(e) => handleFilterChange(setSelectedType, e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-slate-900 text-white">Todos os Segmentos</option>
                  <option value="despachante" className="bg-slate-900 text-white">Despachante</option>
                  <option value="advogado" className="bg-slate-900 text-white">Advogado de Trânsito</option>
                  <option value="autoescola" className="bg-slate-900 text-white">Autoescola (CFC)</option>
                </select>
              </div>

              {/* City Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => handleFilterChange(setSelectedCity, e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2 max-w-[140px] truncate"
                >
                  <option value="all" className="bg-slate-900 text-white">Todas as Cidades</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedSource}
                  onChange={(e) => handleFilterChange(setSelectedSource, e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-slate-900 text-white">Todas as Fontes</option>
                  <option value="google_places" className="bg-slate-900 text-white">Google Places</option>
                  <option value="manual" className="bg-slate-900 text-white">Cadastro Manual</option>
                  <option value="oab_directory" className="bg-slate-900 text-white">Diretório OAB</option>
                </select>
              </div>

              {/* Contact Filter Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedContactFilter}
                  onChange={(e) => handleFilterChange(setSelectedContactFilter, e.target.value)}
                  className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-slate-900 text-white">Todos os Contatos</option>
                  <option value="has_whatsapp" className="bg-slate-900 text-white">Com WhatsApp</option>
                  <option value="has_email" className="bg-slate-900 text-white">Com E-mail</option>
                  <option value="has_website" className="bg-slate-900 text-white">Com Website</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Summary Pill */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/80 pt-3">
            <div className="flex items-center gap-2">
              <span>Total no repositório:</span>
              <span className="text-white font-bold">{totalLeads} contatos</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Página {page} de {totalPages}</span>
            </div>
          </div>
        </div>

        {/* Leads Table Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono">
                  <th className="py-3.5 px-4 font-semibold">EMPRESA / CONTATO</th>
                  <th className="py-3.5 px-4 font-semibold">SEGMENTO</th>
                  <th className="py-3.5 px-4 font-semibold">LOCALIZAÇÃO</th>
                  <th className="py-3.5 px-4 font-semibold">CANAIS</th>
                  <th className="py-3.5 px-4 font-semibold">ORIGEM</th>
                  <th className="py-3.5 px-4 font-semibold text-right">AÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {isLoading && leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-orange-400" />
                        <span>Buscando contatos do repositório marketing_leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <div className="text-sm font-semibold text-slate-300">Nenhum lead encontrado</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tente ajustar os filtros ou use a aba Coleta para raspar novos contatos.
                      </p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const rawPhone = (lead.whatsapp || lead.phone || '').replace(/\D/g, '');
                    const waLink = rawPhone ? `https://wa.me/55${rawPhone}` : null;

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setActiveDrawerLead(lead)}
                      >
                        {/* Company & Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white group-hover:text-orange-400 transition-colors">
                            {lead.name}
                          </div>
                          {lead.category && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {lead.category}
                            </div>
                          )}
                        </td>

                        {/* Segment Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                              lead.lead_type === 'despachante'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : lead.lead_type === 'advogado'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-slate-700 text-slate-300 border-slate-600'
                            }`}
                          >
                            {lead.lead_type === 'despachante' ? (
                              <Building2 className="w-3 h-3" />
                            ) : (
                              <Scale className="w-3 h-3" />
                            )}
                            {lead.lead_type || 'B2B'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200 font-medium">{lead.city || '—'}</div>
                          {lead.state && (
                            <div className="text-[11px] text-slate-500 font-mono">{lead.state}</div>
                          )}
                        </td>

                        {/* Channels */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {waLink ? (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                title={`WhatsApp: ${lead.whatsapp || lead.phone}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            ) : lead.phone ? (
                              <span className="p-1 rounded-md bg-slate-800 text-slate-400" title={lead.phone}>
                                <Phone className="w-3.5 h-3.5" />
                              </span>
                            ) : null}

                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                                title={lead.email}
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-md bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all"
                                title={lead.website}
                              >
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Source */}
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] font-mono text-slate-400">
                            {lead.source || 'google_places'}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDrawerLead(lead);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 ml-auto transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detalhes</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-side Pagination Bar */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span>Linhas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500 font-mono">• Exibindo {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalLeads)} de {totalLeads}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Primeira página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg font-mono text-white text-xs">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lead Drawer */}
        {activeDrawerLead && (
          <ProspectingLeadDrawer
            lead={activeDrawerLead}
            onClose={() => setActiveDrawerLead(null)}
          />
        )}
      </div>
    </ProspectingLayout>
  );
};
