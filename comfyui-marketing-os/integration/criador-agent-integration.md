# Padrões de Integração - Criador Agent → ComfyUI

## Visão Geral

O Criador Agent do Marketing OS pode integrar-se ao ComfyUI através de duas abordagens:
1. **Online Mode** - Execução direta via API REST
2. **Offline Mode** - Exportação de JSON para importação manual

## Arquitetura de Integração

```
┌─────────────────────────────────────────────────────────────────┐
│                     MARKETING OS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Planejamento │───▶│   Criador    │───▶│  Publicação  │      │
│  │    Agent      │    │    Agent     │    │    Agent     │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                    │
│                             ▼                                    │
│                    ┌────────────────┐                            │
│                    │  ComfyUI API   │                            │
│                    │   Integration  │                            │
│                    └────────┬───────┘                            │
│                             │                                    │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                    ┌────────────────┐
                    │    ComfyUI     │
                    │   Server:8188  │
                    └────────────────┘
```

## Padrão 1: Geração Individual

### Fluxo
1. Criador Agent recebe tarefa de conteúdo
2. Seleciona workflow apropriado
3. Preenche prompts dinâmicos
4. Envia para ComfyUI API
5. Recebe ID de execução
6. Polling para conclusão
7. Recupera imagem/vídeo gerado

### Implementação

```typescript
// Interface para integração ComfyUI
interface ComfyUIConfig {
  serverUrl: string; // http://localhost:8188
  timeout: number;   // 300000ms (5 minutos)
  pollInterval: number; // 2000ms (2 segundos)
}

// Função para enviar workflow
async function queuePrompt(
  workflow: object,
  config: ComfyUIConfig
): Promise<string> {
  const response = await fetch(`${config.serverUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow })
  });
  
  const { prompt_id } = await response.json();
  return prompt_id;
}

// Função para verificar status
async function getHistory(
  promptId: string,
  config: ComfyUIConfig
): Promise<any> {
  const response = await fetch(
    `${config.serverUrl}/history/${promptId}`
  );
  return await response.json();
}

// Função para aguardar conclusão
async function waitForCompletion(
  promptId: string,
  config: ComfyUIConfig
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < config.timeout) {
    const history = await getHistory(promptId, config);
    
    if (history[promptId]?.outputs) {
      return history[promptId].outputs;
    }
    
    await new Promise(r => setTimeout(r, config.pollInterval));
  }
  
  throw new Error('Timeout aguardando geração');
}
```

## Padrão 2: Geração em Lote

### Fluxo
1. Planejamento Agent cria calendário editorial
2. Criador Agent recebe lista de conteúdos
3. Agrupa por tipo de workflow
4. Executa workflows em batch
5. Gerencia fila de execuções
6. Coleta todos os resultados
7. Entrega pacote completo

### Implementação

```typescript
// Interface para batch
interface BatchJob {
  id: string;
  type: 'image' | 'video';
  workflow: string;
  prompts: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: string[];
}

// Função para batch generation
async function batchGenerate(
  jobs: BatchJob[],
  config: ComfyUIConfig
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  const queue: BatchJob[] = [...jobs];
  const running: Map<string, BatchJob> = new Map();
  
  while (queue.length > 0 || running.size > 0) {
    // Iniciar novos jobs se há capacidade
    while (queue.length > 0 && running.size < 3) {
      const job = queue.shift()!;
      const promptId = await queuePrompt(job.workflow, config);
      running.set(promptId, job);
    }
    
    // Verificar jobs em execução
    for (const [promptId, job] of running.entries()) {
      const history = await getHistory(promptId, config);
      
      if (history[promptId]?.outputs) {
        job.status = 'completed';
        job.results = extractOutputs(history[promptId].outputs);
        results.set(job.id, job.results!);
        running.delete(promptId);
      }
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  
  return results;
}
```

## Padrão 3: Templates Dinâmicos

### Estrutura de Template

```typescript
interface WorkflowTemplate {
  name: string;
  workflow: object;
  variables: {
    [key: string]: {
      type: 'text' | 'number' | 'select';
      default: any;
      options?: any[];
    }
  };
}

// Templates disponíveis
const templates: Record<string, WorkflowTemplate> = {
  'social-media-post': {
    name: 'Post para Rede Social',
    workflow: require('./workflows/images/social-media-post.json'),
    variables: {
      topic: { type: 'text', default: 'traffic law' },
      style: { 
        type: 'select', 
        default: 'professional',
        options: ['professional', 'modern', 'minimalist']
      }
    }
  },
  'reel-short': {
    name: 'Reel/TikTok Curto',
    workflow: require('./workflows/videos/reel-short.json'),
    variables: {
      topic: { type: 'text', default: 'traffic law tip' },
      duration: { 
        type: 'select', 
        default: '5s',
        options: ['5s', '10s', '15s']
      }
    }
  }
};

// Função para renderizar template
function renderTemplate(
  templateName: string,
  variables: Record<string, any>
): object {
  const template = templates[templateName];
  const workflow = JSON.parse(JSON.stringify(template.workflow));
  
  // Substituir variáveis no prompt
  // (Implementação depende da estrutura do workflow)
  
  return workflow;
}
```

## Padrão 4: Mapeamento de Conteúdo

### Conteúdo → Workflow

```typescript
const contentToWorkflow: Record<string, string> = {
  // Imagens
  'instagram-post': 'social-media-post',
  'facebook-post': 'social-media-post',
  'linkedin-post': 'social-media-post',
  'blog-header': 'blog-header',
  'infographic': 'infographic',
  'quote-card': 'quote-card',
  'carousel': 'carousel',
  
  // Vídeos
  'instagram-reel': 'reel-short',
  'tiktok-video': 'reel-short',
  'explainer-video': 'explainer',
  'talking-head': 'talking-head',
  'animated-infographic': 'animated-infographic'
};

// Função para selecionar workflow
function selectWorkflow(
  contentType: string,
  platform: string
): string {
  const key = `${contentType}-${platform}`;
  return contentToWorkflow[key] || 'social-media-post';
}
```

## Padrão 5: Validação e Retry

### Validação de Workflow

```typescript
function validateWorkflow(workflow: object): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Verificar nós obrigatórios
  const requiredNodes = ['LoadCheckpoint', 'KSampler', 'SaveImage'];
  const nodeTypes = Object.values(workflow)
    .map((n: any) => n.class_type);
  
  for (const required of requiredNodes) {
    if (!nodeTypes.includes(required)) {
      errors.push(`Nó obrigatório ausente: ${required}`);
    }
  }
  
  // Verificar conexões
  for (const [id, node] of Object.entries(workflow)) {
    for (const [key, value] of Object.entries((node as any).inputs)) {
      if (Array.isArray(value) && typeof value[0] === 'string') {
        if (!workflow[value[0]]) {
          errors.push(`Conexão inválida no nó ${id}: ${key}`);
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Retry com Backoff

```typescript
async function queueWithRetry(
  workflow: object,
  config: ComfyUIConfig,
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queuePrompt(workflow, config);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Integração com Criador Agent

### Interface do Agent

```typescript
// O Criador Agent implementa esta interface
interface CriadorAgent {
  // Geração de conteúdo
  generateImage(params: ImageParams): Promise<string>;
  generateVideo(params: VideoParams): Promise<string>;
  
  // Geração em lote
  batchGenerate(items: ContentItem[]): Promise<Map<string, string>>;
  
  // Status
  getStatus(jobId: string): Promise<JobStatus>;
  cancelJob(jobId: string): Promise<void>;
}

// Parâmetros de imagem
interface ImageParams {
  type: 'social' | 'blog' | 'infographic' | 'quote' | 'carousel';
  topic: string;
  style?: 'professional' | 'modern' | 'minimalist';
  platform?: 'instagram' | 'facebook' | 'linkedin';
  customPrompt?: string;
}

// Parâmetros de vídeo
interface VideoParams {
  type: 'reel' | 'explainer' | 'talking-head' | 'animated-infographic';
  topic: string;
  duration?: '5s' | '10s' | '15s' | '30s';
  avatarReference?: string;
  customPrompt?: string;
}
```

### Exemplo de Uso

```typescript
// Criador Agent gera post para Instagram
const imageParams: ImageParams = {
  type: 'social',
  topic: 'defesa de multa por velocidade',
  platform: 'instagram',
  style: 'professional'
};

const imagePath = await criadorAgent.generateImage(imageParams);

// Criador Agent gera reel para TikTok
const videoParams: VideoParams = {
  type: 'reel',
  topic: '5 dicas para evitar multas',
  duration: '15s'
};

const videoPath = await criadorAgent.generateVideo(videoParams);
```

## Configuração do Servidor

### Variáveis de Ambiente

```bash
# ComfyUI Server
COMFYUI_SERVER_URL=http://localhost:8188
COMFYUI_TIMEOUT=300000
COMFYUI_POLL_INTERVAL=2000

# Modo de operação
COMFYUI_MODE=online  # online | offline
COMFYUI_OUTPUT_DIR=./output

# Configurações de qualidade
COMFYUI_QUALITY=production  # draft | production | premium
COMFYUI_DEFAULT_MODEL=flux1-dev
```

### Configuração do Workflow

```typescript
// config/workflow-config.ts
export const workflowConfig = {
  server: {
    url: process.env.COMFYUI_SERVER_URL || 'http://localhost:8188',
    timeout: parseInt(process.env.COMFYUI_TIMEOUT || '300000'),
    pollInterval: parseInt(process.env.COMFYUI_POLL_INTERVAL || '2000')
  },
  defaults: {
    image: {
      model: 'flux1-dev.safetensors',
      steps: 25,
      cfg: 3.5,
      sampler: 'euler',
      scheduler: 'normal'
    },
    video: {
      model: 'wan2.1_t2v_1.3B_bf16.safetensors',
      steps: 20,
      cfg: 6.0,
      sampler: 'euler',
      scheduler: 'normal',
      frameRate: 16
    }
  },
  platforms: {
    instagram: {
      post: { width: 1024, height: 1024 },
      story: { width: 1080, height: 1920 },
      reel: { width: 832, height: 480, frames: 81 }
    },
    facebook: {
      post: { width: 1200, height: 630 }
    },
    linkedin: {
      post: { width: 1200, height: 627 }
    },
    tiktok: {
      video: { width: 832, height: 480, frames: 81 }
    }
  }
};
```

## Monitoramento e Logs

### Logging

```typescript
// utils/comfyui-logger.ts
export class ComfyUICLogger {
  static logQueue(promptId: string, workflow: string) {
    console.log(`[ComfyUI] Queue: ${promptId} | Workflow: ${workflow}`);
  }
  
  static logProgress(promptId: string, progress: number) {
    console.log(`[ComfyUI] Progress: ${promptId} | ${progress}%`);
  }
  
  static logComplete(promptId: string, outputs: any) {
    console.log(`[ComfyUI] Complete: ${promptId}`, outputs);
  }
  
  static logError(promptId: string, error: Error) {
    console.error(`[ComfyUI] Error: ${promptId}`, error.message);
  }
}
```

### Métricas

```typescript
// Métricas a monitorar
const metrics = {
  queueTime: 'Tempo na fila',
  executionTime: 'Tempo de execução',
  totalTime: 'Tempo total (fila + execução)',
  successRate: 'Taxa de sucesso',
  vrampUsage: 'Uso de VRAM',
  memoryUsage: 'Uso de memória'
};
```
