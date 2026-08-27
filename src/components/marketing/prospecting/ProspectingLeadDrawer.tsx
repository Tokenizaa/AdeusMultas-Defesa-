import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Globe,
  MapPin,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Scale,
  ShieldCheck,
  Code,
} from 'lucide-react';
import type { Lead } from '../types/prospecting';

interface ProspectingLeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
}

export const ProspectingLeadDrawer: React.FC<ProspectingLeadDrawerProps> = ({
  lead,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!lead) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(lead, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDespachante = lead.lead_type === 'despachante';
  const isAdvogado = lead.lead_type === 'advogado';

  // Format WhatsApp Link
  const rawPhone = lead.whatsapp || lead.phone || '';
  const digitsOnly = rawPhone.replace(/\D/g, '');
  const waNumber = digitsOnly.length <= 11 && !digitsOnly.startsWith('55') ? `55${digitsOnly}` : digitsOnly;
  const waUrl = waNumber.length >= 10 ? `https://wa.me/${waNumber}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDespachante
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : isAdvogado
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              }`}
            >
              {isAdvogado ? <Scale className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                    isDespachante
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : isAdvogado
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {isDespachante ? 'Despachante de Trânsito' : isAdvogado ? 'Advogado de Trânsito' : lead.lead_type || 'Lead'}
                </span>
                {lead.city && (
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {lead.city} {lead.state ? `- ${lead.state}` : ''}
                  </span>
                )}
              </div>
              <h2 className="text-base font-extrabold text-white mt-1 truncate" title={lead.name}>
                {lead.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Fechar gaveta de detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap gap-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </a>
          )}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>Ligar</span>
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>E-mail</span>
            </a>
          )}
          {lead.website && (
            <a
              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Site</span>
            </a>
          )}
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identificação */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              Identificação & Perfil
            </h3>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2.5">
              <DetailRow label="Razão Social / Nome" value={lead.name} />
              <DetailRow label="Tipo de Segmento" value={lead.lead_type} badge />
              <DetailRow label="Categoria Mapeada" value={lead.category} />
              <DetailRow label="ID do Registro" value={lead.id} isCode />
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Endereço & Localização
            </h3>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2.5">
              <DetailRow label="Endereço Completo" value={lead.address} />
              <DetailRow label="Cidade" value={lead.city} />
              <DetailRow label="Estado (UF)" value={lead.state} />
              <DetailRow label="CEP" value={lead.zip_code} />
              {lead.google_maps_url && (
                <div className="pt-1">
                  <a
                    href={lead.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    <span>Ver no Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Canais de Contato
            </h3>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2.5">
              <DetailRow label="Telefone Fixo / Celular" value={lead.phone} />
              <DetailRow label="WhatsApp" value={lead.whatsapp} />
              <DetailRow label="Telefone Normalizado (E.164)" value={lead.phone_normalized} isCode />
              <DetailRow label="E-mail" value={lead.email} />
              <DetailRow label="Website Oficial" value={lead.website} />
            </div>
          </div>

          {/* Dados de Coleta e Origem */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Origem & Auditoria do Scraping
            </h3>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3.5 space-y-2.5">
              <DetailRow label="Fonte Coletora" value={lead.source || 'Google Maps Places'} />
              <DetailRow
                label="Data da Raspagem"
                value={lead.scraped_at ? new Date(lead.scraped_at).toLocaleString('pt-BR') : '—'}
              />
              <DetailRow
                label="Inserção no Banco"
                value={lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '—'}
              />
            </div>
          </div>

          {/* Raw JSON Inspection */}
          <div className="space-y-2">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <Code className="w-3.5 h-3.5 text-slate-500" />
              <span>{showRawJson ? 'Ocultar JSON Bruto' : 'Inspecionar JSON Bruto'}</span>
            </button>

            {showRawJson && (
              <div className="relative">
                <button
                  onClick={handleCopyJson}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
                <pre className="text-[11px] font-mono bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-slate-300 max-h-60">
                  {JSON.stringify(lead, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>DefesAi B2B Intelligence</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailRow: React.FC<{
  label: string;
  value?: string | null;
  badge?: boolean;
  isCode?: boolean;
}> = ({ label, value, badge, isCode }) => {
  if (!value) {
    return (
      <div className="flex items-center justify-between text-xs py-0.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-600 italic">Não informado</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between text-xs py-0.5 gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      {badge ? (
        <span className="font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 uppercase font-mono text-[10px]">
          {value}
        </span>
      ) : isCode ? (
        <span className="font-mono text-slate-300 text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 break-all text-right">
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-200 text-right break-words">{value}</span>
      )}
    </div>
  );
};
