/**
 * Configuração Canônica Global de Open Graph, Twitter Card e Metadados SEO
 * Adeus Multas — Sistema Pericial de Defesa Autônoma
 */

export interface SEOMetadata {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogSiteName?: string;
  locale?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  keywords?: string[];
  noIndex?: boolean;
}

export const CANONICAL_BASE_URL = 
  (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1'))
    ? window.location.origin
    : (import.meta.env.VITE_APP_URL || 'https://www.defesai.shop');

export const DEFAULT_SEO_CONFIG: Required<SEOMetadata> = {
  title: 'Adeus Multas — Plataforma Pericial de Recursos de Trânsito',
  description:
    'Plataforma de inteligência e triagem pericial para recursos de multas de trânsito, defesas prévias e anulação de penalidades fundamentadas no CTB e CONTRAN.',
  canonicalUrl: 'https://www.defesai.shop/',
  ogImage: 'https://www.defesai.shop/og-image.png',
  ogType: 'website',
  ogSiteName: 'Adeus Multas',
  locale: 'pt_BR',
  twitterCard: 'summary_large_image',
  keywords: [
    'adeus multas',
    'recurso de multa',
    'defesa prévia',
    'jari',
    'cetran',
    'cnh suspensa',
    'lei seca',
    'bafômetro',
    'velocidade ctb',
    'artigo 267 ctb',
    'defesai'
  ],
  noIndex: false,
};

/** Metadados pré-configurados por rota pública */
export const ROUTE_SEO_PRESETS: Record<string, Partial<SEOMetadata>> = {
  '/': {
    title: 'Adeus Multas — Plataforma Pericial de Recursos de Trânsito',
    description: 'Análise pericial de multas de trânsito, defesas técnicas fundamentadas no CTB e resoluções do CONTRAN.',
  },
  '/novo-caso': {
    title: 'Análise Gratuita de Multa — Adeus Multas',
    description: 'Faça a triagem pericial gratuita da sua notificação de autuação e descubra teses de anulação da multa.',
  },
  '/login': {
    title: 'Acessar Conta — Adeus Multas',
    description: 'Acesse o portal do condutor para acompanhar o andamento dos seus recursos de trânsito.',
    noIndex: true,
  },
  '/dashboard': {
    title: 'Painel do Condutor — Adeus Multas',
    description: 'Gestão integrada de recursos, defesas de CNH e acompanhamento de autuações.',
    noIndex: true,
  },
  '/knowledge': {
    title: 'Base Jurídica & Catálogo CTB — Adeus Multas',
    description: 'Catálogo de teses jurídicas, resoluções CONTRAN e jurisprudência pericial de trânsito.',
  },
  '/marketing': {
    title: 'Marketing OS — Adeus Multas',
    description: 'Console operacional de inteligência e distribuição de campanhas de trânsito.',
    noIndex: true,
  },
  '/admin': {
    title: 'Console Administrativo — Adeus Multas',
    description: 'Gestão de infrações, clientes e inteligência jurídica.',
    noIndex: true,
  },
};
