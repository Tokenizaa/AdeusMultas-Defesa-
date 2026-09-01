import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronRight,
  ArrowLeft,
  FileCheck2,
  Scale
} from 'lucide-react';
import {
  ProcedureType,
  InfractionData,
  VehicleData,
  CaseAnalysis,
  CaseDomain,
  CaseDocumentData
} from '../../types';
import { useRouter } from '../../core/router/RouterContext';
import { useAuth } from '../../core/auth/AuthContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { emitCasesChanged } from '../../context/casesEvents';
import {
  UserSituation,
  UserProcessStage,
  InfractionCategory,
  USER_SITUATIONS,
  USER_PROCESS_STAGES,
  RULES_MATRIX
} from '../../core/onboarding/rules-matrix';

// ============================================================================
// Wizard State Persistence (localStorage)
// ============================================================================

const WIZARD_STORAGE_KEY = 'defesai_wizard_state';

interface WizardPersistedState {
  step: number;
  leadName: string;
  leadPhone: string;
  situation: UserSituation;
  processStage: UserProcessStage;
  infractionCategory: InfractionCategory;
  vehicleData: VehicleData;
  infractionData: InfractionData;
  caseAnalysis: CaseAnalysis;
  documentData: CaseDocumentData;
  savedCaseId?: string;
  savedAt: number; // timestamp
}

function loadWizardState(): WizardPersistedState | null {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardPersistedState;
    // Expire after 24 hours
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    return null;
  }
}

function saveWizardState(state: Omit<WizardPersistedState, 'savedAt'>) {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

function clearWizardState() {
  try { localStorage.removeItem(WIZARD_STORAGE_KEY); } catch { /* ignore */ }
}

import { ServiceStep } from './steps/ServiceStep';
import { DefenseStageStep } from './steps/DefenseStageStep';
import { InfractionCategoryStep } from './steps/InfractionCategoryStep';
import { InfractionIdentificationStep } from './steps/InfractionIdentificationStep';
import { SpecificInfractionDataStep } from './steps/SpecificInfractionDataStep';
import { AnalysisProcessingStep } from './steps/AnalysisProcessingStep';
import { FreeAnalysisResultStep } from './steps/FreeAnalysisResultStep';
import { RequiredDataStep } from './generation/RequiredDataStep';
import { DocumentReviewStep } from './generation/DocumentReviewStep';
import { DocumentCheckoutStep } from './generation/DocumentCheckoutStep';
import { AccountVerificationGate } from './AccountVerificationGate';

interface OnboardingWizardProps {
  onCaseReadyForCheckout?: (newCase: CaseDomain) => void;
  onOpenKnowledge?: () => void;
  isAdmin?: boolean;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
    onCaseReadyForCheckout,
    onOpenKnowledge,
    isAdmin: isAdminProp = false,
}) => {
    const { navigate } = useRouter();
    const { user, isAuthenticated, isAdmin: isAdminAuth } = useAuth();
    const authFetch = useAuthFetch();
    // Canal duplo de admin: prop explícita do pai (legado) OU sessão autenticada
    // com role=admin (AuthContext). Corrige o caso em que App.tsx passa `isAdmin`
    // mas o wizard lia uma prop inexistente (`isAdminFromParent`), deixando todos
    // os botões de teste invisíveis.
    const effectiveIsAdmin = isAdminProp || isAdminAuth;

    // Load persisted wizard state if available (e.g., after email confirmation)
    const savedState = loadWizardState();

    // Wizard Step (1 to 6: Phase 1 Free Analysis, 7 to 9: Phase 2 Paid Document Generation)
    const [step, setStep] = useState<number>(savedState?.step ?? 1);
    const wizardTopRef = useRef<HTMLDivElement>(null);

  // Lead Data (Collected in Step 3 for Visitor conversion)
  const [leadName, setLeadName] = useState<string>(savedState?.leadName || user?.name || '');
  const [leadPhone, setLeadPhone] = useState<string>(savedState?.leadPhone || user?.phone || '');
  const [isAuthGateOpen, setIsAuthGateOpen] = useState<boolean>(false);
  const [authGateRedirectAction, setAuthGateRedirectAction] = useState<'generation' | 'dashboard'>('generation');

  // =========================================================================
  // FASE 1: DADOS DA ANÁLISE JURÍDICA (100% GRATUITA)
  // =========================================================================
  const [situation, setSituation] = useState<UserSituation>(savedState?.situation ?? 'multa_transito');
  const [processStage, setProcessStage] = useState<UserProcessStage>(savedState?.processStage ?? 'primeira_notificacao');
  const [infractionCategory, setInfractionCategory] = useState<InfractionCategory>(savedState?.infractionCategory ?? 'excesso_velocidade');

  const [vehicleData, setVehicleData] = useState<VehicleData>(savedState?.vehicleData ?? {
    plate: '',
    brandModel: '',
    renavam: '',
    year: '',
    color: '',
  });

  const [infractionData, setInfractionData] = useState<InfractionData>(savedState?.infractionData ?? {
    aitNumber: '',
    infractionCode: '',
    description: '',
    ctbArticle: '',
    severity: 'media',
    points: 0,
    fineAmount: 0,
    autuadorBody: '',
    dateTime: '',
    location: '',
    formalFlawsDetected: [],
  });

  const [caseAnalysis, setCaseAnalysis] = useState<CaseAnalysis>(savedState?.caseAnalysis ?? {
    id: `an_${Date.now()}`,
    caseId: `temp_${Date.now()}`,
    createdAt: new Date().toISOString(),
    overallSuccessRate: 0,
    detectedInconsistencies: [],
    recommendedArguments: [],
    recommendedProcedure: '',
    competentBody: '',
    summaryReasoning: '',
  });

  // =========================================================================
  // FASE 2: DADOS DE QUALIFICAÇÃO DO CONDUTOR (GERAÇÃO DA PEÇA FORMAL)
  // =========================================================================
  const [documentData, setDocumentData] = useState<CaseDocumentData>(savedState?.documentData ?? {
    applicantName: user?.name || '',
    applicantCpf: user?.cpf || '',
    applicantRg: '',
    applicantCnh: '',
    cnhCategory: '',
    applicantPhone: user?.phone || '',
    applicantEmail: user?.email || '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressZipCode: '',
    addressCityState: '',
    vehicleRenavam: '',
  });

  const [savedCaseId, setSavedCaseId] = useState<string | undefined>(savedState?.savedCaseId);

  // Scroll to top of wizard on every step change AND save state
  useEffect(() => {
    wizardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveWizardState({
      step,
      leadName,
      leadPhone,
      situation,
      processStage,
      infractionCategory,
      vehicleData,
      infractionData,
      caseAnalysis,
      documentData,
      savedCaseId,
    });
  }, [step, leadName, leadPhone, situation, processStage, infractionCategory, vehicleData, infractionData, caseAnalysis, documentData, savedCaseId]);

  // Persist wizard state immediately before page unload (to catch refresh/navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveWizardState({
        step,
        leadName,
        leadPhone,
        situation,
        processStage,
        infractionCategory,
        vehicleData,
        infractionData,
        caseAnalysis,
        documentData,
        savedCaseId,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, leadName, leadPhone, situation, processStage, infractionCategory, vehicleData, infractionData, caseAnalysis, documentData, savedCaseId]);

// Auto-advance: if user was at step 7 (auth gate) and is now authenticated,
// advance to step 8 automatically (e.g., after email confirmation)
  useEffect(() => {
    if (savedState && (savedState.step === 6 || savedState.step === 7) && isAuthenticated && user) {
      setDocumentData((prev) => ({
        ...prev,
        applicantName: user.name || prev.applicantName,
        applicantEmail: user.email || prev.applicantEmail,
        applicantPhone: user.phone || leadPhone || prev.applicantPhone,
        applicantCpf: user.cpf || prev.applicantCpf,
      }));
      setStep(8);
    }
  }, [isAuthenticated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deriva o tipo de procedimento canônico
  const mappedProcedure: ProcedureType =
    situation === 'conversao_advertencia'
      ? 'conversao_advertencia'
      : situation === 'indicacao_condutor'
      ? 'indicacao_condutor'
      : situation === 'suspensao_cnh'
      ? 'suspensao_cnh'
      : situation === 'cassacao_cnh'
      ? 'cassacao_cnh'
      : processStage === 'recurso_jari' || processStage === 'defesa_negada'
      ? 'recurso_jari'
      : processStage === 'recurso_cetran' || processStage === 'recurso_jari_negado'
      ? 'recurso_cetran'
      : 'recurso_jari';

  const isPhase1 = step <= 7;
  const isPhase2 = step >= 8;

  // Active step progression calculation based on conditional service rules
  const currentSitDef = USER_SITUATIONS.find((s) => s.id === situation);
  const skipsStageStep = Boolean(currentSitDef?.inferredStage);
  const skipsCategoryStep = Boolean(currentSitDef?.defaultInfractionCategory);
  
  // Real active steps list in order
  const activeSteps = [
    1,
    ...(skipsStageStep ? [] : [2]),
    ...(skipsCategoryStep ? [] : [3]),
    4,
    5,
    6,
    7,
    8,
    9,
    10,
  ];

  const currentStepIndex = activeSteps.indexOf(step);
  const displayStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : step;
  const totalDisplaySteps = activeSteps.length;

  // Handlers
  const handleSituationSelect = (selected: UserSituation) => {
    setSituation(selected);
    const sitDef = USER_SITUATIONS.find((s) => s.id === selected);

    if (sitDef?.defaultInfractionCategory) {
      setInfractionCategory(sitDef.defaultInfractionCategory);
    }

    if (sitDef?.inferredStage) {
      setProcessStage(sitDef.inferredStage);
      if (sitDef.defaultInfractionCategory) {
        setStep(4); // Direto para identificação da autuação
      } else {
        setStep(3); // Seleciona o tipo de infração
      }
    } else {
      setStep(2); // Pergunta a fase
    }
  };

  const handleStageSelect = (selected: UserProcessStage) => {
    setProcessStage(selected);
    setStep(3); // Passo exclusivo de tipo/categoria da infração
  };

  const handleCategorySelect = (selected: InfractionCategory) => {
    setInfractionCategory(selected);

    // Pre-populate default values according to category if not already set
    if (selected === 'excesso_velocidade') {
      setInfractionData((prev) => ({
        ...prev,
        ctbArticle: prev.ctbArticle || 'Art. 218, I do CTB',
        infractionCode: prev.infractionCode || '745-50',
        description: prev.description || 'Transitar em velocidade superior à máxima permitida em até 20%',
        severity: 'media',
        fineAmount: 130.16,
        points: 4,
      }));
    } else if (selected === 'lei_seca') {
      setInfractionData((prev) => ({
        ...prev,
        ctbArticle: prev.ctbArticle || 'Art. 165-A do CTB',
        infractionCode: prev.infractionCode || '516-91',
        description: prev.description || 'Recusa ao teste do etilômetro / alcoolemia',
        severity: 'gravissima',
        fineAmount: 2934.70,
        points: 7,
      }));
    } else if (selected === 'celular') {
      setInfractionData((prev) => ({
        ...prev,
        ctbArticle: prev.ctbArticle || 'Art. 252, Parágrafo Único do CTB',
        infractionCode: prev.infractionCode || '736-62',
        description: prev.description || 'Segurar ou manusear telefone celular ao volante',
        severity: 'gravissima',
        fineAmount: 293.47,
        points: 7,
      }));
    } else if (selected === 'vermelho') {
      setInfractionData((prev) => ({
        ...prev,
        ctbArticle: prev.ctbArticle || 'Art. 208 do CTB',
        infractionCode: prev.infractionCode || '605-01',
        description: prev.description || 'Avançar o sinal vermelho do semáforo',
        severity: 'gravissima',
        fineAmount: 293.47,
        points: 7,
      }));
    } else if (selected === 'estacionamento') {
      setInfractionData((prev) => ({
        ...prev,
        ctbArticle: prev.ctbArticle || 'Art. 181 do CTB',
        infractionCode: prev.infractionCode || '545-21',
        description: prev.description || 'Estacionar em desacordo com a sinalização / local proibido',
        severity: 'media',
        fineAmount: 130.16,
        points: 4,
      }));
    }
  };

  const handleLeadUpdate = (name: string, phone: string) => {
    setLeadName(name);
    setLeadPhone(phone);
    setDocumentData((prev) => ({
      ...prev,
      applicantName: name || prev.applicantName,
      applicantPhone: phone || prev.applicantPhone,
    }));
  };

  const handleRunAnalysis = async () => {
    setStep(6); // Processando análise
  };

  const handleAnalysisComplete = (analysis: CaseAnalysis) => {
    setCaseAnalysis(analysis);
  };

  const handleAnalysisCompleted = async () => {
    try {
      const res = await authFetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Diagnóstico Auto ${infractionData.aitNumber || 'sem AIT'}`,
          serviceType: mappedProcedure,
          infraction: infractionData,
          vehicle: vehicleData,
          isAnonymous: !isAuthenticated,
          // Identidade do usuário autenticado — mapeada pelo backend para
          // cases.user_id (CanonicalMapper.domainToRow). Ausente ⇒ caso anônimo.
          userId: user?.id,
          userNome: user?.name || leadName,
          userEmail: user?.email,
          status: 'analisado',
          currentStage: 2,
          analysis: caseAnalysis,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setSavedCaseId(data.id);
        // FIX 2: caso persistido no servidor → invalida cache de casos
        // (dashboard/listagem refetcham imediatamente).
        emitCasesChanged();
      }
      // Se o backend retornou análise com successRate > 0, usar a do backend
      if (data.analysis && data.analysis.overallSuccessRate > 0) {
        setCaseAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error saving case:', err);
    }
    setStep(7); // Exibir resultado do diagnóstico gratuito
  };

  const handleProceedToDocumentGeneration = () => {
    // Check if user is already authenticated
    if (isAuthenticated && user) {
      setDocumentData((prev) => ({
        ...prev,
        applicantName: user.name || prev.applicantName,
        applicantEmail: user.email || prev.applicantEmail,
        applicantPhone: user.phone || leadPhone || prev.applicantPhone,
        applicantCpf: user.cpf || prev.applicantCpf,
      }));
      setStep(8); // Início da Fase 2 (Qualificação)
    } else {
      // Persist wizard state before opening auth gate
      saveWizardState({
        step: 7,
        leadName,
        leadPhone,
        situation,
        processStage,
        infractionCategory,
        vehicleData,
        infractionData,
        caseAnalysis,
        documentData,
        savedCaseId,
      });
      setAuthGateRedirectAction('generation');
      setIsAuthGateOpen(true);
    }
  };

  const handleSaveToDashboard = () => {
    if (isAuthenticated && user) {
      navigate('/dashboard');
    } else {
      // Persist wizard state before opening auth gate
      saveWizardState({
        step: 7,
        leadName,
        leadPhone,
        situation,
        processStage,
        infractionCategory,
        vehicleData,
        infractionData,
        caseAnalysis,
        documentData,
        savedCaseId,
      });
      setAuthGateRedirectAction('dashboard');
      setIsAuthGateOpen(true);
    }
  };

  const handleAuthSuccess = async (authUser: any) => {
    setIsAuthGateOpen(false);
    clearWizardState(); // Auth succeeded, no need to restore anymore

    // Update document data with verified user data
    setDocumentData((prev) => ({
      ...prev,
      applicantName: authUser.name || leadName || prev.applicantName,
      applicantEmail: authUser.email || prev.applicantEmail,
      applicantPhone: authUser.phone || leadPhone || prev.applicantPhone,
      applicantCpf: authUser.cpf || prev.applicantCpf,
    }));

    // If case was already saved on backend, link it to the user
    if (savedCaseId) {
      try {
        await authFetch('/api/cases/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: savedCaseId,
            claimToken: savedCaseId,
            userId: authUser.id,
            userEmail: authUser.email,
            userNome: authUser.name,
          }),
        });
        // FIX 2: vinculação caso↔usuário altera a lista canônica → invalida cache.
        emitCasesChanged();
      } catch (err) {
        console.error('Error claiming case for user:', err);
      }
    }

    if (authGateRedirectAction === 'dashboard') {
      navigate('/dashboard');
    } else {
      setStep(8); // Advance directly to Qualification and Document Generation
    }
  };

  const handlePaymentSuccess = (finalCase: CaseDomain) => {
    if (onCaseReadyForCheckout) {
      onCaseReadyForCheckout(finalCase);
      return;
    }
    // FIX pós-pagamento: o caso retornado tem `currentStage=3` + `defenseDraft`
    // pronto, mas o estado global `cases` do App.tsx ainda contém a versão
    // antiga (currentStage=2) carregada em `loadCases()` antes do pagamento.
    // Sem emitir o evento, o `CaseDetailView` recebe um `currentCase`
    // obsoleto via prop e cai na Etapa 2 (Teses CTB) em vez da Etapa 3
    // (Minuta A4). `emitCasesChanged` dispara `loadCases()` no App.tsx,
    // sincronizando `cases` + `activeCase` antes do navigate.
    emitCasesChanged();
    navigate(`/cases/${finalCase.id}`);
  };

  const getStepHeaderLabel = () => {
    switch (step) {
      case 1:
        return '1. Situação que deseja resolver';
      case 2:
        return '2. Fase do Processo';
      case 3:
        return `${displayStepNumber}. Tipo da Infração`;
      case 4:
        return `${displayStepNumber}. Identificação da Autuação & Veículo`;
      case 5:
        return `${displayStepNumber}. Perguntas Específicas do Seu Caso`;
      case 6:
        return `${displayStepNumber}. Processando Análise Jurídica`;
      case 7:
        return `${displayStepNumber}. Diagnóstico Preliminar Concluído`;
      case 8:
        return `${displayStepNumber}. Qualificação do Requerente para a Peça`;
      case 9:
        return `${displayStepNumber}. Revisão da Petição Formal`;
      case 10:
        return `${displayStepNumber}. Emissão & Pagamento Seguro`;
      default:
        return `Etapa ${displayStepNumber} de ${totalDisplaySteps}`;
    }
  };

  return (
    <div ref={wizardTopRef} className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Phase Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs tracking-wider shadow-2xs ${
              isPhase1 ? 'bg-[#155BCB] text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isPhase1 ? 'F1' : 'F2'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-600">
                {isPhase1 ? 'Fase 1 • Diagnóstico Preliminar' : 'Fase 2 • Petição Formal'}
              </span>
              <span className="text-slate-300">•</span>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                  isPhase1
                    ? 'bg-blue-50 text-[#155BCB] border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isPhase1 ? '100% Gratuito' : 'Minuta Jurídica Oficial'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
              {getStepHeaderLabel()}
            </h2>
          </div>
        </div>

        {/* Dynamic mini progress tracker reflecting real active steps */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {activeSteps.map((s, idx) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-7 bg-[#155BCB]'
                  : idx < currentStepIndex
                  ? 'w-2.5 bg-emerald-600'
                  : 'w-2.5 bg-slate-200'
              }`}
              title={`Etapa ${idx + 1} de ${totalDisplaySteps}`}
            />
          ))}
        </div>
      </div>

      {/* Dynamic Step Router */}
      {step === 1 && (
        <ServiceStep
          selectedSituation={situation}
          onSelectSituation={handleSituationSelect}
        />
      )}

      {step === 2 && (
        <DefenseStageStep
          selectedStage={processStage}
          onSelectStage={handleStageSelect}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <InfractionCategoryStep
          selectedCategory={infractionCategory}
          onSelectCategory={handleCategorySelect}
          onNext={() => setStep(4)}
          onBack={() => {
            if (skipsStageStep) {
              setStep(1);
            } else {
              setStep(2);
            }
          }}
          isAdmin={effectiveIsAdmin}
        />
      )}

      {step === 4 && (
        <InfractionIdentificationStep
          infractionData={infractionData}
          vehicleData={vehicleData}
          leadName={leadName}
          leadPhone={leadPhone}
          category={infractionCategory}
          onUpdateInfraction={setInfractionData}
          onUpdateVehicle={setVehicleData}
          onUpdateLead={handleLeadUpdate}
          onNext={() => setStep(5)}
          onBack={() => {
            if (skipsCategoryStep) {
              if (skipsStageStep) {
                setStep(1);
              } else {
                setStep(2);
              }
            } else {
              setStep(3);
            }
          }}
          isAdmin={effectiveIsAdmin}
        />
      )}

      {step === 5 && (
        <SpecificInfractionDataStep
          category={infractionCategory}
          infractionData={infractionData}
          onUpdateInfraction={setInfractionData}
          onNext={handleRunAnalysis}
          onBack={() => setStep(4)}
          onChangeCategory={() => setStep(3)}
          isAdmin={effectiveIsAdmin}
        />
      )}

      {step === 6 && (
        <AnalysisProcessingStep 
          infractionData={infractionData}
          onComplete={handleAnalysisCompleted} 
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {step === 7 && (
        <FreeAnalysisResultStep
          analysis={caseAnalysis}
          infractionData={infractionData}
          vehicleData={vehicleData}
          serviceType={mappedProcedure}
          leadName={leadName}
          leadPhone={leadPhone}
          onProceedToDocumentGeneration={handleProceedToDocumentGeneration}
          onSaveToDashboard={handleSaveToDashboard}
        />
      )}

      {step === 8 && (
        <RequiredDataStep
          documentData={documentData}
          infractionData={infractionData}
          vehicleData={vehicleData}
          onUpdateDocumentData={setDocumentData}
          onNext={() => setStep(9)}
          onBack={() => setStep(7)}
          isAdmin={effectiveIsAdmin}
        />
      )}

      {step === 9 && (
        <DocumentReviewStep
          documentData={documentData}
          infractionData={infractionData}
          vehicleData={vehicleData}
          analysis={caseAnalysis}
          serviceType={mappedProcedure}
          onEditQualification={() => setStep(8)}
          onProceedToPayment={() => setStep(10)}
          onBack={() => setStep(8)}
        />
      )}

      {step === 10 && (
        <DocumentCheckoutStep
          currentCaseId={savedCaseId}
          documentData={documentData}
          infractionData={infractionData}
          vehicleData={vehicleData}
          analysis={caseAnalysis}
          serviceType={mappedProcedure}
          isAdmin={effectiveIsAdmin}
          userId={user?.id}
          onPaymentSuccess={handlePaymentSuccess}
          onBack={() => setStep(9)}
        />
      )}

      {/* Smart Account Gate Modal for Visitors */}
      {isAuthGateOpen && (
        <AccountVerificationGate
          leadName={leadName}
          leadPhone={leadPhone}
          infractionData={infractionData}
          vehicleData={vehicleData}
          analysis={caseAnalysis}
          onSuccess={handleAuthSuccess}
          onCancel={() => setIsAuthGateOpen(false)}
        />
      )}
    </div>
  );
};
