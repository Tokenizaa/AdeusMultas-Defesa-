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
    MapPin,
    Landmark,
} from 'lucide-react';
import { InfractionData, VehicleData } from '../../../types';
import { useAuthFetch } from '../../../hooks/useAuthFetch';
import { INFRACTION_CATALOG } from '../../../data/knowledge-base';

import { TestFillButton } from '../../ui/TestFillButton';
import { InfractionCategory } from '../../../core/onboarding/rules-matrix';
import { buildCompleteTestIdentificationFixture } from '../testFillData';

type BrazilianDateInputProps = {
    id: string;
    value?: string;
    onChange: (isoDate: string) => void;
    required?: boolean;
};

function isoToBrazilianDate(value?: string): string {
    const iso = toDateInputValue(value);
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
}

function brazilianDateToIso(value: string): string | undefined {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    const [, day, month, year] = match;
    const iso = `${year}-${month}-${day}`;
    return toDateInputValue(iso) === iso ? iso : undefined;
}

function formatBrazilianDateTyping(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function BrazilianDateInput({ id, value, onChange, required }: BrazilianDateInputProps) {
    const [displayValue, setDisplayValue] = useState(() => isoToBrazilianDate(value));

    React.useEffect(() => {
        setDisplayValue(isoToBrazilianDate(value));
    }, [value]);

    return (
        <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            required={required}
            value={displayValue}
            onChange={(event) => {
                const next = formatBrazilianDateTyping(event.target.value);
                setDisplayValue(next);
                if (!next) {
                    onChange('');
                    return;
                }
                const iso = brazilianDateToIso(next);
                if (iso) onChange(iso);
            }}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
        />
    );
}

/** Normaliza datas do formulário para o formato exigido por <input type="date">.
 * Aceita YYYY-MM-DD e timestamps ISO (YYYY-MM-DDTHH:mm:ss.sssZ).
 * Datas inválidas viram string vazia, nunca um valor que o navegador não exibe.
 */
function toDateInputValue(value?: string): string {
    const datePart = value?.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!datePart) return '';
    const parsed = new Date(`${datePart}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === datePart
        ? datePart
        : '';
}

// Mapa de categoria do wizard → códigos da infração (baseado no catálogo)
// Usado para filtrar o <select> de código da infração pela categoria escolhida na etapa 3.
export const CATEGORY_CODE_MAP: Record<InfractionCategory, string[]> = {
  excesso_velocidade: ['745-50', '746-30', '745-70', '747-10'],
  lei_seca: ['757-90', '516-91'],
  celular: ['736-62'],
  vermelho: ['605-01', '605-02'],
  estacionamento: ['545-21', '554-12'],
  indicacao_condutor: [],
  // Art. 267 CTB: o catálogo atual só contém estas infrações médias elegíveis.
  conversao_advertencia: ['745-50', '736-62', '735-80', '685-80'],
  cnh_geral: [],
  outro: [],
};

interface InfractionIdentificationStepProps {
    infractionData: InfractionData;
    vehicleData: VehicleData;
    leadName?: string;
    leadPhone?: string;
    /** Categoria selecionada na fase anterior (quando disponível) — torna os dados de teste 🧪 coerentes com ela. */
    category?: InfractionCategory;
    totalSteps?: number;
    stepNumber?: number;
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
    totalSteps = 4,
    stepNumber = 4,
    onUpdateInfraction,
    onUpdateVehicle,
    onUpdateLead,
    onNext,
    onBack,
    isAdmin = false,
}) => {
    const authFetch = useAuthFetch();
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [ocrStatusMessage, setOcrStatusMessage] = useState<string | null>(null);

    const [currentLeadName, setCurrentLeadName] = useState<string>(leadName || '');
    const [currentLeadPhone, setCurrentLeadPhone] = useState<string>(leadPhone || '');

    React.useEffect(() => {
        setCurrentLeadName(leadName || '');
    }, [leadName]);

    React.useEffect(() => {
        setCurrentLeadPhone(leadPhone || '');
    }, [leadPhone]);

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
        (infractionData.infractionCode?.trim().length || 0) >= 3 &&
        (infractionData.location?.trim().length || 0) >= 5 &&
        /^\d{4}-\d{2}-\d{2}$/.test(toDateInputValue(infractionData.dateTime)) &&
        (infractionData.autuadorBody?.trim().length || 0) >= 3 &&
        (infractionData.aitNumber?.trim().length || 0) >= 3;

    const handleFileUpload = async (file: File) => {
        setIsReadingFile(true);
        setOcrStatusMessage(`Enviando "${file.name}" para análise interna...`);

        try {
            const res = await authFetch('/api/ocr/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rawText: `Arquivo de Notificação: ${file.name}`,
                    serviceType: '',
                }),
            });
            const data = await res.json();
            if (data.success && data.extractedData) {
                // Merge OCR extracted data into form state (source of truth)
                const extracted = data.extractedData;
                const infraction = extracted.infraction;
                const vehicle = extracted.vehicle;
                
                if (infraction) {
                    onUpdateInfraction({
                        ...infractionData,
                        aitNumber: infraction.aitNumber || infractionData.aitNumber,
                        infractionCode: infraction.infractionCode || infractionData.infractionCode,
                        description: infraction.description || infractionData.description,
                        ctbArticle: infraction.ctbArticle || infractionData.ctbArticle,
                        severity: infraction.severity || infractionData.severity,
                        points: infraction.points || infractionData.points,
                        fineAmount: infraction.fineAmount || infractionData.fineAmount,
                        autuadorBody: infraction.autuadorBody || infractionData.autuadorBody,
                        notificationExpeditionDate: infraction.notificationExpeditionDate || infractionData.notificationExpeditionDate,
                        notificationDeliveryDate: infraction.notificationDeliveryDate || infractionData.notificationDeliveryDate,
                        defenseDeadline: infraction.defenseDeadline || infractionData.defenseDeadline,
                        dateTime: infraction.dateTime || infractionData.dateTime,
                        location: infraction.location || infractionData.location,
                    });
                }
                
                if (vehicle?.plate) {
                    onUpdateVehicle({
                        ...vehicleData,
                        plate: vehicle.plate,
                        renavam: vehicle.renavam || vehicleData.renavam,
                    });
                }
                
                setOcrStatusMessage('Documento processado! Dados preenchidos automaticamente. Revise antes de continuar.');
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
                    {`Passo ${stepNumber} de ${totalSteps} • Identificação da Autuação`}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Dados da autuação e do condutor
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm">
                    Coletamos os dados da autuação e seu contato para o diagnóstico jurídico gratuito.
                </p>
            </div>

            {/* Lead Contact Box (Nome + WhatsApp) */}
            <div className="flex items-center gap-2">
                <TestFillButton
                    isAdmin={isAdmin}
                    onClick={() => {
                        const fixture = buildCompleteTestIdentificationFixture(category, infractionData);
                        if (onUpdateLead) onUpdateLead(fixture.leadName, fixture.leadPhone);
                        setCurrentLeadName(fixture.leadName);
                        setCurrentLeadPhone(fixture.leadPhone);
                        onUpdateInfraction(fixture.infractionData);
                        onUpdateVehicle(fixture.vehicleData);
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
                        <label htmlFor="input-lead-name" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1 flex items-center gap-1">
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
                        <label htmlFor="input-lead-phone" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1 flex items-center gap-1">
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
                        Formatos aceitos: PDF, JPG ou PNG. O upload faz OCR e preenche os campos automaticamente. Revise antes de continuar.
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
                        <label htmlFor="input-ait-number" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
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
                        <label htmlFor="input-vehicle-plate" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
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

                {/* Órgão autuador é indispensável para endereçar a peça formal. */}
                <div>
                    <label htmlFor="input-autuador-body" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-[#155BCB]" />
                        Órgão Autuador *
                    </label>
                    <input
                        id="input-autuador-body"
                        type="text"
                        list="autuador-body-options"
                        role="combobox"
                        aria-autocomplete="list"
                        value={infractionData.autuadorBody || ''}
                        onChange={(e) => onUpdateInfraction({ ...infractionData, autuadorBody: e.target.value })}
                        placeholder="Ex: DETRAN-SP, CET-SP, PRF ou órgão municipal"
                        className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        Consta no cabeçalho da notificação. Não informe “não informado” para gerar a peça formal.
                    </span>
                    <datalist id="autuador-body-options">
                        <option value="DETRAN-SP" />
                        <option value="DETRAN-RJ" />
                        <option value="DETRAN-MG" />
                        <option value="CET-SP / DSV" />
                        <option value="DER-SP" />
                        <option value="PRF" />
                        <option value="DNIT" />
                        <option value="Órgão municipal de trânsito" />
                    </datalist>
                </div>

                {/* Código da Infração — FONTE DE VERDADE */}
                <div>
                    <label htmlFor="input-infraction-code" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
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
                        {category && CATEGORY_CODE_MAP[category]?.length
                          ? CATEGORY_CODE_MAP[category].map((code) => {
                              const item = INFRACTION_CATALOG.find((x) => x.code === code);
                              return item ? (
                                <option key={item.code} value={item.code}>
                                  {item.code} — {item.description.slice(0, 70)}...
                                </option>
                              ) : null;
                            })
                          : INFRACTION_CATALOG.map((item) => (
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

                {/* Data da Infração + Data Expedição Notificação + Prazo Defesa */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Data da Infração */}
                    <div>
                        <label htmlFor="input-datetime" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Data da Ocorrência
                        </label>
                        <BrazilianDateInput
                            id="input-datetime"
                            value={infractionData.dateTime}
                            onChange={(value) => onUpdateInfraction({ ...infractionData, dateTime: value })}
                            required
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                            Prazo de decadência (Art. 281, §1º, II CTB)
                        </span>
                    </div>

                    {/* Data de Expedição da Notificação */}
                    <div>
                        <label htmlFor="input-notification-expedition-date" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-600" />
                            Data Expedição Notificação
                        </label>
                        <BrazilianDateInput
                            id="input-notification-expedition-date"
                            value={infractionData.notificationExpeditionDate}
                            onChange={(value) => onUpdateInfraction({ ...infractionData, notificationExpeditionDate: value })}
                            
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                            Para verificação de decadência (Art. 281, II CTB)
                        </span>
                    </div>

                    {/* Data de Entrega da Notificação */}
                    <div>
                        <label htmlFor="input-notification-delivery-date" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            Data de Entrega da Notificação
                        </label>
                        <BrazilianDateInput
                            id="input-notification-delivery-date"
                            value={infractionData.notificationDeliveryDate}
                            onChange={(value) => onUpdateInfraction({ ...infractionData, notificationDeliveryDate: value })}
                            
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                            Consta no aviso de recebimento. Sem essa data, a violação da dupla notificação não pode ser avaliada.
                        </span>
                    </div>

                    {/* Prazo para Defesa (da notificação) */}
                    <div>
                        <label htmlFor="input-defense-deadline" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-rose-600" />
                            Prazo Final p/ Defesa
                        </label>
                        <BrazilianDateInput
                            id="input-defense-deadline"
                            value={infractionData.defenseDeadline}
                            onChange={(value) => onUpdateInfraction({ ...infractionData, defenseDeadline: value })}
                            
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                            Consta na notificação recebida
                        </span>
                    </div>
                </div>

                {/* Local da Infração */}
                <div>
                    <label htmlFor="input-location" className="text-[11px] font-bold text-slate-700 uppercase font-mono mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#155BCB]" />
                        Local da Infração *
                    </label>
                    <input
                        id="input-location"
                        type="text"
                        value={infractionData.location || ''}
                        onChange={(e) => onUpdateInfraction({ ...infractionData, location: e.target.value })}
                        placeholder="Ex: Av. Paulista, 1000 - São Paulo/SP"
                        className="w-full text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none transition-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        Endereço completo: via, número, bairro, cidade/UF
                    </span>
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
