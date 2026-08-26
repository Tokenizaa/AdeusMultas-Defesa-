import React, { useState, useEffect } from 'react';
import { useRouter } from '../../core/router/RouterContext';
import {
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Car,
  Scale,
  FileText,
  CreditCard,
  Terminal,
  User,
  FileCheck,
  Printer,
} from 'lucide-react';
import { CaseDetailBase } from '../shared/CaseDetailBase';
import { CaseDomain } from '../../types';
import { PRICING } from '../../config/pricing';

export const AdminCaseDetailView: React.FC = () => {
  const { params, navigate, queryParams } = useRouter();
  const caseId = params.id;
  
  // Get tab from query parameters, default to 'overview'
  const [activeTab, setActiveTabState] = useState<'overview' | 'theses' | 'document' | 'payment' | 'logs'>('overview');
  useEffect(() => {
    const tab = queryParams.tab as 'overview' | 'theses' | 'document' | 'payment' | 'logs' || 'overview';
    setActiveTabState(tab);
  }, [queryParams.tab]);
  
  const shared = CaseDetailBase({
    caseId,
    variant: 'admin',
    onBackToList: () => navigate('/admin/cases'),
    onOpenWhatsAppModal: (caseId: string) => {
      // Admin might have a different WhatsApp modal implementation
      // For now, we'll keep it empty or implement if needed
      console.log('Opening WhatsApp modal for case:', caseId);
    }
  });
  
  // Destructure what we need from the shared component
  const {
    caseData,
    isLoading,
    error,
    isSimulatingPayment,
    actionSuccess,
    handleSimulatePayment,
    handleOpenWhatsAppModal,
    handleBackToList
  } = shared;
  
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm">Carregando registro operacional do caso {caseId}...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
          <h2 className="text-base font-bold">Caso não encontrado ou indisponível</h2>
        </div>
        <p className="text-sm font-mono text-rose-200">{error || 'ID de caso inválido.'}</p>
        <button
          onClick={handleBackToList}
          className="px-4 py-2 bg-slate-900 text-slate-100 rounded-xl text-sm font-semibold hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Casos</span>
        </button>
      </div>
    );
  }

  const isPaid = caseData.isPaid || caseData.payment?.status === 'paid' || caseData.payment?.status === 'approved';
  const hasDraft = Boolean(caseData.defenseDraft);
  const theses = caseData.analysis?.recommendedArguments || caseData.defenseDraft?.selectedArguments || [];
  const formalFlaws = caseData.infraction?.formalFlawsDetected || [];

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={handleBackToList}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Voltar para lista de casos"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white font-mono">
                {caseData.title || `Caso #${caseData.id}`}
              </h1>
              <span className="px-2 py-0.5 rounded text-sm font-bold uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700">
                ID: {caseData.id}
              </span>
              {isPaid ? (
                <span className="px-2 py-0.5 rounded text-sm font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PAGO (R$ {(caseData.payment?.amount || PRICING.DEFAULT_PRICE).toFixed(2).replace('.', ',')})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-sm font-bold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  AGUARDANDO PAGAMENTO
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">
              Criado em {new Date(caseData.createdAt).toLocaleString('pt-BR')} • Órgão: {caseData.infraction?.autuadorBody || 'DETRAN'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPaid && (
            <button
              onClick={handleSimulatePayment}
              disabled={isSimulatingPayment}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSimulatingPayment ? 'Processando...' : 'Simular Webhook PagBank'}</span>
            </button>
          )}
          <button
            onClick={() => {
              // For now, let's just call the payment simulation which already refetches
              // But only if we're not already simulating payment
              if (!isSimulatingPayment) {
                handleSimulatePayment(caseData.id);
              }
            }}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 rounded-xl text-sm font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess === 'success' ? 'Pagamento aprovado via Webhook PagBank simulado!' : 'Erro ao processar pagamento'}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => navigate(`/admin/cases/${caseId}?tab=overview`)}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Visão Operacional & Autuação</span>
        </button>

        <button
          onClick={() => navigate(`/admin/cases/${caseId}?tab=theses`)}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'theses'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Diagnóstico RAG & Teses ({theses.length})</span>
        </button>

        <button
          onClick={() => navigate(`/admin/cases/${caseId}?tab=document`)}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'document'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Petição & Minuta Formal</span>
        </button>

        <button
          onClick={() => navigate(`/admin/cases/${caseId}?tab=payment`)}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'payment'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pagamento PagBank</span>
        </button>

        <button
          onClick={() => navigate(`/admin/cases/${caseId}?tab=logs`)}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'logs'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Trilha de Eventos & Logs</span>
        </button>
      </div>

      {/* Tab 1: Overview & Infraction */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Infraction & Vehicle Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-bold text-white font-mono uppercase">Dados da Infração & Veículo</h2>
                </div>
                <span className="px-2 py-0.5 rounded text-sm font-bold bg-slate-800 text-orange-400 font-mono">
                  Enquadramento: {caseData.infraction?.infractionCode || '745-50'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
                <div>
                  <span className="text-slate-500 text-sm uppercase">Auto de Infração (AIT)</span>
                  <p className="text-white font-bold text-sm">{caseData.infraction?.aitNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Placa / Renavam</span>
                  <p className="text-white font-bold text-sm">
                    {caseData.vehicle?.plate || 'N/A'} • {caseData.vehicle?.renavam || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Veículo</span>
                  <p className="text-slate-200 font-medium">{caseData.vehicle?.brandModel || 'Toyota Corolla Cross XRE'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Órgão Autuador</span>
                  <p className="text-slate-200 font-medium">{caseData.infraction?.autuadorBody || 'DETRAN'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Data e Hora</span>
                  <p className="text-slate-200">{caseData.infraction?.dateTime || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Local</span>
                  <p className="text-slate-200">{caseData.infraction?.location || 'N/A'}</p>
                </div>
                {caseData.infraction?.speedLimit !== undefined && (
                  <>
                    <div>
                      <span className="text-slate-500 text-sm uppercase">Velocidade Limite vs Medida</span>
                      <p className="text-slate-200 font-bold">
                        {caseData.infraction?.speedLimit} km/h ➔ {caseData.infraction?.measuredSpeed} km/h (Considerada: {caseData.infraction?.consideredSpeed} km/h)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-sm uppercase">Equipamento / INMETRO</span>
                      <p className="text-slate-200">
                        {caseData.infraction?.radarEquipmentId || 'Radar Radartech'} (Aferição: {caseData.infraction?.inmetroAferitionDate || 'Vencida'})
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-sm font-mono">
                <span className="text-slate-500 text-sm uppercase block mb-1">Descrição Legal CTB</span>
                <p className="text-slate-300">{caseData.infraction?.description || 'Transitar em velocidade superior à máxima permitida em até 20%'}</p>
                <p className="text-orange-400 font-bold mt-1">Artigo {caseData.infraction?.ctbArticle || '218, I'} do CTB • {caseData.infraction?.points || 4} Pontos • R$ {caseData.infraction?.fineAmount?.toFixed(2) || '130.16'}</p>
              </div>
            </div>

            {/* Formal Flaws Detected */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Vícios Formais & Inconsistências Identificadas ({formalFlaws.length})</span>
              </div>
              {formalFlaws.length === 0 ? (
                <p className="text-sm text-slate-400 font-mono">Nenhuma nulidade evidente identificada no Auto.</p>
              ) : (
                <div className="space-y-2">
                  {formalFlaws.map((flaw, idx) => (
                    <div key={idx} className="p-2.5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-sm font-mono text-rose-200 flex items-start gap-2">
                      <span className="text-rose-400 font-bold">[{idx + 1}]</span>
                      <span>{flaw}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Client Qualification Card */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-bold text-white font-mono uppercase">Requerente / Cliente</h2>
              </div>

              <div className="space-y-3 text-sm font-mono">
                <div>
                  <span className="text-slate-500 text-sm uppercase">Nome Completo</span>
                  <p className="text-white font-bold">{caseData.clientName || 'Motorista DefesAi'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">CPF</span>
                  <p className="text-slate-200">{caseData.clientCpf || '000.000.000-00'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">E-mail de Contato</span>
                  <p className="text-slate-200">{caseData.clientEmail || 'contato@defesai.com.br'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Telefone</span>
                  <p className="text-slate-200">{caseData.clientPhone || '(11) 99999-9999'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm uppercase">Procedimento Solicitado</span>
                  <p className="text-orange-400 font-bold">
                    {caseData.serviceType === 'conversao_advertencia'
                      ? 'Conversão em Advertência (Art. 267 CTB)'
                      : caseData.serviceType === 'recurso_jari'
                      ? 'Recurso JARI (1ª Instância)'
                      : 'Defesa Prévia (Autuação)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white font-mono uppercase">Atalhos Operacionais</h3>
              <button
                onClick={() => navigate(`/admin/cases/${caseId}?tab=document`)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span>Visualizar Minuta A4</span>
              </button>
              <button
                onClick={() => navigate(`/admin/cases/${caseId}?tab=payment`)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Inspecionar PagBank PIX</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Theses and RAG Diagnosis */}
      {activeTab === 'theses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                Diagnóstico do Motor RAG & Teses Jurídicas
              </h2>
              <p className="text-sm text-slate-400 font-mono">
                52 teses jurídicas catalogadas e validadas contra as Resoluções CONTRAN
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-mono font-bold">
                Probabilidade: {caseData.analysis?.overallSuccessRate ?? 0}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {theses.map((arg: any, index: number) => (
              <div
                key={arg.id || index}
                className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-sm font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    {arg.category || 'MÉRITO'}
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    Peso: {arg.weight || 90}%
                  </span>
                </div>
                <h3 className="text-white font-bold text-sm">{arg.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{arg.summary || arg.legalBasis}</p>
                <div className="pt-2 text-sm text-slate-500 flex items-center justify-between border-t border-slate-900">
                  <span>Fundamentação: {arg.legalBasis || 'CTB / Resoluções'}</span>
                  <span>ID: {arg.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Generated Document */}
      {activeTab === 'document' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white font-mono">
                  Minuta da Petição Administrativa Formal
                </h2>
              </div>
              <p className="text-sm text-slate-400 font-mono">
                Estruturada conforme exigências dos órgãos de trânsito (ABNT / A4)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Paper View Container */}
          <div className="bg-slate-950 p-6 sm:p-10 rounded-2xl border border-slate-800 shadow-inner font-mono text-slate-300 text-sm leading-relaxed space-y-4 max-w-4xl mx-auto whitespace-pre-wrap">
            {caseData.defenseDraft?.fullDraftText || caseData.defenseDraft?.factsNarrative || 'Nenhum rascunho de petição gerado ainda para este caso.'}
          </div>
        </div>
      )}

      {/* Tab 4: PagBank Payment */}
      {activeTab === 'payment' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                Integração PagBank Orders v2 & Conciliação
              </h2>
              <p className="text-sm text-slate-400 font-mono">
                Transação PIX oficial com confirmação via webhook e idempotência
              </p>
            </div>
            {isPaid ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold font-mono">
                STATUS: PAID / APROVADO
              </span>
) : (
<span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-bold font-mono">
                  STATUS: PENDING / AGUARDANDO
                </span>
             )
           }
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-sm">
              <h3 className="text-white font-bold text-sm border-b border-slate-900 pb-2">Metadados da Transação</h3>
              <div>
                <span className="text-slate-500 text-sm uppercase">Transaction ID</span>
                <p className="text-slate-200">{caseData.payment?.transactionId || `ord_${caseData.id}`}</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm uppercase">Valor Total</span>
                <p className="text-emerald-400 font-bold text-sm">R$ {caseData.payment?.amount?.toFixed(2) || PRICING.DEFAULT_PRICE.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm uppercase">Método</span>
                <p className="text-slate-200">PIX (Banco Central do Brasil via PagBank)</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm uppercase">Data de Confirmação</span>
                <p className="text-slate-200">{caseData.paidAt || caseData.payment?.paidAt || 'Aguardando liquidação'}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-sm">
              <h3 className="text-white font-bold text-sm border-b border-slate-900 pb-2">Ações de Conciliação</h3>
              <p className="text-slate-400 text-sm">
                Caso o cliente tenha pago via PIX e o webhook do PagBank tenha sofrido atraso na rede, você pode forçar a reconciliação imediata.
              </p>
              <button
                onClick={handleSimulatePayment}
                disabled={isSimulatingPayment}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isSimulatingPayment ? 'Processando...' : 'Reconciliar e Aprovar Pagamento'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Logs & Execution Trail */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white font-mono">
              Trilha de Execução & Linha do Tempo Técnica
            </h2>
            <p className="text-sm text-slate-400 font-mono">
              Eventos registrados pelo EventBus do sistema para o caso {caseData.id}
            </p>
          </div>

          <div className="space-y-3 font-mono text-sm">
            {caseData.timeline && caseData.timeline.length > 0 ? (
              caseData.timeline.map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-white font-bold">{event.title}</p>
                      <span className="text-sm text-slate-500">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{event.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500">Nenhum evento registrado na linha do tempo.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};