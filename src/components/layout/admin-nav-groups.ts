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
  Target,
  Sparkles,
  CalendarClock,
  Radio,
  Zap,
  BarChart3,
  Settings,
  Share2,
  Tag,
  Percent,
  Gift,
  UsersRound,
  Wallet,
  TestTube2,
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
        label: 'Pagamentos (PagBank)',
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
            label: 'Kanban Editorial',
            path: '/admin/marketing?view=planning',
            icon: Target,
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
            label: 'Agendamento & Fila',
            path: '/admin/marketing?view=schedule',
            icon: CalendarClock,
          },
          {
            label: 'Automações de Postagem',
            path: '/admin/marketing?view=automations',
            icon: Zap,
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
          {
            label: 'Testes',
            path: '/admin/commercial/tests',
            icon: TestTube2,
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