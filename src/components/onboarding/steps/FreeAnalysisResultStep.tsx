import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Calendar,
  Scale,
  Download,
  Check,
  Database,
  RefreshCw,
  ExternalLink,
  Phone,
  User,
  BarChart2
} from 'lucide-react';
import { CaseAnalysis, InfractionData, VehicleData, ProcedureType } from '../../../types';

// FUNÇÃO AUXILIAR: Formata explicações jurídicas no estilo GOV.BR
const formatLegalPointGovBr = (arg: any, caseData: { infraction: InfractionData; vehicle: VehicleData }) => {
  // Mapeia argumentos para explicações no estilo GOV.BR (focadas no usuário)
  const govBrExplanations: Record<string, {
    title: string;
    lawExplanation: string;
    evidenceCheck: (data: any) => string;
    userImpact: string;
    confidenceBase: string;
  }> = {
    'ARG-001': {
      title: 'Validação do radar que mediu sua velocidade',
      lawExplanation: 'Segundo a Resolução CONTRAN nº 798/2020, Art. 4º, III, todo equipamento de medição de velocidade deve passar por verificação anual obrigatória no INMETRO ou IPEM delegado. Sem laudo válido (máximo 12 meses na data da infração), a medição perde fé pública.',
      evidenceCheck: (data) => {
        if (data.infraction.radarCalibrationDate) {
          const calibDate = new Date(data.infraction.radarCalibrationDate);
          const infDate = new Date(data.infraction.dateTime);
          const diffMonths = (infDate.getTime() - calibDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          return diffMonths > 12 
            ? `Última averificação há ${Math.round(diffMonths)} meses (fora da validade de 12 meses)`
            : `Última averificação há ${Math.round(diffMonths)} meses (dentro da validade)`;
        }
        return 'Não há registro de data de averificação disponível para validação';
      },
      userImpact: 'Se confirmado que o radar estava com calibração vencida, este é fundamento sólido para solicitar anulação da multa',
      confidenceBase: 'Res. CONTRAN 798/2020'
    },
    'ARG-051': {
      title: 'Direito à advertência por escrito (Art. 267 do CTB)',
      lawExplanation: 'A Lei nº 14.071/2020 alterou o Art. 267 do CTB para determinar que, quando a infração é leve ou média e o condutor não cometeu infrações nos últimos 12 meses, a autoridade é OBRIGADA a converter a multa em advertência por escrito, sem pagamento nem pontos na CNH.',
      evidenceCheck: (data) => {
        const infractionCode = data.infraction.infractionCode;
        // Simplificação para demonstração - na prática usaria o catálogo completo
        const isLightOrMedium = ['745-50', '735-80', '736-62', '735-80'].includes(infractionCode); 
        const hasRecentInfractions = data.infraction.hasPreviousInfractionsLast12Months === true;
        
        if (!isLightOrMedium) return 'Infração classificada como grave/gravíssima (não se aplica Art. 267)';
        if (hasRecentInfractions) return 'Constam infrações nos últimos 12 meses (não se aplica Art. 267)';
        return 'Infração leve/média constatada e não há infrações recentes nos últimos 12 meses';
      },
      userImpact: 'Você tem DIREITO SUBJETIVO de converter esta multa em advertência por escrito - não pagará valor e não perderá pontos na CNH',
      confidenceBase: 'Lei 14.071/2020, art. 267 do CTB'
    },
    'ARG-002': {
      title: 'Sinalização de velocidade adequada no local',
      lawExplanation: 'O Art. 90, caput e §1º do CTB estabelece que nenhuma sanção pode ser aplicada por inobservância de sinalização quando esta for insuficiente, incorreta ou ausente. Para validade da medição por radar, é obrigatória placa R-19 visível na distância técnica mínima (Res. CONTRAN 798/2020).',
      evidenceCheck: (data) => {
        if (data.infraction.hasR19SignageProof === false) return 'Ausência de comprovação de sinalização regulatória nos documentos';
        if (data.infraction.hasR19SignageProof === true) return 'Comprovação de sinalização regulatória presente nos documentos';
        return 'Não há comprovação fotográfica de sinalização regulatória disponível';
      },
      userImpact: 'Se constatada ausência ou inadequação da sinalização, isso pode invalidar a medição de velocidade como prova da infração',
      confidenceBase: 'Art. 90 do CTB, Res. CONTRAN 798/2020'
    }
  };

  const explanation = govBrExplanations[arg.id] || {
    title: arg.title,
    lawExplanation: `${arg.legalBase} ${arg.contraranResolution ? `(c/c ${arg.contraranResolution})` : ''}`,
    evidenceCheck: () => 'Verificação específica não configurada para este argumento',
    userImpact: arg.summary,
    confidenceBase: 'Base jurídica padrão'
  };

  // Calcula nível de confiança baseado na evidência disponível
  const evidenceResult = explanation.evidenceCheck({
    infraction: caseData.infraction,
    vehicle: caseData.vehicle
  });
   
  let confidenceLevel: 'Baixo' | 'Médio' | 'Alto' | 'Muito Alto' = 'Médio';
  let confidenceReason = '';
   
  // Lógica de confiança baseada na qualidade da evidência
  if (explanation.confidenceBase.includes('Lei') && 
      (evidenceResult.includes('constatada') || evidenceResult.includes('fora da validade'))) {
    confidenceLevel = 'Muito Alto';
    confidenceReason = 'Baseado em lei com alteração recente que tornou o direito obrigatório';
  } else if (explanation.confidenceBase.includes('Res.') && 
             (evidenceResult.includes('fora da validade') || evidenceResult.includes('dentro da validade'))) {
    confidenceLevel = 'Alto';
    confidenceReason = 'Baseado em resolução técnica com prazo claro e objetivo';
  } else if (evidenceResult.includes('Não há registro') || 
             evidenceResult.includes('Não há comprovação') ||
             evidenceResult.includes('ausência de')) {
    confidenceLevel = 'Médio';
    confidenceReason = 'Baseado em ausência de comprovação disponível nos dados fornecidos';
  } else {
    confidenceLevel = 'Baixo';
    confidenceReason = 'Evidência insuficiente para conclusão definitiva';
  }

  return {
    ...explanation,
    evidenceResult,
    confidenceLevel,
    confidenceReason
  };
};

interface FreeAnalysisResultStepProps {
  analysis: CaseAnalysis;
  infractionData: InfractionData;
  vehicleData: VehicleData;
  serviceType: ProcedureType;
  leadName?: string;
  leadPhone?: string;
  onProceedToDocumentGeneration: () => void;
  onSaveToDashboard: () => void;
}

export const FreeAnalysisResultStep: React.FC<FreeAnalysisResultStepProps> = ({
  analysis,
  infractionData,
  vehicleData,
  serviceType,
  leadName = '',
  leadPhone = '',
  onProceedToDocumentGeneration,
  onSaveToDashboard,
}) => {
  const successRate = analysis?.overallSuccessRate ?? 0;
  const isHighProbability = successRate >= 80;
  
  // Calcula pontos de defesa personalizados (top 3 por relevância)
  const defensePoints = analysis?.recommendedArguments
    ?.map(arg => formatLegalPointGovBr(arg, { infraction: infractionData, vehicle: vehicleData }))
    ?.sort((a, b) => {
      // Ordena por: confiança (Muito Alto > Alto > Médio > Baixo) 
      const confidenceOrder: Record<string, number> = {
        'Muito Alto': 4,
        'Alto': 3,
        'Médio': 2,
        'Baixo': 1
      };
      return (confidenceOrder[b.confidenceLevel] || 0) - (confidenceOrder[a.confidenceLevel] || 0);
    })
    .slice(0, 3) // Mostra apenas os top 3 argumentos mais relevantes
    ?? [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações básicas */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Diagnóstico Jurídico Gratuito Concluído
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {leadName ? `Diagnóstico de ${leadName.split(' ')[0]}` : 'Resultado da Análise Preliminar'}
        </h1>
        <p className="text-base text-slate-500">
          Auto nº <span className="font-mono font-bold text-slate-800">{infractionData.aitNumber || 'N/A'}</span> • 
          Placa <span className="font-mono font-bold text-slate-800">{vehicleData.plate || 'N/A'}</span>
          {leadPhone && <span className="ml-2 text-slate-400 font-mono">• WhatsApp: {leadPhone}</span>}
        </p>
      </div>

      {/* Probabilidade de Êxito */}
      <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
        <div className="space-y-3">
          <span className="text-base font-bold text-emerald-800 uppercase font-mono block">
            Probabilidade de Êxito
          </span>
          <div className="text-4xl sm:text-5xl font-extrabold text-emerald-700 font-mono">
            {successRate}%
          </div>
          <span className="text-lg text-emerald-800 font-medium">
            Alto potencial de anulação
          </span>
        </div>
      </div>

      {/* Resumo informativo (3 colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <span className="text-base font-bold uppercase font-mono text-slate-400">Enquadramento</span>
          <p className="text-lg font-bold text-slate-900 truncate">{infractionData.ctbArticle || 'Art. 218 do CTB'}</p>
          <p className="text-base text-slate-500 font-mono">Cód. {infractionData.infractionCode || '745-50'}</p>
        </div>
        <div className="space-y-3">
          <span className="text-base font-bold uppercase font-mono text-slate-400">Órgão Julgador</span>
          <p className="text-lg font-bold text-slate-900 truncate">{infractionData.autuadorBody || 'DETRAN-SP'}</p>
          <p className="text-base text-slate-500">Instância: Defesa Administrativa</p>
        </div>
        <div className="space-y-3">
          <span className="text-base font-bold uppercase font-mono text-slate-400">Impacto Estimado</span>
          <p className="text-lg font-bold text-slate-900">R$ {infractionData.fineAmount?.toFixed(2) || '130,16'}</p>
          <p className="text-base text-amber-700 font-semibold">{infractionData.points || 4} Pontos na CNH</p>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: Análise jurídica personalizada */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileCheck2 className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-900 font-mono uppercase">
            Principais pontos verificados para sua defesa ({defensePoints?.length || 0})
            {analysis?.recommendedArguments?.length > 3 && (
              <span className="text-base text-slate-500 ml-2">
                (+{analysis.recommendedArguments.length - 3} outros pontos disponíveis na visualização completa)
              </span>
            )}
          </h3>
        </div>

        {defensePoints?.length > 0 ? (
          <div className="space-y-6">
            {defensePoints.map((point, idx) => (
              <div
                key={point.title || idx}
                className="p-6 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-5"
              >
                {/* Ícone e título */}
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-900">{point.title}</h4>
                    <p className="text-base text-slate-500 font-mono">{point.confidenceBase}</p>
                  </div>
                </div>

                {/* Explicação no estilo GOV.BR */}
                <div className="space-y-5">
                  {/* O que verificamos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <Clock className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">O que verificamos</span>
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed pl-6">{point.title}</p>
                  </div>

                  {/* O que a lei diz */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">O que a lei diz</span>
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed pl-6">{point.lawExplanation}</p>
                  </div>

                  {/* O que encontramos */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">O que encontramos nos seus dados</span>
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed pl-6">{point.evidenceResult}</p>
                  </div>

                  {/* O que isso significa */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">O que isso significa para você</span>
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed pl-6">{point.userImpact}</p>
                  </div>

                  {/* Nível de confiança */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                        <BarChart2 className="w-3 h-3" />
                      </div>
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Nível de confiança</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-bold ${
                        point.confidenceLevel === 'Muito Alto' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        point.confidenceLevel === 'Alto' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        point.confidenceLevel === 'Médio' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {point.confidenceLevel}
                      </span>
                      <span className="text-sm text-slate-500">{point.confidenceReason}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-lg text-slate-600 leading-relaxed">
              Nenhum vício formal ou tese de anulação foi identificado com base nas informações fornecidas. 
              Recomendamos reunir mais documentos ou consultar um advogado para uma análise mais detalhada.
            </p>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={onSaveToDashboard}
            className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-lg font-bold transition-colors cursor-pointer border border-slate-700"
          >
            Salvar e Ver no Painel
          </button>

          <button
            id="btn-proceed-to-document-generation"
            onClick={onProceedToDocumentGeneration}
            className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tight"
          >
            <span>Gerar Minha Defesa</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};