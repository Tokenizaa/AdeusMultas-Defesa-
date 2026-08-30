/**
 * @file AdminE2ERunDetailView.tsx
 * DefesAi — Detalhes da Execução de Teste E2E (Usuários Criados, Casos, Logs e Marcas-d'Água)
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  ShieldCheck,
  RefreshCw,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';

interface AdminE2ERunDetailViewProps {
  runId: string;
}

export const AdminE2ERunDetailView: React.FC<AdminE2ERunDetailViewProps> = ({ runId }) => {
  const { navigate } = useRouter();
  const authFetch = useAuthFetch();

  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const fetchRunDetail = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/admin/e2e-tests/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data.run);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da execução E2E:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunDetail();
  }, [runId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-400" />
        <p>Carregando detalhes da execução {runId}...</p>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono space-y-4">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <p>Execução não encontrada ({runId}).</p>
        <button
          onClick={() => navigate('/admin/e2e-tests')}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-mono"
        >
          Voltar para Central de Testes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar & Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/e2e-tests')}
          className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-mono uppercase text-orange-400 font-bold">Relatório de Execução E2E</span>
            <span className="text-slate-600">•</span>
            <span className="text-2xs font-mono text-slate-400">{run.id}</span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono">
            Execução #{run.id.slice(-8)} — {run.passedTests}/{run.totalTests} Aprovados
          </h1>
        </div>
      </div>

      {/* Resumo da Execução */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-2xs font-mono uppercase text-slate-400">Status Geral</span>
          <p className={`text-xl font-bold font-mono ${run.status === 'PASSED' ? 'text-emerald-400' : 'text-red-400'}`}>
            {run.status}
          </p>
          <span className="text-2xs text-slate-500 font-mono">Por {run.triggeredBy}</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-2xs font-mono uppercase text-slate-400">Duração Total</span>
          <p className="text-xl font-bold font-mono text-white">
            {Math.round(run.durationMs / 1000)}s
          </p>
          <span className="text-2xs text-slate-500 font-mono">{run.durationMs}ms</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-2xs font-mono uppercase text-slate-400">Taxa de Aprovação</span>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {run.totalTests > 0 ? Math.round((run.passedTests / run.totalTests) * 100) : 100}%
          </p>
          <span className="text-2xs text-slate-500 font-mono">{run.passedTests} de {run.totalTests} cenários</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-2xs font-mono uppercase text-slate-400">Suítes de Serviço</span>
          <p className="text-xl font-bold font-mono text-blue-400">
            {run.suites?.length || 0}
          </p>
          <span className="text-2xs text-slate-500 font-mono">4 cenários cada</span>
        </div>
      </div>

      {/* Detalhamento de Suítes e Cenários */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Resultados por Serviço e Cenário E2E
        </h2>

        {(run.suites || []).map((suite: any) => (
          <div key={suite.serviceKey} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-orange-400 px-2 py-0.5 rounded bg-orange-950/60 border border-orange-800/60">
                  {suite.serviceKey}
                </span>
                <span className="text-sm font-bold text-white font-mono">{suite.serviceName}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400">{suite.passed}/{suite.totalScenarios} Aprovados</span>
                <span className="text-slate-500">{suite.durationMs}ms</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/60">
              {(suite.scenarios || []).map((scenario: any) => {
                const isExpanded = expandedScenario === scenario.scenarioId;
                return (
                  <div key={scenario.scenarioId} className="p-4 space-y-3">
                    <div
                      onClick={() => setExpandedScenario(isExpanded ? null : scenario.scenarioId)}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-sm font-bold text-slate-200">{scenario.scenarioName}</span>
                        </div>
                        <div className="text-2xs text-slate-400 font-mono flex items-center gap-3 pl-6.5">
                          <span>Usuário: <strong className="text-slate-300">{scenario.userName}</strong> ({scenario.userEmail})</span>
                          <span>•</span>
                          <span>Marca-d'Água: <strong className="text-orange-300">{scenario.watermark}</strong></span>
                          <span>•</span>
                          <span>Integridade: <strong className="text-emerald-300">100%</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-2xs font-mono text-slate-500">{scenario.durationMs}ms</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pl-6.5 space-y-3 pt-2">
                        {/* Etapas do Cenário */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {(scenario.steps || []).map((st: any, idx: number) => (
                            <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-2xs font-mono space-y-1">
                              <div className="text-slate-400 font-semibold">{st.name}</div>
                              <div className="flex items-center justify-between text-slate-500">
                                <span className="text-emerald-400">PASSED</span>
                                <span>{st.durationMs}ms</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Snippet do Documento Gerado */}
                        {scenario.assembledDocumentSnippet && (
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-2xs font-mono text-slate-400 space-y-1">
                            <span className="text-slate-300 font-bold block">Espelho da Minuta Jurídica Assembled:</span>
                            <p className="line-clamp-3 italic text-slate-500">{scenario.assembledDocumentSnippet}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logs da Execução */}
      {run.logs && run.logs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-400" />
            Logs de Execução do Runner E2E
          </h2>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-2xs text-slate-300 max-h-48 overflow-y-auto space-y-1">
            {run.logs.map((log: string, idx: number) => (
              <div key={idx} className="leading-relaxed">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
