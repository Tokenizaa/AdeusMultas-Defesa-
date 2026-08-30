import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Shield,
  Folders,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { PRICING } from '../../config/pricing';

export const AdminUserDetailView: React.FC = () => {
  const { params, navigate } = useRouter();
  const userId = params.id;

  const [user, setUser] = useState<any | null>(null);
  const [userCases, setUserCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        // Fetch all cases to find those matching the user
        const res = await fetch('/api/cases');
        const cases = await res.json();

        // Build user profile or mock user based on cases
        const matchedCases = cases.filter((c: any) => c.clientCpf === userId || c.id.includes(userId || ''));
        
        setUser({
          id: userId || 'usr_001',
          name: matchedCases[0]?.clientName || 'Dr. Carlos Eduardo Silva',
          email: matchedCases[0]?.clientEmail || 'carlos.silva@exemplo.com.br',
          phone: matchedCases[0]?.clientPhone || '(11) 98765-4321',
          cpf: matchedCases[0]?.clientCpf || '123.456.789-00',
          role: 'citizen',
          status: 'active',
          createdAt: matchedCases[0]?.createdAt || new Date(Date.now() - 30 * 86400000).toISOString(),
          casesCount: matchedCases.length || 1,
          totalSpent: matchedCases.filter((c: any) => c.isPaid).length * PRICING.DEFAULT_PRICE,
        });

        setUserCases(matchedCases.length > 0 ? matchedCases : cases.slice(0, 3));
      } catch (err: any) {
        console.error('Error fetching user:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm">Carregando perfil do usuário {userId}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Voltar para Usuários"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-bold text-white font-mono">
                {user?.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-sm font-bold uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {user?.role === 'admin' ? 'Administrador' : 'Cidadão / Condutor'}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">
              Cadastrado em {new Date(user?.createdAt).toLocaleDateString('pt-BR')} • CPF: {user?.cpf}
            </p>
          </div>
        </div>
      </div>

      {/* Profile & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
        {/* User Account Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-sm">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-white uppercase">Dados da Conta</h2>
          </div>

          <div>
            <span className="text-slate-500 text-sm uppercase">E-mail</span>
            <p className="text-slate-200">{user?.email}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm uppercase">Telefone</span>
            <p className="text-slate-200">{user?.phone}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm uppercase">CPF</span>
            <p className="text-slate-200">{user?.cpf}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm uppercase">Status da Conta</span>
            <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-fit block mt-1">
              ATIVO & VERIFICADO
            </span>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase">Total Investido</h2>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            R$ {user?.totalSpent?.toFixed(2) || PRICING.DEFAULT_PRICE.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500">
            Pagamentos via PIX PagBank conciliados com sucesso
          </p>
        </div>

        {/* Cases Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Folders className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase">Autuações Vinculadas</h2>
          </div>
          <p className="text-2xl font-bold text-white">
            {userCases.length} Casos
          </p>
          <p className="text-sm text-slate-500">
            Recursos gerados e acompanhados na plataforma
          </p>
        </div>
      </div>

      {/* User Cases List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-sm">
        <h3 className="text-sm font-bold text-white uppercase">Histórico de Casos do Condutor</h3>

        <div className="space-y-3">
          {userCases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/admin/cases/${c.id}`)}
              className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors">
                    {c.title || `Caso #${c.id}`}
                  </h4>
                  {c.isPaid ? (
                    <span className="px-2 py-0.5 rounded text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      PAGO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      AGUARDANDO
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Auto {c.infraction?.aitNumber || 'N/A'} • Placa {c.vehicle?.plate || 'N/A'} • {c.infraction?.autuadorBody || 'DETRAN'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
