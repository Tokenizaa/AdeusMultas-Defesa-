import {
  LayoutDashboard,
  Folders,
  Users,
  FileText,
  CreditCard,
  Bot,
  Cpu,
  Boxes,
  Sliders,
  HeartPulse,
  Scale,
  FolderLock,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Radio,
  BarChart3,
  Settings,
  Share2,
  Tag,
  Percent,
  Gift,
  UsersRound,
  Wallet,
  ListChecks,
  Settings2,
  List,
} from 'lucide-react';
import type { AdminNavGroup } from './admin-nav-types';

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Visão Geral',
    items: [
      {
        label: 'Dashboard OS',
        path: '/admin',
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    title: 'Operação',
    items: [
      {
        label: 'Casos & Autuações',
        path: '/admin/cases',
        icon: Folders,
      },
      {
        label: 'Usuários & Contas',
        path: '/admin/users',
        icon: Users,
      },
      {
        label: 'Documentos & Petições',
        path: '/admin/documents',
        icon: FileText,
      },
      {
        label: 'Pagamentos & Afiliados (VenoPag)',
        path: '/admin/payments',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Crescimento',
    children: [
      {
        title: 'Operação de Marketing',
        items: [
          {
            label: 'Dashboard Geral',
            path: '/admin/marketing',
            icon: LayoutDashboard,
          },
          {
            label: 'Inbox Unificado',
            path: '/admin/marketing?view=inbox',
            icon: MessageSquare,
          },
          {
            label: 'Biblioteca de Conteúdos',
            path: '/admin/marketing?view=contents',
            icon: FileText,
          },
          {
            label: 'Estúdio Criativo IA',
            path: '/admin/marketing?view=studio',
            icon: Sparkles,
          },
          {
            label: 'Canais Conectados',
            path: '/admin/marketing?view=channels',
            icon: Radio,
          },
          {
            label: 'Análise de Resultados',
            path: '/admin/marketing?view=results',
            icon: BarChart3,
          },
          {
            label: 'Configurações de Marca',
            path: '/admin/marketing?view=settings',
            icon: Settings,
          },
        ],
      },
      {
        title: 'Prospecção B2B Autônoma',
        items: [
          { label: 'Visão Geral', path: '/admin/marketing/prospecting', icon: LayoutDashboard, exact: true },
          { label: 'Leads', path: '/admin/marketing/prospecting/leads', icon: Users },
          { label: 'Campanhas', path: '/admin/marketing/prospecting/campaigns', icon: ListChecks },
          { label: 'Automação', path: '/admin/marketing/prospecting/automation', icon: Settings2 },
          { label: 'Fila', path: '/admin/marketing/prospecting/queue', icon: List },
          { label: 'Coleta', path: '/admin/marketing/prospecting/collection', icon: Bot },
        ],
      },
      {
        title: 'Gestão Comercial (Hub)',
        items: [
          {
            label: 'Visão Geral',
            path: '/admin/commercial',
            icon: TrendingUp,
            exact: true,
          },
          {
            label: 'Preços',
            path: '/admin/commercial/prices',
            icon: Tag,
          },
          {
            label: 'Promoções',
            path: '/admin/commercial/promotions',
            icon: Percent,
          },
          {
            label: 'Cupons',
            path: '/admin/commercial/coupons',
            icon: Gift,
          },
          {
            label: 'Bônus',
            path: '/admin/commercial/bonuses',
            icon: Wallet,
          },
          {
            label: 'Indicações',
            path: '/admin/commercial/referrals',
            icon: Share2,
          },
          {
            label: 'Comissões',
            path: '/admin/commercial/commissions',
            icon: UsersRound,
          },
          {
            label: 'Configurações',
            path: '/admin/commercial/settings',
            icon: Sliders,
          },
        ],
      },
    ],
  },
  {
    title: 'Inteligência',
    items: [
      {
        label: 'IA & Gateway Providers',
        path: '/admin/ai',
        icon: Cpu,
      },
      {
        label: 'Base Jurídica CTB',
        path: '/admin/knowledge',
        icon: Scale,
      },
    ],
  },
  {
    title: 'Sistema',
    items: [
      {
        label: 'Hub de Integrações',
        path: '/admin/integrations',
        icon: Boxes,
      },
      {
        label: 'Configurações (Settings)',
        path: '/admin/settings',
        icon: Sliders,
      },
      {
        label: 'Monitoramento & Saúde',
        path: '/admin/monitoring',
        icon: HeartPulse,
      },
      {
        label: 'Auditoria & LGPD',
        path: '/admin/audit',
        icon: FolderLock,
      },
    ],
  },
];
