/**
 * @file AdminIntegrityTestView.tsx
 * DefesAi — Painel de Auditoria e Teste de Integridade E2E de Dados (Marca-d'Água)
 * 
 * Permite ao admin executar fluxos completos com dados marca-d'água (ex: NETTO TESTE 84721)
 * e validar a presença determinística de todos os campos no documento final, sem vazamento
 * de contexto ou contaminação cruzada.
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Download,
  Check,
  X,
  Layers,
  ArrowRight,
  Database,
  Printer
} from 'lucide-react';
import { DocumentAssemblyEngine } from '../../core/documents/document-assembly-engine';
import { mapCaseToAnalysisInput, mapAnalysisToDocumentInput, auditWatermarkIntegrity, WatermarkAuditResult } from '../../lib/mappers/case-mappers';
import { CaseDomain, ProcedureType } from '../../types';

interface PresetWatermark {
  id: string;
  name: string;
  watermarkToken: string;
  procedure: ProcedureType;
  clientName: string;
  cpf: string;
  cnh: string;
  plate: string;
  model: string;
  aitNumber: string;
  autuador: string;
  ctbArticle: string;
  description: string;
  cityState: string;
}

const PRESET_WATERMARKS: PresetWatermark[] = [
  {
    id: 'wm-netto-84721',
    name: 'Netto Teste 84721 (Padrão JARI SP)',
    watermarkToken: 'NETTO TESTE 84721',
    procedure: 'recurso_jari',
    clientName: 'Netto Teste 84721 da Silva',
    cpf: '847.210.999-00',
    cnh: '08472199881',
    plate: 'NET-8472',
    model: 'Honda Civic Touring 84721',
    aitNumber: 'AIT-NETTO-84721',
    autuador: 'DETRAN-SP',
    ctbArticle: 'Art. 218, Inciso II do CTB',
    description: 'Transitar em velocidade superior à máxima permitida em mais de 20% até 50%',
    cityState: 'São Paulo - SP',
  },
  {
    id: 'wm-defesa-previa-001',
    name: 'Defesa Prévia 001 (Notificação de Autuação)',
    watermarkToken: 'TESTE-001-NA',
    procedure: 'defesa_previa',
    clientName: 'Condutor Teste 001 Defesa Prévia',
    cpf: '111.222.333-44',
    cnh: '12345678901',
    plate: 'PRV-1001',
    model: 'Toyota Corolla Altis 2024',
    aitNumber: 'NA-99887711',
    autuador: 'CET-SP',
    ctbArticle: 'Art. 218, Inciso I do CTB',
    description: 'Transitar em velocidade superior à máxima permitida em até 20%',
    cityState: 'São Paulo - SP',
  },
  {
    id: 'wm-cetran-002',
    name: 'Recurso CETRAN 002 (2ª Instância Final)',
    watermarkToken: 'TESTE-002-CETRAN',
    procedure: 'recurso_cetran',
    clientName: 'Condutor Teste 002 Cetran Recurso',
    cpf: '222.333.444-55',
    cnh: '23456789012',
    plate: 'CET-2002',
    model: 'Volkswagen T-Cross Highline',
    aitNumber: 'CETRAN-RJ-445566',
    autuador: 'DETRAN-RJ',
    ctbArticle: 'Art. 165 do CTB',
    description: 'Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa',
    cityState: 'Rio de Janeiro - RJ',
  },
  {
    id: 'wm-suspensao-003',
    name: 'PSDD 003 (Processo Suspensão CNH)',
    watermarkToken: 'TESTE-003-PSDD',
    procedure: 'suspensao_cnh',
    clientName: 'Condutor Teste 003 Processo Suspensão',
    cpf: '333.444.555-66',
    cnh: '34567890123',
    plate: 'SUS-3003',
    model: 'Jeep Compass Limited',
    aitNumber: 'PSDD-MG-102030',
    autuador: 'DETRAN-MG',
    ctbArticle: 'Art. 261 do CTB',
    description: 'Processo de Suspensão do Direito de Dirigir por Acúmulo de Pontos',
    cityState: 'Belo Horizonte - MG',
  },
  {
    id: 'wm-fari-004',
    name: 'FARI 004 (Indicação de Condutor Infrator)',
    watermarkToken: 'TESTE-004-FARI',
    procedure: 'indicacao_condutor',
    clientName: 'Proprietário Teste 004 Indicação',
    cpf: '444.555.666-77',
    cnh: '45678901234',
    plate: 'FAR-4004',
    model: 'Hyundai HB20 Platinum',
    aitNumber: 'FARI-RS-778899',
    autuador: 'EPTC Porto Alegre',
    ctbArticle: 'Art. 257 do CTB',
    description: 'Formulário de Indicação do Real Condutor Infrator',
    cityState: 'Porto Alegre - RS',
  },
  {
    id: 'wm-advertencia-005',
    name: 'Advertência 005 (Art. 267 CTB)',
    watermarkToken: 'TESTE-005-ADV',
    procedure: 'conversao_advertencia',
    clientName: 'Condutor Teste 005 Ficha Limpa',
    cpf: '555.666.777-88',
    cnh: '56789012345',
    plate: 'ADV-5005',
    model: 'Chevrolet Onix Plus Premier',
    aitNumber: 'ADV-BA-334455',
    autuador: 'TRANSALVADOR',
    ctbArticle: 'Art. 267 do CTB',
    description: 'Requerimento de Conversão de Multa Leve/Média em Advertência por Escrito',
    cityState: 'Salvador - BA',
  },
];

export const AdminIntegrityTestView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<PresetWatermark>(PRESET_WATERMARKS[0]);
  const [customWatermark, setCustomWatermark] = useState<string>('NETTO TESTE 84721');
  const [customClientName, setCustomClientName] = useState<string>('Netto Teste 84721 da Silva');
  const [customCpf, setCustomCpf] = useState<string>('847.210.999-00');
  const [customPlate, setCustomPlate] = useState<string>('NET-8472');
  const [customAit, setCustomAit] = useState<string>('AIT-NETTO-84721');
  const [customProcedure, setCustomProcedure] = useState<ProcedureType>('recurso_jari');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<WatermarkAuditResult | null>(null);
  const [assembledDocText, setAssembledDocText] = useState<string>('');
  const [rawPayload, setRawPayload] = useState<any>(null);

  const handleSelectPreset = (p: PresetWatermark) => {
    setSelectedPreset(p);
    setCustomWatermark(p.watermarkToken);
    setCustomClientName(p.clientName);
    setCustomCpf(p.cpf);
    setCustomPlate(p.plate);
    setCustomAit(p.aitNumber);
    setCustomProcedure(p.procedure);
  };

  const handleExecuteIntegrityTest = () => {
    setIsRunning(true);

    try {
      // 1. Constrói CaseDomain com todos os dados da marca d'água
      const testCaseDomain: CaseDomain = {
        id: `case_integrity_${Date.now()}`,
        title: `Teste Integridade ${customWatermark}`,
        clientName: customClientName,
        clientCpf: customCpf,
        userId: 'admin_test_runner',
        status: 'analisado',
        currentStage: 1,
        serviceType: customProcedure,
        vehicle: {
          plate: customPlate,
          brandModel: selectedPreset.model,
          renavam: '12345678901',
        },
        infraction: {
          aitNumber: customAit,
          infractionCode: '745-50',
          description: `${selectedPreset.description} [${customWatermark}]`,
          ctbArticle: selectedPreset.ctbArticle,
          severity: 'grave',
          points: 5,
          fineAmount: 195.23,
          autuadorBody: selectedPreset.autuador,
          dateTime: new Date().toISOString(),
          location: selectedPreset.cityState,
        },
        applicant: {
          applicantName: customClientName,
          applicantCpf: customCpf,
          applicantRg: '12.345.678-9',
          applicantCnh: selectedPreset.cnh,
          cnhCategory: 'AB',
          applicantPhone: '(11) 98765-4321',
          applicantEmail: 'teste@defesai.com.br',
          addressStreet: 'Avenida Paulista',
          addressNumber: '1000',
          addressNeighborhood: 'Bela Vista',
          addressZipCode: '01310-100',
          addressCityState: selectedPreset.cityState,
          factsNarrative: `O requerente vem por meio desta demonstrar a inconsistência formal do auto de infração nº ${customAit}, marca identificadora ${customWatermark}.`,
        },
        timeline: [],
        isPaid: true,
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Mapeamento explícito via case-mappers
      const analysisInput = mapCaseToAnalysisInput(testCaseDomain);
      const documentPayload = mapAnalysisToDocumentInput(testCaseDomain, undefined, testCaseDomain.applicant);
      setRawPayload({ analysisInput, documentPayload });

      // 3. Montagem determinística da peça
      const assembledDraft = DocumentAssemblyEngine.assemble(documentPayload);
      const fullText = assembledDraft.fullDraftText || '';
      setAssembledDocText(fullText);

      // 4. Auditoria de marca d'água e contaminação cruzada
      const simulatedForeignCases: CaseDomain[] = [
        {
          id: 'foreign_1',
          title: 'Caso Estranho de Terceiro',
          clientName: 'João Silva Estranho',
          clientCpf: '999.888.777-66',
          vehicle: { plate: 'XYZ-9999', brandModel: 'Carro Estranho' },
          status: 'novo',
          currentStage: 1,
          serviceType: 'recurso_jari',
          infraction: {
            aitNumber: 'AIT-ESTRANHO-999',
            description: 'Infração de Terceiro',
            ctbArticle: 'Art. 181 do CTB',
            severity: 'media',
            points: 4,
            fineAmount: 130.16,
            autuadorBody: 'DETRAN-RJ',
            dateTime: new Date().toISOString(),
            location: 'Rio de Janeiro - RJ',
          },
          timeline: [],
          isPaid: false,
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const audit = auditWatermarkIntegrity(customWatermark, testCaseDomain, fullText, simulatedForeignCases);
      setAuditResult(audit);
    } catch (err: any) {
      console.error('Erro na auditoria de integridade:', err);
      alert(`Falha ao executar teste: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-orange-400 uppercase tracking-wider font-mono">
                ADMIN QA • AUDITORIA DETERMINÍSTICA DE MARCA-D'ÁGUA
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white font-mono tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              Validador de Integridade & Single Source of Truth
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Gera fluxos ponta a ponta com carimbo de marca-d'água explícito e verifica se 100% dos dados qualificados
              (nome, CPF, CNH, placa, AIT, órgão, artigos) constam com fidelidade absoluta na peça jurídica final, sem
              contaminação de sessões externas.
            </p>
          </div>

          <button
            id="btn-run-integrity-test"
            onClick={handleExecuteIntegrityTest}
            disabled={isRunning}
            className="px-6 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Auditando...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Executar Auditoria de Marca-d'Água</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Seletor de Presets de Marca-d'Água */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Presets & Configuração */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400" />
              Presets de Teste por Serviço
            </h2>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {PRESET_WATERMARKS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-950/40 border-orange-500/80 text-white shadow-xs'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-orange-400">{preset.watermarkToken}</span>
                      <span className="text-2xs uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {preset.procedure}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 mt-1 truncate">{preset.name}</div>
                    <div className="text-2xs text-slate-500 mt-0.5 truncate">{preset.clientName} • {preset.plate}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dados do Teste Atual */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h2 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              Parâmetros da Marca-d'Água
            </h2>
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block text-2xs uppercase font-mono">Marca-d'Água Token</label>
                <input
                  type="text"
                  value={customWatermark}
                  onChange={(e) => setCustomWatermark(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-orange-300 font-mono text-xs focus:border-orange-500 outline-hidden"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-2xs uppercase font-mono">Requerente</label>
                <input
                  type="text"
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 text-xs focus:border-orange-500 outline-hidden"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block text-2xs uppercase font-mono">CPF</label>
                  <input
                    type="text"
                    value={customCpf}
                    onChange={(e) => setCustomCpf(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-xs focus:border-orange-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-2xs uppercase font-mono">Placa</label>
                  <input
                    type="text"
                    value={customPlate}
                    onChange={(e) => setCustomPlate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-xs focus:border-orange-500 outline-hidden"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-400 block text-2xs uppercase font-mono">Número AIT</label>
                <input
                  type="text"
                  value={customAit}
                  onChange={(e) => setCustomAit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 font-mono text-xs focus:border-orange-500 outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Central e Direita: Resultados da Auditoria & Scorecard */}
        <div className="lg:col-span-2 space-y-4">
          {auditResult ? (
            <>
              {/* Placar de Integridade */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <span className="text-2xs font-mono uppercase text-slate-400">Score de Integridade E2E</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-3xl font-extrabold font-mono ${
                        auditResult.integrityScorePercent === 100 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {auditResult.integrityScorePercent}%
                      </span>
                      <span className="text-xs text-slate-400">
                        ({auditResult.matchedCount} de {auditResult.totalFields} campos determinísticos validados)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {auditResult.crossContaminationDetected ? (
                      <span className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-800 text-red-400 text-xs font-bold font-mono flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        CONTAMINAÇÃO CRUZADA DETECTADA
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        ISOLAMENTO TOTAL DE SESSÃO: OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid de Validação de Campos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {auditResult.matchedFields.map((field, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                        field.foundInDocument
                          ? 'bg-slate-950 border-emerald-900/60 text-slate-300'
                          : 'bg-red-950/30 border-red-800 text-red-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-200">{field.field}</div>
                        <div className="text-2xs font-mono text-slate-400 truncate">{field.expectedValue}</div>
                      </div>
                      <div className="shrink-0">
                        {field.foundInDocument ? (
                          <span className="w-6 h-6 rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center font-bold">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center font-bold">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pré-visualização da Peça Gerada com Realce de Marca-d'Água */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Visualizador de Peça Jurídica Montada
                  </h2>
                  <span className="text-2xs text-slate-400 font-mono">{assembledDocText.length} caracteres</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
                  {assembledDocText}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-orange-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-mono">Nenhum teste de integridade em execução</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Selecione um preset de marca-d'água à esquerda ou preencha os parâmetros personalizados e clique em "Executar Auditoria de Marca-d'Água".
                </p>
              </div>
              <button
                onClick={handleExecuteIntegrityTest}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs font-mono inline-flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Iniciar Teste com Preset Atual</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
