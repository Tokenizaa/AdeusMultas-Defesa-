/**
 * @file config-service.ts
 * Centralized Platform Configuration & Secret Management Service
 * 
 * Provides:
 * 1. Strict separation of public Configuration vs. protected Secrets.
 * 2. In-memory and environment-backed configuration with typed validation.
 * 3. Masked serialization for frontend (secrets never leaked in plain text).
 */
import { PRICING } from './pricing';
export type SettingCategory =
  | 'ai'
  | 'commercial'
  | 'knowledge'
  | 'marketing'
  | 'meta'
  | 'notifications'
  | 'ocr'
  | 'payments'
  | 'supabase'
  | 'system';

export type SettingType = 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'json';

export interface SettingDefinition {
  key: string;
  name: string;
  category: SettingCategory;
  type: SettingType;
  description: string;
  defaultValue: any;
  currentValue?: any;
  isSecret: boolean;
  isRequired: boolean;
  isEditable: boolean;
  options?: { label: string; value: any }[];
  validationRegex?: string;
  envSource?: string;
  lastUpdated?: string;
  updatedBy?: string;
  isConfigured?: boolean;
}

export interface SettingUpdatePayload {
  key: string;
  value: any;
  updatedBy: string;
}

export interface SettingAuditRecord {
  id: string;
  key: string;
  category: SettingCategory;
  isSecret: boolean;
  action: 'UPDATE_CONFIG' | 'UPDATE_SECRET' | 'RESET_DEFAULT';
  updatedBy: string;
  timestamp: string;
  environment: string;
  details: string;
}

class ConfigService {
  private settings: Map<string, SettingDefinition> = new Map();
  private auditHistory: SettingAuditRecord[] = [];

  constructor() {
    this.initializeDefinitions();
    this.loadFromEnvironment();
  }

  private initializeDefinitions() {
    const definitions: SettingDefinition[] = [
      // =========================================================================
      // 1. IA / PROVIDERS (NVIDIA, 9Router, Gemini, Operational)
      // =========================================================================
      {
        key: 'NVIDIA_API_KEY',
        name: 'NVIDIA API Key',
        category: 'ai',
        type: 'secret',
        description: 'Chave de autenticação da API NVIDIA NIM / Build (nvapi-...)',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'NVIDIA_API_KEY',
      },
      {
        key: 'NVIDIA_BASE_URL',
        name: 'NVIDIA Base URL',
        category: 'ai',
        type: 'string',
        description: 'Endpoint base para inferência de modelos na infraestrutura NVIDIA NIM',
        defaultValue: 'https://integrate.api.nvidia.com/v1',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        envSource: 'NVIDIA_BASE_URL',
      },
      {
        key: 'NVIDIA_CHAT_MODEL',
        name: 'NVIDIA Modelo Principal de Chat',
        category: 'ai',
        type: 'select',
        description: 'Modelo de LLM prioritário para redação jurídica e análise de autos',
        defaultValue: 'meta/llama-3.3-70b-instruct',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        options: [
          { label: 'Llama 3.3 70B Instruct (Recomendado Jurídico)', value: 'meta/llama-3.3-70b-instruct' },
          { label: 'Llama 3.1 405B Instruct (Ultra Alta Fidelidade)', value: 'meta/llama-3.1-405b-instruct' },
          { label: 'Mistral Large 2 (Raciocínio Analítico)', value: 'mistralai/mistral-large-2-instruct' },
          { label: 'Qwen 2.5 72B Instruct (Alta Velocidade)', value: 'qwen/qwen2.5-72b-instruct' },
        ],
        envSource: 'NVIDIA_CHAT_MODEL',
      },
      {
        key: 'NVIDIA_EMBEDDING_MODEL',
        name: 'NVIDIA Modelo de Embeddings',
        category: 'ai',
        type: 'select',
        description: 'Modelo vetorial para busca semântica em jurisprudência e resoluções do CONTRAN',
        defaultValue: 'nvidia/nv-embedqa-e5-v5',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        options: [
          { label: 'NV-EmbedQA E5 v5 (4096 dim - RAG Especializado)', value: 'nvidia/nv-embedqa-e5-v5' },
          { label: 'Snowflake Arctic Embed L (1024 dim)', value: 'snowflake/arctic-embed-l' },
          { label: 'BAAI BGE Multilingual Gemma2', value: 'baai/bge-multilingual-gemma2' },
        ],
        envSource: 'NVIDIA_EMBEDDING_MODEL',
      },
      {
        key: 'NINEROUTER_KEY',
        name: '9Router API Key (Fallback)',
        category: 'ai',
        type: 'secret',
        description: 'Chave de contingência para o roteador 9Router quando NVIDIA estiver indisponível',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'NINEROUTER_KEY',
      },
      {
        key: 'NINEROUTER_BASE_URL',
        name: '9Router Base URL',
        category: 'ai',
        type: 'string',
        description: 'URL base do serviço de contingência 9Router',
        defaultValue: 'https://api.9router.com/v1',
        isSecret: false,
        isRequired: false,
        isEditable: true,
        envSource: 'NINEROUTER_BASE_URL',
      },
      {
        key: 'NINEROUTER_MODEL',
        name: '9Router Modelo Fallback',
        category: 'ai',
        type: 'string',
        description: 'Identificador do modelo no 9Router para fallback imediato',
        defaultValue: 'qwen/qwen-2.5-72b-instruct',
        isSecret: false,
        isRequired: false,
        isEditable: true,
      },
      {
        key: 'AI_TIMEOUT_MS',
        name: 'Timeout da IA (milissegundos)',
        category: 'ai',
        type: 'number',
        description: 'Tempo limite antes de acionar retry ou fallback para 9Router / Gemini',
        defaultValue: 8000,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'AI_MAX_RETRIES',
        name: 'Tentativas Máximas (Retries)',
        category: 'ai',
        type: 'number',
        description: 'Número de repetições automáticas em caso de erro 429 ou 503 na NVIDIA',
        defaultValue: 2,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'AI_ENABLE_FALLBACK',
        name: 'Habilitar Fallback Automático',
        category: 'ai',
        type: 'boolean',
        description: 'Alterna automaticamente para 9Router / Gemini quando NVIDIA falhar',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'AI_TEMPERATURE',
        name: 'Temperatura de Geração',
        category: 'ai',
        type: 'number',
        description: 'Controle de determinismo das teses jurídicas (0.0 = determinístico, 1.0 = criativo)',
        defaultValue: 0.15,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'GEMINI_API_KEY',
        name: 'Google Gemini API Key',
        category: 'ai',
        type: 'secret',
        description: 'Chave de API do Google AI Studio para motor de assistência contextual e visão',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'GEMINI_API_KEY',
      },

      // =========================================================================
      // 2. SUPABASE (Database, Auth, Edge Functions)
      // =========================================================================
      {
        key: 'VITE_SUPABASE_URL',
        name: 'Supabase Project URL',
        category: 'supabase',
        type: 'string',
        description: 'URL base do projeto Supabase (ex: https://xyz.supabase.co)',
        defaultValue: '',
        isSecret: false,
        isRequired: false,
        isEditable: true,
        envSource: 'VITE_SUPABASE_URL',
      },
      {
        key: 'VITE_SUPABASE_ANON_KEY',
        name: 'Supabase Anon Key',
        category: 'supabase',
        type: 'secret',
        description: 'Chave pública anônima para cliente frontend e autenticação de usuários',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'VITE_SUPABASE_ANON_KEY',
      },
      {
        key: 'SUPABASE_SERVICE_ROLE_KEY',
        name: 'Supabase Service Role Key',
        category: 'supabase',
        type: 'secret',
        description: 'Chave de privilégio de serviço (backend apenas) para bypass de RLS e migrações',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'SUPABASE_SERVICE_ROLE_KEY',
      },
      {
        key: 'SUPABASE_REGION',
        name: 'Região do Cluster Supabase',
        category: 'supabase',
        type: 'select',
        description: 'Localização geográfica do banco Postgres para latência reduzida',
        defaultValue: 'sa-east-1',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        options: [
          { label: 'São Paulo, Brasil (sa-east-1 - Menor Latência)', value: 'sa-east-1' },
          { label: 'US East (us-east-1)', value: 'us-east-1' },
          { label: 'US West (us-west-1)', value: 'us-west-1' },
          { label: 'Europe (eu-central-1)', value: 'eu-central-1' },
        ],
      },
      {
        key: 'SUPABASE_ENABLE_EDGE_FUNCTIONS',
        name: 'Habilitar Edge Functions',
        category: 'supabase',
        type: 'boolean',
        description: 'Roteia tarefas de OCR e busca vetorial para Deno Edge Functions',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },

      // =========================================================================
      // 3. PAGAMENTOS (PagBank / GGPIXAPI / Gateway Abstraction)
      // =========================================================================
{
  key: 'PAYMENT_ACTIVE_GATEWAY',
  name: 'Gateway de Pagamento Ativo',
  category: 'payments',
  type: 'select',
  description: 'Gateway utilizado para novas cobranças PIX. Pagamentos existentes NÃO são afetados pela troca.',
  defaultValue: 'ggpixapi',
  isSecret: false,
  isRequired: true,
  isEditable: true,
  options: [
    { label: 'PagBank / PagSeguro (Recomendado — PIX + Cartão)', value: 'pagbank' },
    { label: 'GGPIXAPI (Apenas PIX In)', value: 'ggpixapi' },
  ],
  envSource: 'PAYMENT_ACTIVE_GATEWAY',
},
      {
        key: 'PAGBANK_ENV',
        name: 'Ambiente PagBank',
        category: 'payments',
        type: 'select',
        description: 'Modo de processamento de pagamentos PIX e cartão de crédito',
        defaultValue: 'sandbox',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        options: [
          { label: 'Sandbox / Homologação (Testes Seguros)', value: 'sandbox' },
          { label: 'Produção (Transações Reais)', value: 'production' },
        ],
        envSource: 'PAGBANK_ENV',
      },
      {
        key: 'PAGBANK_TOKEN',
        name: 'PagBank Token de Autenticação',
        category: 'payments',
        type: 'secret',
        description: 'Bearer Token gerado no portal do desenvolvedor PagBank/PagSeguro',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'PAGBANK_TOKEN',
      },
      {
        key: 'PAGBANK_WEBHOOK_SECRET',
        name: 'PagBank Webhook Signature Secret',
        category: 'payments',
        type: 'secret',
        description: 'Chave secreta para validação criptográfica do webhook de confirmação de PIX',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'PAGBANK_WEBHOOK_SECRET',
      },
      {
        key: 'GGPIX_API_KEY',
        name: 'GGPIXAPI Chave de API',
        category: 'payments',
        type: 'secret',
        description: 'API Key do GGPIXAPI para autenticação (header X-API-Key). Obtida em Configurações → Credenciais no painel.',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'GGPIX_API_KEY',
      },
{
  key: 'GGPIX_ENABLED',
  name: 'GGPIXAPI Habilitado',
  category: 'payments',
  type: 'boolean',
  description: 'Ativa o gateway GGPIXAPI para processar cobranças PIX In',
  defaultValue: true,
  isSecret: false,
  isRequired: false,
  isEditable: true,
  envSource: 'GGPIX_ENABLED',
},
      {
        key: 'PAYMENT_DEFAULT_AMOUNT',
        name: 'Valor Padrão da Defesa (R$)',
        category: 'payments',
        type: 'number',
        description: 'Preço base para emissão da minuta jurídica personalizada com garantia',
        defaultValue: PRICING.FALLBACK_PRICE,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'PAYMENT_PIX_EXPIRATION_MINUTES',
        name: 'Validade do QR Code PIX (minutos)',
        category: 'payments',
        type: 'number',
        description: 'Tempo até o QR Code PIX expirar e exigir nova geração',
        defaultValue: 30,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },

      // =========================================================================
      // 4. META (Facebook & Instagram Graph API)
      // =========================================================================
      {
        key: 'META_APP_ID',
        name: 'Meta App ID',
        category: 'meta',
        type: 'string',
        description: 'Identificador do aplicativo no portal Meta for Developers',
        defaultValue: '',
        isSecret: false,
        isRequired: false,
        isEditable: true,
        envSource: 'META_APP_ID',
      },
      {
        key: 'META_APP_SECRET',
        name: 'Meta App Secret',
        category: 'meta',
        type: 'secret',
        description: 'Segredo do aplicativo Meta para troca e validação de tokens de longa duração',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'META_APP_SECRET',
      },
      {
        key: 'META_ACCESS_TOKEN',
        name: 'Meta Page Access Token',
        category: 'meta',
        type: 'secret',
        description: 'Token permanente de acesso à Página do Facebook e conta do Instagram Business',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'META_ACCESS_TOKEN',
      },
      {
        key: 'META_PAGE_ID',
        name: 'Facebook Page ID',
        category: 'meta',
        type: 'string',
        description: 'ID da página oficial no Facebook para publicações de conteúdo educativo',
        defaultValue: '',
        isSecret: false,
        isRequired: false,
        isEditable: true,
        envSource: 'META_PAGE_ID',
      },
      {
        key: 'INSTAGRAM_ACCOUNT_ID',
        name: 'Instagram Business Account ID',
        category: 'meta',
        type: 'string',
        description: 'ID da conta profissional do Instagram conectada à Página',
        defaultValue: '',
        isSecret: false,
        isRequired: false,
        isEditable: true,
        envSource: 'INSTAGRAM_ACCOUNT_ID',
      },

      // =========================================================================
      // 5. MARKETING OS (7 Autonomous Agents)
      // =========================================================================
      {
        key: 'MARKETING_AUTO_CYCLE_ENABLED',
        name: 'Loop Autônomo de Marketing',
        category: 'marketing',
        type: 'boolean',
        description: 'Permite que o ciclo de 7 agentes produza pautas e carrosséis automaticamente',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'MARKETING_CYCLE_INTERVAL_MINUTES',
        name: 'Intervalo de Ciclo de Campanhas (minutos)',
        category: 'marketing',
        type: 'number',
        description: 'Frequência de reavaliação de engajamento e proposição de novos conteúdos',
        defaultValue: 60,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'MARKETING_QUALITY_THRESHOLD',
        name: 'Nota Mínima do Agente de Qualidade',
        category: 'marketing',
        type: 'number',
        description: 'Pontuação mínima (0 a 10) exigida para aprovação de postagens sem intervenção humana',
        defaultValue: 8.5,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'MARKETING_MAX_POSTS_PER_DAY',
        name: 'Limite Diário de Publicações',
        category: 'marketing',
        type: 'number',
        description: 'Teto de conteúdos postados por canal para manter alta relevância algorítmica',
        defaultValue: 3,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },

      // =========================================================================
      // 6. OCR & PROCESSAMENTO DOCUMENTAL
      // =========================================================================
      {
        key: 'OCR_CONFIDENCE_THRESHOLD',
        name: 'Limiar Mínimo de Confiança OCR (%)',
        category: 'ocr',
        type: 'number',
        description: 'Confiança mínima necessária para autopreencher campos sem solicitar revisão visual',
        defaultValue: 80,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'OCR_MAX_IMAGE_SIZE_MB',
        name: 'Tamanho Máximo de Arquivo (MB)',
        category: 'ocr',
        type: 'number',
        description: 'Limite para upload de fotos e PDFs da notificação de trânsito',
        defaultValue: 15,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'OCR_ENABLE_RADAR_PREPROCESSING',
        name: 'Pré-processamento Avançado de Radars',
        category: 'ocr',
        type: 'boolean',
        description: 'Aplica filtros de binarização e correção de perspectiva em fotos de radares',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },

      // =========================================================================
      // 7. SISTEMA & PLATAFORMA
      // =========================================================================
      {
        key: 'APP_ENV',
        name: 'Ambiente de Execução',
        category: 'system',
        type: 'select',
        description: 'Modo operacional do servidor e containers',
        defaultValue: process.env.NODE_ENV === 'production' ? 'production' : 'development',
        isSecret: false,
        isRequired: true,
        isEditable: false,
        options: [
          { label: 'Desenvolvimento (Development)', value: 'development' },
          { label: 'Homologação (Staging)', value: 'staging' },
          { label: 'Produção (Production)', value: 'production' },
        ],
      },
      {
        key: 'APP_URL',
        name: 'URL Pública da Aplicação',
        category: 'system',
        type: 'string',
        description: 'Domínio canônico para geração de links seguros, webhooks e callbacks OAuth',
        defaultValue: process.env.APP_URL || 'https://www.defesai.shop/',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        envSource: 'APP_URL',
      },
      {
        key: 'ENABLE_WHATSAPP_SIMULATOR',
        name: 'Habilitar Simulador WhatsApp Evolution',
        category: 'system',
        type: 'boolean',
        description: 'Permite que condutores testem o recebimento de notificações interativas via WhatsApp',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'ENABLE_AI_COPILOT',
        name: 'Habilitar Copiloto Jurídico em Tempo Real',
        category: 'system',
        type: 'boolean',
        description: 'Exibe assistente flutuante de esclarecimento de dúvidas da CNH na jornada do motorista',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'MAINTENANCE_MODE',
        name: 'Modo Manutenção Operacional',
        category: 'system',
        type: 'boolean',
        description: 'Quando ativado, exibe aviso amigável de manutenção programada para novos condutores',
        defaultValue: false,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },

      // =========================================================================
      // 8. NOTIFICAÇÕES & ALERTA DE PRAZOS
      // =========================================================================
      // OBS(2026-08-27): As chaves NOTIF_WHATSAPP_API_URL / NOTIF_WHATSAPP_API_KEY
      // foram REMOVIDAS por serem órfãs. A integração WhatsApp é feita de forma
      // canônica pelo WhatsAppService (src/server/services/whatsapp-service.ts),
      // que lê diretamente as env vars EVOLUTION_API_URL / EVOLUTION_API_KEY /
      // EVOLUTION_INSTANCE_NAME (fonte única de verdade). Nenhum consumidor
      // lia as chaves NOTIF_WHATSAPP_* (grep provou zero usos além das
      // definições de catálogo). Mantidas: ENABLE_WHATSAPP_SIMULATOR (fluxo de
      // simulação) e NOTIF_ALERT_DEADLINE_DAYS_BEFORE / NOTIF_ENABLE_SMS_FALLBACK.
      {
        key: 'NOTIF_ALERT_DEADLINE_DAYS_BEFORE',
        name: 'Alerta Preventivo de Prazo (Dias antes)',
        category: 'notifications',
        type: 'number',
        description: 'Dispara lembrete preventivo no WhatsApp e e-mail antes do encerramento do prazo de recurso',
        defaultValue: 5,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'NOTIF_ENABLE_SMS_FALLBACK',
        name: 'Fallback para SMS em Casos Críticos',
        category: 'notifications',
        type: 'boolean',
        description: 'Envia SMS automático se mensagem de WhatsApp sobre suspensão de CNH não for entregue',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      // =========================================================================
      // 9. COMERCIAL
      // =========================================================================
      {
        key: 'COMERCIAL_ENV',
        name: 'Ambiente Comercial',
        category: 'commercial',
        type: 'select',
        description: 'Ambiente de operação do módulo comercial (sandbox ou produção)',
        defaultValue: 'sandbox',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        options: [
          { label: 'Sandbox / Homologação', value: 'sandbox' },
          { label: 'Produção (Transações Reais)', value: 'production' },
        ],
        envSource: 'COMERCIAL_ENV',
      },
      {
        key: 'COMERCIAL_TOKEN',
        name: 'Token Comercial',
        category: 'commercial',
        type: 'secret',
        description: 'Bearer Token para autenticação na API comercial',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'COMERCIAL_TOKEN',
      },
      {
        key: 'COMERCIAL_WEBHOOK_SECRET',
        name: 'Webhook Secret Comercial',
        category: 'commercial',
        type: 'secret',
        description: 'Secret para validação de webhooks comerciais',
        defaultValue: '',
        isSecret: true,
        isRequired: false,
        isEditable: true,
        envSource: 'COMERCIAL_WEBHOOK_SECRET',
      },
      {
        key: 'COMERCIAL_AUDIT_ENABLED',
        name: 'Auditoria Comercial Ativada',
        category: 'commercial',
        type: 'boolean',
        description: 'Ativa auditoria detalhada de operações comerciais',
        defaultValue: false,
        isSecret: false,
        isRequired: false,
        isEditable: true,
      },
      {
        key: 'COMERCIAL_NOTIFICATION_THRESHOLD',
        name: 'Limiar de Notificação Comercial',
        category: 'commercial',
        type: 'number',
        description: 'Limiar de valor para disparar notificações de transações comerciais',
        defaultValue: 1000,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      // =========================================================================
      // 10. BASE DE CONHECIMENTO
      // =========================================================================
      {
        key: 'KNOWLEDGE_AUTO_UPDATE_ENABLED',
        name: 'Atualização Automática do Knowledge Base',
        category: 'knowledge',
        type: 'boolean',
        description: 'Ativa a atualização automática da base de conhecimento jurídico',
        defaultValue: true,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'KNOWLEDGE_EMBEDDING_MODEL',
        name: 'Modelo de Embeddings do Knowledge Base',
        category: 'knowledge',
        type: 'select',
        description: 'Modelo de embeddings utilizado para vetorização de documentos jurídicos',
        defaultValue: 'nvidia/nv-embedqa-e5-v5',
        isSecret: false,
        isRequired: true,
        isEditable: true,
        options: [
          { label: 'NV-EmbedQA E5 v5 (4096 dim - RAG Especializado)', value: 'nvidia/nv-embedqa-e5-v5' },
          { label: 'Snowflake Arctic Embed L (1024 dim)', value: 'snowflake/arctic-embed-l' },
          { label: 'BAAI BGE Multilingual Gemma2', value: 'baai/bge-multilingual-gemma2' },
        ],
        envSource: 'KNOWLEDGE_EMBEDDING_MODEL',
      },
      {
        key: 'KNOWLEDGE_UPDATE_INTERVAL_HOURS',
        name: 'Intervalo de Atualização do Knowledge Base (horas)',
        category: 'knowledge',
        type: 'number',
        description: 'Intervalo em horas entre atualizações automáticas da base de conhecimento',
        defaultValue: 24,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
      {
        key: 'KNOWLEDGE_CHUNK_SIZE',
        name: 'Tamanho do Chunk de Texto do Knowledge Base',
        category: 'knowledge',
        type: 'number',
        description: 'Tamanho máximo em tokens para cada chunk de texto ao processar documentos',
        defaultValue: 512,
        isSecret: false,
        isRequired: true,
        isEditable: true,
      },
    ];

    for (const def of definitions) {
      this.settings.set(def.key, {
        ...def,
        currentValue: def.defaultValue,
        isConfigured: def.defaultValue !== '' && def.defaultValue !== null,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  private loadFromEnvironment() {
    for (const [key, def] of this.settings.entries()) {
      const envKey = def.envSource || key;
      const envVal = process.env[envKey];

      if (envVal !== undefined && envVal !== '') {
        let parsedVal: any = envVal;
        if (def.type === 'number') parsedVal = Number(envVal);
        if (def.type === 'boolean') parsedVal = envVal === 'true' || envVal === '1';

        def.currentValue = parsedVal;
        def.isConfigured = true;
        def.lastUpdated = new Date().toISOString();
      }
  }
    }

  /**
   * Get raw value for backend consumers (includes unmasked secrets)
   */
  public get<T = any>(key: string, fallback?: T): T {
    const def = this.settings.get(key);
    if (!def) {
      return (process.env[key] as unknown as T) ?? (fallback as T);
    }
    return (def.currentValue ?? def.defaultValue ?? fallback) as T;
  }

  /**
   * Check if a specific secret/service is configured
   */
  public isConfigured(key: string): boolean {
    const val = this.get(key);
    return Boolean(val && String(val).trim().length > 0);
  }

  /**
   * Update a setting or secret safely with validation and audit trail
   */
  public update(payload: SettingUpdatePayload): { success: boolean; message: string } {
    const { key, value, updatedBy } = payload;
    const def = this.settings.get(key);

    if (!def) {
      return { success: false, message: `Configuração '${key}' não reconhecida no catálogo da plataforma.` };
    }

    if (!def.isEditable) {
      return { success: false, message: `A configuração '${def.name}' é fixa pelo ambiente e não pode ser editada.` };
    }

    // Type coercion & validation
    let sanitizedValue = value;
    if (def.type === 'number') {
      sanitizedValue = Number(value);
      if (isNaN(sanitizedValue)) {
        return { success: false, message: `Valor inválido para '${def.name}'. Deve ser um número válido.` };
      }
    } else if (def.type === 'boolean') {
      sanitizedValue = Boolean(value);
    } else if (def.type === 'secret') {
      sanitizedValue = String(value || '').trim();
    }

    def.currentValue = sanitizedValue;
    def.isConfigured = sanitizedValue !== '' && sanitizedValue !== null && sanitizedValue !== undefined;
    def.lastUpdated = new Date().toISOString();
    def.updatedBy = updatedBy;

    // Record audit entry WITHOUT ever logging the secret value
    const auditRecord: SettingAuditRecord = {
      id: `audit_cfg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key: def.key,
      category: def.category,
      isSecret: def.isSecret,
      action: def.isSecret ? 'UPDATE_SECRET' : 'UPDATE_CONFIG',
      updatedBy: updatedBy || 'admin',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      details: def.isSecret
        ? `Segredo '${def.name}' [${def.key}] atualizado com sucesso.`
        : `Configuração '${def.name}' alterada para '${String(sanitizedValue)}'.`,
    };

    this.auditHistory.unshift(auditRecord);
    if (this.auditHistory.length > 500) {
      this.auditHistory.pop();
    }

    return { success: true, message: `Configuração '${def.name}' atualizada com sucesso!` };
  }

  /**
   * Reset a setting to its standard platform default
   */
  public resetToDefault(key: string, updatedBy: string): { success: boolean; message: string } {
    const def = this.settings.get(key);
    if (!def) {
      return { success: false, message: `Configuração não encontrada: ${key}` };
    }

    def.currentValue = def.defaultValue;
    def.isConfigured = def.defaultValue !== '' && def.defaultValue !== null;
    def.lastUpdated = new Date().toISOString();
    def.updatedBy = updatedBy;

    this.auditHistory.unshift({
      id: `audit_cfg_${Date.now()}`,
      key: def.key,
      category: def.category,
      isSecret: def.isSecret,
      action: 'RESET_DEFAULT',
      updatedBy,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      details: `Configuração '${def.name}' restaurada para o padrão de fábrica.`,
    });

    return { success: true, message: `'${def.name}' restaurado para o padrão de fábrica.` };
  }

  /**
   * Return safe, masked settings for the frontend Admin UI
   * SECRETS ARE NEVER RETURNED IN PLAIN TEXT!
   */
  public getSafeSettingsForFrontend(): SettingDefinition[] {
    const safeList: SettingDefinition[] = [];

    for (const def of this.settings.values()) {
      let safeCurrentValue = def.currentValue;

      // Mask secret values
      if (def.isSecret) {
        safeCurrentValue = def.isConfigured ? '••••••••••••••••' : '';
      }

      safeList.push({
        ...def,
        currentValue: safeCurrentValue,
        defaultValue: def.isSecret ? (def.defaultValue ? '••••••••••••••••' : '') : def.defaultValue,
      });
    }

    return safeList;
  }

  /**
   * Get audit log for settings modifications
   */
  public getAuditHistory(): SettingAuditRecord[] {
    return [...this.auditHistory];
  }
}

export const configService = new ConfigService();
