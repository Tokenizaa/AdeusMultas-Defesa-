import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  Scale,
  Sparkles,
  Building2,
  Send,
  Calendar,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check,
  Edit3,
  ExternalLink,
  MessageSquare,
  History,
  Copy,
  ChevronRight,
  FileDown,
  Shield,
  CreditCard,
  User,
  Car,
  AlertTriangle,
  Terminal,
  RefreshCw,
  FileCheck,
  Zap,
  Eye,
} from 'lucide-react';
import { CaseDomain, JourneyStage, ProcedureType } from '../../types';
import { AUTUADOR_BODIES, PROCEDURE_TITLES } from '../../data/knowledge-base';
import { api } from '../../lib/api/client';

interface CaseDetailBaseProps {
  caseId?: string;
  currentCase?: CaseDomain;
  onUpdateCase?: (updated: CaseDomain) => void;
  onBackToList: () => void;
  onOpenWhatsAppModal?: (caseId: string) => void;
  variant: 'user' | 'admin';
  isLoading?: boolean;
}

interface CaseDetailBaseReturnValue {
  caseData: CaseDomain | null;
  isLoading: boolean;
  error: string | null;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  // User-specific states
  isEditingDraft?: boolean;
  setIsEditingDraft?: React.Dispatch<React.SetStateAction<boolean>>;
  editedDraftText?: string;
  setEditedDraftText?: React.Dispatch<React.SetStateAction<string>>;
  isRegenerating?: boolean;
  setIsRegenerating?: React.Dispatch<React.SetStateAction<boolean>>;
  copiedDraft?: boolean;
  setCopiedDraft?: React.Dispatch<React.SetStateAction<boolean>>;
  checkedDocuments?: Record<string, boolean>;
  setCheckedDocuments?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  // Admin-specific states
  isSimulatingPayment?: boolean;
  setIsSimulatingPayment?: React.Dispatch<React.SetStateAction<boolean>>;
  actionSuccess?: string | null;
  setActionSuccess?: React.Dispatch<React.SetStateAction<string | null>>;
  // Common handlers
  handleBackToList: () => void;
  handleOpenWhatsAppModal: (caseId: string) => void;
  handleUpdateCase: (updated: CaseDomain) => Promise<void>;
  handleSimulatePayment: (caseId: string) => Promise<void>;
}

export const CaseDetailBase: React.FC<CaseDetailBaseProps> = ({
  caseId,
  currentCase,
  onUpdateCase,
  onBackToList,
  onOpenWhatsAppModal,
  variant,
  isLoading: externalIsLoading,
}) => {
  const [caseData, setCaseData] = useState<CaseDomain | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize caseData and reset variant-specific states when currentCase or caseId changes
  useEffect(() => {
    // Determine what case data to use
    let newCaseData: CaseDomain | null = null;
    if (currentCase) {
      // Use the passed-in currentCase (prioritized over fetching)
      newCaseData = currentCase;
    } else if (caseId) {
      // We'll fetch this below if needed
      newCaseData = null;
    } else {
      // No case identifier provided
      newCaseData = null;
    }

    setCaseData(newCaseData);
    
    // Reset error state when case changes
    setError(null);
  }, [caseId, currentCase]);

  // Fetch case data if caseId is provided and we don't have currentCase
  useEffect(() => {
    if (caseId && !currentCase) {
      const fetchCaseDetails = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const data = await api.get<CaseDomain>(`/api/cases/${caseId}`);
          setCaseData(data);
        } catch (err: any) {
          console.error('Error fetching case:', err);
          setError(err.message || 'Erro ao carregar detalhes do caso.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchCaseDetails();
    }
  }, [caseId, currentCase]);

  // Set loading state based on external prop or internal fetching state
  useEffect(() => {
    if (externalIsLoading !== undefined) {
      setIsLoading(externalIsLoading);
    }
  }, [externalIsLoading]);

  // User-specific states - initialized based on caseData
  const [activeStage, setActiveStage] = useState<JourneyStage>(
    caseData?.currentStage || 3
  );
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false);
  const [editedDraftText, setEditedDraftText] = useState<string>(
    caseData?.defenseDraft?.fullDraftText || ''
  );
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [copiedDraft, setCopiedDraft] = useState<boolean>(false);
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, boolean>>({});

  // Reset user-specific states when caseData changes significantly
  useEffect(() => {
    if (caseData) {
      // Reset editing state when case changes
      setIsEditingDraft(false);
      setEditedDraftText(caseData.defenseDraft?.fullDraftText || '');
      setIsRegenerating(false);
      setCopiedDraft(false);
      
      // Reset checked documents to default values
      setCheckedDocuments({
        doc_cnh: true,
        doc_crlv: true,
        doc_notificacao: true,
        doc_comprovante_residencia: false,
        doc_procuracao: false,
      });
      
      // Reset active stage to case's current stage or default to 3
      setActiveStage(caseData.currentStage || 3);
    }
  }, [caseData]);

  // Admin-specific states
  const [activeTab, setActiveTab] = useState<
    'overview' | 'theses' | 'document' | 'payment' | 'logs'
  >('overview');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Common handlers
  const handleBackToList = () => {
    onBackToList();
  };

  const handleOpenWhatsAppModal = (caseId: string) => {
    if (onOpenWhatsAppModal) {
      onOpenWhatsAppModal(caseId);
    }
  };

  // User-specific handlers
  const handleUpdateCase = async (updated: CaseDomain) => {
    if (onUpdateCase) {
      await onUpdateCase(updated);
      setCaseData(updated);
    }
  };

  // Admin-specific handlers
  const handleSimulatePayment = async (caseId: string) => {
    try {
      setIsSimulatingPayment(true);
      setActionSuccess(null);
      // Refresh real case data and status from server
      const updatedCase = await api.get<CaseDomain>(`/api/cases/${caseId}`);
      setCaseData(updatedCase);
      setActionSuccess('success');
    } catch (err: any) {
      console.error('Error refreshing case data:', err);
      setActionSuccess('error');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // Return all necessary values and handlers
  return {
    caseData,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    // User-specific
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
    // Admin-specific
    isSimulatingPayment,
    setIsSimulatingPayment,
    actionSuccess,
    setActionSuccess,
    // Common handlers
    handleBackToList,
    handleOpenWhatsAppModal,
    handleUpdateCase,
    handleSimulatePayment,
  };
};