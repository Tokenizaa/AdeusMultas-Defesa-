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
import { INFRACTION_CATALOG } from '../../data/knowledge-base';
import {
  UserSituation,
  UserProcessStage,
  InfractionCategory,
  USER_SITUATIONS,
  USER_PROCESS_STAGES,
  RULES_MATRIX
} from '../../core/onboarding/rules-matrix';

// ============================================================================
// Wizard State Persistence (sessionStorage — metadata only)
// ============================================================================
// Never persist PII (CPF, RG, CNH, etc.), analysis results, or document
// qualification data in browser storage. Case data is persisted server-side.
// Form data (vehicle, infraction, lead name/phone) IS persisted to survive
// page reloads during onboarding — it's non-sensitive data the user typed.

const WIZARD_STORAGE_KEY = 'defesai_wizard_state';
const WIZARD_FORM_DATA_KEY = 'defesai_wizard_form_data';

// Código canônico inicial de cada categoria (catálogo INFRACTION_CATALOG).
// Só as categorias com código equivalente no catálogo têm default.
const CATEGORY_DEFAULT_CODE: Partial<Record<InfractionCategory, string>> = {
  excesso_velocidade: '745-50',
  lei_seca: '757-90',
  celular: '736-62',
  vermelho: '605-01',
  estacionamento: '545-21',
};

interface WizardPersistedState {
  step: number;
  savedCaseId?: string;
  savedClaimToken?: string;
  savedAt: number;
}

interface WizardFormDataState {
  infractionData: InfractionData;
  vehicleData: VehicleData;
  leadName: string;
  leadPhone: string;
  savedAt: number;
}

function loadWizardState(): WizardPersistedState | null {
  try {
    // Remove the legacy localStorage payload that could contain PII.
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardPersistedState;
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      return null;
    }
    if (typeof parsed.step !== 'number' || !Number.isFinite(parsed.step)) {
      sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      return null;
    }
    return { step: parsed.step, savedCaseId: parsed.savedCaseId, savedClaimToken: parsed.savedClaimToken, savedAt: parsed.savedAt };
  } catch {
    try { sessionStorage.removeItem(WIZARD_STORAGE_KEY); } catch { /* ignore */ }
    return null;
  }
}

function loadWizardFormData(): WizardFormDataState | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_FORM_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardFormDataState;
    // TTL 24h
    if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(WIZARD_FORM_DATA_KEY);
      return null;
    }
    return parsed;
  } catch {
    try { sessionStorage.removeItem(WIZARD_FORM_DATA_KEY); } catch { /* ignore */ }
    return null;
  }
}

function saveWizardState(state: Pick<WizardPersistedState, 'step' | 'savedCaseId' | 'savedClaimToken'>) {
  try {
    sessionStorage.setItem(
      WIZARD_STORAGE_KEY,
      JSON.stringify({ step: state.step, savedCaseId: state.savedCaseId, savedClaimToken: state.savedClaimToken, savedAt: Date.now() })
    );
  } catch { /* storage unavailable, ignore */ }
}

function saveWizardFormData(state: WizardFormDataState) {
  try {
    sessionStorage.setItem(
      WIZARD_FORM_DATA_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() })
    );
  } catch { /* sessionStorage unavailable, ignore */ }
  try {
    localStorage.setItem(
      'defesai_wizard_form_data_local_v1',
      JSON.stringify({ ...state, savedAt: Date.now() })
    );
  } catch { /* localStorage unavailable, ignore */ }
}

function clearWizardFormData() {
  try { sessionStorage.removeItem(WIZARD_FORM_DATA_KEY); } catch { /* ignore */ }
}

function clearWizardState() {
  try { sessionStorage.removeItem(WIZARD_STORAGE_KEY); } catch { /* ignore */ }
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
    const savedFormData = loadWizardFormData();

    // Wizard Step (1 to 6: Phase 1 Free Analysis, 7 to 9: Phase 2 Paid Document Generation)
    const [step, setStep] = useState<number>(savedState?.step ?? 1);
    const wizardTopRef = useRef<HTMLDivElement>(null);
    const stepContentRef = useRef<HTMLDivElement>(null);
    const stepAnnouncerRef = useRef<HTMLDivElement>(null);
    // Keep the selected procedure available synchronously for persistence.
    // The analysis step can finish before a state-derived closure is refreshed.
    const mappedProcedureRef = useRef<ProcedureType>('defesa_previa');

  // Lead Data (Collected in Step 3 for Visitor conversion)
  const [leadName, setLeadName] = useState<string>(savedFormData?.leadName ?? (user?.name || ''));
  const [leadPhone, setLeadPhone] = useState<string>(savedFormData?.leadPhone ?? (user?.phone || ''));
  const [isAuthGateOpen, setIsAuthGateOpen] = useState<boolean>(false);
  const [authGateRedirectAction, setAuthGateRedirectAction] = useState<'generation' | 'dashboard'>('generation');
  // Falha de persistência do caso: antes ficava só no console e o usuário
  // acreditava que o diagnóstico estava salvo.
  const [persistError, setPersistError] = useState<string | null>(null);

  // =========================================================================
  // FASE 1: DADOS DA ANÁLISE JURÍDICA (100% GRATUITA)
  // =========================================================================
  const [situation, setSituation] = useState<UserSituation>('multa_transito');
  const [processStage, setProcessStage] = useState<UserProcessStage>('primeira_notificacao');
  const [infractionCategory, setInfractionCategory] = useState<InfractionCategory>('excesso_velocidade');

  const [vehicleData, setVehicleData] = useState<VehicleData>(() => savedFormData?.vehicleData ?? {
    plate: '',
    brandModel: '',
    renavam: '',
    year: '',
    color: '',
  });

  const [infractionData, setInfractionData] = useState<InfractionData>(() => savedFormData?.infractionData ?? {
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

  const [caseAnalysis, setCaseAnalysis] = useState<CaseAnalysis>({
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
  const [documentData, setDocumentData] = useState<CaseDocumentData>({
    applicantName: user?.name || '',
    applicantCpf: user?.cpf || '',
    applicantRg: '',
    applicantCnh: user?.cnh || '',
    cnhCategory: '',
    applicantPhone: user?.phone || '',
    applicantEmail: user?.email || '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressNeighborhood: '',
    addressZipCode: '',
    addressCityState: user?.cityState || '',
    vehicleRenavam: '',
  });

  const [savedCaseId, setSavedCaseId] = useState<string | undefined>(savedState?.savedCaseId);
  // Token de claim gerado pelo servidor para casos anônimos — nunca o próprio ID.
  const [savedClaimToken, setSavedClaimToken] = useState<string | undefined>(savedState?.savedClaimToken);

  // Sincroniza o perfil quando a sessão termina de carregar ou quando o
  // usuário entra durante o onboarding. Só preenche campos vazios: dados que
  // o usuário já editou nesta peça nunca são sobrescritos silenciosamente.
  useEffect(() => {
    if (!user) return;
    setLeadName((prev) => prev || user.name || '');
    setLeadPhone((prev) => prev || user.phone || '');
    setDocumentData((prev) => ({
      ...prev,
      applicantName: prev.applicantName || user.name || '',
      applicantCpf: prev.applicantCpf || user.cpf || '',
      applicantCnh: prev.applicantCnh || user.cnh || '',
      applicantRg: prev.applicantRg || user.rg || '',
      cnhCategory: prev.cnhCategory || user.cnhCategory || '',
      applicantPhone: prev.applicantPhone || user.phone || '',
      applicantEmail: prev.applicantEmail || user.email || '',
      addressCityState: prev.addressCityState || user.cityState || '',
      addressStreet: prev.addressStreet || user.addressStreet || '',
      addressNumber: prev.addressNumber || user.addressNumber || '',
      addressComplement: prev.addressComplement || user.addressComplement || '',
      addressNeighborhood: prev.addressNeighborhood || user.addressNeighborhood || '',
      addressZipCode: prev.addressZipCode || user.addressZipCode || '',
    }));
  }, [user]);

  // Scroll to top of wizard on every step change and persist only non-sensitive metadata.
  useEffect(() => {
    wizardTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    saveWizardState({ step, savedCaseId, savedClaimToken });
  }, [step, savedCaseId, savedClaimToken]);

  // Persist form data (vehicle, infraction, lead) on every change — survives reload.
  useEffect(() => {
    saveWizardFormData({
      infractionData,
      vehicleData,
      leadName,
      leadPhone,
      savedAt: Date.now(),
    });
  }, [infractionData, vehicleData, leadName, leadPhone]);

  // Persist only navigation metadata immediately before page unload.
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveWizardState({ step, savedCaseId, savedClaimToken });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [step, savedCaseId, savedClaimToken]);

  // Focus management and step announcement for accessibility
  useEffect(() => {
    // Move focus to step content for keyboard/screen reader users
    stepContentRef.current?.focus();

    // Announce step change to screen readers
    const label = getStepHeaderLabel();
    if (stepAnnouncerRef.current) {
      stepAnnouncerRef.current.textContent = `Etapa ${step}: ${label}`;
    }
  }, [step]);

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
      : 'defesa_previa';

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

    if (sitDef?.mappedProcedure) {
      mappedProcedureRef.current = sitDef.mappedProcedure;
    }

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
    // Suspension and cassation are already specialized procedures selected in
    // step 1. Their generic phase question must not downgrade them to JARI.
    if (situation !== 'suspensao_cnh' && situation !== 'cassacao_cnh') {
      const stage = USER_PROCESS_STAGES.find((item) => item.id === selected);
      if (stage?.mappedProcedure) {
        mappedProcedureRef.current = stage.mappedProcedure;
      }
    }
    setStep(3); // Passo exclusivo de tipo/categoria da infração
  };

  const handleCategorySelect = (selected: InfractionCategory) => {
    setInfractionCategory(selected);

    // Pre-populate a partir do catálogo canônico: multa, pontos, artigo e
    // severidade são os do código realmente selecionado. Defaults escritos à
    // mão divergiam do catálogo (ex.: "lei_seca" com 0 pontos) e a tela os
    // exibia como se fossem dados do usuário.
    const defaultCode = CATEGORY_DEFAULT_CODE[selected];
    const item = defaultCode ? INFRACTION_CATALOG.find((x) => x.code === defaultCode) : undefined;
    if (!item) return;

    setInfractionData((prev) => ({
      ...prev,
      ctbArticle: prev.ctbArticle || item.article,
      infractionCode: prev.infractionCode || item.code,
      description: prev.description || item.description,
      severity: item.severity,
      fineAmount: item.fineAmount,
      points: item.points,
    }));
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
    // O resultado da análise não deve ficar bloqueado pela persistência
    // remota. Exiba a etapa 7 imediatamente; o salvamento continua abaixo e
    // atualiza savedCaseId quando concluir.
    setStep(7);
    setPersistError(null);
    try {
      const res = await authFetch(isAuthenticated ? '/api/cases' : '/api/cases/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Diagnóstico Auto ${infractionData.aitNumber || 'sem AIT'}`,
          serviceType: mappedProcedureRef.current,
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
      if (!res.ok) {
        throw new Error(`Falha ao salvar o diagnóstico (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (data.id) {
        setSavedCaseId(data.id);
        // Claim token gerado pelo servidor para casos anônimos (nunca o ID do caso).
        if (data.claimToken) {
          setSavedClaimToken(data.claimToken);
        }
        // FIX 2: caso persistido no servidor → invalida cache de casos
        // (dashboard/listagem refetcham imediatamente).
        emitCasesChanged();
      }
      // A análise do backend é a fonte canônica mesmo quando a taxa é 0.
      // O teste anterior descartava análises válidas sem teses elegíveis e
      // deixava o estado inicial da UI (0%) mascarar o payload persistido.
      if (data.analysis && typeof data.analysis === 'object') {
        setCaseAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error saving case:', err);
      // O diagnóstico já está na tela; só a gravação falhou. Dizer isso ao
      // usuário em vez de deixar o console esconder a falha.
      setPersistError(
        'Não foi possível salvar este diagnóstico agora. O resultado acima continua válido e você pode gerar a defesa; para guardar o caso no painel, tente novamente em alguns instantes.'
      );
    }
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
      saveWizardState({ step: 7, savedCaseId, savedClaimToken });
      setAuthGateRedirectAction('generation');
      setIsAuthGateOpen(true);
    }
  };

  const handleSaveToDashboard = () => {
    if (isAuthenticated && user) {
      navigate('/dashboard');
    } else {
      // Persist wizard state before opening auth gate
      saveWizardState({ step: 7, savedCaseId, savedClaimToken });
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
        await authFetch(`/api/cases/${encodeURIComponent(savedCaseId)}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            // Token server-side correspondente ao caso; identidade vem do JWT (nunca do body).
            claimToken: savedClaimToken,
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
            <span className="sr-only" aria-live="polite" aria-atomic="true" ref={stepAnnouncerRef}>
              Etapa {step}: {getStepHeaderLabel()}
            </span>
          </div>
        </div>

        {/* Dynamic mini progress tracker reflecting real active steps */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          {activeSteps.map((s, idx) => {
            // Determinar se esta etapa foi pulada para a situação atual
            const sitDef = USER_SITUATIONS.find((s) => s.id === situation);
            const stageSkipped = skipsStageStep && idx + 1 === 2; // Etapa 2 (fase) pulada
            const categorySkipped = skipsCategoryStep && idx + 1 === 3; // Etapa 3 (categoria) pulada
            const isSkipped = stageSkipped || categorySkipped;

            return (
              <div
                key={s}
                className={[
                  'h-2 rounded-full transition-all duration-300',
                  s === step
                    ? 'w-7 bg-[#155BCB]'
                    : isSkipped
                      ? 'w-2.5 bg-slate-400 text-slate-500 opacity-50'
                      : idx < currentStepIndex
                        ? 'w-2.5 bg-emerald-600'
                        : 'w-2.5 bg-slate-200',
                ].join(' ')}
                title={
                  isSkipped
                    ? `Etapa ${idx + 1} de ${totalDisplaySteps} (pulada)`
                    : `Etapa ${idx + 1} de ${totalDisplaySteps}`
                }
              />
            );
          })}
        </div>
      </div>

      {/* Dynamic Step Router */}
      <div ref={stepContentRef} tabIndex={-1} className="mt-6">
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
          onBack={() => setStep(5)}
        />
      )}

      {step === 7 && (
        <>
          {persistError && (
            <div role="alert" className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 leading-relaxed">
              {persistError}
            </div>
          )}
          <FreeAnalysisResultStep
            analysis={caseAnalysis}
            infractionData={infractionData}
            vehicleData={vehicleData}
            serviceType={mappedProcedure}
            leadName={leadName}
            leadPhone={leadPhone}
            onProceedToDocumentGeneration={handleProceedToDocumentGeneration}
            onSaveToDashboard={handleSaveToDashboard}
            onBack={() => setStep(5)}
          />
        </>
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
          serviceType={mappedProcedure}
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

      </div>

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
