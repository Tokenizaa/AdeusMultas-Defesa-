import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  History,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Key,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { CommercialAuditEntry } from '../../types/commercial';

export const AdminCommercialSettingsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<CommercialAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commercial/audit');
      const data = await res.json();
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Failed to load commercial audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const commercialPermissions = [
    {
      code: 'commercial.view',
      name: 'Visualização Comercial',
      description: 'Acesso aos painéis de métricas, GMV, relatórios de conversão e consultas.',
      roleDefault: 'Analista Comercial / Suporte',
    },
    {
      code: 'commercial.prices',
      name: 'Gestão de Tabela de Preços',
      description: 'Alteração de preços padrão, promocionais e datas de vigência por serviço.',
      roleDefault: 'Diretor Comercial / Admin Master',
    },
    {
      code: 'commercial.promotions',
      name: 'Criação de Campanhas & Descontos',
      description: 'Ativação e encerramento de campanhas sazonais e descontos percentuais.',
      roleDefault: 'Gerente de Marketing / Comercial',
    },
    {
      code: 'commercial.coupons',
      name: 'Emissão & Gestão de Cupons',
      description: 'Criação de códigos promocionais, limites de uso por CPF e regras de resgate.',
      roleDefault: 'Gerente Comercial / Marketing',
    },
    {
      code: 'commercial.bonuses',
      name: 'Operação do Ledger de Bônus',
      description: 'Crédito manual, bonificação e estorno de créditos para condutores.',
      roleDefault: 'Supervisor Financeiro / Admin',
    },
    {
      code: 'commercial.referrals',
      name: 'Configuração da Árvore em 3 Níveis',
      description: 'Alteração das taxas percentuais (N1, N2, N3) e bases de cálculo.',
      roleDefault: 'Diretoria Executiva / Admin Master',
    },
    {
      code: 'commercial.commissions',
      name: 'Liquidação de Comissões & Reversões',
      description: 'Autorização de pagamentos a afiliados e reversão em caso de cancelamento.',
      roleDefault: 'Diretor Financeiro / Controller',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600 font-mono">
              Configurações & Governança
            </span>
            <span className="text-slate-500 text-sm font-mono">•</span>
            <span className="text-slate-400 text-sm">Políticas de Segurança e Auditoria</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">
            Governança Comercial, Permissões & Trilha de Auditoria
          </h1>
        </div>

        <button
          onClick={fetchAudit}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Auditoria
        </button>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-white">Matriz de Permissões Granulares Comerciais</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-sm border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Código de Permissão</th>
                <th className="px-4 py-3">Funcionalidade Protegida</th>
                <th className="px-4 py-3">Descrição de Acesso</th>
                <th className="px-4 py-3">Papel Mínimo Recomendado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {commercialPermissions.map((perm) => (
                <tr key={perm.code} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-orange-400">
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {perm.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-white font-sans">
                    {perm.name}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-sans text-sm">
                    {perm.description}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sm">
                      {perm.roleDefault}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commercial Audit Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              Trilha de Auditoria Comercial ({auditLogs.length} eventos registrados)
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-sm border-b border-slate-800 sticky top-0">
              <tr>
                <th className="px-4 py-3">Data / Hora</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Justificativa / Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sm text-orange-400">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {log.entityType} ({log.entityId})
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-bold">
                    {log.changedBy}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-sans italic text-sm">
                    "{log.reason}"
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
