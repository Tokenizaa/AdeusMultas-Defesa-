/**
 * @file DocumentBlocksView.tsx
 * DefesaAI — Biblioteca de Blocos Parametrizáveis (Fase 4.2 & 4.3)
 * Explorador visual dos 65+ blocos reutilizáveis que compõem o Motor de Documentos v1.
 */

import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Copy,
  Check,
  Code2,
  FileText,
  Tag,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { DOCUMENT_BLOCKS, DocumentBlockModel, DocumentBlockCategory } from '../../core/templates/document-blocks';

const CATEGORY_LABELS: Record<string, { label: string; color: string; badgeBg: string }> = {
  all: { label: 'Todos os Blocos', color: 'text-slate-700', badgeBg: 'bg-slate-100' },
  enderecamento: { label: 'Endereçamento', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  qualificacao: { label: 'Qualificação das Partes', color: 'text-purple-700', badgeBg: 'bg-purple-50 border-purple-200' },
  fatos: { label: 'Dos Fatos (Narrativa)', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-200' },
  preliminares: { label: 'Preliminares de Nulidade', color: 'text-rose-700', badgeBg: 'bg-rose-50 border-rose-200' },
  argumentos_velocidade: { label: 'Mérito: Radar & Velocidade', color: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-200' },
  argumentos_semaforo: { label: 'Mérito: Sinal Vermelho', color: 'text-red-700', badgeBg: 'bg-red-50 border-red-200' },
  argumentos_celular: { label: 'Mérito: Uso de Celular', color: 'text-indigo-700', badgeBg: 'bg-indigo-50 border-indigo-200' },
  argumentos_estacionamento: { label: 'Mérito: Estacionamento', color: 'text-cyan-700', badgeBg: 'bg-cyan-50 border-cyan-200' },
  argumentos_leiseca: { label: 'Mérito: Lei Seca / Bafômetro', color: 'text-rose-800', badgeBg: 'bg-rose-100 border-rose-300' },
  argumentos_cinto: { label: 'Mérito: Cinto de Segurança', color: 'text-teal-700', badgeBg: 'bg-teal-50 border-teal-200' },
  argumentos_documentais: { label: 'Mérito: Licenciamento / NIC', color: 'text-blue-800', badgeBg: 'bg-blue-100 border-blue-300' },
  argumentos_psdd: { label: 'Mérito: Suspensão CNH (PSDD)', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  argumentos_pcdd: { label: 'Mérito: Cassação CNH (PCDD)', color: 'text-red-800', badgeBg: 'bg-red-100 border-red-300' },
  argumentos_fici: { label: 'Mérito: Indicação Condutor (FICI)', color: 'text-emerald-800', badgeBg: 'bg-emerald-100 border-emerald-300' },
  argumentos_advertencia: { label: 'Mérito: Advertência por Escrito', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  pedidos: { label: 'Dos Pedidos Formais', color: 'text-violet-700', badgeBg: 'bg-violet-50 border-violet-200' },
  fechamento: { label: 'Fechamento & Assinatura', color: 'text-slate-700', badgeBg: 'bg-slate-100 border-slate-300' },
};

export const DocumentBlocksView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>('BLK-001');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const q = searchQuery.toLowerCase();

  const filteredBlocks = DOCUMENT_BLOCKS.filter((block) => {
    const matchCat = selectedCategory === 'all' || block.category === selectedCategory;
    const matchSearch =
      block.id.toLowerCase().includes(q) ||
      block.code.toLowerCase().includes(q) ||
      block.title.toLowerCase().includes(q) ||
      block.description.toLowerCase().includes(q) ||
      block.contentTemplate.toLowerCase().includes(q) ||
      block.supportedVariables.some((v) => v.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleCopy = (block: DocumentBlockModel) => {
    navigator.clipboard.writeText(block.contentTemplate);
    setCopiedId(block.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold uppercase tracking-wider font-mono px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                Fase 4.2 • Biblioteca Canônica de Blocos (document_blocks)
              </span>
              <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {DOCUMENT_BLOCKS.length} Blocos Modulares
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Blocos Parametrizáveis de Montagem Determinística
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Cada petição jurídica é composta como uma sequência ordenada de blocos autônomos. Os blocos contêm variáveis estritas (<code className="text-orange-300 font-mono text-sm font-bold">&#123;&#123;variavel&#125;&#125;</code>) interpoladas diretamente pelo motor de geração, garantindo petições precisas e 100% sem IA.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700">
            <div className="text-right">
              <div className="text-lg font-bold text-white font-mono">{DOCUMENT_BLOCKS.length}</div>
              <div className="text-sm text-slate-400 uppercase tracking-wider">Blocos Ativos</div>
            </div>
            <div className="h-8 w-px bg-slate-700 mx-2" />
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-400 font-mono">18</div>
              <div className="text-sm text-slate-400 uppercase tracking-wider">Categorias</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID (ex: BLK-001), código, título, texto ou variável (ex: {{placa}})..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              {categories.map((catKey) => (
                <option key={catKey} value={catKey}>
                  {CATEGORY_LABELS[catKey]?.label || catKey} (
                  {catKey === 'all'
                    ? DOCUMENT_BLOCKS.length
                    : DOCUMENT_BLOCKS.filter((b) => b.category === catKey).length}
                  )
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-sm">
          {categories.map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const count =
              catKey === 'all'
                ? DOCUMENT_BLOCKS.length
                : DOCUMENT_BLOCKS.filter((b) => b.category === catKey).length;
            if (count === 0 && catKey !== 'all') return null;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-2.5 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {CATEGORY_LABELS[catKey]?.label}
                <span
                  className={`ml-1.5 px-1 py-0.2 rounded-full text-[9px] font-mono ${
                    isSelected ? 'bg-slate-800 text-orange-300' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-500 px-1">
          <span>
            Exibindo <strong>{filteredBlocks.length}</strong> de {DOCUMENT_BLOCKS.length} blocos catalogados
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-orange-600 hover:underline text-sm cursor-pointer"
            >
              Limpar busca
            </button>
          )}
        </div>

        {filteredBlocks.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Nenhum bloco encontrado</h3>
            <p className="text-sm text-slate-500 mt-1">
              Tente ajustar os filtros de categoria ou o termo de busca.
            </p>
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const isExpanded = expandedBlockId === block.id;
            const catMeta = CATEGORY_LABELS[block.category] || CATEGORY_LABELS['enderecamento'];

            return (
              <div
                key={block.id}
                id={`block-card-${block.id}`}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded
                    ? 'border-orange-500 ring-2 ring-orange-500/10 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                {/* Block Header Row */}
                <div
                  onClick={() => setExpandedBlockId(isExpanded ? null : block.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <button
                      className="mt-0.5 sm:mt-0 p-1 text-slate-400 hover:text-slate-600 rounded"
                      aria-label="Expandir bloco"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-orange-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {block.id}
                        </span>
                        <span
                          className={`text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${catMeta.badgeBg} ${catMeta.color}`}
                        >
                          {catMeta.label}
                        </span>
                        <span className="text-sm font-mono text-slate-500">
                          {block.code}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{block.title}</h3>
                      <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">
                        {block.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-sm font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      {block.supportedVariables.length} vars
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(block);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copiar template"
                    >
                      {copiedId === block.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-4">
                    {/* Variables */}
                    {block.supportedVariables && block.supportedVariables.length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono">
                          <Tag className="w-3 h-3 text-orange-500" />
                          Variáveis Suportadas para Interpolação:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(block.supportedVariables || []).map((variable) => (
                            <span
                              key={variable}
                              className="font-mono text-sm text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md font-semibold"
                            >
                              {variable}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Procedures */}
                    {block.recommendedProcedures && block.recommendedProcedures.length > 0 && (
                      <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 font-mono">
                          <BookOpen className="w-3 h-3 text-blue-500" />
                          Procedimentos Recomendados:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {block.recommendedProcedures.map((proc) => (
                            <span
                              key={proc}
                              className="text-sm text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-mono"
                            >
                              {proc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Preview Box */}
                    <div>
                      <div className="flex items-center justify-between text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                        <span className="flex items-center gap-1">
                          <Code2 className="w-3 h-3 text-slate-500" />
                          Template do Bloco (Raw Text):
                        </span>
                        <span className="text-sm text-slate-400 lowercase font-normal">
                          {block.contentTemplate.length} caracteres
                        </span>
                      </div>

                      <div className="bg-slate-950 rounded-lg p-4 font-mono text-sm text-slate-100 whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-80 overflow-y-auto selection:bg-orange-500 selection:text-white">
                        {block.contentTemplate}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
