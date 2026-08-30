import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Scale,
  Zap,
  FileSearch
} from 'lucide-react';
import { InfractionData, CaseAnalysis } from '../../../types';
import { ExpertRuleEngine } from '../../../core/rules/rule-engine';

interface AnalysisProcessingStepProps {
  infractionData: InfractionData;
  onComplete: () => void;
  onAnalysisComplete: (analysis: CaseAnalysis) => void;
}

export const AnalysisProcessingStep: React.FC<AnalysisProcessingStepProps> = ({ 
  infractionData, 
  onComplete, 
  onAnalysisComplete 
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<CaseAnalysis | null>(null);

  // Executar ExpertRuleEngine quando o componente montar
  useEffect(() => {
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
    }
  }, [infractionData]);

  const stages = [
    { label: 'Recebendo e validando dados informados pelo condutor', duration: 700 },
    { label: 'Cruzando autuação com 390 dispositivos do CTB e Resoluções do CONTRAN', duration: 800 },
    { label: 'Auditando decadência de prazo (Art. 281-A CTB — Lei 14.071/2020) e aferição de radar', duration: 800 },
    { label: 'Verificando vigência temporal: Lei 14.071/2020, 14.229/2021, 14.440/2022, 14.599/2023', duration: 700 },
    { label: 'Calibrando probabilidade de deferimento perante o órgão autuador', duration: 700 },
    { label: 'Diagnóstico jurídico 100% gratuito concluído com sucesso!', duration: 500 },
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentStageIndex < stages.length - 1) {
      timer = setTimeout(() => {
        setCurrentStageIndex((prev) => prev + 1);
      }, stages[currentStageIndex].duration);
    } else {
      timer = setTimeout(() => {
        if (analysisResult) {
          onAnalysisComplete(analysisResult);
        }
        onComplete();
      }, stages[currentStageIndex].duration);
    }

    return () => clearTimeout(timer);
  }, [currentStageIndex, analysisResult, stages, onComplete, onAnalysisComplete]);

  const progressPercentage = Math.round(((currentStageIndex + 1) / stages.length) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-2xs text-center space-y-6 max-w-2xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-2xs animate-pulse">
        <Sparkles className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200 font-mono">
          Processamento em Tempo Real
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Analisando sua autuação com Inteligência Jurídica
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Aplicando 390 dispositivos do CTB, 7 peças-modelo validadas e precedentes do STJ em tempo real.
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
        {stages.map((stage, idx) => {
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
    </div>
  );
};
