import { Router } from 'express';
import { TRANSIT_DATABASE_REGISTRY } from '../../data/test-fixtures';

const router = Router();

/**
 * GET /api/transit-database/query
 * Regional Transit Database Query (Renainf / DETRAN Integration Simulator)
 */
router.get('/transit-database/query', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(501).json({
      error: 'Serviço de consulta veicular não disponível',
      message: 'Integração com DETRAN em preparação para produção.',
    });
  }

  const { placa, autoInfracao } = req.query;
  const cleanPlaca = String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const foundVehicle =
    TRANSIT_DATABASE_REGISTRY.vehicles.find((v) => v.placa === cleanPlaca || cleanPlaca === '') ||
    TRANSIT_DATABASE_REGISTRY.vehicles[0];

  const radarMatch = TRANSIT_DATABASE_REGISTRY.radarCertificates[0];

  res.json({
    success: true,
    source: 'RENAINF / DETRAN Central API Gateway',
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

  const { equipamentoId } = req.query;
  const cert =
    TRANSIT_DATABASE_REGISTRY.radarCertificates.find((c) => c.equipamentoId === equipamentoId) ||
    TRANSIT_DATABASE_REGISTRY.radarCertificates[0];

  res.json({
    success: true,
    origem: 'Base Nacional de Metrologia Legal (INMETRO/IPEM)',
    equipamento: cert,
    regularidade: cert.statusLaudo === 'VIGENTE_REGULAR',
    alertaPerito:
      cert.statusLaudo === 'EXPIRADO_INVALIDO'
        ? 'Aferição expirada! Vício metrológico insanável perante a Resolução CONTRAN 798/2020.'
        : 'Equipamento com laudo metrológico válido.',
  });
});

export default router;
