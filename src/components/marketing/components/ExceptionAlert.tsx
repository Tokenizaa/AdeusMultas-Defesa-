import React from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { MarketingAgentState } from '../../../types';
import { PublisherQueueItem, MarketingOverallMetrics } from '../hooks/use-marketing-service';

interface ExceptionAlertProps {
  agents: MarketingAgentState[];
  publisherQueue: PublisherQueueItem[];
  metrics: MarketingOverallMetrics | null;
  scheduledPosts: number;
  metaConnected: boolean;
  onRetry?: () => void;
}

/**
 * ExceptionAlert (4.8) — SÓ exceções aparecem. Estado saudável = nada renderizado.
 * Nada de spinner de sucesso falso: cada alerta é derivado de estado real da API.
 */
export const ExceptionAlert: React.FC<ExceptionAlertProps> = ({
  agents,
  publisherQueue,
  metrics,
  scheduledPosts,
  metaConnected,
  onRetry,
}) => {
  const failingAgents = agents.filter((a) => a.status === 'alert');
  const retryingPublishes = publisherQueue.filter((q) => q.attempts >= 1);
  const stalledDelivery = scheduledPosts > 0 && !metaConnected;

  const hasExceptions = failingAgents.length > 0 || retryingPublishes.length > 0 || stalledDelivery;
  if (!hasExceptions) return null;

  return (
    <div className="space-y-2">
      {failingAgents.map((agent) => (
        <div
          key={agent.id}
          className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-800">
              {agent.name} em alerta
            </p>
            <p className="text-rose-700 text-sm mt-0.5">{agent.currentTask || 'Tarefa interrompida'}</p>
          </div>
        </div>
      ))}

      {retryingPublishes.map((q) => (
        <div
          key={q.id}
          className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm flex items-center gap-2.5"
        >
          <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-amber-800">Publicação {q.id} em retry</p>
            <p className="text-amber-700 text-sm font-mono mt-0.5">
              tentativa {q.attempts} • destino {q.destination}
            </p>
          </div>
        </div>
      ))}

      {stalledDelivery && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-rose-800">Entrega travada: Meta desconectada</p>
            <p className="text-rose-700 text-sm mt-0.5">
              {scheduledPosts} conteúdo(s) agendado(s) sem canal conectado para entrega.
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold"
            >
              Verificar
            </button>
          )}
        </div>
      )}

      {metrics && metrics.conversionRate === 0 && metrics.publishedPosts > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-amber-800">
            {metrics.publishedPosts} publicação(ões) sem conversão registrada — investigar funil.
          </p>
        </div>
      )}
    </div>
  );
};