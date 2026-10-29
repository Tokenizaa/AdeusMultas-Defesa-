import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Clock,
  ArrowRight,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { CaseAnalysis, InfractionData, VehicleData, ProcedureType } from '../../../types';
import { INFRACTION_CATALOG } from '../../../data/knowledge-base';
import { calculateConsideredSpeed } from '../../../core/onboarding/rules-matrix';

// Códigos de infração de severidade leve/média (base do Art. 267 do CTB).
const MEDIA_OR_LIGHT_CODES = new Set(
  INFRACTION_CATALOG.filter((i) => i.severity === 'media' || i.severity === 'leve').map((i) => i.code)
);

const ANALYSIS_FIELD_LABELS: Record<string, string> = {
  hasPreviousInfractionsLast12Months: 'histórico de infrações nos 12 meses anteriores',
  notificationExpeditionDate: 'data de expedição da notificação de autuação',
  notificationDeliveryDate: 'data de entrega da notificação',
  penaltyNotificationExpeditionDate: 'registro da Notificação de Imposição de Penalidade',
  defenseDeadline: 'prazo informado para defesa',
  inmetroAferitionDate: 'data da última aferição do radar',
  radarCalibrationDate: 'data da última aferição do radar',
  speedLimit: 'limite de velocidade da via',
  measuredSpeed: 'velocidade medida pelo equipamento',
  consideredSpeed: 'velocidade considerada na notificação',
  infractionDate: 'data da infração',
  infractionCode: 'código da infração',
  autuadorBody: 'órgão autuador',
};

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
    'ARG-048': {
      title: 'A notificação de autuação foi expedida dentro do prazo de 30 dias?',
      whatWeChecked:
        'Comparamos a data da infração com a data registrada para expedição da Notificação de Autuação. A confirmação depende do documento oficial e do histórico do órgão.',
      lawExplanation:
        'O art. 281, § 1º, II, do CTB prevê o arquivamento do auto quando a Notificação de Autuação não é expedida no prazo máximo de 30 dias. A data de expedição deve ser conferida na notificação e no histórico oficial; a data de recebimento, isoladamente, não substitui essa verificação.',
      evidenceCheck: (data) => {
        const infractionDate = data.infraction.dateTime;
        const expeditionDate = data.infraction.notificationExpeditionDate;
        if (!infractionDate || !expeditionDate) {
          return 'SEM_DADOS: Faltam a data da infração ou a data oficial de expedição da Notificação de Autuação para calcular o prazo.';
        }
        const infractionDay = new Date(`${String(infractionDate).slice(0, 10)}T00:00:00Z`);
        const expeditionDay = new Date(`${String(expeditionDate).slice(0, 10)}T00:00:00Z`);
        if (Number.isNaN(infractionDay.getTime()) || Number.isNaN(expeditionDay.getTime())) {
          return 'SEM_DADOS: Não foi possível interpretar as datas informadas. Confira os documentos oficiais.';
        }
        const diffDays = Math.round((expeditionDay.getTime() - infractionDay.getTime()) / 86400000);
        if (diffDays < 0) {
          return 'SEM_DADOS: A data de expedição aparece anterior à infração; confira se os dados foram preenchidos corretamente.';
        }
        return `As datas informadas indicam ${diffDays} dias entre a infração e a expedição registrada. ${diffDays > 30 ? 'É um indício preliminar de extrapolação do prazo: confirme a data oficial de expedição na Notificação de Autuação e no histórico do órgão antes de concluir pela decadência.' : 'Pelo cálculo das datas informadas, o intervalo não ultrapassa 30 dias; confira a data oficial de expedição no documento.'}`;
      },
      userImpact:
        'Se os documentos oficiais confirmarem que a Notificação de Autuação não foi expedida no prazo legal aplicável, esse fato poderá fundamentar pedido de arquivamento do auto. A conclusão depende da conferência documental.',
      confidenceBase: 'Art. 281, § 1º, II, do CTB'
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
        const history = data.infraction.hasPreviousInfractionsLast12Months;

        if (!isLightOrMedium) return 'NAO_APLICA: Esta infração é grave ou gravíssima, então a conversão em advertência não se aplica ao seu caso.';
        if (history === undefined || history === null) return 'SEM_DADOS: Não foi informado se houve infrações nos 12 meses anteriores. Consulte o prontuário antes de concluir se os requisitos do art. 267 estão atendidos.';
        if (history === true) return 'NAO_APLICA: Foram informadas infrações nos últimos 12 meses, então é necessário conferir o requisito legal no prontuário antes de avaliar a conversão.';
        return 'DECLARADO: Você informou não ter cometido outras infrações nos últimos 12 meses. Essa informação ainda precisa ser confirmada no prontuário oficial para verificar o requisito do art. 267.';
      },
      userImpact:
        'Quando os requisitos legais forem confirmados no prontuário oficial, o art. 267 prevê a imposição de advertência por escrito em lugar da multa. Isso evita a cobrança da multa e a pontuação correspondente; a aplicação ao caso concreto depende da confirmação dos dados e do procedimento administrativo.',
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
        'A Resolução CONTRAN nº 798/2020 estabelece como calcular a velocidade considerada a partir da medida do equipamento. A comparação com o limite da via e o enquadramento do código também precisam ser coerentes: uma conta aritmética correta, isoladamente, não confirma que a infração ocorreu.',
      evidenceCheck: (data) => {
        const measured = Number(data.infraction.measuredSpeed ?? data.infraction.speedMeasured);
        const considered = Number(data.infraction.consideredSpeed ?? data.infraction.speedConsidered);
        const limit = Number(data.infraction.speedLimit);
        if (![measured, considered, limit].every(Number.isFinite)) {
          return 'SEM_DADOS: Faltam os números de velocidade e o limite da via para conferir o cálculo e o enquadramento.';
        }
        const expected = calculateConsideredSpeed(measured);
        const deduction = Math.round((measured - expected) * 10) / 10;
        const delta = Math.abs(expected - considered);
        if (delta > 1) {
          return `DIVERGENCIA: Com ${measured} km/h medidos, a velocidade considerada calculada seria aproximadamente ${expected} km/h (desconto de ${deduction} km/h), mas o auto informa ${considered} km/h. Confira a notificação original.`;
        }
        if (considered <= limit) {
          return `DIVERGENCIA: O cálculo informado é compatível com ${considered} km/h considerados, mas esse valor não supera o limite de ${limit} km/h. Os dados apresentados não explicam o enquadramento por excesso de velocidade; confira o limite sinalizado, o código e os valores na notificação original. Isso é um alerta para conferência, não uma conclusão de nulidade.`;
        }
        return `VALIDADO: O cálculo da velocidade considerada é compatível: ${measured} km/h medidos, desconto aproximado de ${deduction} km/h e ${considered} km/h considerados, acima do limite informado de ${limit} km/h. Ainda é necessário conferir os dados na notificação original.`;
      },
      userImpact:
        'Se a velocidade considerada registrada não superar o limite aplicável, ou se houver divergência entre cálculo, limite e código, peça a conferência dos dados oficiais. Não conclua que a multa é inválida apenas com a conta isolada.',
      confidenceBase: 'Resolução CONTRAN nº 798/2020, Anexo II'
    }
  };

  // A regra de prazo pode recomendar ARG-049 (dupla notificação) junto de ARG-048 (expedição em 30 dias). Ambos precisam usar a evidência de expedição no card principal, sem cair no texto genérico.
  const explanation = govBrExplanations[arg.id] || (arg.id === 'ARG-049' ? govBrExplanations['ARG-048'] : undefined) || {
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
  if (evidenceResult.startsWith('VENCIDO:')) {
    confidenceLevel = 'Muito Alto';
    confidenceReason = evidenceResult.startsWith('VENCIDO:')
      ? 'Baseado em resolução técnica: radar com vistoria vencida na data da infração'
      : 'Baseado em lei: requisitos do art. 267 CTB atendidos';
  } else if (evidenceResult.startsWith('DECLARADO:')) {
    confidenceLevel = 'Médio';
    confidenceReason = 'Baseado em declaração do condutor, ainda pendente de confirmação no prontuário oficial';
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
  onProceedToDocumentGeneration,
  onSaveToDashboard,
  onBack,
}) => {
  const recommendedArguments = analysis?.recommendedArguments ?? [];
  const detectedInconsistencies = analysis?.detectedInconsistencies ?? [];
  const dataGaps = analysis?.dataGaps ?? [];
  const evaluatedRules = analysis?.evaluatedRules ?? [];
  // Count a missing-data rule once even if the engine's two result collections
  // temporarily disagree; a data gap must never be displayed as fully evaluated.
  const pendingRuleIds = new Set([
    ...evaluatedRules.filter((rule) => rule.status === 'DATA_GAP').map((rule) => rule.ruleId),
    ...dataGaps.map((gap) => gap.ruleId),
  ]);
  const evaluationCounts = {
    passed: evaluatedRules.filter((rule) => rule.status === 'PASS' && !dataGaps.some((gap) => gap.ruleId === rule.ruleId)).length,
    findings: evaluatedRules.filter((rule) => rule.status === 'FAIL').length,
    pending: pendingRuleIds.size,
    notApplicable: evaluatedRules.filter((rule) => rule.status === 'NOT_APPLICABLE').length,
  };
  const formatRuleReason = (reason: string) => {
    const restricted = reason.match(/Regra restrita às famílias \[([^\]]+)\]; a infração foi classificada como ["']?([^"'\.]+)["']?\.?/i);
    if (!restricted) return reason;
    const familyLabels: Record<string, string> = {
      excesso_velocidade: 'excesso de velocidade',
      alcoolemia: 'álcool e direção',
      semaforo: 'avanço de sinal',
      celular: 'uso de celular ao volante',
      estacionamento: 'regras de estacionamento',
      cinto: 'uso do cinto de segurança',
      documentos: 'documentação do veículo ou do condutor',
      circulacao: 'circulação ou restrições de tráfego',
      capacidade: 'capacete e transporte em motocicleta',
      lotacao: 'lotação ou condições do veículo',
      desconhecida: 'infração não classificada',
    };
    const categoryLabels: Record<string, string> = {
      excesso_velocidade: 'excesso de velocidade',
      lei_seca: 'álcool e direção',
      celular: 'uso de celular ao volante',
      vermelho: 'avanço de sinal',
      estacionamento: 'estacionamento',
      indicacao_condutor: 'indicação do real condutor',
      conversao_advertencia: 'conversão em advertência por escrito',
      cnh_geral: 'questões gerais da CNH',
      documentos: 'documentação',
      outro: 'outra categoria de infração',
    };
    const humanList = (items: string[]) => {
      if (items.length < 2) return items[0] ?? '';
      if (items.length === 2) return `${items[0]} e ${items[1]}`;
      return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
    };
    const families = humanList(restricted[1].split(',').map((item) => familyLabels[item.trim()] ?? item.trim().replace(/_/g, ' ')));
    const category = categoryLabels[restricted[2].trim()] ?? restricted[2].trim().replace(/_/g, ' ');
    return `Esta verificação trata de ${families} e não se aplica à infração por ${category} informada neste caso.`;
  };
  const formatDataGap = (gap: NonNullable<CaseAnalysis['dataGaps']>[number]) => {
    const labels = (gap.missingData ?? []).map((field) => ANALYSIS_FIELD_LABELS[field] ?? field);
    let reason = gap.reason ?? '';
    for (const [field, label] of Object.entries(ANALYSIS_FIELD_LABELS)) {
      reason = reason.split(field).join(label);
    }
    if (!reason) return labels.join(', ') || 'Informação necessária para concluir a verificação.';
    if (labels.length > 0 && !labels.every((label) => reason.includes(label))) {
      return labels.join(', ') + '. ' + reason;
    }
    return reason;
  };
  const isTechnicalFailure = analysis?.status === 'failed';
  const hasFindings = recommendedArguments.length > 0 || detectedInconsistencies.length > 0;
  const isInconclusive = !isTechnicalFailure && !hasFindings;
  const defensePoints = recommendedArguments
    .map((arg) => formatLegalPointGovBr(arg, { infraction: infractionData, vehicle: vehicleData }))
    .slice(0, 3);
  const deadline = analysis?.procedureDeadline || infractionData.defenseDeadline;
  const formattedDeadline = deadline
    ? (() => {
        const dateOnly = deadline.slice(0, 10);
        const parsed = new Date(`${dateOnly}T12:00:00`);
        return Number.isNaN(parsed.getTime())
          ? dateOnly
          : new Intl.DateTimeFormat('pt-BR').format(parsed);
      })()
    : null;
  const cleanEvidenceText = (value: string) =>
    value.replace(/^(SEM_DADOS|NAO_APLICA|DIVERGENCIA|VALIDADO|ATENDIDO|DECLARADO|VENCIDO|EM_DIA|PRESENTE|AUSENCIA):\s*/, '');
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-3">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${isTechnicalFailure ? 'border-rose-200 bg-rose-50 text-rose-700' : isInconclusive ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {isTechnicalFailure ? <AlertTriangle className="h-4 w-4" /> : isInconclusive ? <Clock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {isTechnicalFailure ? 'Análise não concluída' : isInconclusive ? 'Resultado inconclusivo' : 'Diagnóstico inicial concluído'}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isTechnicalFailure ? 'Não conseguimos concluir sua análise' : isInconclusive ? 'Ainda não confirmamos um problema na autuação' : 'Veja o que merece atenção na sua multa'}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-600">
          {isTechnicalFailure
            ? 'Ocorreu um problema durante a análise. Isso não significa que sua multa esteja correta. Seus dados continuam disponíveis para você voltar e tentar novamente.'
            : isInconclusive
              ? 'Com as informações disponíveis, ainda não conseguimos confirmar um ponto específico. Isso não significa que a multa esteja correta; documentos adicionais podem ajudar.'
              : 'Identificamos pontos que podem merecer uma análise mais detalhada. Eles não garantem o cancelamento da multa; a decisão cabe ao órgão responsável.'}
        </p>
        {!isTechnicalFailure && evaluatedRules.length > 0 && (
          <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-sm font-semibold text-slate-800">A análise registrou {evaluatedRules.length} verificações.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {evaluationCounts.passed} {evaluationCounts.passed === 1 ? 'concluída' : 'concluídas'} sem falha · {evaluationCounts.findings} {evaluationCounts.findings === 1 ? 'ponto de atenção' : 'pontos de atenção'} · {evaluationCounts.pending} {evaluationCounts.pending === 1 ? 'pendente' : 'pendentes'} por falta de dados · {evaluationCounts.notApplicable} {evaluationCounts.notApplicable === 1 ? 'não aplicável' : 'não aplicáveis'}.
            </p>
          </div>
        )}
        <p className="text-sm text-slate-500">
          Auto nº <span className="font-medium text-slate-700">{infractionData.aitNumber || 'não informado'}</span>
          {' · '}Placa <span className="font-medium text-slate-700">{vehicleData.plate || 'não informada'}</span>
        </p>
      </header>

      {!isTechnicalFailure && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="result-findings-title">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-orange-600" />
            <h2 id="result-findings-title" className="text-lg font-bold text-slate-900">
              {hasFindings ? 'Principais pontos identificados' : 'O que ainda falta confirmar'}
            </h2>
          </div>
          {defensePoints.length > 0 ? (
            <div className="space-y-3">
              {defensePoints.map((point, index) => (
                <details key={point.title || index} className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer list-none font-semibold text-slate-800">
                    <span className="inline-flex items-start gap-2"><ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /><span>{point.title}</span></span>
                  </summary>
                  <div className="space-y-3 pt-3 text-sm leading-relaxed text-slate-600">
                    <p>{cleanEvidenceText(point.evidenceResult)}</p>
                    <div><p className="mb-1 font-semibold text-slate-800">O que diz a regra</p><p>{point.lawExplanation}</p></div>
                    <div><p className="mb-1 font-semibold text-slate-800">Por que isso importa</p><p>{point.userImpact}</p></div>
                    <div><p className="mb-1 font-semibold text-slate-800">Base legal indicada</p><p>{point.confidenceBase}</p></div>
                  </div>
                </details>
              ))}
              {recommendedArguments.length > defensePoints.length && <p className="text-sm text-slate-500">Há outros pontos registrados. Os detalhes poderão ser consultados na próxima etapa.</p>}
            </div>
          ) : detectedInconsistencies.length > 0 ? (
            <ul className="space-y-3">
              {detectedInconsistencies.slice(0, 3).map((item, index) => (
                <li key={item.legalArgumentId || item.title || index} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-2 text-sm leading-relaxed text-slate-600">
              <p>Não identificamos um ponto confirmado com os dados disponíveis. A ausência de um achado não comprova que a autuação esteja correta.</p>
              {dataGaps.length > 0 && <ul className="list-disc space-y-1 pl-5">{dataGaps.slice(0, 3).map((gap, index) => <li key={gap.ruleId || index}>{formatDataGap(gap)}</li>)}</ul>}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
          <div className="space-y-1">
            <h2 className="font-bold text-slate-900">Prazo e próximo passo</h2>
            {formattedDeadline ? <p className="text-sm leading-relaxed text-slate-600">O prazo informado para o caso é <strong>{formattedDeadline}</strong>. Confirme a data na notificação original e, se possível, protocole dentro do prazo aplicável.</p> : <p className="text-sm leading-relaxed text-slate-600">Não temos um prazo confirmado nesta tela. Consulte a data indicada na notificação original antes de protocolar.</p>}
          </div>
        </div>
      </section>

      {!isTechnicalFailure && <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-800">Ver detalhes da autuação e da análise</summary>
        <div className="mt-4 space-y-4 text-sm text-slate-600">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><dt className="font-semibold text-slate-800">Infração</dt><dd>{infractionData.ctbArticle || 'Não informado'} · Código {infractionData.infractionCode || 'não informado'}</dd></div>
            <div><dt className="font-semibold text-slate-800">Órgão autuador informado</dt><dd>{infractionData.autuadorBody || 'Não informado'}</dd></div>
            <div><dt className="font-semibold text-slate-800">Valor informado</dt><dd>{infractionData.fineAmount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(infractionData.fineAmount) : 'Não informado'}</dd></div>
            <div><dt className="font-semibold text-slate-800">Pontuação indicada</dt><dd>{infractionData.points === undefined ? 'Não informada' : `${infractionData.points} ${infractionData.points === 1 ? 'ponto' : 'pontos'} se a penalidade for mantida`}</dd></div>
          </dl>
          {analysis?.summaryReasoning && <div><h3 className="font-semibold text-slate-800">Resumo técnico</h3><p className="mt-1 whitespace-pre-line">{analysis.summaryReasoning}</p></div>}
          {analysis?.evaluatedRules && analysis.evaluatedRules.length > 0 && (
            <div><h3 className="font-semibold text-slate-800">Verificações registradas ({analysis.evaluatedRules.length})</h3><ul className="mt-2 space-y-2">
              {analysis.evaluatedRules.map((rule, index) => (
                <li key={rule.ruleId || index} className="border-l-2 border-slate-200 pl-3">
                  <p className="font-medium text-slate-800">{rule.name || rule.ruleId}</p>
                  <p>{dataGaps.find((gap) => gap.ruleId === rule.ruleId)
                    ? formatDataGap(dataGaps.find((gap) => gap.ruleId === rule.ruleId)!)
                    : rule.reason ? formatRuleReason(rule.reason) : ({ PASS: 'Verificação concluída sem falha identificada.', FAIL: 'A regra identificou um resultado que exige atenção.', DATA_GAP: 'Faltam dados para concluir esta verificação.', NOT_APPLICABLE: 'Esta regra não se aplica ao caso informado.' } as Record<string, string>)[rule.status]}</p>
                </li>
              ))}
            </ul></div>
          )}
          {dataGaps.length > 0 && <div><h3 className="font-semibold text-slate-800">Informações que podem fazer falta</h3><ul className="mt-1 list-disc space-y-1 pl-5">{dataGaps.map((gap, index) => <li key={gap.ruleId || index}>{formatDataGap(gap)}</li>)}</ul></div>}
          {detectedInconsistencies.length > 0 && <div><h3 className="font-semibold text-slate-800">Outros registros da análise</h3><ul className="mt-1 list-disc space-y-1 pl-5">{detectedInconsistencies.map((item, index) => <li key={item.legalArgumentId || item.title || index}>{item.title}: {item.description}</li>)}</ul></div>}
        </div>
      </details>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" id="btn-back-to-edit-diagnosis" onClick={onBack} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto">
          <ArrowRight className="h-4 w-4 rotate-180" />{isTechnicalFailure ? 'Voltar e revisar os dados' : 'Voltar e corrigir dados'}
        </button>
        <button type="button" onClick={onSaveToDashboard} className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto">Salvar no painel</button>
        {!isTechnicalFailure && <button type="button" id="btn-proceed-to-document-generation" onClick={onProceedToDocumentGeneration} className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-base font-bold text-white transition-colors hover:bg-orange-600"><span>Continuar para preparar minha defesa</span><ArrowRight className="h-5 w-5" /></button>}
      </div>
    </div>
  );
};
