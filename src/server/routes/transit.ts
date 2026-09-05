import { Router } from 'express';

const router = Router();

/**
 * GET /api/transit-database/query
 * Regional Transit Database Query (Renainf / DETRAN Integration Simulator)
 * Production: Returns 501 - integration not available.
 * Development: Returns mock data for UI testing.
 */
router.get('/transit-database/query', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Serviço de consulta veicular não disponível',
      message: 'Integração com DETRAN em preparação para produção.',
    });
  }

  // Development mock data - ONLY in non-production
  const mockVehicles = [
    {
      placa: 'BRA2E19',
      chassi: '9BRBL48E8P0192841',
      renavam: '01294819284',
      marcaModelo: 'Toyota Corolla Cross XRE 2.0',
      anoFabricacao: 2024,
      anoModelo: 2025,
      cor: 'Cinza Granito',
      combustivel: 'Flex / Álcool e Gasolina',
      municipioUf: 'São Paulo/SP',
      situacao: 'EM_CIRCULACAO',
      restricoes: 'Nenhuma restrição financeira ou administrativa',
      ultimoLicenciamento: 2025,
    },
    {
      placa: 'ABC1D23',
      chassi: '9BD158914L0918231',
      renavam: '00987123456',
      marcaModelo: 'Honda Civic Touring 1.5 Turbo',
      anoFabricacao: 2023,
      anoModelo: 2024,
      cor: 'Preto Cristal',
      combustivel: 'Gasolina',
      municipioUf: 'Campinas/SP',
      situacao: 'EM_CIRCULACAO',
      restricoes: 'Alienação Fiduciária',
      ultimoLicenciamento: 2025,
    },
  ];

  const mockRadarCertificates = [
    {
      equipamentoId: 'INMETRO-RAD-883921',
      orgaoAutuador: 'DETRAN-SP',
      modeloRadar: 'FISCAL-RADAR FX-3000 Fixe Laser',
      localInstalacao: 'Av. das Nações Unidas, km 18.5 - Marginal Pinheiros',
      limiteVelocidade: 70,
      dataUltimaAfericao: '2025-04-10',
      validadeAfericao: '2026-04-10',
      statusLaudo: 'EXPIRADO_INVALIDO',
      numeroCertificadoInmetro: 'INMETRO/DIMEL-SP-2025-09182',
      motivoInvalidade: 'Vencido há mais de 60 dias da data do cometimento.',
    },
    {
      equipamentoId: 'INMETRO-RAD-119284',
      orgaoAutuador: 'PRF',
      modeloRadar: 'TRUCAM II Portátil Laser',
      localInstalacao: 'BR-116, km 220 - Dutra Sul',
      limiteVelocidade: 110,
      dataUltimaAfericao: '2026-02-15',
      validadeAfericao: '2027-02-15',
      statusLaudo: 'VIGENTE_REGULAR',
      numeroCertificadoInmetro: 'INMETRO/DIMEL-RJ-2026-44120',
      motivoInvalidade: null,
    },
  ];

  const { placa, autoInfracao } = req.query;
  const cleanPlaca = String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const foundVehicle =
    mockVehicles.find((v) => v.placa === cleanPlaca || cleanPlaca === '') ||
    mockVehicles[0];

  const radarMatch = mockRadarCertificates[0];

  res.json({
    success: true,
    source: 'RENAINF / DETRAN Central API Gateway (MOCK - DEV ONLY)',
    consultaEm: new Date().toISOString(),
    veiculo: foundVehicle,
    situacaoCadastral: {
      licenciamentoAno: 2025,
      bloqueiosJudiciais: false,
      comunicacaoVenda: false,
      gravame: foundVehicle.restricoes,
    },
    autuacaoAssociada: autoInfracao
      ? {
          autoInfracao,
          orgaoAutuador: 'DETRAN-SP',
          statusProcessual: 'DEFESA_PREVIA_TEMPESTIVA',
          efeitoSuspensivoAtivo: true,
          amparoLegal: 'Art. 284, § 3º e Art. 285 do CTB',
        }
      : null,
    radarAfericao: radarMatch,
  });
});

/**
 * GET /api/transit-database/inmetro-check
 * INMETRO Radar Calibration Check
 */
router.get('/transit-database/inmetro-check', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Serviço INMETRO não disponível',
      message: 'Integração com INMETRO em preparação para produção.',
    });
  }

  // Development mock data - ONLY in non-production
  const mockRadarCertificates = [
    {
      equipamentoId: 'INMETRO-RAD-883921',
      orgaoAutuador: 'DETRAN-SP',
      modeloRadar: 'FISCAL-RADAR FX-3000 Fixe Laser',
      localInstalacao: 'Av. das Nações Unidas, km 18.5 - Marginal Pinheiros',
      limiteVelocidade: 70,
      dataUltimaAfericao: '2025-04-10',
      validadeAfericao: '2026-04-10',
      statusLaudo: 'EXPIRADO_INVALIDO',
      numeroCertificadoInmetro: 'INMETRO/DIMEL-SP-2025-09182',
      motivoInvalidade: 'Vencido há mais de 60 dias da data do cometimento.',
    },
    {
      equipamentoId: 'INMETRO-RAD-119284',
      orgaoAutuador: 'PRF',
      modeloRadar: 'TRUCAM II Portátil Laser',
      localInstalacao: 'BR-116, km 220 - Dutra Sul',
      limiteVelocidade: 110,
      dataUltimaAfericao: '2026-02-15',
      validadeAfericao: '2027-02-15',
      statusLaudo: 'VIGENTE_REGULAR',
      numeroCertificadoInmetro: 'INMETRO/DIMEL-RJ-2026-44120',
      motivoInvalidade: null,
    },
  ];

  const { equipamentoId } = req.query;
  const cert =
    mockRadarCertificates.find((c) => c.equipamentoId === equipamentoId) ||
    mockRadarCertificates[0];

  res.json({
    success: true,
    origem: 'Base Nacional de Metrologia Legal (INMETRO/IPEM) (MOCK - DEV ONLY)',
    equipamento: cert,
    regularidade: cert.statusLaudo === 'VIGENTE_REGULAR',
    alertaPerito:
      cert.statusLaudo === 'EXPIRADO_INVALIDO'
        ? 'Aferição expirada! Vício metrológico insanável perante a Resolução CONTRAN 798/2020.'
        : 'Equipamento com laudo metrológico válido.',
  });
});

export default router;
