import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, User, ShieldCheck, Search, Check, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { AuthUser, UserRole } from '../../types/auth';

export const AdminUsersListView: React.FC = () => {
  const authFetch = useAuthFetch();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingEmail, setTogglingEmail] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await authFetch('/api/admin/users');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const list: AuthUser[] = Array.isArray(data?.users) ? data.users : [];
      setUsers(list);
    } catch (err) {
      console.error('Error loading users:', err);
      setLoadError('Não foi possível carregar usuários. Tente novamente.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.cpf && u.cpf.includes(searchTerm))
  );

  const handleToggleRole = async (email: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'citizen' : 'admin';
    setTogglingEmail(email);
    try {
      const res = await authFetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      await loadUsers();
    } catch (err) {
      console.error('Error toggling user role:', err);
      setLoadError('Não foi possível atualizar a permissão do usuário.');
    } finally {
      setTogglingEmail(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-mono">Gestão de Usuários da Plataforma</h2>
          <p className="text-sm text-slate-400">
            Controle de condutores cadastrados, administradores e permissões de acesso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
            Total: <strong className="text-white">{users.length}</strong> usuários
          </span>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors"
            title="Recarregar usuários"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-950/40 border border-red-800 text-red-200 rounded-xl px-4 py-3 text-sm">
          {loadError}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500 font-mono"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-slate-400">Carregando usuários…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-800 font-mono text-sm uppercase">
                <tr>
                  <th className="py-3 px-4">Usuário / Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Função (Role)</th>
                  <th className="py-3 px-4">Cadastro</th>
                  <th className="py-3 px-4 text-right">Permissões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono text-sm text-slate-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-orange-400 font-bold flex items-center justify-center text-sm shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white font-sans">{u.name}</p>
                          <p className="text-sm text-slate-500">{u.cityState || 'Local não informado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-sm font-bold border ${
                          u.role === 'admin'
                            ? 'bg-orange-950/60 text-orange-300 border-orange-800'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {u.role === 'admin' ? 'Administrador' : 'Motorista (Cidadão)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleRole(u.email, u.role)}
                        disabled={togglingEmail === u.email}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-sm font-sans font-bold transition-colors cursor-pointer border border-slate-800 disabled:opacity-50"
                      >
                        {u.role === 'admin' ? 'Rebaixar para Motorista' : 'Promover a Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      Nenhum usuário encontrado para o filtro atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};