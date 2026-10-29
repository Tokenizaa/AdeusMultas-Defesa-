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
  onProceedToDocumentGeneration,
  onSaveToDashboard,
  onBack,
}) => {
  const recommendedArguments = analysis?.recommendedArguments ?? [];
  const detectedInconsistencies = analysis?.detectedInconsistencies ?? [];
  const dataGaps = analysis?.dataGaps ?? [];
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
    value.replace(/^(SEM_DADOS|NAO_APLICA|DIVERGENCIA|VALIDADO|ATENDIDO|VENCIDO|EM_DIA|PRESENTE|AUSENCIA):\s*/, '');
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
              {dataGaps.length > 0 && <ul className="list-disc space-y-1 pl-5">{dataGaps.slice(0, 3).map((gap, index) => <li key={gap.ruleId || index}>{gap.missingData?.length ? gap.missingData.join(', ') : gap.reason}</li>)}</ul>}
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
                  <p>{rule.reason || ({ PASS: 'Verificação concluída sem falha identificada.', FAIL: 'A regra identificou um resultado que exige atenção.', DATA_GAP: 'Faltam dados para concluir esta verificação.', NOT_APPLICABLE: 'Esta regra não se aplica ao caso informado.' } as Record<string, string>)[rule.status]}</p>
                </li>
              ))}
            </ul></div>
          )}
          {dataGaps.length > 0 && <div><h3 className="font-semibold text-slate-800">Informações que podem fazer falta</h3><ul className="mt-1 list-disc space-y-1 pl-5">{dataGaps.map((gap, index) => <li key={gap.ruleId || index}>{gap.reason || gap.missingData.join(', ')}</li>)}</ul></div>}
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
