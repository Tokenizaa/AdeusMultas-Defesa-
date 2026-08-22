import React from 'react';
import { ShieldCheck, Palette, Megaphone } from 'lucide-react';
import { BrandIdentityConfig } from '../../../types';

export const MarketingSettings: React.FC<{ brand: BrandIdentityConfig | null }> = ({ brand }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-6">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-sm">
          <h3 className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider font-mono mb-3">
            <Palette className="w-3.5 h-3.5 text-slate-600" />
            Identidade da Marca
          </h3>
          {brand ? (
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 text-sm">{brand.brandName}</p>
              <p className="text-slate-600 text-sm">{brand.tagline}</p>
              <p className="text-slate-500 text-sm leading-relaxed">{brand.positioning}</p>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase font-mono">Cores primárias</p>
                <div className="flex gap-2 mt-1">
                  {(brand.primaryColors || []).map((c) => (
                    <span key={c} className="w-6 h-6 rounded-lg border border-slate-200" style={{ backgroundColor: c }} title={c} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase font-mono">Palavras proibidas</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(brand.disallowedWords || []).map((w) => (
                    <span key={w} className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[9px] font-mono">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Identidade não carregada.</p>
          )}
        </div>
      </div>

      <div className="lg:col-span-6 space-y-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs text-sm">
          <h3 className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider font-mono mb-2">
            <Megaphone className="w-3.5 h-3.5 text-slate-600" />
            Ciclo Autônomo
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Orquestrador roda a cada <strong>5 minutos</strong>. Os 7 agentes avançam o pipeline:
            estratégico mapeia → planejamento distribui → criador redige → qualidade aprova →
            publicação agenda e enfileira na Meta Publisher.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sem botões manuais. Exceções aparecem no painel de alertas.
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-xs text-sm text-slate-300">
          <h3 className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider font-mono mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Governança
          </h3>
          <p className="text-sm leading-relaxed text-slate-400">
            Conteúdo só é publicado após aprovação do agente de qualidade (score na grade).
            Token Meta é renovado automaticamente antes de retry na fila.
          </p>
        </div>
      </div>
    </div>
  );
};