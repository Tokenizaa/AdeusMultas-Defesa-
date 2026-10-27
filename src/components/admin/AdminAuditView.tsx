import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

type AuditEvent = {
  id: string;
  action: string;
  actor: string;
  actorRole: string;
  targetResource: string;
  targetId: string;
  details: string;
  timestamp: string;
  correlationId: string;
  gdprCompliant: boolean;
};

const normalizeAuditEvent = (row: any, index: number): AuditEvent => ({
  id: String(row.id || `${row.timestamp || 'audit'}-${index}`),
  action: String(row.action || 'UNKNOWN_ACTION'),
  actor: String(row.actor || 'unknown'),
  actorRole: String(row.actor_role || row.actorRole || 'unknown'),
  targetResource: String(row.target_resource || row.targetResource || '—'),
  targetId: String(row.target_id || row.targetId || ''),
  details: typeof row.details === 'string' ? row.details : JSON.stringify(row.details || {}),
  timestamp: String(row.timestamp || ''),
  correlationId: String(row.correlation_id || row.correlationId || ''),
  gdprCompliant: row.gdpr_compliant === true || row.gdprCompliant === true,
});

export const AdminAuditView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadAuditEvents = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await authFetch('/api/audit/logs?limit=200');
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error?.message || body?.message || `HTTP ${response.status}`);
      }
      const rows = Array.isArray(body?.logs) ? body.logs : [];
      setEvents(rows.map(normalizeAuditEvent));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a trilha de auditoria.');
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => { void loadAuditEvents(); }, [loadAuditEvents]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => [
      event.action, event.actor, event.actorRole, event.targetResource, event.targetId,
      event.details, event.correlationId,
    ].some((value) => value.toLowerCase().includes(term)));
  }, [events, search]);

  const downloadAuditEvents = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `defesai-audit-log-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Auditoria persistida
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Trilha de auditoria</h1>
          <p className="mt-1 text-sm text-slate-400">Eventos persistidos em <code>audit_logs</code>. Esta tela não mistura logs técnicos efêmeros com a trilha de auditoria.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadAuditEvents} disabled={filteredEvents.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40">
            <Download className="h-4 w-4" /> Exportar JSON
          </button>
          <button onClick={() => void loadAuditEvents()} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-800 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">Falha ao carregar auditoria: {error}</div>}

      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ação, ator, recurso, ID ou detalhes…"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-emerald-600"
            />
          </div>
          <span className="text-xs text-slate-500">{filteredEvents.length} de {events.length} eventos carregados</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando eventos persistidos…</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">{error ? 'A trilha não foi carregada.' : 'Nenhum evento corresponde à busca.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Ator</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="align-top hover:bg-slate-900/50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{event.timestamp ? new Date(event.timestamp).toLocaleString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{event.action}</p>
                      <p className="mt-1 text-xs text-slate-500">{event.actorRole}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{event.actor}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300">{event.targetResource}</p>
                      {event.targetId && <p className="mt-1 break-all text-xs text-slate-500">{event.targetId}</p>}
                    </td>
                    <td className="max-w-lg px-4 py-3 text-xs text-slate-400">
                      <details>
                        <summary className="cursor-pointer text-emerald-300">Ver detalhes</summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words font-mono">{event.details || '{}'}</pre>
                        {event.correlationId && <p className="mt-2 break-all">Correlation ID: {event.correlationId}</p>}
                        <p className="mt-1">{event.gdprCompliant ? 'Marcado como GDPR compliant' : 'Conformidade não marcada'}</p>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
