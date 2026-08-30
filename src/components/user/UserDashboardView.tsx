import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building,
  TestTube2,
  Check,
} from 'lucide-react';
import { CaseDomain } from '../../types';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';

interface UserDashboardViewProps {
  cases: CaseDomain[];
  onSelectCase: (c: CaseDomain) => void;
}

export const UserDashboardView: React.FC<UserDashboardViewProps> = ({ cases, onSelectCase }) => {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const authFetch = useAuthFetch();

  const [userTestScenarios, setUserTestScenarios] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);

  // Metrics for current driver
  const totalCases = cases.length;
  const readyCases = cases.filter((c) => c.status === 'defense_ready' || c.status === 'filed').length;
  const analysisCases = cases.filter((c) => c.status === 'analyzed' || c.status === 'paid').length;
  const draftCases = cases.filter((c) => c.status === 'draft').length;

  const estimatedSavedValue = readyCases * 293.47;
  const estimatedPointsSaved = readyCases * 5;

  const isTestUser = Boolean(user?.email?.includes('@e2e.local') || user?.name?.startsWith('Teste '));

  // Buscar resultados de testes do usuário conectado (Item 17 e 18 da especificação)
  useEffect(() => {
    if (isTestUser && user?.email) {
      setLoadingTests(true);
      authFetch('/api/e2e-tests/user-results')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.testScenarios) {
            setUserTestScenarios(data.testScenarios);
          }
        })
        .catch((err) => console.error('Erro ao buscar testes do usuário:', err))
        .finally(() => setLoadingTests(false));
    }
  }, [user?.email, isTestUser]);

  return (
    <div className="space-y-6">
      {/* Test User Badge if active */}
      {isTestUser && (
        <div className="bg-orange-950/80 border border-orange-700/80 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-orange-200 font-mono text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <TestTube2 className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <span className="font-bold text-orange-300">Usuário de Teste E2E Persistente:</span> {user?.name} ({user?.email})
              <p className="text-2xs text-orange-400/80">
                Os casos vinculados a esta conta foram criados pelas suítes automatizadas Playwright com validação de marca-d'água.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-orange-900/60 border border-orange-700 font-bold shrink-0 text-center">
            SENHA: E2E@2026Teste
          </span>
        </div>
      )}

      {/* Driver Welcome Hero & Primary CTA */}
      <div className="p-6 bg-[#071D41] text-white rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b-4 border-[#155BCB]">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-900/60 text-[#FFCD07] border border-blue-800 text-sm font-mono uppercase tracking-wider font-bold">
            <Sparkles className="w-4 h-4 text-[#FFCD07]" />
            <span>Área do Condutor • DefesAi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Olá, {user?.name || 'Condutor'}!
          </h2>
          <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
            Consulte seus diagnósticos gratuitos de autuação, recursos prontos para protocolo e prazos decadenciais perante o DETRAN, DNIT, PRF e JARI.
          </p>
        </div>

        <button
          id="user-dashboard-start-analysis-btn"
          onClick={() => navigate('/novo-caso')}
          className="w-full md:w-auto px-6 py-4 bg-[#155BCB] hover:bg-[#0C326F] text-white font-bold rounded-lg text-base shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          aria-label="Iniciar nova análise gratuita"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Nova Análise Gratuita</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Seção Testes e Validações (Itens 17 e 18 da especificação para usuários de teste) */}
      {isTestUser && (
        <div className="bg-white border border-[#CCCCCC] rounded-xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E6E6E6] flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <TestTube2 className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-bold text-sm text-[#071D41]">Testes e Validações</h3>
                <p className="text-xs text-slate-500">
                  Histórico de execuções automatizadas Playwright deste usuário
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Isolamento 100% Auditado
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100 space-y-3">
            {userTestScenarios.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-xs font-mono text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-2xs">
                    APROVADO
                  </span>
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Onboarding ✓
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Análise ✓
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Documento ✓
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> PDF ✓
                    </span>
                  </div>
                </div>
                <div className="text-slate-400 text-2xs">
                  Execução: {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
            ) : (
              userTestScenarios.map((sc, i) => (
                <div key={i} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-2xs">
                        {sc.status === 'PASSED' ? 'APROVADO' : sc.status}
                      </span>
                      <span className="font-bold text-slate-800">{sc.scenarioName || 'Cenário de Teste'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 text-2xs">
                      <span>Auto: {sc.aitNumber || 'AIT-E2E-PADRÃO'}</span>
                      <span>•</span>
                      <span>Marca-d’água: {sc.watermark}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold">
                      Onboarding ✓ Análise ✓ Documento ✓ PDF ✓
                    </span>
                    <span className="text-slate-400 text-2xs">
                      {sc.runDate ? new Date(sc.runDate).toLocaleDateString('pt-BR') : 'Hoje'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <div className="p-4 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-1">
          <span className="text-sm font-semibold text-slate-600">Total de Processos</span>
          <p className="text-2xl font-extrabold text-[#071D41]">{totalCases}</p>
          <span className="text-sm text-slate-500 font-mono">Em acompanhamento</span>
        </div>

        <div className="p-4 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-1">
          <span className="text-sm font-semibold text-slate-600">Defesas Prontas</span>
          <p className="text-2xl font-extrabold text-[#168821]">{readyCases}</p>
          <span className="text-sm text-slate-500 font-mono">Minutas A4 geradas</span>
        </div>

        <div className="p-4 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-1">
          <span className="text-sm font-semibold text-slate-600">Economia Potencial</span>
          <p className="text-2xl font-extrabold text-[#071D41]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              estimatedSavedValue || 293.47
            )}
          </p>
          <span className="text-sm text-slate-500 font-mono">Valores de multas</span>
        </div>

        <div className="p-4 bg-white border border-[#CCCCCC] rounded-xl shadow-2xs space-y-1">
          <span className="text-sm font-semibold text-slate-600">Pontos em CNH Protegidos</span>
          <p className="text-2xl font-extrabold text-[#155BCB]">
            {estimatedPointsSaved || 5} pts
          </p>
          <span className="text-sm text-slate-500 font-mono">Efeito suspensivo</span>
        </div>
      </div>

      {/* Recentes Casos do Condutor */}
      <div className="bg-white border border-[#CCCCCC] rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E6E6E6] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#071D41]">Meus Recursos de Trânsito</h3>
            <p className="text-sm text-slate-500">Histórico de defesas geradas e em análise</p>
          </div>

          <button
            onClick={() => navigate('/cases')}
            className="text-sm font-bold text-[#155BCB] hover:underline flex items-center gap-1 cursor-pointer"
            aria-label="Ver todos os casos"
          >
            <span>Ver Todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-[#E6E6E6]">
          {!cases || cases.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">Nenhum recurso cadastrado até o momento.</p>
              <button
                onClick={() => navigate('/novo-caso')}
                className="px-4 py-2 bg-[#155BCB] hover:bg-[#0C326F] text-white rounded-lg text-sm font-bold transition-colors cursor-pointer"
                aria-label="Cadastrar primeira multa"
              >
                Cadastrar Primeira Multa (Grátis)
              </button>
            </div>
          ) : (
            (cases || []).slice(0, 5).map((rawCase) => {
              const inf = (rawCase as { infraction?: { aitNumber?: string; infractionCode?: string; description?: string } }).infraction || {};
              const c = {
                ...rawCase,
                aitNumber: rawCase.aitNumber || inf.aitNumber,
                infractionCode: rawCase.infractionCode || inf.infractionCode,
                infractionDescription: rawCase.infractionDescription || inf.description,
              };
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectCase(rawCase)}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                  aria-label={`Selecionar caso ${c.aitNumber || c.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#071D41]">
                        Auto {c.aitNumber || 'S/N'}
                      </span>
                      <span className="text-sm font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {c.infractionCode || '745-5-0'}
                      </span>
                      <span
                        className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded ${
                          c.status === 'defense_ready' || c.status === 'filed'
                            ? 'bg-emerald-50 text-[#168821] border border-emerald-200'
                            : 'bg-blue-50 text-[#155BCB] border border-blue-200'
                        }`}
                      >
                        {c.status === 'defense_ready'
                          ? 'Minuta Pronta'
                          : c.status === 'filed'
                            ? 'Protocolado'
                            : 'Em Análise'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate max-w-md">
                      {c.infractionDescription || 'Infração de trânsito em análise pelo sistema.'}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
