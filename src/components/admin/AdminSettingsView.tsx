import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Cpu,
  Database,
  CreditCard,
  Share2,
  Bot,
  Scan,
  Server,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  Zap,
  Play,
  Save,
  Check,
  History,
  Lock,
  Search,
  ExternalLink,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { SecretEditModal } from './SecretEditModal';
import { api } from '../../lib/api/client';
import type { SettingDefinitionFrontend, SettingAuditRecord, SettingsResponse, TestIntegrationResult } from '../../types/api';





export const AdminSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SettingDefinitionFrontend[]>([]);
  const [auditHistory, setAuditHistory] = useState<SettingAuditRecord[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Secret Modal State
  const [selectedSecret, setSelectedSecret] = useState<SettingDefinitionFrontend | null>(null);
  const [isSecretModalOpen, setIsSecretModalOpen] = useState<boolean>(false);

  // Integration Test State
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const categories = [
    { id: 'ai', label: 'IA / Providers', icon: Cpu, desc: 'NVIDIA NIM, 9Router, Gemini & Fallback' },
    { id: 'supabase', label: 'Supabase', icon: Database, desc: 'PostgreSQL, Auth & Edge Functions' },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard, desc: 'PagBank, PIX, Sandbox & Webhooks' },
    { id: 'meta', label: 'Meta (FB/Insta)', icon: Share2, desc: 'Graph API, OAuth & Publicação' },
    { id: 'marketing', label: 'Marketing OS', icon: Bot, desc: '7 Agentes, Ciclos & Qualidade' },
    { id: 'ocr', label: 'OCR & Percepção', icon: Scan, desc: 'Limiares de Confiança & Radars' },
    { id: 'system', label: 'Sistema & Flags', icon: Server, desc: 'Ambiente, URLs & Feature Flags' },
    { id: 'notifications', label: 'Notificações', icon: Bell, desc: 'Evolution API, WhatsApp & Prazos' },
    { id: 'commercial', label: 'Comercial', icon: TrendingUp, desc: 'Configurações de vendas, comissão e bônus' },
    { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen, desc: 'Configurações de atualização e embeddings do knowledge base' },
  ];

const loadSettings = async () => {
     try {
       setIsLoading(true);
       const res = await api.get<SettingsResponse>('/api/settings');
       setSettings(res.settings);
       setAuditHistory(res.auditHistory);
     } catch (err) {
       console.error('Error loading settings:', err);
     } finally {
       setIsLoading(false);
     }
   };

  useEffect(() => {
    loadSettings();
  }, []);

const handleUpdateSetting = async (key: string, value: any) => {
     setSavingKey(key);
     try {
       const res = await api.put<{ success: boolean; message: string; settings: SettingDefinitionFrontend[] }>('/api/settings', {
         key,
         value,
         updatedBy: 'admin@defesai.com.br',
       });
       if (res.success) {
         setSettings(res.settings);
         setSuccessToast(res.message || 'Configuração salva com sucesso!');
         setTimeout(() => setSuccessToast(null), 3000);
         // refresh audit history
         const auditRes = await api.get<SettingsResponse>('/api/settings');
         setAuditHistory(auditRes.auditHistory);
       }
     } catch (err) {
       console.error('Error updating setting:', err);
     } finally {
       setSavingKey(null);
     }
   };

const handleResetDefault = async (key: string) => {
     if (!window.confirm('Tem certeza que deseja restaurar esta configuração para o padrão original de fábrica?')) {
       return;
     }
     setSavingKey(key);
     try {
       const res = await api.post<{ success: boolean; message: string; settings: SettingDefinitionFrontend[] }>('/api/settings/reset-default', {
         key,
         updatedBy: 'admin@defesai.com.br',
       });
       if (res.success) {
         setSettings(res.settings);
         setSuccessToast(res.message);
         setTimeout(() => setSuccessToast(null), 3000);
       }
     } catch (err) {
       console.error('Error resetting setting:', err);
     } finally {
       setSavingKey(null);
     }
   };

const handleSaveSecret = async (key: string, newSecret: string): Promise<boolean> => {
     try {
       const res = await api.put<{ success: boolean; message: string; settings: SettingDefinitionFrontend[] }>('/api/settings', {
         key,
         value: newSecret,
         updatedBy: 'admin@defesai.com.br',
       });
       if (res.success) {
         setSettings(res.settings);
         setSuccessToast('Segredo criptográfico atualizado com sucesso!');
         setTimeout(() => setSuccessToast(null), 3000);
         return true;
       }
       return false;
     } catch (err) {
       console.error('Error updating secret:', err);
       return false;
     }
   };

const handleTestIntegration = async (serviceId: string) => {
     setTestingService(serviceId);
     try {
       const res = await api.post<TestIntegrationResult>('/api/settings/test-integration', {
         serviceId,
       });
       setTestResults((prev) => ({ ...prev, [serviceId]: res }));
     } catch (err) {
       console.error(`Error testing integration ${serviceId}:`, err);
     } finally {
       setTestingService(null);
     }
   };

  const filteredSettings = settings.filter((s) => {
    const matchesCategory = s.category === activeCategory;
    if (!searchQuery.trim()) return matchesCategory;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.key.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  const getIntegrationTestForCategory = (category: string) => {
    switch (category) {
      case 'ai':
        return [
          { id: 'nvidia', label: 'Testar Conexão NVIDIA NIM' },
          { id: '9router', label: 'Testar Fallback 9Router' },
        ];
      case 'supabase':
        return [{ id: 'supabase', label: 'Testar Conexão Supabase Postgres & Auth' }];
      case 'payments':
        return [{ id: 'pagbank', label: 'Testar API PagBank Orders v2' }];
      case 'meta':
        return [{ id: 'meta', label: 'Testar Graph API Facebook/Instagram' }];
      case 'ocr':
        return [{ id: 'ocr', label: 'Testar Extrator OCR CTB' }];
      default:
        return [];
    }
  };

  const testButtons = getIntegrationTestForCategory(activeCategory);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 text-sm font-semibold flex items-center gap-2.5 shadow-2xl animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950 border border-slate-900 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Painel Central de Configurações</h1>
            <span className="text-sm font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              Admin Safe Mode
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Gerencie os parâmetros operacionais da plataforma com separação rigorosa de variáveis públicas e segredos criptográficos protegidos contra vazamentos.
          </p>
        </div>

        {/* Global Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar configuração ou chave..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-500 font-mono transition-all"
          />
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setSearchQuery('');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-orange-500/10 border-orange-500 text-white shadow-sm'
                  : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
              </div>
              <div>
                <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {cat.label}
                </div>
                <div className="text-[9px] text-slate-500 truncate font-mono mt-0.5">{cat.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Integration Test Bar */}
      {testButtons.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-400 shrink-0" />
            <div>
              <span className="text-sm font-bold text-slate-200">Verificação Ativa de Conectividade</span>
              <p className="text-sm text-slate-500 font-mono">
                Executa teste de ping, autenticação e latência diretamente no backend sem expor chaves.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {testButtons.map((btn) => {
              const isTesting = testingService === btn.id;
              const result = testResults[btn.id];

              return (
                <button
                  key={btn.id}
                  onClick={() => handleTestIntegration(btn.id)}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                      <span className="text-sm">Testando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-orange-400" />
                      <span className="text-sm">{btn.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Test Results Display */}
      {Object.entries(testResults).map(([svcId, resultObj]) => {
        const res = resultObj as any;
        if (!res) return null;
        const isPassed = res.status === 'passed';

        return (
          <div
            key={svcId}
            className={`p-4 rounded-2xl border ${
              isPassed
                ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                : 'bg-amber-950/30 border-amber-800/80 text-amber-200'
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-sm font-bold font-mono uppercase">{res.serviceName}</span>
                <span className="text-sm font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                  Latência: {res.latencyMs} ms
                </span>
              </div>
              <button
                onClick={() => setTestResults((prev) => ({ ...prev, [svcId]: null }))}
                className="text-sm text-slate-400 hover:text-white underline cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <p className="text-sm font-mono">{res.message}</p>

            {res.checks && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                {(res.checks || []).map((chk: any, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-950/60 border border-slate-900 text-sm font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${chk.passed ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="font-semibold text-slate-200">{chk.label}</span>
                    </div>
                    {chk.detail && <div className="text-sm text-slate-400 truncate mt-0.5">{chk.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Settings List */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              {categories.find((c) => c.id === activeCategory)?.label || 'Configurações'} ({filteredSettings.length})
            </span>
          </div>
          <span className="text-sm text-slate-500 font-mono">
            Todas as alterações geram trilha imutável no Audit Log
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
            <span>Carregando configurações operacionais...</span>
          </div>
        ) : filteredSettings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Nenhuma configuração encontrada para este filtro.
          </div>
        ) : (
          <div className="divide-y divide-slate-900">
            {filteredSettings.map((setting) => {
              const isSaving = savingKey === setting.key;

              return (
                <div
                  key={setting.key}
                  className="p-4 sm:p-5 hover:bg-slate-900/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-sans">{setting.name}</span>
                      {setting.isSecret ? (
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> SECRET
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {setting.type}
                        </span>
                      )}
                      {setting.isConfigured ? (
                        <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                          <Check className="w-2.5 h-2.5" /> Configurada
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-slate-500">Pendente</span>
                      )}
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed font-sans">{setting.description}</p>

                    <div className="flex items-center gap-3 text-sm text-slate-500 font-mono pt-1">
                      <span>Chave: {setting.key}</span>
                      {setting.lastUpdated && (
                        <span>
                          Atualizado: {new Date(setting.lastUpdated).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(setting.lastUpdated).toLocaleTimeString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {setting.isSecret ? (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-mono text-sm select-none">
                          {setting.isConfigured ? '••••••••••••••••' : '(não informada)'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSecret(setting);
                            setIsSecretModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Alterar</span>
                        </button>
                      </div>
                    ) : setting.type === 'boolean' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleUpdateSetting(setting.key, !setting.currentValue)}
                          disabled={!setting.isEditable || isSaving}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            setting.currentValue ? 'bg-orange-500' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              setting.currentValue ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className="text-sm font-mono text-slate-300 w-16">
                          {setting.currentValue ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>
                    ) : setting.type === 'select' ? (
                      <select
                        value={setting.currentValue || ''}
                        onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                        disabled={!setting.isEditable || isSaving}
                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500 font-mono cursor-pointer"
                      >
                        {setting.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type={setting.type === 'number' ? 'number' : 'text'}
                          defaultValue={setting.currentValue}
                          onBlur={(e) => {
                            if (e.target.value !== String(setting.currentValue)) {
                              handleUpdateSetting(setting.key, e.target.value);
                            }
                          }}
                          disabled={!setting.isEditable || isSaving}
                          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange-500 font-mono w-48 sm:w-64"
                        />
                      </div>
                    )}

                    {/* Reset default button */}
                    {setting.isEditable && (
                      <button
                        onClick={() => handleResetDefault(setting.key)}
                        disabled={isSaving}
                        title="Restaurar padrão"
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Trail Section */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Histórico de Auditoria de Configurações ({auditHistory.length})
            </span>
          </div>
          <span className="text-sm text-slate-500 font-mono">
            Registros imutáveis com mascaramento de dados sensíveis
          </span>
        </div>

        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-sm font-mono">
            <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase border-b border-slate-900 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Data / Hora</th>
                <th className="py-2.5 px-4">Administrador</th>
                <th className="py-2.5 px-4">Ação</th>
                <th className="py-2.5 px-4">Configuração</th>
                <th className="py-2.5 px-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-sm">
              {auditHistory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2 px-4 text-slate-500">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-4 text-slate-300 font-sans font-semibold">{item.updatedBy}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`px-1.5 py-0.5 rounded text-sm font-bold ${
                        item.isSecret
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          : 'bg-orange-950/60 text-orange-400 border border-orange-800/60'
                      }`}
                    >
                      {item.action}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-200">{item.key}</td>
                  <td className="py-2 px-4 text-slate-400 text-sm truncate max-w-xs">{item.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secret Edit Modal */}
      {selectedSecret && (
        <SecretEditModal
          isOpen={isSecretModalOpen}
          onClose={() => {
            setIsSecretModalOpen(false);
            setSelectedSecret(null);
          }}
          settingKey={selectedSecret.key}
          settingName={selectedSecret.name}
          description={selectedSecret.description}
          isCurrentlyConfigured={Boolean(selectedSecret.isConfigured)}
          onSave={handleSaveSecret}
        />
      )}
    </div>
  );
};
