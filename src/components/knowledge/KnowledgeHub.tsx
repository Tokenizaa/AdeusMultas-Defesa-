import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Scale,
  FileText,
  ListChecks,
  GitFork,
  Cpu,
  Layers,
  BarChart3,
  Code2,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { InfractionsView } from './InfractionsView';
import { CTBView } from './CTBView';
import { ArgumentsView } from './ArgumentsView';
import { TemplatesView } from './TemplatesView';
import { ProceduresView } from './ProceduresView';
import { GraphView } from './GraphView';
import { DocumentEngineView } from './DocumentEngineView';
import { BlocksView } from './BlocksView';
import { ReportsView } from './ReportsView';
import { JsonExplorer } from './JsonExplorer';
import { NationalMonitorView } from './NationalMonitorView';
import type { KnowledgeCategoryType } from '../../core/domain/knowledge-schema';

type KnowledgeViewType =
  | 'infractions'
  | 'nationalMonitor'
  | 'ctb'
  | 'arguments'
  | 'templates'
  | 'procedures'
  | 'graph'
  | 'documentEngine'
  | 'blocks'
  | 'reports'
  | 'jsonExplorer';

export const KnowledgeHub: React.FC = () => {
  const [activeView, setActiveView] = useState<KnowledgeViewType>('infractions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<KnowledgeCategoryType | 'all'>('all');

  const views = [
    { id: 'nationalMonitor', title: 'Monitor Nacional (27 UFs)', icon: ShieldCheck, color: 'text-emerald-400', desc: 'Varredura & Fila de Revisão' },
    { id: 'infractions', title: 'Infrações', icon: AlertTriangle, color: 'text-amber-400', desc: 'Tipificação & Enquadramentos' },
    { id: 'ctb', title: 'Código CTB', icon: BookOpen, color: 'text-blue-400', desc: 'Artigos & Resoluções CONTRAN' },
    { id: 'arguments', title: 'Teses Jurídicas', icon: Scale, color: 'text-emerald-400', desc: '52 Teses Fundamentadas' },
    { id: 'templates', title: 'Templates', icon: FileText, color: 'text-purple-400', desc: 'Peças & Minutas Canônicas' },
    { id: 'procedures', title: 'Procedimentos', icon: ListChecks, color: 'text-orange-400', desc: 'Prazos Decadenciais & Ritos' },
    { id: 'graph', title: 'Grafo Relacional', icon: GitFork, color: 'text-indigo-400', desc: 'Mapeamento Interligado' },
    { id: 'documentEngine', title: 'Motor de Petições', icon: Cpu, color: 'text-cyan-400', desc: 'Simulador Zero-AI v1' },
    { id: 'blocks', title: 'Blocos (65+)', icon: Layers, color: 'text-pink-400', desc: 'Biblioteca de Parágrafos' },
    { id: 'reports', title: 'Cobertura & Auditoria', icon: BarChart3, color: 'text-teal-400', desc: 'Métricas de Conformidade' },
    { id: 'jsonExplorer', title: 'Explorador JSON / RAG', icon: Code2, color: 'text-slate-400', desc: 'Árvore de Dados Canônica' },
  ] as const;

  const knowledgeCategories: { id: KnowledgeCategoryType | 'all'; label: string }[] = [
    { id: 'all', label: 'Todas as Categorias' },
    { id: 'direito_material', label: 'Direito Material' },
    { id: 'direito_formal', label: 'Direito Formal (Nulidades)' },
    { id: 'direito_constitucional', label: 'Direito Constitucional' },
    { id: 'metrologia_engenharia', label: 'Metrologia / Radares' },
    { id: 'sinalizacao_viaria', label: 'Sinalização Viária' },
    { id: 'prazos_decadencia', label: 'Prazos & Decadência' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Hub Canônico de Conhecimento Jurídico
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-mono font-bold">
                100% Deterministico
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Base canônica imutável com 142+ artigos do CTB, 52 teses fundamentadas, 65+ blocos e motor de petições v1.
            </p>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar em toda a base canônica..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {views.map((v) => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id as KnowledgeViewType)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/10'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : v.color}`} />
              <span>{v.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main View Area */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        {activeView === 'nationalMonitor' && <NationalMonitorView />}
        {activeView === 'infractions' && (
          <InfractionsView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'ctb' && (
          <CTBView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'arguments' && (
          <ArgumentsView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'templates' && (
          <TemplatesView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'procedures' && (
          <ProceduresView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'graph' && (
          <GraphView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'documentEngine' && (
          <DocumentEngineView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'blocks' && (
          <BlocksView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'reports' && (
          <ReportsView searchQuery={searchQuery} categoryFilter={selectedCategory} />
        )}
        {activeView === 'jsonExplorer' && (
          <JsonExplorer query={searchQuery} categoryFilter={selectedCategory} />
        )}
      </div>
    </div>
  );
};
