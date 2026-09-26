/**
 * @file facts-narrative.ts
 * Narrativa de FATOS gerada a partir do Case — causa-raiz RC-5.
 *
 * A auditoria FASE 12 provou que 49 fatos do Case não chegavam ao documento:
 * o bloco de fatos dos templates é texto fixo e interpola apenas AIT, órgão,
 * artigo, descrição, data e local. Código da infração, gravidade, pontos,
 * multa, velocidades medidas/consideradas/limite, equipamento de radar e data de
 * aferição ficavam de fora — inclusive nos 6 casos de excesso de velocidade, em
 * que a peça nunca mencionava a velocidade.
 *
 * Regras desta narrativa:
 * 1. só afirma o que existe no Case (fail-closed — nunca inventa);
 * 2. omite silenciosamente o que não existe, sem deixar texto quebrado;
 * 3. não repete a tese: é a narrativa dos fatos, não o argumento.
 */

export interface FactsNarrativeInput {
  aitNumber?: string;
  autuadorBody?: string;
  ctbArticle?: string;
  description?: string;
  dateTime?: string;
  location?: string;
  infractionCode?: string;
  severity?: string;
  points?: number;
  fineAmount?: number;
  speedLimit?: number;
  measuredSpeed?: number;
  consideredSpeed?: number;
  radarEquipmentId?: string;
  inmetroAferitionDate?: string;
  refusedTest?: boolean;
  offeredRetest?: boolean;
  hasPsychomotorTerm?: boolean;
  yellowPhaseCrossing?: boolean;
  cellphoneCircumstance?: string;
  emergencyPassage?: boolean;
  notes?: string;
}

export interface FactsNarrativeResult {
  /** Narrativa completa, sem placeholders. */
  text: string;
  /** Campos do Case efetivamente declarados (rastreabilidade do bloco). */
  declaredFields: string[];
  /** Campos que o caso traz mas a peça não declara (usado pelo Quality Gate). */
  omittedFields: string[];
}

const str = (v: unknown): string => (v === undefined || v === null || v === '' ? '' : String(v));
const has = (v: unknown): boolean => str(v).trim().length > 0;
const dateBR = (iso: unknown): string => {
  if (!has(iso)) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('pt-BR');
};

export function buildFactsNarrative(infraction: FactsNarrativeInput): FactsNarrativeResult {
  // Estado local por chamada: evita mistura de declared/omitted entre casos concorrentes.
  const declared: string[] = [];
  const omitted: string[] = [];
  const mention = (field: string, value: unknown): string => {
    if (!has(value)) {
      omitted.push(field);
      return '';
    }
    declared.push(field);
    return str(value);
  };

  const ait = mention('infraction.aitNumber', infraction.aitNumber);
  const orgao = mention('infraction.autuadorBody', infraction.autuadorBody);
  const artigo = mention('infraction.ctbArticle', infraction.ctbArticle);
  const descricao = mention('infraction.description', infraction.description);
  const dataInfra = mention('infraction.dateTime', infraction.dateTime);
  const local = mention('infraction.location', infraction.location);
  const codigo = mention('infraction.infractionCode', infraction.infractionCode);
  const gravidade = mention('infraction.severity', infraction.severity);
  const pontos = mention('infraction.points', infraction.points);
  const multa = mention('infraction.fineAmount', infraction.fineAmount);
  const vMedida = mention('infraction.measuredSpeed', infraction.measuredSpeed);
  const vConsiderada = mention('infraction.consideredSpeed', infraction.consideredSpeed);
  const vLimite = mention('infraction.speedLimit', infraction.speedLimit);
  const radar = mention('infraction.radarEquipmentId', infraction.radarEquipmentId);
  const afericao = mention('infraction.inmetroAferitionDate', infraction.inmetroAferitionDate);
  const recusa = mention('infraction.refusedTest', infraction.refusedTest === true ? 'sim' : '');
  const reteste = mention('infraction.offeredRetest', infraction.offeredRetest === true ? 'sim' : '');
  const psicomotor = mention('infraction.hasPsychomotorTerm', infraction.hasPsychomotorTerm === true ? 'sim' : '');
  const amarelo = mention('infraction.yellowPhaseCrossing', infraction.yellowPhaseCrossing === true ? 'sim' : '');
  const vivaVoz = mention('infraction.cellphoneCircumstance', infraction.cellphoneCircumstance);
  const emergencia = mention('infraction.emergencyPassage', infraction.emergencyPassage === true ? 'sim' : '');

  // ── Identificação da autuação ────────────────────────────────────────────
  const head: string[] = [];
  if (ait) head.push(`Auto de Infração nº ${ait}`);
  if (orgao) head.push(`lavrado pelo(a) ${orgao}`);
  if (dataInfra) head.push(`na data de ${dateBR(dataInfra)}`);
  if (local) head.push(`no local ${local}`);

  const tipificacao: string[] = [];
  if (artigo) tipificacao.push(artigo);
  if (descricao) tipificacao.push(`"${descricao}"`);
  if (codigo) tipificacao.push(`código ${codigo}`);

  const sancoes: string[] = [];
  if (gravidade) {
    const g = `gravidade ${gravidade}`;
    sancoes.push(pontos ? `${g}, ${pontos} ponto(s)` : g);
  }
  if (multa) sancoes.push(`multa de R$ ${multa}`);

  // ── Evidência de medição (velocidade / radar) ────────────────────────────
  const medicao: string[] = [];
  if (vMedida) medicao.push(`velocidade medida de ${vMedida} km/h`);
  if (vConsiderada) medicao.push(`velocidade considerada de ${vConsiderada} km/h`);
  if (vLimite) medicao.push(`velocidade máxima permitida de ${vLimite} km/h`);
  if (radar) medicao.push(`equipamento Fiscalizador ${radar}`);
  if (afericao) medicao.push(`última aferição metrológica em ${dateBR(afericao)}`);

  // ── Circunstâncias específicas (só as que o caso registra) ───────────────
  const circunstancias: string[] = [];
  if (recusa) circunstancias.push('o condutor recusou-se a submeter-se ao teste do etilômetro');
  if (reteste) circunstancias.push('foi oferecido contraprova');
  if (psicomotor) circunstancias.push('foi lavrado Termo de Constatação de Sinais Psicomotores');
  if (amarelo) circunstancias.push('a travessia ocorreu durante a fase amarela do semáforo');
  if (vivaVoz) circunstancias.push(`registro de uso do aparelho: ${vivaVoz}`);
  if (emergencia) circunstancias.push('passagem em emergência para veículo de emergência');
  if (has(infraction.notes)) {
    mention('infraction.notes', infraction.notes);
    circunstancias.push(str(infraction.notes));
  }

  const paragrafos: string[] = [];
  paragrafos.push(`Constam dos autos ${head.join(', ') || 'a autuação ora impugnada'}.`);
  if (tipificacao.length) paragrafos.push(`A conduta imputada está tipificada no ${tipificacao.join(' — ')}.`);
  if (sancoes.length) paragrafos.push(`A autuação foi classificada com ${sancoes.join(', ')}.`);
  if (medicao.length) paragrafos.push(`O registro da fiscalização aponta ${medicao.join(', ')}.`);
  if (circunstancias.length) paragrafos.push(`O caso registra ${circunstancias.join('; ')}.`);

  return {
    text: paragrafos.filter((p) => p.trim().length > 0).join('\n\n'),
    declaredFields: Array.from(new Set(declared)),
    omittedFields: Array.from(new Set(omitted)),
  };
}
