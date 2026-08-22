# Guia: Como Usar Modelos Gratuitos no ComfyUI

## 📋 Resumo

Baseado na documentação oficial do ComfyUI, existem várias opções de modelos gratuitos e open-source que podem ser usados sem autenticação ou licenças especiais.

## 🆓 Modelos Gratuitos Disponíveis

### 1. SD1.5 (Stable Diffusion 1.5) - **RECOMENDADO**
- **Descrição**: Modelo básico e open-source
- **Resolução**: 512x512
- **Tamanho**: ~4GB
- **VRAM mínimo**: 6GB
- **Licença**: CreativeML OpenRAIL-M
- **Download**: https://huggingface.co/runwayml/stable-diffusion-v1-5

### 2. Dreamshaper 8 - **POPULAR**
- **Descrição**: Modelo fine-tuned do SD1.5 com melhor qualidade
- **Resolução**: 512x512
- **Tamanho**: ~4GB
- **VRAM mínimo**: 6GB
- **Download**: https://huggingface.co/lykon/dreamshaper-8

### 3. Anything V3 - **ANIME**
- **Descrição**: Modelo especializado em estilo anime
- **Resolução**: 512x512
- **Tamanho**: ~4GB
- **VRAM mínimo**: 6GB
- **Download**: https://huggingface.co/ckeditor/anything-v3-better-vae

### 4. SDXL - **ALTA QUALIDADE**
- **Descrição**: Modelo de alta qualidade
- **Resolução**: 1024x1024
- **Tamanho**: ~7GB
- **VRAM mínimo**: 8GB
- **Licença**: CreativeML OpenRAIL-M
- **Download**: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0

## 🛠️ Instalação Manual

### Passo1: Criar diretórios
```bash
cd /home/lg/ComfyUI/models
mkdir -p checkpoints vae loras controlnet upscale_models embeddings
```

### Passo2: Baixar modelos
```bash
# SD1.5
wget -P checkpoints/ "https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors"

# VAE
wget -P vae/ "https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors"

# LoRA (opcional)
wget -P loras/ "https://huggingface.co/krloz31/dreamshaper-lora/resolve/main/dreamshaper_lora.safetensors"
```

### Passo3: Reiniciar ComfyUI
```bash
# Parar ComfyUI (Ctrl+C no terminal onde está rodando)
# Reiniciar
comfyui --listen --port 8188
```

## 🚀 Instalação Automática

Execute o script de instalação:
```bash
chmod +x install-free-models.sh
./install-free-models.sh
```

## 📱 Usando no ComfyUI

### 1. Acessar a interface
- Abra o navegador em http://localhost:8188

### 2. Carregar workflow
- Baixe um workflow de exemplo (arraste a imagem do workflow para a interface)
- Ou crie manualmente com os nodes:
  - `LoadCheckpoint` → Selecione o modelo
  - `CLIPTextEncode` → Digite o prompt
  - `EmptyLatentImage` → Defina a resolução
  - `KSampler` → Configure os parâmetros
  - `VAEDecode` → Decodifique a imagem
  - `SaveImage` → Salve o resultado

### 3. Exemplo de workflow básico
```json
{
  "1": {
    "class_type": "LoadCheckpoint",
    "inputs": {
      "ckpt_name": "dreamshaper_8.safetensors"
    }
  },
  "2": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "A professional Brazilian lawyer in a modern office",
      "clip": ["1", 1]
    }
  },
  "3": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "low quality, blurry",
      "clip": ["1", 1]
    }
  },
  "4": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    }
  },
  "5": {
    "class_type": "KSampler",
    "inputs": {
      "model": ["1", 0],
      "seed": 42,
      "steps": 20,
      "cfg": 7.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "positive": ["2", 0],
      "negative": ["3", 0],
      "latent_image": ["4", 0],
      "denoise": 1.0
    }
  },
  "6": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["5", 0],
      "vae": ["1", 2]
    }
  },
  "7": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "marketing_test",
      "images": ["6", 0]
    }
  }
}
```

## 🔧 Parâmetros Recomendados

### Para SD1.5/Dreamshaper:
- **Steps**: 20-30
- **CFG**: 7.0-8.0
- **Sampler**: euler ou dpmpp_2m
- **Scheduler**: normal ou karras
- **Resolução**: 512x512

### Para SDXL:
- **Steps**: 25-40
- **CFG**: 5.0-7.0
- **Sampler**: euler
- **Scheduler**: normal
- **Resolução**: 1024x1024

## 📚 Recursos Adicionais

### Onde baixar mais modelos gratuitos:
1. **Civitai**: https://civitai.com (maior repositório de modelos)
2. **Hugging Face**: https://huggingface.co (repositório oficial)
3. **OpenModelDB**: https://openmodeldb.info (modelos de upscale)

### Formatos suportados:
- `.safetensors` (recomendado - seguro)
- `.ckpt` (legado - evitar)

### Directórios do ComfyUI:
```
/home/lg/ComfyUI/models/
├── checkpoints/      # Modelos principais (SD1.5, SDXL, etc.)
├── vae/              # Modelos VAE
├── loras/            # Modelos LoRA
├── controlnet/       # Modelos ControlNet
├── upscale_models/   # Modelos de upscale
├── embeddings/       # Embeddings
└── text_encoders/    # Text encoders (T5, CLIP, etc.)
```

## ⚠️ Dicas Importantes

1. **Sempre baixe de fontes confiáveis** (Hugging Face, Civitai)
2. **Verifique a licença** do modelo antes de usar
3. **Comece com modelos pequenos** se tiver pouca VRAM
4. **Use `.safetensors`** em vez de `.ckpt` por segurança
5. **Reinicie o ComfyUI** após instalar novos modelos

## 🎯 Para Marketing OS

Para o seu caso de uso (marketing jurídico), recomendo:

1. **SD1.5 + Dreamshaper**: Para imagens gerais
2. **SDXL**: Para imagens de alta qualidade
3. **LoRA específicos**: Para estilo profissional/corporativo

Exemplo de prompt para marketing jurídico:
```
"Professional Brazilian lawyer in modern office, traffic law, justice, scales of justice, corporate, clean design, high quality, detailed"
```

Negative prompt:
```
"low quality, blurry, distorted, cartoon, anime, unrealistic"
```