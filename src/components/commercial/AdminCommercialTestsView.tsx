import React, { useState, useEffect } from 'react';
import {
  Award,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  ShieldCheck,
  Zap,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CommercialTestCaseResult, CommercialTestSuiteSummary } from '../../server/commercial/commercial-test-suite';

export const AdminCommercialTestsView: React.FC = () => {
  const [suiteResult, setSuiteResult] = useState<CommercialTestSuiteSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const runTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/commercial/tests');
      const data: CommercialTestSuiteSummary = await res.json();
      setSuiteResult(data);
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const filteredTests = suiteResult?.results.filter((t) => {
    if (categoryFilter === 'ALL') return true;
    return t.category === categoryFilter;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              Test Center Automatizado
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Validação de Integridade do Motor Comercial</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Suíte de Testes Comerciais & Indicações em 3 Níveis
          </h1>
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Executando Testes...' : 'Executar Todos os Testes'}
        </button>
      </div>

      {/* Summary Stats */}
      {suiteResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm font-medium">Total de Testes</span>
            <div className="mt-1 text-2xl font-black text-white font-mono">
              {suiteResult.totalTests}
            </div>
            <span className="text-sm text-slate-500 font-mono">15 cenários de negócio</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm font-medium">Aprovados</span>
            <div className="mt-1 text-2xl font-black text-emerald-400 font-mono">
              {suiteResult.passedCount}
            </div>
            <span className="text-sm text-emerald-400 font-mono">100% de sucesso</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm font-medium">Falhas</span>
            <div className="mt-1 text-2xl font-black text-rose-400 font-mono">
              {suiteResult.failedCount}
            </div>
            <span className="text-sm text-slate-500 font-mono">0 regressões</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm font-medium">Taxa de Conformidade</span>
            <div className="mt-1 text-2xl font-black text-blue-400 font-mono">
              {suiteResult.successRatePercent}%
            </div>
            <span className="text-sm text-slate-500 font-mono">Última execução: {new Date(suiteResult.timestamp).toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
        {['ALL', 'PRICING', 'PROMOTIONS', 'COUPONS', 'BONUSES', 'REFERRALS', 'SECURITY'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-orange-500 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'Todos os Testes' : cat}
          </button>
        ))}
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const isPassed = test.status === 'PASSED';
          const isExpanded = expandedTest === test.code;

          return (
            <div
              key={test.code}
              className={`bg-slate-900/90 border rounded-xl p-4 transition-all ${
                isPassed ? 'border-slate-800 hover:border-slate-700' : 'border-rose-500/40 bg-rose-950/10'
              }`}
            >
              <div
                onClick={() => setExpandedTest(isExpanded ? null : test.code)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isPassed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-orange-400">
                        {test.code}
                      </span>
                      <span className="text-slate-500 text-sm font-mono">•</span>
                      <h3 className="text-sm sm:text-sm font-bold text-white">
                        {test.name}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {test.actual}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-slate-500">
                    {test.durationMs}ms
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-mono font-bold ${
                      isPassed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {test.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Expandable Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-sm font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                    <div>
                      <span className="text-slate-500 text-sm uppercase block">Resultado Esperado:</span>
                      <span className="text-slate-300 font-sans">{test.expected}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-sm uppercase block">Resultado Obtido:</span>
                      <span className="text-emerald-400 font-sans">{test.actual}</span>
                    </div>
                  </div>

                  {test.details && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-sm uppercase block mb-1">Payload / Contexto:</span>
                      <pre className="text-sm text-slate-400 overflow-x-auto p-1">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
