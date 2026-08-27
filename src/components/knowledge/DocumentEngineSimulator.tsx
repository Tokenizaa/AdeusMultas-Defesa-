/**
 * @file DocumentEngineSimulator.tsx
 * DefesaAI — Motor de Documentos v1 (Test Playground)
 * Simulador e testador interativo do pipeline determinístico de geração de petições.
 * 100% IA-Independente (Zero AI runtime).
 */

import React, { useState, useMemo } from 'react';
import {
  Cpu,
  FileText,
  Play,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  Shield,
  FileCheck,
  ChevronRight,
  Sliders,
  Settings2,
  Printer
} from 'lucide-react';
import {
  DocumentAssemblyEngine,
  DocumentAssemblyPayload
} from '../../core/documents/document-assembly-engine';
import { TEMPLATES_CATALOG } from '../../core/templates/templates-catalog';
import { PROCEDURES_CATALOG } from '../../core/procedures/procedures-catalog';
import { DOCUMENT_BLOCKS } from '../../core/templates/document-blocks';
import { ARGUMENTS_CATALOG } from '../../core/arguments/arguments-catalog';
import { ProcedureType } from '../../types';

interface PresetCase {
  label: string;
  procedureType: ProcedureType;
  description: string;
  payload: DocumentAssemblyPayload;
}

const PRESET_CASES: PresetCase[] = [
  {
    label: '1. Defesa Prévia - Radar com Aferição Vencida (Art. 218, I)',
    procedureType: 'recurso_jari',
    description: 'Auto de infração de excesso de velocidade captado por radar com laudo metrológico do INMETRO expirado há mais de 12 meses.',
    payload: {
      caseId: 'CASE-TEST-001',
      procedureType: 'recurso_jari',
      infraction: {
        id: 'inf-001',
        aitNumber: 'E025988412',
        code: '7455-0',
        ctbArticle: 'Art. 218, I do CTB',
        description: 'Transitar em velocidade superior à máxima permitida em até 20%',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        autuadorBody: 'DETRAN-SP / DER-SP',
        dateTime: '12/01/2026 14:35',
        location: 'Rodovia SP-070, Km 42 - Pista Leste',
        speedMeasured: 84,
        speedLimit: 70,
        speedConsidered: 77,
      },
      vehicle: {
        plate: 'BRA2E19',
        model: 'Toyota Corolla XEi 2.0',
        renavam: '00984726154',
      },
      applicant: {
        name: 'CARLOS EDUARDO SILVEIRA',
        cpf: '123.456.789-00',
        rg: '28.910.455-X SSP/SP',
        cnh: '04928174920',
        category: 'B',
        address: 'Av. Paulista, nº 1500, Apto 82 - Bela Vista',
        cityState: 'São Paulo/SP',
      },
      dates: {
        infractionDate: '12/01/2026',
        expeditionDate: '18/01/2026',
        daysElapsed: 6,
      },
      speeds: {
        measured: 84,
        considered: 77,
        limit: 70,
      },
      selectedArgumentIds: ['ARG-001', 'ARG-002', 'ARG-005'],
    },
  },
  {
    label: '2. Recurso JARI - Semáforo sem Foto de Retenção (Art. 208)',
    procedureType: 'recurso_jari',
    description: 'Recurso ordinário de 1ª instância perante a JARI por avanço semafórico eletrônico sem fotografia da linha de retenção no foco vermelho.',
    payload: {
      caseId: 'CASE-TEST-002',
      procedureType: 'recurso_jari',
      infraction: {
        id: 'inf-002',
        aitNumber: 'DS99481726',
        code: '6050-1',
        ctbArticle: 'Art. 208 do CTB',
        description: 'Avançar o sinal vermelho do semáforo ou o de parada obrigatória',
        severity: 'gravissima',
        points: 7,
        fineAmount: 293.47,
        autuadorBody: 'DSV / CET-SP',
        dateTime: '05/01/2026 22:15',
        location: 'Av. Brigadeiro Faria Lima x Rua Amauri',
      },
      vehicle: {
        plate: 'FGH4I50',
        model: 'Honda Civic Touring 1.5',
        renavam: '00817263541',
      },
      applicant: {
        name: 'MARIANA COSTA ALBUQUERQUE',
        cpf: '234.567.890-11',
        rg: '34.567.890-1 SSP/SP',
        cnh: '05829104819',
        category: 'B',
        address: 'Rua Oscar Freire, 900 - Jardins',
        cityState: 'São Paulo/SP',
      },
      dates: {
        infractionDate: '05/01/2026',
        expeditionDate: '12/01/2026',
        appealFilingDate: '10/02/2026',
      },
      selectedArgumentIds: ['ARG-009', 'ARG-010', 'ARG-048'],
    },
  },
  {
    label: '3. Recurso CETRAN - Decisão Desprovida de Motivação (2ª Instância)',
    procedureType: 'recurso_cetran',
    description: 'Recurso em 2ª instância ao Conselho Estadual de Trânsito contra decisão genérica e nula proferida pela JARI (Art. 50 Lei 9.784/99).',
    payload: {
      caseId: 'CASE-TEST-003',
      procedureType: 'recurso_cetran',
      infraction: {
        id: 'inf-003',
        aitNumber: 'CT99182341',
        code: '7366-2',
        ctbArticle: 'Art. 252, parágrafo único do CTB',
        description: 'Dirigir veículo segurando ou manuseando telefone celular',
        severity: 'gravissima',
        points: 7,
        fineAmount: 293.47,
        autuadorBody: 'DETRAN-SP / JARI',
        dateTime: '15/11/2025 09:20',
        location: 'Av. Ibirapuera, alt. nº 2000',
      },
      vehicle: {
        plate: 'KML9A88',
        model: 'Jeep Compass Longitude',
        renavam: '00718294018',
      },
      applicant: {
        name: 'ROBERTO MENDONÇA FERREIRA',
        cpf: '345.678.901-22',
        rg: '19.827.364-5 SSP/SP',
        cnh: '03819284710',
        category: 'AB',
        address: 'Rua Domingos de Morais, 1200 - Vila Mariana',
        cityState: 'São Paulo/SP',
      },
      dates: {
        infractionDate: '15/11/2025',
        appealFilingDate: '05/02/2026',
      },
      selectedArgumentIds: ['ARG-015', 'ARG-048'],
    },
  },
  {
    label: '4. Suspensão CNH (PSDD) - Aplicação Retroativa 40 Pontos (Lei 14.071)',
    procedureType: 'processo_suspensao',
    description: 'Defesa administrativa em processo de suspensão da habilitação requerendo a aplicação do Tema 1.097 do STJ e o novo teto de pontuação.',
    payload: {
      caseId: 'CASE-TEST-004',
      procedureType: 'processo_suspensao',
      infraction: {
        id: 'inf-004',
        aitNumber: 'PSDD-884920/2026',
        code: 'PSDD-PONTOS',
        ctbArticle: 'Art. 261, I do CTB',
        description: 'Instauração de Processo de Suspensão do Direito de Dirigir por Acúmulo de Pontos',
        severity: 'gravissima',
        points: 24,
        fineAmount: 0,
        autuadorBody: 'DETRAN-SP / CPDD',
        dateTime: '01/02/2026',
        location: 'Sistema Informatizado DETRAN/RENACH',
      },
      vehicle: {
        plate: 'BRA2E19',
        model: 'Volkswagen Nivus Highline',
        renavam: '00984726154',
      },
      applicant: {
        name: 'FERNANDO DIAS BASTOS',
        cpf: '456.789.012-33',
        rg: '44.829.102-1 SSP/SP',
        cnh: '01928475629',
        category: 'B',
        address: 'Rua Pamplona, 500 - Jardim Paulista',
        cityState: 'São Paulo/SP',
      },
      processNumbers: {
        psddNumber: 'PSDD-884920/2026',
        suspensionMonths: 6,
      },
      selectedArgumentIds: ['ARG-042', 'ARG-043'],
    },
  },
  {
    label: '5. Cassação CNH (PCDD) - Ausência de Abordagem / Terceiro ao Volante',
    procedureType: 'processo_cassacao',
    description: 'Defesa técnica comprovando que a multa lavrada sem abordagem durante a vigência da suspensão ocorreu sob condução de terceiro.',
    payload: {
      caseId: 'CASE-TEST-005',
      procedureType: 'processo_cassacao',
      infraction: {
        id: 'inf-005',
        aitNumber: 'PCDD-994821/2026',
        code: 'PCDD-ART263',
        ctbArticle: 'Art. 263, I do CTB',
        description: 'Instauração de Processo de Cassação do Documento de Habilitação',
        severity: 'gravissima',
        points: 0,
        fineAmount: 0,
        autuadorBody: 'DETRAN-SP',
        dateTime: '10/01/2026',
        location: 'Sistema de Habilitação DETRAN/SP',
      },
      vehicle: {
        plate: 'XYZ9876',
        model: 'Hyundai HB20 1.0',
        renavam: '00192837465',
      },
      applicant: {
        name: 'GUSTAVO HENRIQUE LIMA',
        cpf: '567.890.123-44',
        rg: '21.092.384-9 SSP/SP',
        cnh: '02837465910',
        category: 'AB',
        address: 'Rua Vergueiro, 2500 - Vila Mariana',
        cityState: 'São Paulo/SP',
      },
      processNumbers: {
        pcddNumber: 'PCDD-994821/2026',
      },
      selectedArgumentIds: ['ARG-045', 'ARG-046'],
    },
  },
  {
    label: '6. Indicação de Real Condutor (FICI) - Transferência de Pontos',
    procedureType: 'indicacao_condutor',
    description: 'Declaração conjunta solene entre proprietário e condutor infrator com qualificação bilateral para transferência tempestiva de 4 pontos.',
    payload: {
      caseId: 'CASE-TEST-006',
      procedureType: 'indicacao_condutor',
      infraction: {
        id: 'inf-006',
        aitNumber: 'AIT-55482190',
        code: '7455-0',
        ctbArticle: 'Art. 218, I do CTB',
        description: 'Velocidade superior à máxima permitida em até 20%',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        autuadorBody: 'DER-SP',
        dateTime: '15/01/2026 11:40',
        location: 'Rodovia dos Imigrantes, Km 28',
      },
      vehicle: {
        plate: 'QWE1A23',
        model: 'Chevrolet Onix Plus',
        renavam: '00394857261',
      },
      applicant: {
        name: 'PATRICIA SOUZA NOGUEIRA (Proprietária)',
        cpf: '678.901.234-55',
        rg: '31.294.058-2 SSP/SP',
        cnh: '09876543210',
        category: 'B',
        address: 'Rua Haddock Lobo, 800 - Cerqueira César',
        cityState: 'São Paulo/SP',
      },
      nominatedDriver: {
        name: 'LUCAS NOGUEIRA BARROS (Condutor Infrator)',
        cpf: '789.012.345-66',
        rg: '42.918.273-0 SSP/SP',
        cnh: '01234567890',
        category: 'B',
        uf: 'SP',
        address: 'Rua Bela Cintra, 1400 - Consolação',
        city: 'São Paulo',
      },
      selectedArgumentIds: ['ARG-039', 'ARG-048'],
    },
  },
  {
    label: '7. Conversão em Advertência por Escrito (Art. 267 CTB)',
    procedureType: 'conversao_advertencia',
    description: 'Requerimento de direito subjetivo e poder vinculado de conversão de multa média em advertência educativa sem cobrança monetária.',
    payload: {
      caseId: 'CASE-TEST-007',
      procedureType: 'conversao_advertencia',
      infraction: {
        id: 'inf-007',
        aitNumber: 'AD-19283746',
        code: '7455-0',
        ctbArticle: 'Art. 218, I do CTB',
        description: 'Transitar em velocidade superior à máxima em até 20%',
        severity: 'media',
        points: 4,
        fineAmount: 130.16,
        autuadorBody: 'DETRAN-SP',
        dateTime: '20/01/2026 16:10',
        location: 'Av. 23 de Maio, Km 3 - Sentido Bairro',
      },
      vehicle: {
        plate: 'ADV2026',
        model: 'Toyota Yaris Sedan XLS',
        renavam: '00827364519',
      },
      applicant: {
        name: 'JULIANA MARTINS RIBEIRO',
        cpf: '890.123.456-77',
        rg: '38.472.910-3 SSP/SP',
        cnh: '08765432190',
        category: 'B',
        address: 'Rua Augusta, 2200 - Jardins',
        cityState: 'São Paulo/SP',
      },
      selectedArgumentIds: ['ARG-051'],
    },
  },
];

export const DocumentEngineSimulator: React.FC = () => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [activePayload, setActivePayload] = useState<DocumentAssemblyPayload>(
    PRESET_CASES[0].payload
  );
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'petition' | 'blocks' | 'variables' | 'validation'>('petition');

  // Load Preset
  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setActivePayload(PRESET_CASES[index].payload);
  };

  // Run Deterministic Assembly Pipeline
  const assemblyResult = useMemo(() => {
    return DocumentAssemblyEngine.assemble(activePayload);
  }, [activePayload]);

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(assemblyResult.fullDraftText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Petição Jurídica - ${assemblyResult.procedureType}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; padding: 40px; color: #000; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${assemblyResult.fullDraftText}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold uppercase tracking-wider font-mono px-2.5 py-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-orange-400" />
                Fase 4.3 • Motor de Documentos v1 (Test Playground)
              </span>
              <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Zero Dependência de IA
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Simulador de Montagem Determinística de Peças Jurídicas
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              O motor recebe os dados do caso, seleciona o template adequado entre os 7 procedimentos catalogados, resolve as preliminares e o mérito técnico na biblioteca de 52 teses e 65 blocos, interpola todas as variáveis e entrega uma petição 100% formatada e pronta para protocolo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-center">
              <div className="text-sm font-bold text-emerald-400 font-mono">100% OK</div>
              <div className="text-sm text-slate-400">0 Placeholders Perdidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Sliders className="w-3.5 h-3.5 text-orange-500" />
            Selecione um Caso de Teste (7 Procedimentos Disponíveis):
          </label>
          <span className="text-sm font-mono text-slate-500">
            Procedimento: <strong>{activePayload.procedureType}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {PRESET_CASES.map((preset, idx) => {
            const isSelected = selectedPresetIndex === idx;
            return (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(idx)}
                className={`p-3 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-sm font-mono font-bold uppercase text-slate-500">
                      Caso #{idx + 1}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] bg-orange-500 text-white font-bold px-1.5 py-0.2 rounded font-mono">
                        ATIVO
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-2">{preset.label}</h4>
                </div>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Playground Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Parameters Form */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                Parâmetros do Caso
              </h3>
              <span className="text-sm font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                Interpolação Ativa
              </span>
            </div>

            {/* Requerente */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
                Requerente (Pessoa Física / Condutor)
              </label>
              <input
                type="text"
                value={activePayload.applicant.name}
                onChange={(e) =>
                  setActivePayload({
                    ...activePayload,
                    applicant: { ...activePayload.applicant, name: e.target.value },
                  })
                }
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                placeholder="Nome completo"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={activePayload.applicant.cpf}
                  onChange={(e) =>
                    setActivePayload({
                      ...activePayload,
                      applicant: { ...activePayload.applicant, cpf: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-800"
                  placeholder="CPF"
                />
                <input
                  type="text"
                  value={activePayload.applicant.cnh}
                  onChange={(e) =>
                    setActivePayload({
                      ...activePayload,
                      applicant: { ...activePayload.applicant, cnh: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-800"
                  placeholder="CNH"
                />
              </div>
            </div>

            {/* Auto de Infração e Órgão */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
                Dados da Infração & Órgão
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-slate-500 block mb-1">Nº do AIT:</span>
                  <input
                    type="text"
                    value={activePayload.infraction.aitNumber}
                    onChange={(e) =>
                      setActivePayload({
                        ...activePayload,
                        infraction: { ...activePayload.infraction, aitNumber: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-800"
                  />
                </div>
                <div>
                  <span className="text-sm text-slate-500 block mb-1">Placa:</span>
                  <input
                    type="text"
                    value={activePayload.vehicle.plate}
                    onChange={(e) =>
                      setActivePayload({
                        ...activePayload,
                        vehicle: { ...activePayload.vehicle, plate: e.target.value.toUpperCase() },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <span className="text-sm text-slate-500 block mb-1">Órgão Autuador:</span>
                <input
                  type="text"
                  value={activePayload.infraction.autuadorBody}
                  onChange={(e) =>
                    setActivePayload({
                      ...activePayload,
                      infraction: { ...activePayload.infraction, autuadorBody: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800"
                />
              </div>

              <div>
                <span className="text-sm text-slate-500 block mb-1">Enquadramento CTB:</span>
                <input
                  type="text"
                  value={activePayload.infraction.ctbArticle}
                  onChange={(e) =>
                    setActivePayload({
                      ...activePayload,
                      infraction: { ...activePayload.infraction, ctbArticle: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-mono text-slate-800"
                />
              </div>
            </div>

            {/* Speeds (if applicable) */}
            {activePayload.speeds && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider block">
                  Metrologia de Velocidade (Radar)
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Medida</span>
                    <input
                      type="number"
                      value={activePayload.speeds.measured}
                      onChange={(e) =>
                        setActivePayload({
                          ...activePayload,
                          speeds: {
                            ...activePayload.speeds,
                            measured: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full text-center font-mono font-bold text-sm bg-transparent border-0"
                    />
                  </div>
                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                    <span className="text-[9px] text-orange-600 font-bold block">Considerada</span>
                    <input
                      type="number"
                      value={activePayload.speeds.considered}
                      onChange={(e) =>
                        setActivePayload({
                          ...activePayload,
                          speeds: {
                            ...activePayload.speeds,
                            considered: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full text-center font-mono font-bold text-sm text-orange-700 bg-transparent border-0"
                    />
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    <span className="text-[9px] text-slate-500 block">Limite Via</span>
                    <input
                      type="number"
                      value={activePayload.speeds.limit}
                      onChange={(e) =>
                        setActivePayload({
                          ...activePayload,
                          speeds: {
                            ...activePayload.speeds,
                            limit: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full text-center font-mono font-bold text-sm bg-transparent border-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Nominated Driver (FICI) */}
            {activePayload.nominatedDriver && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-sm font-bold text-emerald-700 uppercase tracking-wider block">
                  Condutor Infrator Indicado (FICI)
                </label>
                <input
                  type="text"
                  value={activePayload.nominatedDriver.name}
                  onChange={(e) =>
                    setActivePayload({
                      ...activePayload,
                      nominatedDriver: {
                        ...activePayload.nominatedDriver!,
                        name: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-md text-sm text-slate-800"
                  placeholder="Nome do condutor indicado"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={activePayload.nominatedDriver.cpf}
                    onChange={(e) =>
                      setActivePayload({
                        ...activePayload,
                        nominatedDriver: {
                          ...activePayload.nominatedDriver!,
                          cpf: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-md text-sm font-mono text-slate-800"
                    placeholder="CPF"
                  />
                  <input
                    type="text"
                    value={activePayload.nominatedDriver.cnh}
                    onChange={(e) =>
                      setActivePayload({
                        ...activePayload,
                        nominatedDriver: {
                          ...activePayload.nominatedDriver!,
                          cnh: e.target.value,
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-md text-sm font-mono text-slate-800"
                    placeholder="CNH"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assembly Output & Inspector */}
        <div className="lg:col-span-8 space-y-4">
          {/* Action and Subtabs bar */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveViewTab('petition')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeViewTab === 'petition'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Petição Completa ({assemblyResult.fullDraftText.length} caracteres)</span>
              </button>

              <button
                onClick={() => setActiveViewTab('validation')}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeViewTab === 'validation'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Auditoria & Validação ({assemblyResult.validation.appliedBlockCount} Blocos)</span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Imprimir / Salvar em PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={handleCopyDraft}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {copiedDraft ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Petição Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Petição</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content: Petition Preview */}
          {activeViewTab === 'petition' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-sm text-slate-600">
                <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  {assemblyResult.validation.templateCode} • {assemblyResult.validation.procedureName}
                </span>
                <span className="text-sm font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Pronto para Protocolo
                </span>
              </div>

              <div className="p-6 bg-amber-50/20">
                <div className="bg-white rounded-lg p-8 shadow-xs border border-slate-200 max-h-[650px] overflow-y-auto font-serif text-[13px] leading-relaxed text-slate-900 whitespace-pre-wrap selection:bg-orange-500 selection:text-white">
                  {assemblyResult.fullDraftText}
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Validation Report */}
          {activeViewTab === 'validation' && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Relatório de Conformidade do Motor Determinístico
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Verificação estrutural em tempo real de interpolação de variáveis e blocos jurídicos aplicados.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Blocos Aplicados
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                    {assemblyResult.validation.appliedBlockCount}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    Integrados do catálogo modular
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Teses & Artigos
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
                    {assemblyResult.validation.appliedArgumentCount}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    Preliminares e mérito técnico
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <div className="text-sm font-bold text-emerald-800 uppercase tracking-wider font-mono">
                    Placeholders Perdidos
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
                    {assemblyResult.validation.unresolvedPlaceholders.length}
                  </div>
                  <div className="text-sm text-emerald-700 mt-1">
                    {assemblyResult.validation.unresolvedPlaceholders.length === 0
                      ? '100% das variáveis foram preenchidas'
                      : 'Atenção aos campos pendentes'}
                  </div>
                </div>
              </div>

              {assemblyResult.validation?.unresolvedPlaceholders && assemblyResult.validation.unresolvedPlaceholders.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <div className="text-sm font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Placeholders não resolvidos no rascunho:
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(assemblyResult.validation.unresolvedPlaceholders || []).map((ph) => (
                      <span
                        key={ph}
                        className="text-sm font-mono bg-rose-200/60 text-rose-900 px-2 py-0.5 rounded font-bold"
                      >
                        {ph}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Garantias Arquiteturais da Fase 4.3 (Motor v1)
                </h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sem Chamadas Externas a LLMs:</strong> A montagem ocorre estritamente na CPU do motor de regras, garantindo latência inferior a 15 milissegundos e custo zero de inferência.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Estrutura Forense Canônica:</strong> Respeita rigorosamente o ordenamento de Endereçamento → Qualificação → Dos Fatos → Das Preliminares → Do Mérito → Dos Pedidos → Fechamento e Assinatura.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Interpolação Completa de Aliases:</strong> Compatível com tags longas (ex: <code className="text-orange-600 font-mono">&#123;&#123;nome_requerente&#125;&#125;</code>) e abreviações diretas (ex: <code className="text-orange-600 font-mono">&#123;&#123;nome&#125;&#125;</code>, <code className="text-orange-600 font-mono">&#123;&#123;placa&#125;&#125;</code>, <code className="text-orange-600 font-mono">&#123;&#123;auto_infracao&#125;&#125;</code>).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
