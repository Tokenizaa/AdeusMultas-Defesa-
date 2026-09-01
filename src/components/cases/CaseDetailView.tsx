import React from 'react';
import {
  ExternalLink,
  Building2,
  FileText,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  FileDown,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Check,
  Edit3,
  Copy,
  Printer,
  Scale,
} from 'lucide-react';
import { CaseDetailBase } from '../shared/CaseDetailBase';
import { CaseDomain, JourneyStage, ProcedureType, LegalArgumentDomain } from '../../types';
import { CanonicalKnowledgeRegistry } from '../../core/knowledge/registry/canonical-registry';
import { ARGUMENTS_CATALOG } from '../../core/arguments/arguments-catalog';
import { PROCEDURE_TITLES } from '../../data/knowledge-base';
import { exportDefenseToPDF } from '../../lib/pdf-export';
import { buildDocumentRollItems, normalizeProcedureId } from '../../core/documents/document-roll';
import { GoogleDriveButton } from '../common/GoogleDriveButton';

/**
 * Deriva a jornada processual do caso em linguagem legível ao cidadão,
 * a partir dos artefatos do pipeline canônico (análise + minuta).
 * Não expõe detalhes internos técnicos ao usuário.
 */
function pipelineJourney(caseData: CaseDomain | null) {
  const hasAnalysis = Boolean(caseData?.analysis?.recommendedArguments?.length || caseData?.analysis?.detectedInconsistencies?.length);
  const hasRules = Boolean(caseData?.analysis?.evaluatedRules?.length);
  const hasFlaws = Boolean(caseData?.analysis?.detectedFlaws?.length || caseData?.analysis?.detectedInconsistencies?.length);
  const hasDraft = Boolean(caseData?.defenseDraft?.fullDraftText);
  const draftValid = caseData?.defenseDraft?.validationStatus === 'valid'
    || (hasDraft && caseData.defenseDraft?.integrityScore !== undefined && caseData.defenseDraft.integrityScore >= 100);

  const steps = [
    { label: 'Dados recebidos', done: true, active: false },
    { label: 'Caso classificado', done: Boolean(caseData?.serviceType), active: !caseData?.serviceType },
    { label: 'Fatos analisados', done: hasAnalysis, active: !hasAnalysis && Boolean(caseData?.serviceType) },
    { label: 'Regras executadas', done: hasRules, active: !hasRules && hasAnalysis },
    { label: 'Vícios identificados', done: hasFlaws, active: !hasFlaws && hasRules },
    { label: 'Teses aplicadas', done: Boolean(caseData?.analysis?.selectedArguments?.length) || hasAnalysis, active: !hasAnalysis },
    { label: 'Minuta montada', done: hasDraft, active: !hasDraft && (hasFlaws || hasAnalysis) },
    { label: 'Validação concluída', done: draftValid, active: !draftValid && hasDraft },
    { label: 'Documento pronto', done: draftValid, active: false },
  ];
  return steps;
}

interface CaseDetailViewProps {
  /** Optional pre-loaded case. When absent, the view fetches it by `caseId`. */
  currentCase?: CaseDomain;
  /** Fallback case identifier (e.g. from route params) used to fetch data. */
  caseId?: string;
  onUpdateCase: (updated: CaseDomain) => void;
  onBackToList: () => void;
  onOpenWhatsAppModal: (caseId: string) => void;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  currentCase,
  caseId,
  onUpdateCase,
  onBackToList,
  onOpenWhatsAppModal,
}) => {
  const resolvedCaseId = currentCase?.id || caseId;

  const shared = CaseDetailBase({
    caseId: resolvedCaseId,
    currentCase,
    onUpdateCase,
    onBackToList,
    onOpenWhatsAppModal,
    variant: 'user'
  });

  // Destructure what we need from the shared component
  const {
    caseData,
    isLoading,
    error,
    activeStage,
    setActiveStage,
    isEditingDraft,
    setIsEditingDraft,
    editedDraftText,
    setEditedDraftText,
    isRegenerating,
    setIsRegenerating,
    copiedDraft,
    setCopiedDraft,
    checkedDocuments,
    setCheckedDocuments,
    // Admin-specific fields we won't use in user view
    activeTab,
    setActiveTab,
    isSimulatingPayment,
    actionSuccess,
    handleSimulatePayment
  } = shared;

  // Selected argument IDs in Stage 2 (this is user-specific and not in CaseDetailBase)
  const [selectedArgIds, setSelectedArgIds] = React.useState<string[]>(
    caseData?.defenseDraft?.selectedArgumentIds ||
      caseData?.analysis?.recommendedArguments?.map((a) => a.id) || [
        'ARG-001',
        'ARG-003',
        'ARG-007',
      ]
  );

  // Stage 2 simplified mode: regular users get automatic selection (top 3
  // recommended grounds); lawyers/dispatchers can opt into manual picking.
  const [professionalMode, setProfessionalMode] = React.useState(false);

  // Sync selectedArgIds with caseData when it changes
  React.useEffect(() => {
    if (caseData) {
      setSelectedArgIds(
        caseData.defenseDraft?.selectedArgumentIds ||
          caseData.analysis?.recommendedArguments?.map((a) => a.id) || [
            'ARG-001',
            'ARG-003',
            'ARG-007',
          ]
      );
    }
  }, [caseData]);

  const toggleArgument = (argId: string) => {
    if (selectedArgIds.includes(argId)) {
      setSelectedArgIds(selectedArgIds.filter((id) => id !== argId));
    } else {
      setSelectedArgIds([...selectedArgIds, argId]);
    }
  };

  const handleRegenerateDefense = async () => {
    setIsRegenerating(true);
    try {
      // Timeout de segurança: nunca deixa o usuário preso no spinner "Redigindo com IA..."
      let applicantData: Record<string, string | undefined> | undefined;
      const a = currentCase?.applicant;
      if (a && a.applicantName && a.applicantCpf && a.applicantCnh) {
        applicantData = {
          name: a.applicantName,
          cpf: a.applicantCpf,
          rg: a.applicantRg,
          cnh: a.applicantCnh,
          category: a.cnhCategory,
          address: `${a.addressStreet}, ${a.addressNumber || ''}`,
          cityState: a.addressCityState,
        };
      }
      const res = await fetch(`/api/cases/${resolvedCaseId}/generate-defense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          procedureType: currentCase?.serviceType,
          selectedArgumentIds: selectedArgIds,
          applicantData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateCase(data.case);
        setEditedDraftText(data.defenseDraft.fullDraftText);
        setActiveStage(3);
      } else {
        alert('Não foi possível gerar a defesa agora. Tente novamente em instantes.');
      }
    } catch (err) {
      console.error('Error generating defense:', err);
      alert('Não foi possível gerar a defesa agora. Verifique sua conexão e tente novamente.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportDefenseToPDF(caseData, editedDraftText || caseData?.defenseDraft?.fullDraftText);
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(editedDraftText || caseData?.defenseDraft?.fullDraftText || '');
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleSaveEditedDraft = () => {
    if (caseData?.defenseDraft) {
      const updatedCase: CaseDomain = {
        ...caseData,
        defenseDraft: {
          ...caseData.defenseDraft,
          fullDraftText: editedDraftText,
          updatedAt: new Date().toISOString(),
        },
      };
      onUpdateCase(updatedCase);
      setIsEditingDraft(false);
    }
  };

  // Find organ info — FAIL CLOSED (Fase 8): resolve via registry canônico nacional
  // (27 UFs + órgãos federais/municipais). NUNCA exibe dados de outro órgão:
  // se o órgão não consta no catálogo, retorna null e o UI avisa sem inventar.
  const autuadorInfo = (() => {
    const raw = caseData?.infraction?.autuadorBody || '';
    if (!raw) return null;
    // Abreviação uppercase normalizada para match canônico (DETRAN-MG, CET-SP / DSV, PRF).
    return CanonicalKnowledgeRegistry.resolveProtocolInfo(raw.toUpperCase()) || null;
  })();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm">Carregando registro operacional do caso {resolvedCaseId || '...'}...</p>
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
          onClick={onBackToList}
          className="px-4 py-2 bg-slate-900 text-slate-100 rounded-xl text-sm font-semibold hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Casos</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top High-Density Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToList}
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-orange-500 hover:bg-orange-50/20 text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {caseData.title}
              </h1>
              <span className="px-2 py-0.2 text-sm rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-mono">
                {(caseData.status || 'novo').toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Requerente: <span className="font-semibold text-slate-800">{caseData.clientName}</span> • Placa: <span className="font-mono font-bold text-slate-900">{caseData.vehicle?.plate || '—'}</span> • AIT: <span className="font-mono text-slate-900">{caseData.infraction?.aitNumber || '—'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-pdf-top"
            onClick={handleExportPDF}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Exportar PDF (A4)</span>
          </button>

          <button
            onClick={() => onOpenWhatsAppModal(caseData.id)}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Alertas WhatsApp</span>
          </button>
        </div>
      </div>

      {/* 5-Stage JourneyStepper Grid Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-5 gap-2 text-center">
          <div
            onClick={() => setActiveStage(1)}
            className={`flex flex-col items-center py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeStage >= 1 ? 'border-orange-500' : 'border-slate-200'
            }`}
          >
            <span className={`text-sm font-bold uppercase tracking-wider font-mono ${
              activeStage >= 1 ? 'text-orange-500' : 'text-slate-400'
            }`}>
              Etapa 1
            </span>
            <span className={`text-sm font-semibold truncate ${
              activeStage === 1 ? 'text-slate-900 font-bold' : 'text-slate-500'
            }`}>
              Autuação
            </span>
          </div>

          <div
            onClick={() => setActiveStage(2)}
            className={`flex flex-col items-center py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeStage >= 2 ? 'border-orange-500' : 'border-slate-200'
            }`}
          >
            <span className={`text-sm font-bold uppercase tracking-wider font-mono ${
              activeStage >= 2 ? 'text-orange-500' : 'text-slate-400'
            }`}>
              Etapa 2
            </span>
            <span className={`text-sm font-semibold truncate ${
              activeStage === 2 ? 'text-slate-900 font-bold' : 'text-slate-500'
            }`}>
              Teses CTB
            </span>
          </div>

          <div
            onClick={() => setActiveStage(3)}
            className={`flex flex-col items-center py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeStage >= 3 ? 'border-orange-500' : 'border-slate-200'
            }`}
          >
            <span className={`text-sm font-bold uppercase tracking-wider font-mono ${
              activeStage >= 3 ? 'text-orange-500' : 'text-slate-400'
            }`}>
              Etapa 3
            </span>
            <span className={`text-sm font-semibold truncate ${
              activeStage === 3 ? 'text-slate-900 font-bold' : 'text-slate-500'
            }`}>
              Minuta A4
            </span>
          </div>

          <div
            onClick={() => setActiveStage(4)}
            className={`flex flex-col items-center py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeStage >= 4 ? 'border-orange-500' : 'border-slate-200'
            }`}
          >
            <span className={`text-sm font-bold uppercase tracking-wider font-mono ${
              activeStage >= 4 ? 'text-orange-500' : 'text-slate-400'
            }`}>
              Etapa 4
            </span>
            <span className={`text-sm font-semibold truncate ${
              activeStage === 4 ? 'text-slate-900 font-bold' : 'text-slate-500'
            }`}>
              Protocolo
            </span>
          </div>

          <div
            onClick={() => setActiveStage(5)}
            className={`flex flex-col items-center py-2 px-1 border-b-2 transition-all cursor-pointer ${
              activeStage >= 5 ? 'border-orange-500' : 'border-slate-200'
            }`}
          >
            <span className={`text-sm font-bold uppercase tracking-wider font-mono ${
              activeStage >= 5 ? 'text-orange-500' : 'text-slate-400'
            }`}>
              Etapa 5
            </span>
            <span className={`text-sm font-semibold truncate ${
              activeStage === 5 ? 'text-slate-900 font-bold' : 'text-slate-500'
            }`}>
              Andamento
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: Autuação & Diagnóstico Inicial */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Diagnóstico do Auto de Infração nº {caseData.infraction?.aitNumber || '—'}
            </h2>
            <button
              onClick={() => setActiveStage(2)}
              className="px-3.5 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 cursor-pointer shadow-xs shadow-orange-200"
            >
              <span>Avançar para Teses</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-sm font-bold text-slate-400 uppercase font-mono">Enquadramento</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">{caseData.infraction?.infractionCode || '—'}</p>
              <p className="text-sm text-slate-600 mt-0.5 leading-snug">{caseData.infraction?.description || '—'}</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-sm font-bold text-slate-400 uppercase font-mono">Penalidade Prevista</span>
              <p className="text-sm font-bold text-rose-600 mt-0.5 font-mono">
                {caseData.infraction?.points ?? 0} Pontos • R$ {(caseData.infraction?.fineAmount ?? 0).toFixed(2)}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">{caseData.infraction?.ctbArticle || '—'}</p>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-sm font-bold text-slate-400 uppercase font-mono">Órgão Julgador</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">{caseData.infraction?.autuadorBody || '—'}</p>
              <p className="text-sm text-slate-600 mt-0.5 font-mono">Prazo: {caseData.infraction?.defenseDeadline || '—'}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-orange-50/50 border-l-4 border-orange-400 text-sm">
            <h4 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-1.5 mb-1.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
              Vícios Formais Detectados no Auto:
            </h4>
            <ul className="space-y-1 text-slate-700">
              {caseData.infraction?.formalFlawsDetected?.map((flaw, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>{flaw}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: Estratégia Jurídica & Seleção de Teses */}
      {/* Simplified by default (auto top-3) — professional manual picking opt-in */}
      {/* ========================================================================= */}
      {activeStage === 2 && (() => {
        const recommendedArgs = ARGUMENTS_CATALOG.filter((a) => selectedArgIds.includes(a.id)).slice(0, 3);
        const MAX_GENERATIONS = 3;
        // O backend controla o limite efetivo; o frontend apenas reflete o estado.
        const generationCount = caseData.defenseDraft?.generationCount ?? 0;
        const generationLimitReached = generationCount >= MAX_GENERATIONS;
        return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              {professionalMode ? (
                <>
                  <h2 className="text-base font-bold text-slate-900">
                    Seleção de Teses Jurídicas (CTB & CONTRAN)
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Modo profissional — selecione as teses de nulidade que serão injetadas na minuta.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold text-slate-900">
                    Estratégia Jurídica Pronta para o Seu Caso
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Nossa inteligência jurídica já escolheu as teses mais fortes. É só gerar a minuta — sem juridiquês.
                  </p>
                </>
              )}
            </div>

            <button
              id="regenerate-with-selected-button"
              onClick={handleRegenerateDefense}
              disabled={isRegenerating || generationLimitReached}
              className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-tight ${
                professionalMode
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200 px-6 py-2.5'
              }`}
              title={generationLimitReached ? 'Limite de 3 gerações atingido' : undefined}
            >
              {isRegenerating ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Redigindo com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {professionalMode ? (
                    <span>Gerar Minuta ({selectedArgIds.length} Teses)</span>
                  ) : (
                    <span>Gerar Nova Defesa</span>
                  )}
                </>
              )}
            </button>
            {generationLimitReached ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                Limite de 3 gerações atingido
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500">
                {generationCount}/{MAX_GENERATIONS} gerações
              </span>
            )}
          </div>

          {!professionalMode ? (
            /* ---------- MODO SIMPLIFICADO: top-3 automático, somente leitura ---------- */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(recommendedArgs.length > 0 ? recommendedArgs : ARGUMENTS_CATALOG.slice(0, 3)).map((arg, idx) => (
                  <div key={arg.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 flex flex-col text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs uppercase font-mono">
                        Tese {idx + 1}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                        <Check className="w-3.5 h-3.5" /> Automática
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 leading-snug">{arg.title}</h4>
                    <p className="text-slate-600 mt-1.5 leading-relaxed flex-1">{arg.description}</p>
                    <div className="mt-3 pt-2 border-t border-emerald-100 flex items-center justify-between font-mono text-xs">
                      <span className="text-slate-500">{arg.legalBase}</span>
                      <span className="text-emerald-700 font-bold shrink-0 ml-2">{arg.confidenceScore}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-center justify-center gap-2 text-sm text-slate-500 cursor-pointer w-fit mx-auto hover:text-slate-700">
                <input
                  type="checkbox"
                  checked={professionalMode}
                  onChange={(e) => setProfessionalMode(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-orange-500"
                />
                Sou advogado/despachante — quero escolher as teses manualmente
              </label>
            </div>
          ) : (
            /* ---------- MODO PROFISSIONAL: seleção manual completa (preservada) ---------- */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ARGUMENTS_CATALOG.map((arg) => {
                  const isSelected = selectedArgIds.includes(arg.id);
                  return (
                    <div
                      key={arg.id}
                      onClick={() => toggleArgument(arg.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer text-sm ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/20 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-400 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-orange-500 text-white' : 'border border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="font-bold text-slate-900 text-sm">{arg.title}</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 font-bold text-sm uppercase font-mono">
                          {arg.category}
                        </span>
                      </div>

                      <p className="text-slate-600 mt-1.5 leading-relaxed text-sm">{arg.description}</p>
                      <p className="font-mono text-sm text-orange-600 mt-1.5">{arg.legalBase}</p>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-mono">
                        <span className="text-emerald-700 font-semibold">{arg.confidenceScore}% probabilidade</span>
                        <span className="text-slate-400">{isSelected ? '✔ Selecionada' : '+ Incluir'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="flex items-center justify-center gap-2 text-sm text-slate-500 cursor-pointer w-fit mx-auto hover:text-slate-700">
                <input
                  type="checkbox"
                  checked={professionalMode}
                  onChange={(e) => setProfessionalMode(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-orange-500"
                />
                Voltar ao modo automático (recomendado para condutores)
              </label>
            </>
          )}
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* STAGE 3: Minuta da Defesa & Editor Jurídico (Folha A4 Diagramada) */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono uppercase">
                Petição Pronta (52 Blocos CTB)
              </span>
              <span className="text-sm text-slate-500 hidden sm:inline truncate">
                {PROCEDURE_TITLES[normalizeProcedureId(caseData.serviceType) as keyof typeof PROCEDURE_TITLES] || 'Defesa Administrativa'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isEditingDraft ? (
                <button
                  onClick={handleSaveEditedDraft}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Edição
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingDraft(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar Minuta
                </button>
              )}

              <button
                onClick={handleCopyDraft}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedDraft ? 'Copiado!' : 'Copiar Texto'}
              </button>

              <button
                id="btn-export-pdf-stage3"
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shadow-orange-200"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Exportar PDF (A4)</span>
              </button>

              <GoogleDriveButton
                documentToExport={{
                  title: `Recurso de Multa - ${caseData.infraction?.infractionCode || 'Sem Código'}`,
                  content: caseData.defenseDraft?.fullDraftText || editedDraftText || '',
                  aitNumber: caseData.infraction?.aitNumber,
                  plate: caseData.vehicle?.plate,
                }}
              />

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>

              <button
                onClick={() => setActiveStage(4)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Protocolar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Formal Legal Document View (Simulated A4 Paper) */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-md p-8 sm:p-12 max-w-3xl mx-auto min-h-[800px] text-slate-900 font-serif leading-relaxed text-sm sm:text-sm">
            {/* Official Header Timbre */}
            <div className="text-center pb-5 mb-5 border-b-2 border-slate-900/30">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-orange-400 mx-auto flex items-center justify-center font-bold text-sm mb-2">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-slate-700 font-mono">
                REPÚBLICA FEDERATIVA DO BRASIL • SISTEMA NACIONAL DE TRÂNSITO
              </h3>
              <p className="font-sans text-sm text-slate-500 mt-0.5">
                DEFESA ADMINISTRATIVA COM BASE NA LEI Nº 9.503/1997 (CÓDIGO DE TRÂNSITO BRASILEIRO)
              </p>
            </div>

            {isEditingDraft ? (
              <textarea
                value={editedDraftText}
                onChange={(e) => setEditedDraftText(e.target.value)}
                rows={28}
                className="w-full font-serif text-sm text-slate-900 border border-slate-300 rounded-lg p-4 outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
              />
            ) : (
              <div className="whitespace-pre-wrap text-justify space-y-4">
                {caseData.defenseDraft?.fullDraftText || editedDraftText}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: Protocolo & Órgão Autuador */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded text-sm font-bold bg-sky-50 text-sky-800 border border-sky-200 uppercase font-mono">
                Guia de Envio Oficial
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                Onde e Como Protocolar sua Defesa
              </h2>
            </div>

            <button
              onClick={() => setActiveStage(5)}
              className="px-3.5 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 cursor-pointer shadow-xs shadow-orange-200"
            >
              <span>Acompanhar Processo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {autuadorInfo ? (
            <>
            {/* Digital Protocol Card */}
            <div className="p-4 rounded-xl border border-emerald-500 bg-emerald-50/20">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <ExternalLink className="w-4 h-4" />
                Opção 1: Protocolo 100% Digital (Recomendado)
              </div>
              <p className="text-sm text-slate-600 mt-1.5 leading-snug">
                Você pode enviar o PDF gerado diretamente pelo portal eletrônico oficial do órgão autuador sem sair de casa.
              </p>
              <div className="mt-3 pt-2 border-t border-emerald-200">
                <span className="text-sm font-bold text-slate-700 uppercase block font-mono">Portal Oficial:</span>
                <a
                  href={autuadorInfo.portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-mono text-emerald-700 underline break-all mt-0.5 block hover:text-emerald-900 font-semibold"
                >
                  {autuadorInfo.portalUrl}
                </a>
              </div>
            </div>

            {/* Physical / Correios Option */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-slate-600" />
                Opção 2: Envio por Correios (Carta Registrada com AR)
              </div>
              <p className="text-sm text-slate-600 mt-1.5 leading-snug">
                Imprima a petição, assine à caneta, anexe as cópias e envie para o endereço da JARI:
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900 block text-sm">{autuadorInfo.competentBody}</span>
                <span className="text-slate-600 block mt-0.5 text-sm">{autuadorInfo.physicalAddress}</span>
              </div>
            </div>
            </>
            ) : (
              <div className="col-span-full p-4 rounded-xl border border-amber-400 bg-amber-50/20 text-amber-900 text-sm">
                <strong>Dados de protocolo não disponíveis para o órgão autuador informado.</strong>{' '}
                Não exibimos portal/endereço de outro órgão (evita orientação incorreta). Consulte o órgão
                autuador diretamente para confirmar o canal de protocolo.
              </div>
            )}
          </div>

          {/* Checklist of Mandatory Documents — espelha o ROL DE DOCUMENTOS (BLK-068) da minuta gerada.
              Fonte única de verdade: buildDocumentRollItems(serviceType) — apenas documentos
              OBRIGATÓRIOS exigidos pelo órgão autuador no ato do protocolo. */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2 font-mono">
              <FileText className="w-3.5 h-3.5 text-slate-700" />
              Checklist de Documentos Obrigatórios para Juntada:
            </h3>
            <p className="text-xs text-slate-500 mb-2.5 leading-snug">
              Estes são os mesmos itens declarados no Rol de Documentos (Seção final da sua petição), conforme exigência do {autuadorInfo?.competentBody || 'órgão autuador'} para o procedimento <strong>{PROCEDURE_TITLES[normalizeProcedureId(caseData.serviceType) as keyof typeof PROCEDURE_TITLES] || caseData.serviceType}</strong>. Junte todos antes de protocolar.
            </p>

            <div className="space-y-1.5 text-sm">
              {buildDocumentRollItems(caseData.serviceType).map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!!checkedDocuments[item.id]}
                    onChange={(e) => setCheckedDocuments({ ...checkedDocuments, [item.id]: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-orange-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{item.label}</span>
                    {item.hint && <span className="text-slate-500 block text-xs">{item.hint}</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: Acompanhamento & Linha do Tempo */}
      {/* ========================================================================= */}
      {activeStage === 5 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase font-mono">
                Linha do Tempo em Tempo Real
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                Histórico Processual & Andamento
              </h2>
            </div>
          </div>

          {/* Jornada do Processamento do Caso (pipeline canônico, linguagem do cidadão) */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Jornada do Seu Caso
            </p>
            {pipelineJourney(caseData).map((step, idx) => (
              <div key={step.label} className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    step.done
                      ? 'bg-emerald-500'
                      : step.active
                      ? 'bg-orange-500 ring-4 ring-orange-100'
                      : 'bg-slate-200'
                  }`}
                />
                <span className={`text-sm ${step.done ? 'text-slate-900' : step.active ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4" />

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {(caseData.timeline || []).map((item, idx) => (
              <div key={item.id || idx} className="relative group">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white ring-2 ring-orange-100" />
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                    <span className="text-sm font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-[#0f172a] text-white flex items-center justify-between text-sm shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Próximo Julgamento Previsto</p>
                <p className="text-slate-300 text-sm">Prazo médio de deliberação da JARI: 30 a 60 dias</p>
              </div>
            </div>
            <button
              onClick={() => onOpenWhatsAppModal(caseData.id)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer text-sm"
            >
              Alertas WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};