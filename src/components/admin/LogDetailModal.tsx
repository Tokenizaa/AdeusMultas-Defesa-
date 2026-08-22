import React, { useState } from 'react';
import { X, Copy, Check, ShieldCheck, Terminal, Clock, Server, Hash, FileCode } from 'lucide-react';
import { StructuredLogEntry } from '../../server/observability/logger';

interface LogDetailModalProps {
  log: StructuredLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onTraceCorrelation?: (correlationId: string) => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  log,
  isOpen,
  onClose,
  onTraceCorrelation,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'fatal':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'error':
        return 'bg-rose-900/50 text-rose-300 border-rose-700';
      case 'warn':
        return 'bg-amber-900/50 text-amber-300 border-amber-700';
      case 'info':
        return 'bg-sky-900/50 text-sky-300 border-sky-700';
      case 'debug':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm font-bold font-mono uppercase px-2.5 py-1 rounded-lg border ${getLevelBadgeClass(
                log.level
              )}`}
            >
              {log.level}
            </span>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {log.service.toUpperCase()} / {log.module}
              </h3>
              <p className="text-sm text-slate-400 font-mono">{log.operation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Message Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-sm font-mono text-slate-500 uppercase">Mensagem Estruturada</div>
            <div className="text-sm font-mono text-slate-200 mt-1 font-semibold break-all">
              {log.message}
            </div>
          </div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-sm font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Timestamp
              </div>
              <div className="text-sm text-slate-200 mt-1 truncate font-semibold">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
              </div>
              <div className="text-[9px] text-slate-500 truncate">
                {new Date(log.timestamp).toLocaleDateString('pt-BR')}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <Server className="w-3 h-3 text-slate-400" /> Duração / Status
              </div>
              <div className="text-sm text-slate-200 mt-1 font-semibold">
                {log.duration !== undefined ? `${log.duration} ms` : '—'}
              </div>
              <div className="text-sm capitalize text-emerald-400">{log.status}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-slate-400" /> Provider & Modelo
              </div>
              <div className="text-sm text-slate-200 mt-1 font-semibold truncate">
                {log.provider || 'internal'}
              </div>
              <div className="text-[9px] text-slate-400 truncate">{log.model || '—'}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="text-sm text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Sanitização LGPD
              </div>
              <div className="text-sm text-emerald-400 mt-1 font-semibold">
                ✓ Aplicada
              </div>
              <div className="text-[9px] text-slate-500">Sem vazamento</div>
            </div>
          </div>

          {/* Tracing Correlation IDs */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-sm font-mono text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Identificadores de Rastreamento (Correlation)</span>
              {onTraceCorrelation && (
                <button
                  onClick={() => {
                    onTraceCorrelation(log.correlationId);
                    onClose();
                  }}
                  className="text-sm text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                >
                  Rastrear todo este fluxo ➔
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-sm text-slate-500 block">correlationId:</span>
                <span className="text-sm text-orange-400 font-bold break-all">
                  {log.correlationId}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-sm text-slate-500 block">requestId:</span>
                <span className="text-sm text-slate-300 break-all">{log.requestId}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-sm text-slate-500 block">caseId:</span>
                <span className="text-sm text-slate-300 break-all">{log.caseId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Metadata JSON Inspector */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="space-y-1.5">
              <div className="text-sm font-mono text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-slate-400" />
                <span>Metadados Estruturados (Sanitizados)</span>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
