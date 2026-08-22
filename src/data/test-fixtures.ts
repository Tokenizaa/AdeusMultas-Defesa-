/**
 * Test fixtures — mock data para endpoints simulados de integração
 * (RENAINF/DETRAN, INMETRO) em ambiente de desenvolvimento.
 * Não é conhecimento jurídico real — NÃO confundir com knowledge-base.
 */
export const TRANSIT_DATABASE_REGISTRY = {
  vehicles: [
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
  ],
  radarCertificates: [
    {
      equipamentoId: 'INMETRO-RAD-883921',
      orgaoAutuador: 'DETRAN-SP',
      modeloRadar: 'FISCAL-RADAR FX-3000 Fixe Laser',
      localInstalacao: 'Av. das Nações Unidas, km 18.5 - Marginal Pinheiros',
      limiteVelocidade: 70,
      dataUltimaAfericao: '2025-04-10', // Mais de 12 meses atrás!
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
  ],
};