import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './core/auth/AuthContext';
import { RouterProvider, useRouter } from './core/router/RouterContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { api } from './lib/api/client';
import { CASES_CHANGED_EVENT } from './context/casesEvents';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { LandingPageView } from './components/public/LandingPageView';
import { LoginPageView } from './components/public/LoginPageView';
import { RegisterPageView } from './components/public/RegisterPageView';

// User Pages
import { UserDashboardView } from './components/user/UserDashboardView';
import { UserProfileView } from './components/user/UserProfileView';
import { UserSettingsView } from './components/user/UserSettingsView';

// Existing Product Modules & Functional Views
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { CheckoutView } from './components/checkout/CheckoutView';
import { CaseDetailView } from './components/cases/CaseDetailView';
import { CasesListView } from './components/cases/CasesListView';
import { KnowledgeHub } from './components/knowledge/KnowledgeHub';
import { MarketingOSView } from './components/marketing/MarketingOSView';
import { ProspectingPage } from './components/marketing/components/ProspectingPage';
import { AdminAuditView } from './components/admin/AdminAuditView';
import { WhatsAppSimulatorModal } from './components/communication/WhatsAppSimulatorModal';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';

// Admin Pages
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminCasesListView } from './components/admin/AdminCasesListView';
import { AdminCaseDetailView } from './components/admin/AdminCaseDetailView';
import { AdminUsersListView } from './components/admin/AdminUsersListView';
import { AdminUserDetailView } from './components/admin/AdminUserDetailView';
import { AdminDocumentsView } from './components/admin/AdminDocumentsView';
import { AdminPaymentsView } from './components/admin/AdminPaymentsView';
import { AdminAiGatewayView } from './components/admin/AdminAiGatewayView';
import { AdminIntegrationsView } from './components/admin/AdminIntegrationsView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { AdminMonitoringView } from './components/admin/AdminMonitoringView';

// Commercial Admin Central Hub
import { CommercialHubView } from './components/commercial/CommercialHubView';
import { AffiliatePortalView } from './components/affiliate/AffiliatePortalView';

import { CaseDomain } from './types';

function AppContent() {
  const { currentPath, activeArea, params, navigate } = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const [cases, setCases] = useState<CaseDomain[]>([]);
  const [activeCase, setActiveCase] = useState<CaseDomain | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [whatsAppTargetCaseId, setWhatsAppTargetCaseId] = useState<string>('');

  const loadCases = async (retryCount = 0) => {
    try {
      const data = await api.get<CaseDomain[]>('/api/cases');
      if (Array.isArray(data)) {
        setCases(data);
        if (!activeCase && data.length > 0) {
          setActiveCase(data[0]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch cases from server, retrying in background...', err);
      if (retryCount < 3) {
        setTimeout(() => loadCases(retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  // FIX 2 — invalidação de cache: quando qualquer fluxo (wizard, checkout)
  // persiste um caso no servidor, refazemos o fetch canônico para que
  // dashboard (/dashboard), listagem (/cases) e views admin reflitam o novo
  // caso imediatamente, sem depender de reload manual.
  useEffect(() => {
    const handleCasesChanged = () => {
      loadCases();
    };
    window.addEventListener(CASES_CHANGED_EVENT, handleCasesChanged);
    return () => window.removeEventListener(CASES_CHANGED_EVENT, handleCasesChanged);
  }, []);

  // Sync activeCase if URL params has an ID
  useEffect(() => {
    if (params.id && cases.length > 0) {
      const found = cases.find((c) => c.id === params.id);
      if (found) {
        setActiveCase(found);
      }
    }
  }, [params.id, cases]);

  const handleCaseReadyForCheckout = (newCase: CaseDomain) => {
    setActiveCase(newCase);
    setCases((prev) => {
      const exists = prev.some((c) => c.id === newCase.id);
      return exists ? prev.map((c) => (c.id === newCase.id ? newCase : c)) : [newCase, ...prev];
    });
    navigate(`/cases/${newCase.id}`);
  };

  const handlePaymentSuccess = (updatedCase: CaseDomain) => {
    setActiveCase(updatedCase);
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    // Reconciliação server-truth após mutação de pagamento (aditivo ao patch otimista).
    loadCases();
    navigate(`/cases/${updatedCase.id}`);
  };

  const handleSelectCaseFromList = (caseItem: CaseDomain) => {
    setActiveCase(caseItem);
    navigate(`/cases/${caseItem.id}`);
  };

  const handleUpdateCase = (updated: CaseDomain) => {
    setActiveCase(updated);
    setCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    api.put(`/api/cases/${updated.id}`, updated).catch(console.error);
  };

  const handleOpenWhatsAppModal = (caseId: string) => {
    setWhatsAppTargetCaseId(caseId);
    setIsWhatsAppModalOpen(true);
  };

  // =========================================================================
  // 1. ÁREA ADMINISTRATIVA (Rotas /admin/*)
  // =========================================================================
  if (activeArea === 'admin') {
    let title = 'Console Administrativo';
    let subtitle = 'Monitoramento operacional de autuações, teses e conformidade';

    if (currentPath === '/admin/cases' || currentPath.startsWith('/admin/cases/')) {
      title = 'Casos & Autuações';
      subtitle = 'Tabela operacional de autuações, pagamentos e minutas';
    } else if (currentPath === '/admin/users' || currentPath.startsWith('/admin/users/')) {
      title = 'Usuários & Permissões';
      subtitle = 'Gestão de contas de condutores e administradores';
    } else if (currentPath === '/admin/documents') {
      title = 'Repositório de Petições & Minutas';
      subtitle = 'Peças jurídicas geradas pelo motor CTB e modelos de RAG';
    } else if (currentPath === '/admin/payments') {
      title = 'Gestão Financeira (PagBank)';
      subtitle = 'Monitoramento de liquidação PIX, conciliação e webhooks';
    } else if (currentPath === '/admin/ai') {
      title = 'IA Core & Gateway de Provedores';
      subtitle = 'Orquestração multi-provider (NVIDIA NIM ➔ 9Router ➔ RAG CTB)';
    } else if (currentPath === '/admin/integrations') {
      title = 'Hub Central de Integrações';
      subtitle = 'Meta Graph API, PagBank Orders v2, Supabase e OCR Vision';
    } else if (currentPath === '/admin/knowledge') {
      title = 'Base Jurídica Canônica';
      subtitle = '52 teses fundamentadas, 6 checklists e templates determinísticos';
    } else if (currentPath.startsWith('/admin/marketing/prospecting')) {
      title = 'Prospecção B2B Autônoma';
      if (currentPath === '/admin/marketing/prospecting/leads') {
        subtitle = 'Base qualificada de despachantes e advogados de trânsito';
      } else if (currentPath === '/admin/marketing/prospecting/campaigns') {
        subtitle = 'Regras de cadência, segmentação por cidade e disparos ativos';
      } else if (currentPath === '/admin/marketing/prospecting/automation') {
        subtitle = 'Status do motor, worker autônomo e conectividade Evolution API';
      } else if (currentPath === '/admin/marketing/prospecting/queue') {
        subtitle = 'Jobs agendados, tentativas, retries e logs de processamento';
      } else if (currentPath === '/admin/marketing/prospecting/collection') {
        subtitle = 'Aquisição autônoma de novos contatos no Google Maps e bases públicas';
      } else {
        subtitle = 'Métricas, KPIs de conversão e motor de prospecção via WhatsApp';
      }
    } else if (currentPath.startsWith('/admin/marketing')) {
      title = 'Marketing OS (7 Agentes)';
      subtitle = 'Campanhas autônomas de aquisição e nutrição de condutores';
    } else if (currentPath === '/admin/settings') {
      title = 'Configurações da Plataforma (Settings)';
      subtitle = 'Gestão centralizada de variáveis operacionais e credenciais criptográficas';
    } else if (currentPath === '/admin/logs') {
      title = 'Logs Estruturados & Tracing';
      subtitle = 'Inspeção de eventos com correlationId e mascaramento LGPD';
    } else if (currentPath === '/admin/monitoring') {
      title = 'Monitoramento & Observabilidade';
      subtitle = 'Saúde de infraestrutura, latências P50/P95/P99 e alertas ativos';
    } else if (currentPath === '/admin/audit') {
      title = 'Auditoria & LGPD';
      subtitle = 'Trilha de eventos imutável com mascaramento criptográfico';
    } else if (currentPath === '/admin/commercial') {
      title = 'Visão Geral Comercial & Economia';
      subtitle = 'Monitoramento de receita (GMV), conversões e indicadores';
    } else if (currentPath === '/admin/commercial/prices') {
      title = 'Tabela de Preços & Serviços';
      subtitle = 'Valores padrão, promocionais e histórico auditável de alterações';
    } else if (currentPath === '/admin/commercial/promotions') {
      title = 'Promoções & Campanhas';
      subtitle = 'Gestão de ofertas sazonais, descontos e primeira compra';
    } else if (currentPath === '/admin/commercial/coupons') {
      title = 'Gestão de Cupons';
      subtitle = 'Emissão de códigos de desconto, regras e limites por condutor';
    } else if (currentPath === '/admin/commercial/bonuses') {
      title = 'Sistema de Bônus (Ledger)';
      subtitle = 'Livro-razão imutável de créditos promocionais e bonificações';
    } else if (currentPath === '/admin/commercial/referrals') {
      title = 'Indicações em 3 Níveis';
      subtitle = 'Árvore determinística multinível e taxas configuráveis';
    } else if (currentPath === '/admin/commercial/commissions') {
      title = 'Ledger de Comissões';
      subtitle = 'Comissões geradas por pagamentos confirmados e liquidações';
    } else if (currentPath === '/admin/commercial/tests') {
      title = 'Test Center Comercial Automatizado';
      subtitle = '15 cenários de teste para precificação, cupom e indicações';
    } else if (currentPath === '/admin/commercial/settings') {
      title = 'Configurações Comerciais & Permissões';
      subtitle = 'Governança, matriz de acesso e trilha de auditoria';
    }

    return (
      <AdminLayout pageTitle={title} pageSubtitle={subtitle}>
        {currentPath === '/admin' && (
          <AdminDashboardView onSelectCase={handleSelectCaseFromList} />
        )}
        {currentPath === '/admin/cases' && (
          <AdminCasesListView
            cases={cases}
            onSelectCase={handleSelectCaseFromList}
            onRefreshCases={loadCases}
          />
        )}
        {currentPath.startsWith('/admin/cases/') && <AdminCaseDetailView />}
        {currentPath === '/admin/users' && <AdminUsersListView />}
        {currentPath.startsWith('/admin/users/') && <AdminUserDetailView />}
        {currentPath === '/admin/documents' && <AdminDocumentsView />}
        {currentPath === '/admin/payments' && <AdminPaymentsView />}
        {currentPath === '/admin/ai' && <AdminAiGatewayView />}
        {currentPath === '/admin/integrations' && <AdminIntegrationsView />}
        {currentPath === '/admin/knowledge' && <KnowledgeHub />}
        {currentPath.startsWith('/admin/marketing/prospecting') && <ProspectingPage />}
        {currentPath.startsWith('/admin/marketing') && !currentPath.startsWith('/admin/marketing/prospecting') && <MarketingOSView />}
        {currentPath === '/admin/settings' && <AdminSettingsView />}
        {currentPath === '/admin/logs' && <AdminAuditView />}
        {currentPath === '/admin/monitoring' && <AdminMonitoringView />}
        {currentPath === '/admin/audit' && <AdminAuditView />}

        {/* Commercial Management Hub with Sub-Tabs */}
        {currentPath === '/admin/commercial' && <CommercialHubView initialTab="overview" />}
        {currentPath === '/admin/commercial/prices' && <CommercialHubView initialTab="prices" />}
        {currentPath === '/admin/commercial/promotions' && <CommercialHubView initialTab="promotions" />}
        {currentPath === '/admin/commercial/coupons' && <CommercialHubView initialTab="coupons" />}
        {currentPath === '/admin/commercial/bonuses' && <CommercialHubView initialTab="bonuses" />}
        {currentPath === '/admin/commercial/referrals' && <CommercialHubView initialTab="referrals" />}
        {currentPath === '/admin/commercial/commissions' && <CommercialHubView initialTab="commissions" />}
        {currentPath === '/admin/commercial/settings' && <CommercialHubView initialTab="settings" />}
        {currentPath === '/admin/commercial/tests' && <CommercialHubView initialTab="tests" />}

        {/* PWA Mobile & Desktop Install Prompt */}
        <PWAInstallBanner />
      </AdminLayout>
    );
  }

  // =========================================================================
  // 2. ÁREA DO USUÁRIO / CONDUTOR (Rotas /dashboard, /cases, /perfil, etc.)
  // =========================================================================
  if (activeArea === 'user') {
    let title = 'Painel do Condutor';
    let subtitle = 'Acompanhe seus recursos e prazos perante os órgãos de trânsito';

    if (currentPath.startsWith('/cases')) {
      title = 'Meus Casos & Recursos';
      subtitle = 'Autuações cadastradas e acompanhamento de julgamento';
    } else if (currentPath === '/perfil') {
      title = 'Meu Perfil';
      subtitle = 'Dados do condutor para preenchimento de petições';
    } else if (currentPath === '/configuracoes') {
      title = 'Configurações';
      subtitle = 'Alertas de prazos, notificações e segurança';
    } else if (currentPath === '/checkout') {
      title = 'Pagamento Seguro PIX';
      subtitle = 'Liberação instantânea da minuta jurídica em A4';
    } else if (currentPath === '/afiliado' || currentPath === '/affiliate') {
      title = 'Programa de Afiliados & Indicações';
      subtitle = 'Ganhe até 17% de comissão em 3 níveis divulgando o DefesAi';
    }

    return (
      <UserLayout activeCaseCount={cases.length} pageTitle={title} pageSubtitle={subtitle}>
        {currentPath === '/dashboard' && (
          <UserDashboardView cases={cases} onSelectCase={handleSelectCaseFromList} />
        )}

        {(currentPath === '/afiliado' || currentPath === '/affiliate') && (
          <AffiliatePortalView />
        )}

        {currentPath === '/cases' && (
          <CasesListView
            cases={cases}
            onSelectCase={handleSelectCaseFromList}
            onNewCase={() => navigate('/novo-caso')}
          />
        )}

        {currentPath.startsWith('/cases/') && (
          <CaseDetailView
            currentCase={activeCase ?? undefined}
            caseId={params.id}
            onUpdateCase={handleUpdateCase}
            onBackToList={() => navigate('/cases')}
            onOpenWhatsAppModal={handleOpenWhatsAppModal}
          />
        )}

        {currentPath === '/checkout' && activeCase && isAdmin && (
          <CheckoutView
            currentCase={activeCase}
            onPaymentSuccess={handlePaymentSuccess}
            onBackToOnboarding={() => navigate('/novo-caso')}
          />
        )}
        {(currentPath === '/checkout' && activeCase && !isAdmin) && (
          <div className="max-w-lg mx-auto py-20 px-4 text-center space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Checkout indisponível</h1>
            <p className="text-sm text-slate-600">Complete o processo no wizard de onboarding.</p>
            <button
              onClick={() => navigate('/cases')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm"
            >
              Ver meus casos
            </button>
          </div>
        )}

        {currentPath === '/perfil' && <UserSettingsView />}
        {currentPath === '/configuracoes' && <UserSettingsView />}

        <WhatsAppSimulatorModal
          caseId={whatsAppTargetCaseId}
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
        />

        {/* PWA Mobile & Desktop Install Prompt */}
        <PWAInstallBanner />
      </UserLayout>
    );
  }

  // =========================================================================
  // 3. ÁREA PÚBLICA (Rotas /, /login, /cadastro, /novo-caso)
  // =========================================================================
  const knownPublicRoutes = ['/', '/login', '/cadastro', '/novo-caso'];
  const matchedPublicRoute = knownPublicRoutes.includes(currentPath);

  return (
    <PublicLayout>
      {currentPath === '/' && <LandingPageView />}

      {currentPath === '/login' && <LoginPageView />}

      {currentPath === '/cadastro' && <RegisterPageView />}

      {currentPath === '/novo-caso' && (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
          <OnboardingWizard
            onOpenKnowledge={() => navigate('/admin/knowledge')}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* 404 fallback */}
      {!matchedPublicRoute && (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">404</h1>
            <p className="text-slate-600 mb-6">Pagina nao encontrada</p>
            <button onClick={() => navigate('/')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Voltar ao inicio
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Evolution API Modal */}
      <WhatsAppSimulatorModal
        caseId={whatsAppTargetCaseId}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />

      {/* PWA Mobile & Desktop Install Prompt */}
      <PWAInstallBanner />
    </PublicLayout>
  );
}

export function App() {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </AuthProvider>
    </AccessibilityProvider>
  );
}

export default App;
