import React, { useState, useEffect } from 'react';
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
import { INFRACTION_CATALOG } from '../../../data/knowledge-base';
import { calculateConsideredSpeed } from '../../../core/onboarding/rules-matrix';

// Códigos de infração de severidade leve/média (base do Art. 267 do CTB).
const MEDIA_OR_LIGHT_CODES = new Set(
  INFRACTION_CATALOG.filter((i) => i.severity === 'media' || i.severity === 'leve').map((i) => i.code)
);

// FUNÇÃO AUXILIAR: Formata explicações jurídicas no estilo GOV.BR
const formatLegalPointGovBr = (arg: any, caseData: { infraction: InfractionData; vehicle: VehicleData }) => {
  // Mapeia argumentos para explicações no estilo GOV.BR (focadas no usuário)
  const govBrExplanations: Record<string, {
    title: string;
    whatWeChecked: string;
    lawExplanation: string;
    evidenceCheck: (data: any) => string;
    userImpact: string;
    confidenceBase: string;
  }> = {
    'ARG-001': {
      title: 'O radar estava com a medição válida na data da infração?',
      whatWeChecked:
        'A data da última aferição do radar (feita pelo INMETRO ou pelo IPEM, o órgão que faz a vistoria) comparada com a data da sua infração. A regra é simples: o radar precisa ser vistoriado pelo menos uma vez por ano.',
      lawExplanation:
        'A Resolução CONTRAN nº 798/2020 (art. 4º, III) obriga todo medidor de velocidade a passar por essa vistoria oficial no máximo uma vez por ano. Sem ela em dia, o aparelho não tem valor de prova — e a multa que ele mediu pode ser cancelada.',
      evidenceCheck: (data) => {
        const calibrationDate = data.infraction.inmetroAferitionDate;
        if (calibrationDate) {
          const calibDate = new Date(calibrationDate);
          const infDate = new Date(data.infraction.dateTime);
          const diffMonths = (infDate.getTime() - calibDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          return diffMonths > 12
            ? `A última vistoria foi há ${Math.round(diffMonths)} meses — o radar estava com a medição VENCIDA na data da infração.`
            : `A última vistoria foi há ${Math.round(diffMonths)} meses — o radar estava com a medição EM_DIA na data da infração.`;
        }
        return 'SEM_DADOS: Não há registro da data da vistoria do radar, então este ponto ficou sem confirmação.';
      },
      userImpact:
        'Se o radar estava com a vistoria vencida, esse é um dos argumentos mais fortes do seu caso e pode levar ao cancelamento da multa. Dá para confirmar com a certidão do INMETRO, que é gratuita.',
      confidenceBase: 'Resolução CONTRAN nº 798/2020, art. 4º, III'
    },
    'ARG-051': {
      title: 'Dá para trocar esta multa por advertência (sem pagar e sem pontos)?',
      whatWeChecked:
        'A gravidade da sua infração (leve ou média) e se você tem alguma infração registrada nos últimos 12 meses.',
      lawExplanation:
        'Desde a Lei 14.071/2020, o art. 267 do CTB obriga o órgão de trânsito a converter em advertência por escrito toda multa leve ou média de quem não tem infração nos últimos 12 meses. Na advertência, não se paga nada e não entra ponto na CNH.',
      evidenceCheck: (data) => {
        const infractionCode = data.infraction.infractionCode;
        const isLightOrMedium = MEDIA_OR_LIGHT_CODES.has(infractionCode);
        const hasRecentInfractions = data.infraction.hasPreviousInfractionsLast12Months === true;

        if (!isLightOrMedium) return 'NAO_APLICA: Esta infração é grave ou gravíssima, então a conversão em advertência não se aplica ao seu caso.';
        if (hasRecentInfractions) return 'NAO_APLICA: Constam infrações nos últimos 12 meses, então a conversão em advertência não se aplica ao seu caso.';
        return 'ATENDIDO: A infração é leve ou média e não há infrações nos últimos 12 meses: os requisitos do art. 267 estão atendidos.';
      },
      userImpact:
        'Nesses casos a lei não deixa o órgão escolher: a multa vira advertência. Na prática, sem multa e sem pontuação — se o órgão confirmar a conversão e o prontuário estiver em dia. Se o órgão negar, é um pedido simples de fazer.',
      confidenceBase: 'Art. 267 do CTB (redação da Lei 14.071/2020)'
    },
    'ARG-002': {
      title: 'Existia placa de velocidade no local?',
      whatWeChecked:
        'Se há comprovação de que existia, no local, a placa de velocidade máxima (a placa circular com o número, código R-19) visível antes do radar — e se ela estava na distância correta.',
      lawExplanation:
        'O art. 90 do CTB diz que ninguém pode ser multado por desobedecer a uma placa que estava ausente, escondida ou mal posicionada. Para a fiscalização por radar, a Resolução CONTRAN nº 798/2020 exige a placa R-19 visível antes do radar.',
      evidenceCheck: (data) => {
        if (data.infraction.hasR19SignageProof === false) return 'AUSENCIA: Você informou que não há comprovação de placa de velocidade no local.';
        if (data.infraction.hasR19SignageProof === true) return 'PRESENTE: Há comprovação de placa de velocidade nos documentos que você enviou.';
        return 'SEM_DADOS: Não há foto da placa no local, então este ponto ficou sem confirmação.';
      },
      userImpact:
        'Se a placa não existia ou estava escondida, o órgão não pode exigir que você respeitasse um limite que não estava sinalizado — e isso pode cancelar a multa. É um dos pontos mais checados em caso de radar.',
      confidenceBase: 'Art. 90 do CTB e Resolução CONTRAN nº 798/2020'
    },
    'ARG-005': {
      title: 'A velocidade que foi cobrada está correta?',
      whatWeChecked:
        'Refizemos a conta da velocidade. O radar mede um valor "bruto", mas a multa tem que ser calculada sobre o valor já com a margem de erro do aparelho descontada (7 km/h, para medições até 100 km/h).',
      lawExplanation:
        'A Resolução CONTRAN nº 798/2020 (Anexo II) define a margem de erro admitida em cada faixa de velocidade. A multa só pode ser cobrada sobre a velocidade "considerada" — a velocidade medida já com essa margem descontada. Se o órgão fez a conta com o valor errado, a infração pode mudar de faixa ou nem existir.',
      evidenceCheck: (data) => {
        const measured = Number(data.infraction.measuredSpeed ?? data.infraction.speedMeasured);
        const considered = Number(data.infraction.consideredSpeed ?? data.infraction.speedConsidered);
        const limit = Number(data.infraction.speedLimit);
        if (![measured, considered, limit].every(Number.isFinite)) {
          return 'SEM_DADOS: Faltam os números de velocidade para refazer a conta.';
        }
        const expected = calculateConsideredSpeed(measured);
        const deduction = Math.round((measured - expected) * 10) / 10;
        const delta = Math.abs(expected - considered);
        return delta <= 1
          ? `VALIDADO: A conta fecha: ${measured} km/h medidos − ${deduction} km/h de margem de erro = ${considered} km/h considerados (limite de ${limit} km/h).`
          : `DIVERGENCIA: A conta não fecha: com ${measured} km/h medidos e margem de ${deduction} km/h, o esperado seria ${expected} km/h, mas o auto registra ${considered} km/h.`;
      },
      userImpact:
        'Se o número não fecha, existe chance de a multa cair numa faixa mais barata — ou de não existir. Como é só aritmética, dá para conferir e mostrar o resultado na peça sem depender de nenhum documento.',
      confidenceBase: 'Resolução CONTRAN nº 798/2020, Anexo II'
    }
  };

  const explanation = govBrExplanations[arg.id] || {
    title: arg.title,
    whatWeChecked:
      'Conferimos este ponto nos dados que você enviou.',
    lawExplanation:
      'Em poucas palavras: a lei estabelece este direito ou obrigação. Referência: ' + arg.legalBase,
    evidenceCheck: () =>
      'Não deu para confirmar este ponto com os dados que você enviou. Ele pode ser verificado no processo administrativo — no painel, em Documentos do órgão.',
    userImpact:
      'O que isso significa para você: se este ponto for confirmado, pode ajudar na sua defesa. Próximo passo: confira se tem o documento original no painel.',
    confidenceBase: arg.legalBase
  };

  // Calcula nível de confiança baseado na evidência disponível
  const evidenceResult = explanation.evidenceCheck({
    infraction: caseData.infraction,
    vehicle: caseData.vehicle
  });
   
  let confidenceLevel: 'Baixo' | 'Médio' | 'Alto' | 'Muito Alto' = 'Médio';
  let confidenceReason = '';
   
  // Lógica de confiança baseada em prefixos estruturados do evidenceCheck
  // (não mais casar substring em português frágil)
  if (evidenceResult.startsWith('VENCIDO:') || evidenceResult.startsWith('ATENDIDO:')) {
    confidenceLevel = 'Muito Alto';
    confidenceReason = evidenceResult.startsWith('VENCIDO:')
      ? 'Baseado em resolução técnica: radar com vistoria vencida na data da infração'
      : 'Baseado em lei: requisitos do art. 267 CTB atendidos';
  } else if (evidenceResult.startsWith('EM_DIA:') || evidenceResult.startsWith('PRESENTE:') || evidenceResult.startsWith('VALIDADO:')) {
    confidenceLevel = 'Alto';
    confidenceReason = evidenceResult.startsWith('EM_DIA:')
      ? 'Baseado em resolução técnica: radar com vistoria em dia na data da infração'
      : evidenceResult.startsWith('PRESENTE:')
        ? 'Baseado em resolução técnica: placa de velocidade comprovada'
        : 'Baseado em resolução técnica: cálculo da velocidade validado';
  } else if (evidenceResult.startsWith('SEM_DADOS:') || evidenceResult.startsWith('AUSENCIA:')) {
    confidenceLevel = 'Médio';
    confidenceReason = evidenceResult.startsWith('SEM_DADOS:')
      ? 'Baseado em ausência de comprovação disponível nos dados fornecidos'
      : 'Baseado em declaração do condutor: ausência de placa de velocidade';
  } else if (evidenceResult.startsWith('NAO_APLICA:') || evidenceResult.startsWith('DIVERGENCIA:')) {
    confidenceLevel = 'Baixo';
    confidenceReason = evidenceResult.startsWith('NAO_APLICA:')
      ? 'Este ponto não se aplica à infração informada'
      : 'Há divergência entre o valor calculado e o valor do auto';
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
  onBack: () => void;
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
  onBack,
}) => {
  const successRate = analysis?.overallSuccessRate;
  const hasRecommendedArguments = analysis?.recommendedArguments && analysis.recommendedArguments.length > 0;
  const hasRecommendedArguments = analysis?.recommendedArguments && analysis.recommendedArguments.length > 0;
  const isRateUnavailable = successRate === null || !hasRecommendedArguments;
  const rateValue = isRateUnavailable ? 0 : successRate;
  const isHighProbability = !isRateUnavailable && rateValue >= 80 && hasRecommendedArguments;
  const dataCompleteness = analysis?.dataCompleteness;
  
  // Animated counter state
  const [displayedRate, setDisplayedRate] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Animate from 0 to successRate on mount (only if rate is available)
  useEffect(() => {
    if (isRateUnavailable) {
      setAnimationComplete(true);
      return;
    }
    let startTime: number;
    const duration = 1200;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedRate(Math.round(eased * rateValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayedRate(rateValue);
        setAnimationComplete(true);
      }
    };
    
    requestAnimationFrame(animate);
  }, [rateValue, isRateUnavailable]);
  
  const showImprovementMessage = !animationComplete || (!isRateUnavailable && rateValue < 75 && dataCompleteness && dataCompleteness.missingCriticalFields.length > 0);
  const isLowProbability = !isRateUnavailable && rateValue < 60 && hasRecommendedArguments;
  const isMediumProbability = !isRateUnavailable && rateValue >= 60 && rateValue < 80 && hasRecommendedArguments;
  
  // Calcula pontos de defesa personalizados (top 3 por relevância)
  const defensePoints = analysis?.recommendedArguments
    ?.map(arg => formatLegalPointGovBr(arg, { infraction: infractionData, vehicle: vehicleData }))
    ?.sort((a, b) => {
      const confidenceOrder: Record<string, number> = {
        'Muito Alto': 4,
        'Alto': 3,
        'Médio': 2,
        'Baixo': 1
      };
      return (confidenceOrder[b.confidenceLevel] || 0) - (confidenceOrder[a.confidenceLevel] || 0);
    })
    .slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho com informações básicas */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Diagnóstico concluído — grátis
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Resultado do seu diagnóstico
        </h1>
        <p className="text-base text-slate-500">
          Auto nº <span className="font-mono font-bold text-slate-800">{infractionData.aitNumber || 'N/A'}</span> • 
          Placa <span className="font-mono font-bold text-slate-800">{vehicleData.plate || 'N/A'}</span>
          {leadPhone && <span className="ml-2 text-slate-400 font-mono">• WhatsApp: {leadPhone}</span>}
        </p>
      </div>

      {/* Indicador de Força do Diagnóstico */}
      <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
        <div className="space-y-3">
          <span className="text-base font-bold text-emerald-800 uppercase font-mono block">
            {hasRecommendedArguments ? 'Força da sua defesa' : 'Sem teses detectadas'}
          </span>
          {hasRecommendedArguments ? (
            <div className="text-4xl sm:text-5xl font-extrabold font-mono">
              <span className="text-emerald-700">{displayedRate}%</span>
            </div>
          ) : (
            <span className="text-emerald-700">—</span>
          )}
          {!hasRecommendedArguments && (
            <p className="text-xs text-emerald-600 mt-1 max-w-md mx-auto">
              isRateUnavailable ? 'Análise em modo degradado — base jurídica indisponível' : 'null (sem teses detectadas)'
            </p>
          )}
          {hasRecommendedArguments && (
            <span className="text-lg font-medium">
              {defensePoints.length > 0 ? (
                isHighProbability
                  ? 'Vários pontos fortes no seu caso'
                  : isMediumProbability
                  ? 'Há pontos que valem a pena usar na defesa'
                  : 'Ainda falta comprovar alguns pontos'
              ) : (
                'Com os dados de hoje, não encontramos ponto forte'
              )}
            </span>
          )}
          </span>
          
          {/* Data completeness indicator */}
          {dataCompleteness && (
            <div className="mt-4 pt-4 border-t border-emerald-200 space-y-2">
              <div className="flex items-center justify-center gap-4 text-sm text-emerald-700">
                <span className="font-mono">Você preencheu {dataCompleteness.filledFields} de {dataCompleteness.totalFields} dados</span>
                <span className="px-2 py-1 bg-emerald-100 rounded-full font-mono">{dataCompleteness.ratio}%</span>
              </div>
              <div className="w-full max-w-xs mx-auto h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${dataCompleteness.ratio}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Improvement message when probability is low */}
          {showImprovementMessage && isLowProbability && dataCompleteness && dataCompleteness.missingCriticalFields.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Seu caso fica mais forte com mais {dataCompleteness.missingCriticalFields.length} dados</span>
              </div>
              <p className="text-sm text-amber-700 pl-7">
                Preencha o que falta para a análise ficar mais completa:
              </p>
              <ul className="text-sm text-amber-700 pl-7 space-y-1">
                {dataCompleteness.missingCriticalFields.slice(0, 4).map((field, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                    {field}
                  </li>
                ))}
                {dataCompleteness.missingCriticalFields.length > 4 && (
                  <li className="text-amber-600">+{dataCompleteness.missingCriticalFields.length - 4} outros dados relevantes</li>
                )}
              </ul>
              <p className="text-xs text-amber-600 pl-7 italic">
                Você pode voltar ao formulário e completar esses dados quando quiser — o diagnóstico é refeito na hora.
              </p>
            </div>
          )}
          
          {/* Success message when high probability */}
          {animationComplete && isHighProbability && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-emerald-800">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">Os dados que você enviou já permitem montar a defesa.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo informativo (3 colunas) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <span className="text-base font-bold uppercase font-mono text-slate-400">Tipo da Infração</span>
          <p className="text-lg font-bold text-slate-900 truncate">{infractionData.ctbArticle || 'não informado'}</p>
          <p className="text-base text-slate-500 font-mono">Cód. {infractionData.infractionCode || 'não informado'}</p>
        </div>
        <div className="space-y-3">
          <span className="text-base font-bold uppercase font-mono text-slate-400">Órgão que Aplicou a Multa</span>
          <p className="text-lg font-bold text-slate-900 truncate">{infractionData.autuadorBody || '— não informado —'}</p>
          <p className="text-base text-slate-500">Onde o caso é analisado: defesa administrativa (recurso por escrito ao DETRAN)</p>
        </div>
        <div className="space-y-3">
          <span className="text-base font-bold uppercase font-mono text-slate-400">Valor da Multa</span>
          <p className="text-lg font-bold text-slate-900">
            {infractionData.fineAmount
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(infractionData.fineAmount)
              : 'não informado'}
          </p>
          <p className="text-base text-amber-700 font-semibold">
            {infractionData.points === undefined
              ? 'pontos não informados'
              : `${infractionData.points} ${infractionData.points === 1 ? 'ponto' : 'pontos'} na CNH, se a multa for mantida`}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Quanto vale a multa e os pontos dependem da decisão do órgão.
          </p>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: Análise jurídica personalizada */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileCheck2 className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-900 font-mono uppercase">
            O que conferimos no seu caso ({defensePoints?.length || 0})
            {analysis?.recommendedArguments?.length > 3 && (
              <span className="text-base text-slate-500 ml-2">
                (+{analysis.recommendedArguments.length - 3} outros pontos — você vê todos ao salvar no painel)
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
                    <p className="text-base text-slate-700 leading-relaxed pl-6">{point.whatWeChecked}</p>
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
              Com os dados que você enviou, não encontramos problema na autuação. Isso não quer dizer que a multa está certa: se você tiver a notificação original, fotos do local ou prints, vale reenviar — a análise fica mais forte. Você pode protocolar a petição diretamente no órgão autuador.
            </p>
          </div>
        )}
      </div>

      {/* Próximos passos — a tela precisa dizer o que fazer */}
      <div className="p-5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
        <h3 className="text-base font-bold text-slate-900">O que fazer agora</h3>
        <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
          <li>Salve este diagnóstico no painel — ele fica guardado e você pode voltar a ele quando quiser.</li>
          <li>
            {infractionData.defenseDeadline
              ? `Seu prazo para apresentar a defesa termina em ${infractionData.defenseDeadline.split('T')[0]}. Protocolar antes garante o efeito suspensivo.`
              : 'Confira na notificação a data limite para apresentar a defesa — protocolo depois dessa data costuma esvaziar a defesa.'}
          </li>
          <li>
            {analysis?.recommendedArguments?.[0]
              ? `Para o ponto mais forte do seu caso ("${analysis.recommendedArguments[0].title}"), o documento que faz falta é: ${analysis.recommendedArguments[0].requiredDocuments?.[0] ?? 'a cópia da sua notificação de autuação'}.`
              : 'Separe a cópia da sua notificação de autuação — é o documento que o órgão vai pedir.'}
          </li>
        </ol>
        <p className="text-xs text-slate-500">
          A defesa é protocolada por escrito no DETRAN ou no órgão autuador indicado acima. Você não precisa ir a lugar nenhum: dá para fazer online.
        </p>
      </div>

      {/* Botões de ação */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            id="btn-back-to-edit-diagnosis"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Voltar e corrigir dados
          </button>
          <button
            onClick={onSaveToDashboard}
            className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-lg font-bold transition-colors cursor-pointer border border-slate-700"
          >
            Salvar no painel
          </button>

          <button
            id="btn-proceed-to-document-generation"
            onClick={onProceedToDocumentGeneration}
            className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-lg font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-3 cursor-pointer uppercase tracking-tight"
          >
            <span>Montar minha defesa</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
