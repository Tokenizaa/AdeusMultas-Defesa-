# ComfyUI Marketing OS - Integração Completa

Integração do ComfyUI com o Marketing OS para geração automática de imagens e vídeos de conteúdo marketing para escritório de Direito de Trânsito.

## 📁 Estrutura do Projeto

```
comfyui-marketing-os/
├── workflows/
│   ├── images/
│   │   ├── social-media-post.json      # Posts para redes sociais
│   │   ├── blog-header.json            # Headers de blog
│   │   ├── infographic.json            # Infográficos jurídicos
│   │   ├── quote-card.json             # Cards de frases
│   │   └── carousel.json               # Carrossel educativo
│   ├── videos/
│   │   ├── reel-short.json             # Reels/TikTok curtos
│   │   ├── explainer.json              # Vídeos explicativos
│   │   ├── talking-head.json           # Talking head com avatar
│   │   └── animated-infographic.json   # Infográficos animados
│   └── batch/
│       ├── batch-social.json           # Batch de posts sociais
│       └── batch-carousel.json         # Batch de carrosséis
├── prompts/
│   ├── image-templates.md              # Templates para imagens
│   └── video-templates.md              # Templates para vídeos
├── integration/
│   ├── criador-agent-integration.md    # Padrões de integração
│   └── platform-specs.json             # Specs por plataforma
├── brand/
│   └── brand-config.json               # Configurações de marca
├── comfyui-integration.ts              # Módulo de integração
├── example-usage.ts                    # Exemplo de uso
└── README.md                           # Este arquivo
```

## 🚀 Pré-requisitos

### 1. ComfyUI Instalado

```bash
# Clonar ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
python main.py --listen 0.0.0.0 --port 8188
```

### 2. Modelos Necessários

#### Para Imagens (escolha um):
- **FLUX.1 Dev** (Recomendado): `flux1-dev.safetensors`
- **SDXL**: `sd_xl_base_1.0.safetensors`
- **SD1.5**: `v1-5-pruned-emaonly.safetensors`

#### Para Vídeos:
- **Wan 1.3B** (Recomendado): `wan2.1_t2v_1.3B_bf16.safetensors`
- **Wan 14B** (Alta qualidade): `wan2.1_t2v_14B_bf16.safetensors`

#### Para Talking Head (opcional):
- **IP-Adapter**: `ip-adapter-plus_sd15.safetensors`
- **CLIP Vision**: `clip_vision_sd15.safetensors`

### 3. Custom Nodes

```bash
# Video Helper Suite (para vídeos)
cd custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git

# ComfyUI Manager (gerenciamento)
git clone https://github.com/ltdrdata/ComfyUI-Manager.git
```

## 📦 Instalação da Integração

```bash
# Navegar até o diretório do projeto
cd /home/lg/workspace/projects/DefesaAi_new/comfyui-marketing-os

# Instalar dependências (se necessário)
npm install

# Compilar TypeScript
npx tsc
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env`:

```bash
# ComfyUI Server
COMFYUI_SERVER_URL=http://localhost:8188
COMFYUI_TIMEOUT=300000
COMFYUI_POLL_INTERVAL=2000

# Modo de operação
COMFYUI_MODE=online
COMFYUI_OUTPUT_DIR=./output

# Configurações de qualidade
COMFYUI_QUALITY=production
COMFYUI_DEFAULT_MODEL=flux1-dev
```

### Configuração de Marca

Edite `brand/brand-config.json` para personalizar:

```json
{
  "brand": {
    "colors": {
      "primary": "#1E3A5F",
      "secondary": "#4A90D9"
    },
    "typography": {
      "heading": "Montserrat",
      "body": "Open Sans"
    }
  }
}
```

## 💻 Uso

### 1. Uso via CLI

```bash
# Gerar post para Instagram
npx tsx comfyui-integration.ts image social-media "defesa de multa" instagram

# Gerar reel para TikTok
npx tsx comfyui-integration.ts video reel "5 dicas para evitar multas"

# Verificar status do servidor
npx tsx comfyui-integration.ts status
```

### 2. Uso via Código

```typescript
import { ComfyUIMarketing } from './comfyui-integration.js';

const comfyui = new ComfyUIMarketing({
  serverUrl: 'http://localhost:8188',
  quality: 'production'
});

// Gerar imagem
const result = await comfyui.generateImage({
  type: 'social-media',
  topic: 'defesa de multa por velocidade',
  platform: 'instagram',
  style: 'professional'
});

console.log(result.outputPath);

// Gerar vídeo
const video = await comfyui.generateVideo({
  type: 'reel',
  topic: 'dicas para motoristas',
  duration: '15s'
});

console.log(video.outputPath);
```

### 3. Uso via API REST

```bash
# Enviar workflow diretamente
curl -X POST http://localhost:8188/prompt \
  -H "Content-Type: application/json" \
  -d @workflows/images/social-media-post.json

# Verificar status
curl http://localhost:8188/history/{prompt_id}
```

## 📱 Formatos por Plataforma

| Plataforma | Tipo | Resolução | Proporção | Formato |
|------------|------|-----------|-----------|---------|
| Instagram Post | Imagem | 1080x1080 | 1:1 | PNG |
| Instagram Story | Imagem | 1080x1920 | 9:16 | PNG |
| Instagram Reel | Vídeo | 1080x1920 | 9:16 | MP4 |
| Facebook Post | Imagem | 1200x630 | 1.91:1 | PNG |
| LinkedIn Post | Imagem | 1200x627 | 1.91:1 | PNG |
| TikTok | Vídeo | 1080x1920 | 9:16 | MP4 |
| YouTube Thumbnail | Imagem | 1280x720 | 16:9 | PNG |
| YouTube Shorts | Vídeo | 1080x1920 | 9:16 | MP4 |
| Blog Header | Imagem | 1920x1080 | 16:9 | PNG |

## 🎨 Workflows Disponíveis

### Imagens

| Workflow | Uso | VRAM | Steps |
|----------|-----|------|-------|
| social-media-post | Posts para redes sociais | 8-16GB | 25 |
| blog-header | Headers de blog | 8-16GB | 25 |
| infographic | Infográficos jurídicos | 8-16GB | 25 |
| quote-card | Cards de frases | 8-16GB | 25 |
| carousel | Carrossel educativo | 8-16GB | 25 |

### Vídeos

| Workflow | Uso | VRAM | Steps |
|----------|-----|------|-------|
| reel-short | Reels/TikTok (5-15s) | 5-8GB | 20 |
| explainer | Vídeos explicativos (15-30s) | 5-8GB | 20 |
| talking-head | Talking head com avatar | 12-16GB | 20 |
| animated-infographic | Infográficos animados | 5-8GB | 20 |

## 🔗 Integração com Criador Agent

### Padrão de Uso

```typescript
// O Criador Agent do Marketing OS pode usar esta integração
// para gerar conteúdo automaticamente

interface ConteudoMarketing {
  tipo: 'image' | 'video';
  formato: string;
  plataforma: string;
  topicos: string[];
  calendario: Date[];
}

async function gerarConteudoCalendario(conteudo: ConteudoMarketing) {
  const comfyui = new ComfyUIMarketing();
  
  const items = conteudo.topicos.map((topico, index) => ({
    type: conteudo.tipo === 'image' ? 'social-media' : 'reel',
    topic: topico,
    platform: conteudo.plataforma
  }));
  
  return await comfyui.batchGenerate({ items });
}
```

### Workflow de Automação

1. **Planejamento Agent** cria calendário editorial
2. **Criador Agent** seleciona workflows apropriados
3. **ComfyUI** gera imagens/vídeos
4. **Publicação Agent** distribui para plataformas

## 🛠️ Solução de Problemas

### ComfyUI não responde

```bash
# Verificar se está rodando
curl http://localhost:8188/system_stats

# Reiniciar
pkill -f "python main.py"
python main.py --listen 0.0.0.0 --port 8188
```

### Erro de VRAM

```bash
# Reduzir resolução
# Editar workflow: diminuir width/height

# Ou usar modo draft
# Definir quality: 'draft' na configuração
```

### Modelos não encontrados

```bash
# Verificar modelos disponíveis
ls ComfyUI/models/checkpoints/

# Baixar modelo faltante
# FLUX: https://huggingface.co/black-forest-labs/FLUX.1-dev
# Wan: https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B
```

## 📊 Métricas de Performance

| Workflow | Tempo Médio | VRAM Pico |
|----------|-------------|-----------|
| Social Media Post | 30-45s | 8GB |
| Blog Header | 30-45s | 8GB |
| Infographic | 30-45s | 8GB |
| Reel (5s) | 60-90s | 6GB |
| Explainer (15s) | 120-180s | 6GB |
| Talking Head | 90-120s | 12GB |

## 📝 Licença

Este projeto é parte do Marketing OS para uso interno do escritório.

## 🤝 Contribuição

Para adicionar novos workflows:

1. Crie o workflow JSON em `workflows/`
2. Adicione template de prompt em `prompts/`
3. Atualize `integration/platform-specs.json`
4. Documente no README
