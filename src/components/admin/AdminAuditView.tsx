import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  Info,
  Check,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Eye,
  ShieldCheck as AuditShieldCheck,
  Lock,
  History,
  X,
} from 'lucide-react';
import { LogDetailModal } from './LogDetailModal';
import { api } from '../../lib/api/client';
import { AuditLogEntry } from '../../types';
import type { StructuredLogEntry } from '../../server/observability/logger';

export const AdminAuditView: React.FC = () => {
  // System logs state
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [isSystemLoading, setIsSystemLoading] = useState(true);
  const [selectedSystemLog, setSelectedSystemLog] = useState<any | null>(null);
  const [systemSearchQuery, setSystemSearchQuery] = useState('');
  const [systemLevelFilter, setSystemLevelFilter] = useState<string>('all');
  const [systemServiceFilter, setSystemServiceFilter] = useState<string>('all');
  const [systemAutoRefresh, setSystemAutoRefresh] = useState(true);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'system' | 'audit'>('system');

  // Fetch system logs
  const fetchSystemLogs = async () => {
    try {
      setIsSystemLoading(true);
      const res = await api.get<any>('/api/logs?limit=200');
      setSystemLogs(res.results || []);
    } catch (err: any) {
      console.error('Error fetching system logs:', err);
    } finally {
      setIsSystemLoading(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    try {
      setIsAuditLoading(true);
      const res = await api.get<AuditLogEntry[]>('/api/audit-logs');
      setAuditLogs(res);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsAuditLoading(false);
    }
  };

// Clear system logs
   const handleClearSystemLogs = async () => {
     if (!confirm('Deseja realmente limpar os logs do sistema da memória?')) return;
     try {
       // Note: This would require a backend endpoint to clear logs
       // For now, we'll just clear the local state
       setSystemLogs([]);
     } catch (err: any) {
       console.error('Error clearing system logs:', err);
     }
   };

   // Download system log
   const handleDownloadSystemLog = (log: any) => {
     // Convert log to JSON string
     const logJson = JSON.stringify(log, null, 2);
     const blob = new Blob([logJson], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     
     // Create a temporary link to download
     const a = document.createElement('a');
     a.href = url;
     a.download = `system-log-${log.id || log.timestamp || Date.now()}.json`;
     document.body.appendChild(a);
     a.click();
     
     // Cleanup
     setTimeout(() => {
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
     }, 100);
   };

   useEffect(() => {
    fetchSystemLogs();
    fetchAuditLogs();

    // Set up auto-refresh for system logs
    let interval: NodeJS.Timeout | null = null;
    if (systemAutoRefresh) {
      interval = setInterval(fetchSystemLogs, 5000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [systemAutoRefresh]);

  // Filter system logs
  const filteredSystemLogs = systemLogs
    .filter((log) => {
      const matchesSearch = systemSearchQuery
        ? (log.message || '').toLowerCase().includes(systemSearchQuery.toLowerCase())
        : true;
      const matchesLevel = systemLevelFilter === 'all' || log.level?.toLowerCase() === systemLevelFilter;
      const matchesService = systemServiceFilter === 'all' || log.service?.toLowerCase() === systemServiceFilter;
      return matchesSearch && matchesLevel && matchesService;
    })
    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0).getTime() - new Date(a.timestamp || a.createdAt || 0).getTime());

  // Filter audit logs
  const filteredAuditLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.actor.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.targetResource.toLowerCase().includes(auditFilter.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            {activeTab === 'system' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AuditShieldCheck className="w-4 h-4 text-orange-400" />
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {activeTab === 'system' ? 'Logs do Sistema & Operações' : 'Auditoria de Segurança & Trilha Imutável'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'system'
              ? 'Gerencie logs de operações do sistema, eventos de API e atividades de usuários.'
              : 'Trilha de eventos append-only com mascaramento criptográfico de dados sensíveis e auditoria de agentes.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3 py-1 rounded-xs text-sm font-semibold transition-colors ${
                activeTab === 'system'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Sistema
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded-xs text-sm font-semibold transition-colors ${
                activeTab === 'audit'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Auditoria
            </button>
          </div>

          {activeTab === 'system' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                Total: <strong className="text-white">{filteredSystemLogs.length}</strong> logs
              </span>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                Total: <strong className="text-white">{filteredAuditLogs.length}</strong> registros
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'system' ? (
        <div className="space-y-4">
          {/* System Logs Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por mensagem, serviço ou nível..."
                  value={systemSearchQuery}
                  onChange={(e) => setSystemSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none shadow-2xs font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={systemLevelFilter}
                  onChange={(e) => setSystemLevelFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-sm text-slate-300 outline-none focus:border-orange-500 font-mono"
                >
                  <option value="all">Todos os Níveis</option>
                  <option value="error">Erro</option>
                  <option value="warning">Aviso</option>
                  <option value="info">Informação</option>
                  <option value="debug">Depuração</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={systemServiceFilter}
                  onChange={(e) => setSystemServiceFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-sm text-slate-300 outline-none focus:border-orange-500 font-mono"
                >
                  <option value="all">Todos os Serviços</option>
                  <option value="api">API</option>
                  <option value="auth">Autenticação</option>
                  <option value="payments">Pagamentos</option>
                  <option value="integrations">Integrações</option>
                  <option value="marketing">Marketing</option>
                  <option value="monitoring">Monitoramento</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSystemAutoRefresh(!systemAutoRefresh)}
                className={`px-3 py-1 rounded-xs text-sm font-semibold transition-colors ${
                  systemAutoRefresh
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {systemAutoRefresh ? 'Pausar Atualização' : 'Ativar Atualização'}
              </button>
              <button
                onClick={handleClearSystemLogs}
                className="px-3 py-1 rounded-xs text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                Limpar Logs
              </button>
            </div>
          </div>

          {/* System Logs Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-x-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
<thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 font-mono text-sm uppercase">
                   <tr>
                     <th className="py-3 px-4">Timestamp</th>
                     <th className="py-3 px-4">Serviço</th>
                     <th className="py-3 px-4">Nível</th>
                     <th className="py-3 px-4">Mensagem</th>
                     <th className="py-3 px-4">Duração</th>
                     <th className="py-3 px-4">Correlation ID</th>
                     <th className="py-3 px-4 text-right">Ações</th>
                   </tr>
                 </thead>
                <tbody className="divide-y divide-slate-900 font-mono text-sm text-slate-300">
{filteredSystemLogs.length === 0 ? (
                     <tr>
                       <td colSpan={7} className="py-8 text-center text-slate-500">
                         Nenhum log encontrado para os filtros selecionados.
                       </td>
                     </tr>
                   ) : (
                     filteredSystemLogs.map((log) => (
                       <tr key={log.id || log.timestamp} className="hover:bg-slate-900/40 transition-colors">
                         <td className="py-3 px-4 text-slate-400">
                           {new Date(log.timestamp || log.createdAt || 0).toLocaleString('pt-BR', {
                             hour: '2-digit',
                             minute: '2-digit',
                             second: '2-digit',
                           })}
                         </td>
                         <td className="py-3 px-4 text-slate-400 text-sm">
                           {log.service || 'N/A'}
                         </td>
                         <td className="py-3 px-4">
                           <span
                             className={`px-1 py-0.5 rounded text-sm font-semibold ${
                               log.level === 'error'
                                 ? 'bg-red-100 text-red-800'
                                 : log.level === 'warning'
                                 ? 'bg-yellow-100 text-yellow-800'
                                 : log.level === 'info'
                                 ? 'bg-blue-100 text-blue-800'
                                 : 'bg-gray-100 text-gray-800'
                             }`}
                           >
                             {log.level?.toUpperCase() || 'UNKNOWN'}
                           </span>
                         </td>
                         <td className="py-3 px-4 text-slate-400 break-all max-w-[300px]">
                           {log.message || 'Sem mensagem'}
                         </td>
                         <td className="py-3 px-4 text-center text-slate-400">
                           {log.duration !== undefined ? `${log.duration} ms` : '—'}
                         </td>
                         <td className="py-3 px-4 text-center text-slate-400 font-mono">
                           {log.correlationId || '—'}
                         </td>
                         <td className="py-3 px-4 text-right">
                           <div className="flex items-center gap-1">
                             <button
                               onClick={() => {
                                 setSelectedSystemLog(log);
                               }}
                               className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                             >
                               <Eye className="w-3 h-3" />
                             </button>
                             <button
                               onClick={() => {
                                 handleDownloadSystemLog(log);
                               }}
                               className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                             >
                               <Download className="w-3 h-3" />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Audit Logs Controls */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por ação, ator, detalhes ou recurso..."
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="w-full pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-x-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
<thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 font-mono text-sm uppercase">
                   <tr>
                     <th className="py-3 px-4">Timestamp</th>
                     <th className="py-3 px-4">Ator</th>
                     <th className="py-3 px-4">Ação</th>
                     <th className="py-3 px-4">Recurso Alvo</th>
                     <th className="py-3 px-4">Detalhes</th>
                     <th className="py-3 px-4">IP Hash</th>
                     <th className="py-3 px-4">LGPD</th>
                     <th className="py-3 px-4 text-right">Ações</th>
                   </tr>
                 </thead>
                <tbody className="divide-y divide-slate-900 font-mono text-sm text-slate-300">
{filteredAuditLogs.length === 0 ? (
                     <tr>
                       <td colSpan={8} className="py-8 text-center text-slate-500">
                         Nenhum registro de auditoria encontrado para os filtros selecionados.
                       </td>
                     </tr>
                   ) : (
                     filteredAuditLogs.map((log) => (
                       <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                         <td className="py-3 px-4 text-slate-400">
                           {new Date(log.timestamp || 0).toLocaleString('pt-BR', {
                             hour: '2-digit',
                             minute: '2-digit',
                             second: '2-digit',
                           })}
                         </td>
                         <td className="py-3 px-4 text-slate-400">
                           {log.actor || 'Sistema'}
                         </td>
                         <td className="py-3 px-4 text-slate-400 text-sm">
                           {log.action || 'N/A'}
                         </td>
                         <td className="py-3 px-4 text-slate-400">
                           {log.targetResource || 'N/A'}
                         </td>
                         <td className="py-3 px-4 text-slate-400">
                           {log.details || 'Sem detalhes'}
                         </td>
                         <td className="py-3 px-4 text-center text-slate-400 font-mono">
                           {log.ipHash || '—'}
                         </td>
                         <td className="py-3 px-4 text-center">
                           {log.gdprCompliant ? (
                             <Check className="w-3 h-3 text-green-400" />
                           ) : (
                             <AlertTriangle className="w-3 h-3 text-red-400" />
                           )}
                         </td>
                         <td className="py-3 px-4 text-right">
                           <div className="flex items-center gap-1">
                             <button
                               onClick={() => {
                                 setSelectedAuditLog(log);
                               }}
                               className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                             >
                               <Eye className="w-3 h-3" />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))
                  )}
                </tbody>
              </table>
</div>
            </div>
          </div>
        )}

      {/* Modals */}
     {selectedSystemLog && (
       <LogDetailModal
         log={selectedSystemLog as StructuredLogEntry}
         isOpen={true}
         onClose={() => setSelectedSystemLog(null)}
         onTraceCorrelation={(correlationId) => {
           // Implement trace correlation if needed
           setSelectedSystemLog(null);
         }}
       />
     )}
     {selectedAuditLog && (
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
         <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-xl font-bold text-white">Detalhes do Log de Auditoria</h3>
             <button
               onClick={() => setSelectedAuditLog(null)}
               className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
           <div className="space-y-4 text-slate-300">
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">ID:</span>
               <span className="break-all">{selectedAuditLog.id}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">Timestamp:</span>
               <span className="break-all">
                 {new Date(selectedAuditLog.timestamp).toLocaleString('pt-BR')}
               </span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">Ator:</span>
               <span className="break-all">{selectedAuditLog.actor}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">Papel:</span>
               <span className="break-all">{selectedAuditLog.role}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">Ação:</span>
               <span className="break-all">{selectedAuditLog.action}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">Recurso Alvo:</span>
               <span className="break-all">{selectedAuditLog.targetResource}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">IP Hash:</span>
               <span className="break-all font-mono">{selectedAuditLog.ipHash}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">Detalhes:</span>
               <span className="break-all">{selectedAuditLog.details}</span>
             </div>
             <div className="flex">
               <span className="w-24 font-mono text-slate-400">LGPD Compliant:</span>
               <span className="flex items-center">
                 {selectedAuditLog.gdprCompliant ? (
                   <Check className="w-3 h-3 text-green-400 mr-2" />
                 ) : (
                   <AlertTriangle className="w-3 h-3 text-red-400 mr-2" />
                 )}
                  <span className="text-slate-300">
                    {selectedAuditLog.gdprCompliant ? 'Sim' : 'Não'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
