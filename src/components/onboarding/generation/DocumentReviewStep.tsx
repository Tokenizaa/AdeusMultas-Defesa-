import React from 'react';
import {
  FileText,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Edit3,
  Scale,
  Car
} from 'lucide-react';
import { CaseDocumentData, InfractionData, VehicleData, CaseAnalysis, ProcedureType } from '../../../types';

interface DocumentReviewStepProps {
  documentData: CaseDocumentData;
  infractionData: InfractionData;
  vehicleData: VehicleData;
  analysis: CaseAnalysis;
  serviceType: ProcedureType;
  onEditQualification: () => void;
  onProceedToPayment: () => void;
  onBack: () => void;
}

export const DocumentReviewStep: React.FC<DocumentReviewStepProps> = ({
  documentData,
  infractionData,
  vehicleData,
  analysis,
  serviceType,
  onEditQualification,
  onProceedToPayment,
  onBack,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-6">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 font-mono">
          <Sparkles className="w-3 h-3 text-orange-500" />
          Fase 2 — Revisão Separada da Peça Jurídica
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Revisão dos Dados da Petição
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">
          Confira como seus dados foram organizados para a geração da minuta formal perante o órgão autuador.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 1: Dados da Análise Jurídica */}
        <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-xs text-slate-900 font-mono uppercase">
                1. Fundamentação & Dados da Autuação
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
              {analysis?.overallSuccessRate != null ? `${analysis.overallSuccessRate}%` : 'Análise pendente'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Auto de Infração (AIT):</span>
              <span className="font-mono font-bold text-slate-900">{infractionData.aitNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Código & Enquadramento:</span>
              <span className="font-medium text-slate-900">{infractionData.infractionCode} — {infractionData.ctbArticle}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Órgão Destinatário:</span>
              <span className="font-medium text-slate-900">{infractionData.autuadorBody}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Placa do Veículo:</span>
              <span className="font-mono font-bold text-slate-900">{vehicleData.plate}</span>
            </div>
            <div className="pt-1">
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Teses Inclusas na Peça:
              </span>
              <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                {analysis?.recommendedArguments?.slice(0, 3).map((arg, i) => (
                  <li key={i} className="truncate">{arg.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Dados de Qualificação do Requerente */}
        <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              <h3 className="font-bold text-xs text-slate-900 font-mono uppercase">
                2. Qualificação do Requerente
              </h3>
            </div>
            <button
              onClick={onEditQualification}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" /> Alterar
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Nome:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{documentData.applicantName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">CPF:</span>
              <span className="font-mono text-slate-900">{documentData.applicantCpf}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Registro CNH:</span>
              <span className="font-mono text-slate-900">{documentData.applicantCnh} (Cat. {documentData.cnhCategory || 'B'})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">E-mail:</span>
              <span className="text-slate-900 truncate max-w-[200px]">{documentData.applicantEmail}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Endereço de Domicílio:</span>
              <span className="text-slate-900 truncate max-w-[200px] text-right">
                {documentData.addressStreet}, {documentData.addressNumber} — {documentData.addressCityState}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Guarantee & Standard Badge */}
      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="leading-snug">
          <span className="font-bold">Padrão Técnico A4 Diagramado:</span> A peça jurídica gerada inclui qualificação formal, endereçamento correto à Autoridade/JARI, narrativa dos fatos, fundamentação no CTB/Resoluções do CONTRAN, pedidos de nulidade/efeito suspensivo e espaço para assinatura.
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-2 flex justify-between items-center border-t border-slate-100">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Editar Qualificação</span>
        </button>

        <button
          id="btn-proceed-to-checkout"
          onClick={onProceedToPayment}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-orange-200"
        >
          <span>Avançar para Pagamento Seguro</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
