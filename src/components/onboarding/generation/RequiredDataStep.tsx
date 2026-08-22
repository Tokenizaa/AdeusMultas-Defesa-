import React from 'react';
import {
  User,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { CaseDocumentData, InfractionData, VehicleData } from '../../../types';
import { TestFillButton } from '../../ui/TestFillButton';
import { generateRandomDocumentData } from '../../../utils/test-data-generator';

interface RequiredDataStepProps {
  documentData: CaseDocumentData;
  infractionData: InfractionData;
  vehicleData: VehicleData;
  onUpdateDocumentData: (data: CaseDocumentData) => void;
  onNext: () => void;
  onBack: () => void;
  isAdmin?: boolean;
}

export const RequiredDataStep: React.FC<RequiredDataStepProps> = ({
  documentData,
  infractionData,
  vehicleData,
  onUpdateDocumentData,
  onNext,
  onBack,
  isAdmin = false,
}) => {
  const isFormValid =
    (documentData.applicantName?.trim().length || 0) > 3 &&
    (documentData.applicantCpf?.trim().length || 0) >= 11 &&
    (documentData.applicantCnh?.trim().length || 0) >= 5 &&
    (documentData.applicantEmail?.includes('@') || false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-6">
      {/* Human Guidance Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#155BCB]" />
          <h3 className="text-xs sm:text-sm font-bold text-blue-950">
            Agora vamos preparar sua defesa formal
          </h3>
        </div>
        <p className="text-xs text-blue-900 leading-relaxed">
          Os dados da autuação e do veículo já foram salvos e processados. Precisamos apenas dos seus dados pessoais para qualificar o requerente na petição oficial perante a autoridade de trânsito.
        </p>
      </div>

      {/* Test Fill Button */}
      <div className="flex justify-center">
        <TestFillButton
          isAdmin={isAdmin}
          onClick={() => {
            const data = generateRandomDocumentData();
            onUpdateDocumentData({ ...documentData, ...data });
          }}
        />
      </div>

      {/* Summary of preserved Phase 1 data */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-slate-700 font-medium">
            Dados da autuação preservados (não serão solicitados novamente):
          </span>
        </div>
        <div className="font-mono text-slate-900 font-bold flex flex-wrap gap-3 text-[11px]">
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Placa: {vehicleData.plate || 'N/A'}</span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">AIT: {infractionData.aitNumber || 'N/A'}</span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Órgão: {infractionData.autuadorBody?.split('—')[0] || 'DETRAN'}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Row 1: Nome Completo & CPF */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono mb-1 block">
              Nome Completo do Condutor / Requerente (como na CNH) *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-applicant-name"
                type="text"
                value={documentData.applicantName || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, applicantName: e.target.value })}
                placeholder="Ex: Carlos Eduardo Silveira"
                className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-1">
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono mb-1 block">
              CPF *
            </label>
            <input
              id="input-applicant-cpf"
              type="text"
              value={documentData.applicantCpf || ''}
              onChange={(e) => onUpdateDocumentData({ ...documentData, applicantCpf: e.target.value })}
              placeholder="000.000.000-00"
              className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* Row 2: RG, CNH e Categoria */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono mb-1 block">
              RG / Órgão Emissor
            </label>
            <input
              id="input-applicant-rg"
              type="text"
              value={documentData.applicantRg || ''}
              onChange={(e) => onUpdateDocumentData({ ...documentData, applicantRg: e.target.value })}
              placeholder="Ex: 12.345.678-9 SSP/SP"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono mb-1 block">
              Registro da CNH *
            </label>
            <input
              id="input-applicant-cnh"
              type="text"
              value={documentData.applicantCnh || ''}
              onChange={(e) => onUpdateDocumentData({ ...documentData, applicantCnh: e.target.value })}
              placeholder="Ex: 05492817492"
              className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono block mb-1">
              Categoria CNH
            </label>
            <input
              id="input-cnh-category"
              type="text"
              value={documentData.cnhCategory || 'AB'}
              onChange={(e) => onUpdateDocumentData({ ...documentData, cnhCategory: e.target.value.toUpperCase() })}
              placeholder="Ex: B ou AB"
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* Row 3: Contatos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono mb-1 block">
              E-mail (para receber a petição em PDF) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-applicant-email"
                type="email"
                value={documentData.applicantEmail || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, applicantEmail: e.target.value })}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase font-mono mb-1 block">
              WhatsApp / Celular (para alertas de prazo) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-applicant-phone"
                type="tel"
                value={documentData.applicantPhone || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, applicantPhone: e.target.value })}
                placeholder="(11) 98765-4321"
                className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#155BCB] focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Endereço de Domicílio do Requerente */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#155BCB]" />
            <h4 className="font-bold text-slate-900 text-xs font-mono uppercase">
              Endereço Residencial do Requerente (Para Qualificação no Órgão)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">
                Logradouro (Rua, Avenida, Alameda) *
              </label>
              <input
                id="input-address-street"
                type="text"
                value={documentData.addressStreet || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, addressStreet: e.target.value })}
                placeholder="Ex: Rua das Flores"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#155BCB]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">
                Número *
              </label>
              <input
                id="input-address-number"
                type="text"
                value={documentData.addressNumber || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, addressNumber: e.target.value })}
                placeholder="Ex: 450"
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#155BCB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">
                Bairro / Complemento
              </label>
              <input
                id="input-address-neighborhood"
                type="text"
                value={documentData.addressNeighborhood || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, addressNeighborhood: e.target.value })}
                placeholder="Ex: Vila Madalena, Apto 82"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#155BCB]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">
                CEP
              </label>
              <input
                id="input-address-zipcode"
                type="text"
                value={documentData.addressZipCode || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, addressZipCode: e.target.value })}
                placeholder="01234-567"
                className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#155BCB]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 font-mono block mb-1">
                Cidade / UF *
              </label>
              <input
                id="input-address-citystate"
                type="text"
                value={documentData.addressCityState || ''}
                onChange={(e) => onUpdateDocumentData({ ...documentData, addressCityState: e.target.value })}
                placeholder="São Paulo/SP"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#155BCB]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-2 flex justify-between items-center border-t border-slate-100">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Diagnóstico</span>
        </button>

        <button
          id="btn-next-to-review"
          onClick={onNext}
          disabled={!isFormValid}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            isFormValid
              ? 'bg-[#155BCB] hover:bg-blue-700 text-white cursor-pointer shadow-xs'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Revisar Petição e Minuta</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
