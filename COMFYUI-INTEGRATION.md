# ComfyUI Marketing OS Integration

Integração do ComfyUI com o Marketing OS para geração automática de imagens e vídeos para conteúdo de marketing jurídico.

## 🚀 Início Rápido

### 1. Verificar Conexão

```bash
# Testar se o ComfyUI está rodando
curl http://localhost:8188/system_stats
```

### 2. Executar Teste de Integração

```bash
# Compilar e executar o teste
npx tsx test-comfyui-integration.ts
```

### 3. Executar Exemplos

```bash
# Executar exemplos de uso
npx tsx example-comfyui-usage.ts
```

## 📋 Estrutura de Arquivos

```
src/server/
├── integrations/
│   └── comfyui-marketing.ts    # Módulo principal de integração
├── workers/
│   └── comfyui-worker.ts       # Worker para o Marketing OS
└── workers/agents/
    └── criador-agent.worker.ts # Agente atualizado com ComfyUI
```

## 🖼️ Tipos de Imagem Disponíveis

| Tipo | Resolução | Uso |
|------|-----------|-----|
| `social-media` | 1024x1024 | Posts para redes sociais |
| `blog-header` | 1344x768 | Headers de blog |
| `infographic` | 1024x1360 | Infográficos jurídicos |
| `quote-card` | 1024x1024 | Cards de frases |
| `carousel` | 1024x1024 | Carrosséis educativos |

## 🎬 Tipos de Vídeo Disponíveis

| Tipo | Duração | Uso |
|------|---------|-----|
| `reel` | 5-30s | Reels/TikTok |
| `explainer` | 10-30s | Vídeos explicativos |
| `talking-head` | 5-30s | Talking head com avatar |
| `animated-infographic` | 5-30s | Infográficos animados |

## 📱 Formatos por Plataforma

| Plataforma | Resolução | Proporção |
|------------|-----------|-----------|
| Instagram Post | 1080x1080 | 1:1 |
| Instagram Reel | 1080x1920 | 9:16 |
| Facebook Post | 1200x630 | 1.91:1 |
| LinkedIn Post | 1200x627 | 1.91:1 |
| TikTok | 1080x1920 | 9:16 |

## 🔧 Uso no Código

### Gerar Imagem

```typescript
import { comfyuiMarketing } from './integrations/comfyui-marketing';

const images = await comfyuiMarketing.generateImage({
  type: 'social-media',
  topic: 'defesa de multa',
  platform: 'instagram',
  style: 'professional'
});
```

### Gerar Vídeo

```typescript
import { comfyuiWorker } from './workers/comfyui-worker';

const videos = await comfyuiWorker.generateVideo({
  type: 'reel',
  topic: '5 dicas para motoristas',
  duration: '15s'
});
```

### Geração em Lote

```typescript
import { comfyuiWorker } from './workers/comfyui-worker';

const result = await comfyuiWorker.generateContentForCriadorAgent(
  'social-media',
  'defesa de multa',
  ['instagram', 'facebook', 'linkedin']
);
```

## 🤖 Integração com Criador Agent

O Criador Agent foi atualizado para automaticamente gerar:

1. **Imagens** para cada plataforma alvo
2. **Vídeos** quando o tipo de conteúdo é `video` ou `reel`
3. **Conteúdo visual** baseado no tema jurídico selecionado

### Fluxo de Trabalho

1. Criador Agent seleciona tema jurídico
2. Gera conteúdo textual com base na knowledge base
3. **Novo:** Gera imagens e vídeos com ComfyUI
4. Salva conteúdo completo no banco de dados
5. Publica agendamento para o Publicação Agent

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# URL do servidor ComfyUI
COMFYUI_URL=http://localhost:8188

# Qualidade padrão (draft/production)
COMFYUI_QUALITY=production

# Timeout padrão (ms)
COMFYUI_TIMEOUT=120000
```

### Configuração via Código

```typescript
import { ComfyUIMarketing } from './integrations/comfyui-marketing';

const comfyui = new ComfyUIMarketing({
  serverUrl: 'http://localhost:8188',
  quality: 'production',
  defaultTimeout: 120000
});
```

## 📊 Monitoramento

### Logs

O sistema gera logs detalhados:

```typescript
// Verificar logs do ComfyUI
logger.info('marketing', 'comfyui', 'generateImage', 'Image generated', {
  type: 'social-media',
  platform: 'instagram',
  durationMs: 45000
});
```

### Status do Worker

```typescript
import { comfyuiWorker } from './workers/comfyui-worker';

const status = comfyuiWorker.getStatus();
console.log(status);
// {
//   id: 'comfyui',
//   isRunning: false,
//   isAvailable: true,
//   lastRun: 2024-01-15T10:30:00.000Z
// }
```

## 🐛 Solução de Problemas

### ComfyUI Não Conecta

```bash
# Verificar se o ComfyUI está rodando
ps aux | grep comfyui

# Reiniciar ComfyUI
comfyui --listen --port 8188
```

### Erros de Memória

```bash
# Verificar uso de memória
free -h

# Reduzir qualidade para draft
const comfyui = new ComfyUIMarketing({
  quality: 'draft'  // Usa menos passos
});
```

### Modelos Não Encontrados

```bash
# Listar modelos disponíveis
curl http://localhost:8188/object_info | jq '.CheckpointLoaderSimple.input.required.ckpt_name[0]'
```

## 📈 Próximos Passos

1. **Otimizar prompts** para conteúdo jurídico brasileiro
2. **Adicionar templates** de marca (cores, logotipos)
3. **Implementar cache** de imagens geradas
4. **Adicionar ControlNet** para poses específicas
5. **Integrar com Instagram API** para publicação automática

## 🤝 Contribuindo

1. Adicione novos tipos de imagem/vídeo em `comfyui-marketing.ts`
2. Crie templates de prompts para novos temas jurídicos
3. Implemente cache para melhorar performance
4. Adicione testes para novos workflows

## 📄 Licença

Este código faz parte do projeto Marketing OS para o escritório de advocacia DefesaAi.