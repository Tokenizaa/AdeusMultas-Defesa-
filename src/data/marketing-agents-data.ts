import { MarketingAgentState, EditorialContentItem, BrandIdentityConfig } from '../types';

export const INITIAL_MARKETING_AGENTS: MarketingAgentState[] = [
  {
    id: 'estrategico',
    name: 'Agente Estratégico',
    handle: '@marketing-estrategico',
    description: 'Monitora alterações legislativas no CTB, novas resoluções do CONTRAN e tendências de busca de motoristas.',
    status: 'running',
    lastActivity: 'Há 2 minutos',
    cycleIntervalMinutes: 5,
    tasksCompleted: 142,
    currentTask: 'Mapeando impacto da nova Portaria SENATRAN sobre radares portáteis',
    confidenceScore: 98,
    metrics: [
      { label: 'Oportunidades Mapeadas', value: 28, trend: 'up' },
      { label: 'Pautas Priorizadas', value: 12, trend: 'neutral' },
    ],
  },
  {
    id: 'planejamento',
    name: 'Agente de Planejamento',
    handle: '@marketing-planejamento',
    description: 'Organiza a grade editorial semanal, frequência de postagens e distribuição multicanal (Instagram, Blog SEO, TikTok).',
    status: 'running',
    lastActivity: 'Há 4 minutos',
    cycleIntervalMinutes: 5,
    tasksCompleted: 89,
    currentTask: 'Distribuindo 14 novos slots para a semana de Feriado / Blitz',
    confidenceScore: 95,
    metrics: [
      { label: 'Posts Agendados', value: 24, trend: 'up' },
      { label: 'Taxa de Ocupação da Grade', value: '92%', trend: 'up' },
    ],
  },
  {
    id: 'criador',
    name: 'Agente Criador de Conteúdo',
    handle: '@marketing-criador',
    description: 'Gera copies de alta conversão, carrosséis educativos, roteiros de Reels e guias práticos sobre anulação de multas.',
    status: 'running',
    lastActivity: 'Há 1 minuto',
    cycleIntervalMinutes: 5,
    tasksCompleted: 236,
    currentTask: 'Redigindo carrossel: "3 Erros Comuns no Bafômetro que Anulam o Processo"',
    confidenceScore: 96,
    metrics: [
      { label: 'Minutas de Conteúdo', value: 310, trend: 'up' },
      { label: 'Variações de Gancho', value: '4.8/post', trend: 'up' },
    ],
  },
  {
    id: 'qualidade',
    name: 'Agente Guardião de Qualidade',
    handle: '@marketing-qualidade',
    description: 'Gate duro que audita conformidade jurídica com o CTB/CONTRAN e bloqueia promessas falsas de ganho de causa.',
    status: 'idle',
    lastActivity: 'Há 3 minutos',
    cycleIntervalMinutes: 5,
    tasksCompleted: 198,
    currentTask: 'Auditoria de assertividade jurídica concluída com nota 9.8/10',
    confidenceScore: 99,
    metrics: [
      { label: 'Taxa de Aprovação', value: '94.2%', trend: 'up' },
      { label: 'Vetos de Risco', value: 6, trend: 'down' },
    ],
  },
  {
    id: 'publicacao',
    name: 'Agente de Publicação & Despacho',
    handle: '@marketing-publicacao',
    description: 'Gerencia a fila de agendamento automático e publicação sincronizada nas redes sociais e blog.',
    status: 'running',
    lastActivity: 'Há 7 minutos',
    cycleIntervalMinutes: 5,
    tasksCompleted: 174,
    currentTask: 'Próximo disparo agendado para 18:30 (Instagram Carrossel)',
    confidenceScore: 97,
    metrics: [
      { label: 'Posts Publicados', value: 168, trend: 'up' },
      { label: 'Uptime do Despacho', value: '99.9%', trend: 'neutral' },
    ],
  },
  {
    id: 'inteligencia',
    name: 'Agente de Inteligência & Métricas',
    handle: '@marketing-inteligencia',
    description: 'Coleta dados de engajamento, leads capturados no onboarding anônimo e taxa de conversão em checkout de defesas.',
    status: 'running',
    lastActivity: 'Há 5 minutos',
    cycleIntervalMinutes: 5,
    tasksCompleted: 115,
    currentTask: 'Calculando CAC e taxa de conclusão de análise gratuita por tema',
    confidenceScore: 94,
    metrics: [
      { label: 'Alcance Mensal', value: '284.5k', trend: 'up' },
      { label: 'Conversão em Casos', value: '14.8%', trend: 'up' },
    ],
  },
  {
    id: 'aprendizado',
    name: 'Agente de Aprendizado Contínuo',
    handle: '@marketing-aprendizado',
    description: 'Processa o feedback dos resultados para refinar ganchos persuasivos e focar nos temas com maior retorno.',
    status: 'idle',
    lastActivity: 'Há 6 minutos',
    cycleIntervalMinutes: 5,
    tasksCompleted: 77,
    currentTask: 'Ajustando peso de conversão do tema "Multa de Radar sem Placa R-19"',
    confidenceScore: 96,
    metrics: [
      { label: 'Ganchos Otimizados', value: 43, trend: 'up' },
      { label: 'Melhoria de CTR', value: '+22.4%', trend: 'up' },
    ],
  },
];

export const INITIAL_EDITORIAL_CONTENTS: EditorialContentItem[] = [
  {
    id: 'cnt-001',
    title: 'Recebeu notificação de radar? Confira se a aferição do INMETRO está válida!',
    channel: 'instagram',
    format: 'carrossel',
    legalTheme: 'Aferição Metrológica e Resolução CONTRAN 798/2020',
    infractionTargetCode: '745-50',
    status: 'agendado',
    scheduledDate: '2026-08-15 18:30',
    estimatedReach: 24500,
    copyText: `🚨 ATENÇÃO MOTORISTA: Sabia que mais de 30% dos radares de trânsito podem estar com o laudo do INMETRO vencido?

Pela Resolução CONTRAN nº 798/2020, todo radar eletrônico precisa de calibração anual obrigatória. Se passou de 365 dias, a multa é NULA!

👉 Na notificação que você recebeu, verifique o campo "Data da última verificação".
Se a data for superior a 1 ano da data da infração, você tem direito ao cancelamento imediato!

Faça a análise gratuita do seu auto agora mesmo pelo link da bio! 🚗💨`,
    hashtags: ['#DireitoDeTransito', '#AdeusMulta', '#RecursoDeMulta', '#CTB', '#RadarDeVelocidade'],
    visualPrompt: 'Carrossel moderno com fundo escuro elegante e destaque em amarelo para a data de aferição do radar.',
    authorAgent: '@marketing-criador',
    qualityReviewScore: 9.8,
  },
  {
    id: 'cnt-002',
    title: 'Como converter sua multa leve ou média em Advertência por Escrito (Sem pagar nada)',
    channel: 'blog',
    format: 'artigo_seo',
    legalTheme: 'Conversão em Advertência por Escrito — Art. 267 do CTB',
    infractionTargetCode: '745-50',
    status: 'publicado',
    scheduledDate: '2026-08-14 10:00',
    estimatedReach: 18200,
    copyText: `Desde a Lei nº 14.071/2020, o motorista que cometer infração de trânsito de natureza LEVE ou MÉDIA e não possuir nenhuma outra infração no prontuário nos últimos 12 meses tem o DIREITO SUBJETIVO à conversão automática da multa em advertência por escrito.

Isso significa:
1. Zero reais a pagar (isenção total do boleto)
2. Zero pontos somados na CNH
3. Procedimento 100% administrativo e simples

Descubra o passo a passo e o modelo de petição no Adeus Multa.`,
    hashtags: ['#Art267CTB', '#AdvertenciaPorEscrito', '#Economia', '#Motorista'],
    visualPrompt: 'Imagem ilustrativa de uma CNH com carimbo de isenção e escudo protetor.',
    authorAgent: '@marketing-criador',
    qualityReviewScore: 9.9,
  },
  {
    id: 'cnt-003',
    title: 'Recusou o teste do bafômetro? Entenda por que a multa não é automática',
    channel: 'tiktok',
    format: 'reels_roteiro',
    legalTheme: 'Art. 165-A e Termo de Constatação de Embriaguez',
    infractionTargetCode: '516-91',
    status: 'aprovado_qualidade',
    scheduledDate: '2026-08-16 12:00',
    estimatedReach: 45000,
    copyText: `[ROTEIRO DE REELS / TIKTOK]
(Cena 1 - Gancho): "Se você recusou o bafômetro na blitz, pare tudo e assista isso antes de pagar a multa de quase R$ 3 mil!"
(Cena 2 - Fundamentação): "A Resolução 432 do CONTRAN exige que o policial preencha um Termo de Sinais Psicomotores detalhando sinais visíveis. Se ele só escreveu 'recusou', o auto de infração é NULO."
(Cena 3 - CTA): "Entre no Adeus Multa, envie a foto da sua notificação e descubra os vícios formais na hora!"`,
    hashtags: ['#LeiSeca', '#Bafometro', '#RecusaBafometro', '#Blitz'],
    visualPrompt: 'Vídeo dinâmico em estilo bate-papo jurídico acessível com legendas contrastantes.',
    authorAgent: '@marketing-criador',
    qualityReviewScore: 9.6,
  },
  {
    id: 'cnt-004',
    title: 'Celular no suporte do painel dá multa? O que diz a nova resolução',
    channel: 'instagram',
    format: 'carrossel',
    legalTheme: 'Artigo 252 do CTB — Manuseio x Suporte Veicular',
    infractionTargetCode: '736-62',
    status: 'agendado',
    scheduledDate: '2026-08-17 19:00',
    estimatedReach: 32000,
    copyText: `📱 USAR O GPS NO SUPORTE É PERMITIDO!

O CTB proíbe "segurar ou manusear" o celular enquanto dirige. Tocar rapidamente na tela do GPS fixado no painel para aceitar corrida ou verificar rota com o veículo parado no semáforo NÃO configura infração gravíssima.

Se o agente autuou sem abordagem e não descreveu a conduta na observação, o recurso tem alta chance de anulação!`,
    hashtags: ['#CelularAoVolante', '#MotoristaDeApp', '#Uber', '#99App', '#Transito'],
    visualPrompt: 'Ilustração do interior do veículo com celular no suporte e ícone verde de permitido.',
    authorAgent: '@marketing-criador',
    qualityReviewScore: 9.7,
  },
];

export const BRAND_IDENTITY: BrandIdentityConfig = {
  brandName: 'Adeus Multa',
  tagline: 'Defenda sua CNH com inteligência técnica e jurídica.',
  positioning: 'Especialista digital em defesa administrativa de trânsito. Ajudamos motoristas a gerar e protocolar recursos fundamentados no CTB com rigor técnico.',
  toneOfVoice: 'Técnico porém acessível, empático com o motorista, estritamente legalista, transparente e encorajador.',
  primaryColors: ['#0f172a', '#0284c7', '#10b981', '#f59e0b'],
  targetAudience: 'Motoristas particulares, motoristas de aplicativo (Uber/99), caminhoneiros, frotistas e condutores que receberam autuações indevidas.',
  disallowedWords: ['Garantia de ganho 100%', 'Burlar a lei', 'Advogado virtual', 'Jeitinho', 'Esquema'],
  mandatoryLegalDisclaimers: 'O Adeus Multa é uma ferramenta tecnológica de apoio à elaboração de petições administrativas nos termos do Art. 5º, XXXIV, "a" da Constituição Federal. Não realizamos representação advocatícia privativa nem garantimos resultados de julgamento dos órgãos.',
};
