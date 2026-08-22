import { CanonicalMapper } from '../../core/mappers/canonical-mapper';

/**
 * Seed data for the demo case — used only at startup.
 * Injected into `databaseRows` (write-through to Supabase).
 *
 * Uses the legacy shape (dadosInfracao, analiseIA, historicoTimeline)
 * which CanonicalMapper.domainToRow() handles via backward-compat fallbacks.
 */
export const SAMPLE_CASE = {
  id: 'case_demo_745',
  claimToken: 'tok_demo123',
  isAnonymous: false,
  userId: 'usr_fariasnetto',
  userEmail: 'fariasnetto01@gmail.com',
  userNome: 'Farias Netto',
  status: 'defesa_pronta',
  stageAtual: 3,
  tipoServico: 'recurso_multa',
  dadosInfracao: {
    autoInfracao: 'DET2026SP984712',
    codigoInfracao: '745-50',
    descricaoInfracao: 'Transitar em velocidade superior à máxima permitida em até 20%',
    enquadramentoLegal: 'Art. 218, I do CTB',
    gravidade: 'MEDIA',
    pontos: 4,
    valorOriginal: 130.16,
    valorComDesconto: 104.12,
    placa: 'BRA2E19',
    ufVeiculo: 'SP',
    marcaModelo: 'Toyota Corolla Cross XRE',
    orgaoAutuador: 'DETRAN-SP',
    dataHoraInfracao: '2026-06-12T14:32:00',
    localInfracao: 'Av. das Nações Unidas, km 18.5 - Marginal Pinheiros',
    municipioUf: 'São Paulo - SP',
    velocidadePermitida: 70,
    velocidadeMedida: 79,
    velocidadeConsiderada: 72,
    numeroEquipamentoInmetro: 'INMETRO-RAD-883921',
    dataAfericaoInmetro: '2025-04-10',
    prazoDefesa: '2026-08-30',
    nomeCondutor: 'Farias Netto',
    cpfCondutor: '123.456.789-00',
    cnhNumero: '08492019482',
    ufCnh: 'SP',
  },
  ocrConfidence: 98.4,
  analiseIA: {
    scoreDeferimento: 94,
    nivelConfianca: 'ALTO',
    diagnosticoGeral:
      'Identificadas duas nulidades insanáveis de ordem pública: aferição metrológica do radar vencida há mais de 14 meses (Portaria INMETRO 158/2022) e margem legal para conversão da penalidade em Advertência por Escrito (Art. 267 CTB).',
    nulidadesDetectadas: [
      {
        id: 'nul-01',
        titulo: 'Aferição de Radar Eletrônico Expirada (> 12 Meses)',
        tipo: 'TECNICA',
        descricao:
          'Equipamento medidor de velocidade com última calibração em 10/04/2025, violando o prazo máximo improrrogável de validade metrológica estabelecido pelo CONTRAN e INMETRO.',
        fundamentoLegal:
          'Art. 280, § 2º do CTB, Resolução CONTRAN nº 798/2020 (Art. 4º, I) e Portaria INMETRO nº 158/2022',
        impacto: 'CRITICO',
        probabilidadeExito: 98,
      },
      {
        id: 'nul-02',
        titulo: 'Direito Subjetivo à Advertência por Escrito',
        tipo: 'FORMAL',
        descricao:
          'Por se tratar de infração de natureza Média (4 pontos), preenchidos os requisitos da Lei 14.071/2020.',
        fundamentoLegal: 'Art. 267 do CTB',
        impacto: 'ALTO',
        probabilidadeExito: 92,
      },
    ],
    argumentosRecomendados: [
      'Nulidade absoluta do Auto de Infração por falta de comprovação metrológica válida',
      'Aplicação subsidiária da conversão em advertência educativa sem cobrança de taxa ou perda de pontos',
      'Precedentes uniformes da JARI do DETRAN-SP sobre medidores sem certificado INMETRO vigente',
    ],
    tesesCabiveis: ['Insubsistência Metrológica', 'Advertência por Escrito', 'Sinalização R-19'],
    prazosAvaliacao: {
      prazoLimite: '2026-08-30',
      diasRestantes: 16,
      alertaUrgencia: false,
    },
    orgaoJulgadorInfo: {
      nome: 'DETRAN-SP - Setor de Defesa Prévia',
      instanciaAtual: 'Defesa Prévia (Notificação de Autuação)',
      portalProtocoloOnlineUrl: 'https://www.detran.sp.gov.br',
      enderecoEnvioCorreios: 'Rua Boa Vista, 209 - Centro, São Paulo - SP, CEP 01014-001',
      documentosExigidos: [
        'Cópia legível da Notificação de Autuação / Auto de Infração',
        'Cópia da Carteira Nacional de Habilitação (CNH)',
        'Cópia do Certificado de Registro e Licenciamento do Veículo (CRLV)',
        'Minuta de Defesa assinada pelo condutor/proprietário',
      ],
    },
    recomendacaoFinal:
      'Recomenda-se o protocolo imediato da Defesa Prévia pleiteando o arquivamento sumário do Auto de Infração pela expiração do laudo metrológico INMETRO.',
  },
  statusPagamento: 'pago',
  valorPago: 97.0,
  criadoEm: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  atualizadoEm: new Date().toISOString(),
  historicoTimeline: [
    {
      data: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      titulo: 'Notificação Carregada & OCR Concluído',
      descricao: 'Auto DET2026SP984712 importado com 98.4% de precisão óptica.',
      responsavel: 'OCR Engine',
      status: 'novo',
    },
    {
      data: new Date(Date.now() - 3600000 * 24 * 1.8).toISOString(),
      titulo: 'Laudo Pericial de Nulidades Concluído',
      descricao: 'IA detectou invalidade do laudo INMETRO e score de 94% de vitória.',
      responsavel: 'IA Legal Engine',
      status: 'analisando',
    },
    {
      data: new Date(Date.now() - 3600000 * 24).toISOString(),
      titulo: 'Pagamento Confirmado via PIX',
      descricao: 'Transação PIX de R$ 97,00 compensada com sucesso.',
      responsavel: 'PagBank Gateway',
      status: 'defesa_pronta',
    },
    {
      data: new Date(Date.now() - 3600000 * 12).toISOString(),
      titulo: 'Minuta da Defesa Prévia Gerada',
      descricao: 'Peça jurídica completa elaborada com fundamentação na Resolução 798 CONTRAN.',
      responsavel: 'Document Agent',
      status: 'defesa_pronta',
    },
  ],
};

/**
 * Seed the sample case into `databaseRows` (write-through to Supabase).
 * Accepts anything with a `.set(id, row)` method (CaseRepository or Map).
 */
export function seedDemoCase(databaseRows: { set(id: string, row: any): void }) {
  const row = CanonicalMapper.domainToRow(SAMPLE_CASE as any);
  databaseRows.set(SAMPLE_CASE.id, row);
}
