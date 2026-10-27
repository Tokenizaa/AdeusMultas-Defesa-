import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Folders,
  CreditCard,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from '../../core/router/RouterContext';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export const AdminUserDetailView: React.FC = () => {
  const { params, navigate } = useRouter();
  const authFetch = useAuthFetch();
  const userId = params.id;

  const [user, setUser] = useState<any | null>(null);
  const [userCases, setUserCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUserData = async () => {
      if (!userId) {
        setUser(null);
        setUserCases([]);
        setLoadError('Identificador do usuário ausente.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await authFetch(`/api/admin/users/${encodeURIComponent(userId)}`);

        if (res.status === 404) {
          if (!cancelled) {
            setUser(null);
            setUserCases([]);
            setLoadError('Usuário não encontrado.');
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (cancelled) return;

        if (!data?.user || data.user.id !== userId) {
          setUser(null);
          setUserCases([]);
          setLoadError('A resposta não corresponde ao usuário solicitado.');
          return;
        }

        setUser({
          ...data.user,
          totalSpent: Number.isFinite(Number(data.totalSpent)) ? Number(data.totalSpent) : 0,
        });
        setUserCases(Array.isArray(data.cases) ? data.cases : []);
      } catch {
        if (!cancelled) {
          setUser(null);
          setUserCases([]);
          setLoadError('Não foi possível carregar o perfil. Tente novamente.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchUserData();
    return () => {
      cancelled = true;
    };
  }, [authFetch, userId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm">Carregando perfil do usuário {userId}...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Usuários
        </button>
        <div role="alert" className="rounded-xl border border-red-800 bg-red-950/30 p-5 text-sm text-red-200">
          {loadError || 'Usuário não encontrado.'}
        </div>
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
                {user.name || 'Nome não informado'}
              </h1>
              <span className="px-2 py-0.5 rounded text-sm font-bold uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {user?.role === 'admin' ? 'Administrador' : 'Cidadão / Condutor'}
              </span>
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">
              Cadastrado em {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'Não informado'} • CPF: {user.cpf || 'Não informado'}
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
            <p className="text-slate-200">{user.email || 'Não informado'}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm uppercase">Telefone</span>
            <p className="text-slate-200">{user.phone || 'Não informado'}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm uppercase">CPF</span>
            <p className="text-slate-200">{user.cpf || 'Não informado'}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm uppercase">Status da Conta</span>
            <span className="px-2 py-0.5 rounded text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700 w-fit block mt-1">
              Não informado
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
            R$ {Number(user.totalSpent || 0).toFixed(2)}
          </p>
          <p className="text-sm text-slate-500">
            Soma dos pagamentos confirmados vinculados a esta conta
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
          {userCases.length === 0 && (
            <p className="py-5 text-center text-sm text-slate-500">Nenhum caso vinculado a esta conta.</p>
          )}
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
                  Auto {c.infraction?.aitNumber || 'N/A'} • Placa {c.vehicle?.plate || 'N/A'} • {c.infraction?.autuadorBody || 'Não informado'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : 'Não informado'}
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
