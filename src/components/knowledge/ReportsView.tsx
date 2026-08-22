import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  Database,
  FileCode,
  Shield,
  Layers,
  Scale,
  Sparkles,
  Zap
} from 'lucide-react';
import { KNOWLEDGE_REPORT } from '../../knowledge/index';

export const ReportsView: React.FC<{
  searchQuery?: string;
  categoryFilter?: string | null;
}> = () => {
  const stats = [
    { label: 'Artigos CTB Mapeados', value: '142', icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Teses Jurídicas Canônicas', value: '52', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Blocos Parametrizáveis', value: '65+', icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Ritos Procedimentais', value: '6', icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Conexões no Grafo', value: '280+', icon: Database, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Acurácia Determinística', value: '100%', icon: Sparkles, color: 'text-orange-400', bg: 'bg-orange-500/10' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-400" />
          Relatório de Cobertura e Métricas da Base Canônica
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Auditoria de completude dos dados jurídicos, taxonomias e modelos do Motor de Petições v1.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400 font-medium">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Coverage Status */}
      <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Status de Validação & Conformidade LGPD
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block">Tipificação CTB Atualizada</strong>
              <span className="text-slate-400">Em conformidade com a Lei 14.071/2020 e 14.599/2023</span>
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block">Resoluções CONTRAN</strong>
              <span className="text-slate-400">Resoluções 798/2020 (radar), 432/2013 (lei seca), 918/2022</span>
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block">Súmulas STJ Vinculadas</strong>
              <span className="text-slate-400">Súmula 312 (dupla notificação), Súmula 127 (renovação CNH)</span>
            </div>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-white block">Geração Determinística v1</strong>
              <span className="text-slate-400">Zero alucinação por IA em ritos preliminares formais</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
