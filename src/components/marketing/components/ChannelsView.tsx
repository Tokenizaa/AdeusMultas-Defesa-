import React from 'react';
import { Share2, Link2, Facebook, Instagram, Unplug } from 'lucide-react';
import { MetaAccountState } from '../../../types';

export const ChannelsView: React.FC<{
  metaState: MetaAccountState | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}> = ({ metaState, loading, onConnect, onDisconnect }) => {
  const activePage = metaState?.pages[0];
  const activeIg = activePage?.instagram_business_account;

  return (
    <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
          <Share2 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Integração Oficial Meta</span>
            {loading ? (
              <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded text-sm font-bold font-mono">
                Verificando conexão...
              </span>
            ) : metaState?.isConnected ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-sm font-bold font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Conectado Graph API v20.0
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-sm font-bold font-mono">
                Sandbox / Desconectado
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Facebook className="w-3 h-3 text-blue-600" />
              {activePage?.name || 'Página DefesAi Facebook'}
            </span>
            <span className="flex items-center gap-1">
              <Instagram className="w-3 h-3 text-pink-600" />
              {activeIg?.username ? `@${activeIg.username}` : '@defesai.oficial'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {metaState?.isConnected ? (
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-lg text-sm font-semibold flex items-center gap-1.5"
          >
            <Unplug className="w-3.5 h-3.5" />
            Desconectar
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Conectar Meta</span>
          </button>
        )}
      </div>
    </div>
  );
};