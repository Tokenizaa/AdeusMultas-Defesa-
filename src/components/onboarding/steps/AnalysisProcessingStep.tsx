import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Scale,
  Zap,
  FileSearch,
  ArrowLeft
} from 'lucide-react';
import { InfractionData, CaseAnalysis } from '../../../types';
import { ExpertRuleEngine } from '../../../core/rules/rule-engine';

const ANALYSIS_STAGES = [
  { label: 'Conferindo os dados que você enviou', duration: 700 },
  { label: 'Checando a infração na legislação de trânsito', duration: 800 },
  { label: 'Verificando prazos e equipamento de medição', duration: 800 },
  { label: 'Conferindo as leis que mudaram nos últimos anos', duration: 700 },
  { label: 'Montando o seu diagnóstico', duration: 700 },
  { label: 'Diagnóstico pronto', duration: 500 },
];

interface AnalysisProcessingStepProps {
  infractionData: InfractionData;
  onComplete: () => void;
  onAnalysisComplete: (analysis: CaseAnalysis) => void;
  onBack: () => void;
}

export const AnalysisProcessingStep: React.FC<AnalysisProcessingStepProps> = ({ 
  infractionData, 
  onComplete, 
  onAnalysisComplete,
  onBack
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<CaseAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Executar ExpertRuleEngine quando o componente montar
  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      // Enriquecer infractionData com TODOS os campos que o ExpertRuleEngine espera
      // CRÍTICO: notificationExpeditionDate e defenseDeadline são necessários para
      // RULE_DECADENCIA_30_DIAS e para cálculo de prazos processuais
      const enrichedData: InfractionData = {
        ...infractionData,
        // notificationExpeditionDate: data de expedição da Notificação de Autuação
        // Obrigatório para verificação de decadência (Art. 281, II CTB)
        notificationExpeditionDate: infractionData.notificationExpeditionDate,
        // defenseDeadline: prazo final para defesa informado na notificação
        defenseDeadline: infractionData.defenseDeadline,
        // hasPreviousInfractionsLast12Months: coletado no onboarding (SpecificInfractionDataStep)
        // Se undefined, a regra de advertência NÃO dispara (conservador)
        hasPreviousInfractionsLast12Months: infractionData.hasPreviousInfractionsLast12Months ?? undefined,
        // hasR19SignageProof: coletado no onboarding (SpecificInfractionDataStep para radar)
        // Se undefined, a regra de sinalização R-19 dispara como "possível inconsistência"
        hasR19SignageProof: infractionData.hasR19SignageProof ?? undefined,
      };
      
      const result = ExpertRuleEngine.evaluate(`temp_${Date.now()}`, enrichedData);
      setAnalysisResult(result);
    } catch (err) {
      console.error('ExpertRuleEngine evaluation failed:', err);
      setAnalysisError('Não foi possível concluir a análise com os dados atuais. Seus dados foram preservados; volte às perguntas para revisar as informações e tente novamente.');
    }
  }, [infractionData]);


  useEffect(() => {
    // Nunca avançar para o resultado se a avaliação falhou ou não produziu análise.
    if (analysisError || !analysisResult) return;

    let timer: NodeJS.Timeout;
    if (currentStageIndex < ANALYSIS_STAGES.length - 1) {
      timer = setTimeout(() => {
        setCurrentStageIndex((prev) => prev + 1);
      }, ANALYSIS_STAGES[currentStageIndex].duration);
    } else {
      timer = setTimeout(() => {
        onAnalysisComplete(analysisResult);
        onComplete();
      }, ANALYSIS_STAGES[currentStageIndex].duration);
    }

    return () => clearTimeout(timer);
  }, [currentStageIndex, analysisResult, analysisError, onComplete, onAnalysisComplete]);

  const progressPercentage = Math.round(((currentStageIndex + 1) / ANALYSIS_STAGES.length) * 100);

  if (analysisError) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-2xs sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <FileSearch className="h-8 w-8" />
        </div>
        <div role="alert" aria-live="assertive" className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">A análise não foi concluída</h2>
          <p className="text-sm leading-relaxed text-slate-600">{analysisError}</p>
        </div>
        <button type="button" id="btn-back-from-analysis-error" onClick={onBack} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#155BCB] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          <ArrowLeft className="h-4 w-4" />Voltar e revisar os dados
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-2xs text-center space-y-6 max-w-2xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-2xs animate-pulse">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 font-mono">
          Análise em andamento
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Estamos conferindo a sua autuação
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Cada verificação é feita por regras fixas do Código de Trânsito e das normas do CONTRAN, com o texto da lei ao lado de cada resultado.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 max-w-md mx-auto">
        <div className="flex justify-between text-[11px] font-mono text-slate-500">
          <span>Progresso da Análise</span>
          <span className="font-bold text-orange-600">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-orange-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stage Checklist */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 max-w-md mx-auto text-xs">
        {ANALYSIS_STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div
              key={idx}
              className={`flex items-center gap-2.5 transition-all ${
                isDone
                  ? 'text-emerald-700 font-medium'
                  : isCurrent
                  ? 'text-slate-900 font-bold'
                  : 'text-slate-400'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <div className="w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
              )}
              <span className="text-[11px] leading-snug">{stage.label}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        id="btn-back-from-analysis-processing"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar às perguntas
      </button>
    </div>
  );
};
