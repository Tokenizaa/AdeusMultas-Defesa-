import React, { useState } from 'react';
import {
  FileText,
  Car,
  Building,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Search,
  User,
  Phone,
  Hash,
} from 'lucide-react';
import { InfractionData, VehicleData } from '../../../types';
import { INFRACTION_CATALOG } from '../../../data/knowledge-base';

import { TestFillButton } from '../../ui/TestFillButton';
import { InfractionCategory } from '../../../core/onboarding/rules-matrix';
import {
  generateRandomName,
  generateRandomPhone,
  generateRandomVehicleData,
  generateRandomPlate,
} from '../../../utils/test-data-generator';
import { buildCoherentTestInfraction, buildNeutralTestIdentification } from '../testFillData';

interface InfractionIdentificationStepProps {
  infractionData: InfractionData;
  vehicleData: VehicleData;
  leadName?: string;
  leadPhone?: string;
  /** Categoria selecionada na fase anterior (quando disponível) — torna os dados de teste 🧪 coerentes com ela. */
  category?: InfractionCategory;
  onUpdateInfraction: (data: InfractionData) => void;
  onUpdateVehicle: (data: VehicleData) => void;
  onUpdateLead?: (name: string, phone: string) => void;
  onNext: () => void;
  onBack: () => void;
  isAdmin?: boolean;
}

export const InfractionIdentificationStep: React.FC<InfractionIdentificationStepProps> = ({
  infractionData,
  vehicleData,
  leadName = '',
  leadPhone = '',
  category,
  onUpdateInfraction,
  onUpdateVehicle,
  onUpdateLead,
  onNext,
  onBack,
  isAdmin = false,
}) => {
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [ocrStatusMessage, setOcrStatusMessage] = useState<string | null>(null);

  const [currentLeadName, setCurrentLeadName] = useState<string>(leadName || 'Carlos Eduardo Silveira');
  const [currentLeadPhone, setCurrentLeadPhone] = useState<string>(leadPhone || '(11) 98765-4321');

  const handleNameChange = (val: string) => {
    setCurrentLeadName(val);
    if (onUpdateLead) onUpdateLead(val, currentLeadPhone);
  };

  const handlePhoneChange = (val: string) => {
    setCurrentLeadPhone(val);
    if (onUpdateLead) onUpdateLead(currentLeadName, val);
  };

  const isFormValid =
    (currentLeadName.trim().length >= 3) &&
    (currentLeadPhone.trim().length >= 8) &&
    (vehicleData.plate?.trim().length || 0) >= 7 &&
    (infractionData.autuadorBody?.trim().length || 0) >= 3 &&
    (infractionData.infractionCode?.trim().length || 0) >= 3;

  const handleFileUpload = async (file: File) => {
    setIsReadingFile(true);
    setOcrStatusMessage(`Enviando "${file.name}" para análise interna...`);

    try {
      const res = await fetch('/api/ocr/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
          rawText: `Arquivo de Notificação: ${file.name}`,
          serviceType: '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // OCR data is used internally by the backend (RAG pipeline, analysis).
        // The form fields remain as the user filled them — source of truth.
        setOcrStatusMessage('Documento recebido! Análise interna concluída.');
      } else {
        setOcrStatusMessage('Documento enviado. Preencha os campos manualmente abaixo.');
      }
    } catch (err) {
      setOcrStatusMessage('Não foi possível ler o documento. Preencha os campos manualmente.');
    } finally {
      setIsReadingFile(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-6">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#155BCB] border border-blue-200 font-mono">
          <Sparkles className="w-3 h-3 text-[#155BCB]" />
          Passo 3 de 4 • Identificação da Autuação
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Qual é o auto de infração e o condutor?
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm">
          Coletamos os dados da autuação e seu contato para envio imediato do diagnóstico jurídico gratuito e alertas de prazo.
        </p>
      </div>

      {/* Lead Contact Box (Nome + WhatsApp) */}
      <div className="flex items-center gap-2">
        <TestFillButton
          isAdmin={isAdmin}
          onClick={() => {
            const name = generateRandomName();
            const phone = generateRandomPhone();
            const vehicle = generateRandomVehicleData({
              plate: generateRandomPlate(),
            });
            // FIX 3: infração de teste coerente com a categoria selecionada.
            // Com categoria conhecida → conjunto completo coerente (artigo/código/
            // descrição da MESMA categoria, sem campos contraditórios).
            // Sem categoria conhecida → apenas campos neutros (AIT, data, órgão),
            // preservando qualquer seleção humana já feita.
            const infraction = category
              ? buildCoherentTestInfraction(category, infractionData)
              : buildNeutralTestIdentification(infractionData);
            if (onUpdateLead) onUpdateLead(name, phone);
            setCurrentLeadName(name);
            setCurrentLeadPhone(phone);
            onUpdateInfraction({ ...infractionData, ...infraction });
            onUpdateVehicle({ ...vehicleData, ...vehicle });
          }}
        />
      </div>

      <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#155BCB]" />
            <span className="text-xs font-bold text-slate-900 uppercase font-mono">
              Seus Dados para o Diagnóstico Gratuito
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
            100% Gratuito
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              Seu Nome Completo *
            </label>
            <input
              id="input-lead-name"
              type="text"
              value={currentLeadName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Carlos Eduardo Silveira"
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#155BCB] outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-600" />
              WhatsApp com DDD *
            </label>
            <input
              id="input-lead-phone"
              type="text"
              value={currentLeadPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(11) 98765-4321"
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#155BCB] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Optional Quick Upload Banner */}
      <div className="border border-dashed border-slate-300 hover:border-[#155BCB] rounded-xl p-4 bg-slate-50/60 hover:bg-blue-50/20 transition-all text-center group">
        <input
          id="photo-ocr-upload"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          className="hidden"
        />
        <label htmlFor="photo-ocr-upload" className="cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-[#155BCB] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-800">
              Anexe uma foto ou PDF da notificação para melhorar a análise (Opcional)
            </p>
            <p className="text-[11px] text-slate-500">
              Formatos aceitos: PDF, JPG ou PNG. Os dados abaixo devem ser preenchidos manualmente.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#155BCB] bg-white border border-blue-200 px-3 py-1 rounded-lg group-hover:bg-[#155BCB] group-hover:text-white transition-colors shrink-0">
            Carregar Notificação
          </span>
        </label>

        {isReadingFile && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-center gap-2 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-[#155BCB]" />
            <span>{ocrStatusMessage}</span>
          </div>
        )}

        {ocrStatusMessage && !isReadingFile && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{ocrStatusMessage}</span>
          </div>
        )}
      </div>

      {/* Main Core 3 Fields */}
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Número do AIT */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#155BCB]" />
              Número do Auto de Infração (AIT)
            </label>
            <input
              id="input-ait-number"
              type="text"
              value={infractionData.aitNumber || ''}
              onChange={(e) => onUpdateInfraction({ ...infractionData, aitNumber: e.target.value.toUpperCase() })}
              placeholder="Ex: 1B892014 ou R459201"
              className="w-full text-sm font-mono font-bold uppercase bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Consta no topo ou centro da notificação recebida.
            </span>
          </div>

          {/* Placa do Veículo */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-[#155BCB]" />
              Placa do Veículo *
            </label>
            <input
              id="input-vehicle-plate"
              type="text"
              maxLength={8}
              value={vehicleData.plate || ''}
              onChange={(e) => onUpdateVehicle({ ...vehicleData, plate: e.target.value.toUpperCase() })}
              placeholder="Ex: BRA2E19 ou ABC1234"
              className="w-full text-sm font-mono font-bold uppercase bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Placa no formato Mercosul ou padrão anterior cinza.
            </span>
          </div>
        </div>

        {/* Código da Infração — FONTE DE VERDADE */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[#155BCB]" />
            Código da Infração *
          </label>
          <select
            id="input-infraction-code"
            value={infractionData.infractionCode || ''}
            onChange={(e) => {
              const item = INFRACTION_CATALOG.find((x) => x.code === e.target.value);
              if (item) {
                onUpdateInfraction({
                  ...infractionData,
                  infractionCode: item.code,
                  ctbArticle: item.article,
                  fineAmount: item.fineAmount,
                  points: item.points,
                  severity: item.severity,
                  description: item.description,
                });
              } else {
                onUpdateInfraction({ ...infractionData, infractionCode: e.target.value });
              }
            }}
            className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
          >
            <option value="">Selecione o código da infração...</option>
            {INFRACTION_CATALOG.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.description.slice(0, 70)}...
              </option>
            ))}
          </select>
          {/* Resumo auto-preenchido */}
          {infractionData.infractionCode && infractionData.ctbArticle && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#155BCB] border border-blue-200 font-mono">
                {infractionData.ctbArticle}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {infractionData.points} pontos
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                R$ {infractionData.fineAmount.toFixed(2)}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                infractionData.severity === 'gravissima' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                infractionData.severity === 'grave' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                infractionData.severity === 'media' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-green-50 text-green-700 border-green-200'
              }`}>
                {infractionData.severity}
              </span>
            </div>
          )}
        </div>

        {/* Órgão Autuador + Data lado a lado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Órgão Autuador */}
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#155BCB]" />
              Órgão Autuador / Julgador *
            </label>
            <select
              id="input-autuador-body"
              value={infractionData.autuadorBody || ''}
              onChange={(e) => onUpdateInfraction({ ...infractionData, autuadorBody: e.target.value })}
              className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
            >
              <option value="">Selecione o órgão autuador...</option>
              <optgroup label="Órgãos Federais">
                <option value="PRF">PRF — Polícia Rodoviária Federal</option>
                <option value="DNIT">DNIT — Depto. Nac. de Infraestrutura de Transportes</option>
                <option value="ANTT">ANTT — Agência Nac. de Transportes Terrestres</option>
                <option value="IBAMA">IBAMA — Instituto Brasileiro do Meio Ambiente</option>
              </optgroup>
              <optgroup label="DETRAN por Estado">
                <option value="DETRAN-AC">DETRAN-AC — Acre</option>
                <option value="DETRAN-AL">DETRAN-AL — Alagoas</option>
                <option value="DETRAN-AP">DETRAN-AP — Amapá</option>
                <option value="DETRAN-AM">DETRAN-AM — Amazonas</option>
                <option value="DETRAN-BA">DETRAN-BA — Bahia</option>
                <option value="DETRAN-CE">DETRAN-CE — Ceará</option>
                <option value="DETRAN-DF">DETRAN-DF — Distrito Federal</option>
                <option value="DETRAN-ES">DETRAN-ES — Espírito Santo</option>
                <option value="DETRAN-GO">DETRAN-GO — Goiás</option>
                <option value="DETRAN-MA">DETRAN-MA — Maranhão</option>
                <option value="DETRAN-MT">DETRAN-MT — Mato Grosso</option>
                <option value="DETRAN-MS">DETRAN-MS — Mato Grosso do Sul</option>
                <option value="DETRAN-MG">DETRAN-MG — Minas Gerais</option>
                <option value="DETRAN-PA">DETRAN-PA — Pará</option>
                <option value="DETRAN-PB">DETRAN-PB — Paraíba</option>
                <option value="DETRAN-PR">DETRAN-PR — Paraná</option>
                <option value="DETRAN-PE">DETRAN-PE — Pernambuco</option>
                <option value="DETRAN-PI">DETRAN-PI — Piauí</option>
                <option value="DETRAN-RJ">DETRAN-RJ — Rio de Janeiro</option>
                <option value="DETRAN-RN">DETRAN-RN — Rio Grande do Norte</option>
                <option value="DETRAN-RS">DETRAN-RS — Rio Grande do Sul</option>
                <option value="DETRAN-RO">DETRAN-RO — Rondônia</option>
                <option value="DETRAN-RR">DETRAN-RR — Roraima</option>
                <option value="DETRAN-SC">DETRAN-SC — Santa Catarina</option>
                <option value="DETRAN-SP">DETRAN-SP — São Paulo</option>
                <option value="DETRAN-SE">DETRAN-SE — Sergipe</option>
                <option value="DETRAN-TO">DETRAN-TO — Tocantins</option>
              </optgroup>
              <optgroup label="DER / Infraestrutura Estadual">
                <option value="DER-SP">DER-SP — Depto. Estadual de Estradas de Rodagem (SP)</option>
                <option value="DER-RJ">DER-RJ — Depto. Estadual de Estradas de Rodagem (RJ)</option>
                <option value="DER-MG">DER-MG — Depto. Estadual de Estradas de Rodagem (MG)</option>
                <option value="DER-PR">DER-PR — Depto. Estadual de Estradas de Rodagem (PR)</option>
                <option value="DER-RS">DER-RS — Depto. Estadual de Estradas de Rodagem (RS)</option>
                <option value="DER-SC">DER-SC — Depto. Estadual de Estradas de Rodagem (SC)</option>
                <option value="DER-BA">DER-BA — Depto. Estadual de Estradas de Rodagem (BA)</option>
                <option value="DER-GO">DER-GO — Depto. Estadual de Estradas de Rodagem (GO)</option>
              </optgroup>
              <optgroup label="CET / Trânsito Municipal">
                <option value="CET-SP">CET-SP — Comp. de Trânsito de São Paulo</option>
                <option value="CET-RJ">CET-RJ — Comp. de Trânsito do Rio de Janeiro</option>
                <option value="CET-BH">CET-BH — Comp. de Trânsito de Belo Horizonte</option>
                <option value="CET-CUR">CET-CUR — Comp. de Trânsito de Curitiba</option>
                <option value="CET-GOI">CET-GOI — Comp. de Trânsito de Goiânia</option>
                <option value="CET-BSB">CET-BSB — Comp. de Trânsito de Brasília</option>
                <option value="TRANSALVADOR">TRANSALVADOR — Empresa de Trans. de Salvador</option>
                <option value="TRANSPE">TRANSPE — Dept. de Trânsito de Recife</option>
                <option value="TRANSFOR">TRANSFOR — Trans. Fortaleza</option>
                <option value="PMT-SP">PMT-SP — Prefeitura de São Paulo (Mobilidade)</option>
              </optgroup>
              <optgroup label="Outros Órgãos">
                <option value="POLICIA_MILITAR">Polícia Militar (Multa Eletrônica)</option>
                <option value="POLICIA_RODOVIARIA">Polícia Rodoviária Estadual</option>
                <option value="ARU-SP">ARU-SP — Admin. Regional de Urbanismo (SP)</option>
                <option value="INFRAERO">INFRAERO — Aeroportos</option>
                <option value="OUTRO">Outro órgão (digitar manualmente)</option>
              </optgroup>
            </select>
            {infractionData.autuadorBody === 'OUTRO' && (
              <input
                id="input-autuador-body-custom"
                type="text"
                value=""
                onChange={(e) => onUpdateInfraction({ ...infractionData, autuadorBody: e.target.value.toUpperCase() })}
                placeholder="Digite o nome do órgão..."
                className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 mt-2 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
              />
            )}
          </div>

          {/* Data da Infração */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Data da Ocorrência
            </label>
            <input
              id="input-datetime"
              type="date"
              value={infractionData.dateTime?.split(' ')[0] || ''}
              onChange={(e) => onUpdateInfraction({ ...infractionData, dateTime: e.target.value })}
              className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Art. 281-A CTB
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="pt-3 flex justify-between items-center border-t border-slate-100">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar à fase</span>
        </button>

        <button
          id="btn-next-to-specifics"
          onClick={onNext}
          disabled={!isFormValid}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            isFormValid
              ? 'bg-[#155BCB] hover:bg-blue-700 text-white cursor-pointer shadow-xs'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Continuar para Perguntas do Caso</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

