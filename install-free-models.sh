#!/bin/bash

# Script para baixar e instalar modelos gratuitos do ComfyUI
# Baseado na documentação oficial: https://github.com/comfy-org/docs

echo "🚀 Instalando modelos gratuitos para ComfyUI..."
echo ""

# Diretório base do ComfyUI
COMFYUI_DIR="/home/lg/ComfyUI"
MODELS_DIR="$COMFYUI_DIR/models"

# Verificar se o diretório existe
if [ ! -d "$COMFYUI_DIR" ]; then
    echo "❌ Diretório do ComfyUI não encontrado em $COMFYUI_DIR"
    exit 1
fi

echo "📁 Diretório do ComfyUI: $COMFYUI_DIR"
echo ""

# Função para baixar modelo
download_model() {
    local url=$1
    local destination=$2
    local filename=$(basename "$url")
    
    echo "📥 Baixando $filename..."
    
    if [ -f "$destination/$filename" ]; then
        echo "   ✅ $filename já existe"
        return 0
    fi
    
    # Usar wget ou curl para baixar
    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$destination/$filename" "$url"
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$destination/$filename" "$url"
    else
        echo "   ❌ wget ou curl não encontrado"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        echo "   ✅ $filename baixado com sucesso"
        return 0
    else
        echo "   ❌ Erro ao baixar $filename"
        return 1
    fi
}

# 1. SD1.5 - Modelo básico gratuito (4GB, funciona com 6GB VRAM)
echo "📦 1. Instalando SD1.5 (Stable Diffusion 1.5)..."
echo "   Modelo gratuito e open-source, ideal para iniciantes"
echo "   Resolução: 512x512"
echo "   VRAM mínimo: 6GB"
echo ""

# URL do SD1.5 (dreamshaper - modelo popular gratuito)
SD15_URL="https://huggingface.co/lykon/dreamshaper-8/resolve/main/dreamshaper_8.safetensors"
download_model "$SD15_URL" "$MODELS_DIR/checkpoints"

# 2. VAE para SD1.5
echo ""
echo "📦 2. Instalando VAE para SD1.5..."
VAE_URL="https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/vae-ft-mse-840000-ema-pruned.safetensors"
download_model "$VAE_URL" "$MODELS_DIR/vae"

# 3. LoRA para SD1.5 (estilo anime)
echo ""
echo "📦 3. Instalando LoRA para SD1.5 (estilo anime)..."
LORA_URL="https://huggingface.co/ckeditor/anything-v3-better-vae/resolve/main/anything-v3-better-vae.safetensors"
download_model "$LORA_URL" "$MODELS_DIR/loras"

# 4. Upscale model
echo ""
echo "📦 4. Instalando modelo de upscale..."
UPSCALE_URL="https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x4plus.pth"
download_model "$UPSCALE_URL" "$MODELS_DIR/upscale_models"

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Reinicie o ComfyUI"
echo "2. Acesse http://localhost:8188"
echo "3. Carregue um workflow de Text to Image"
echo "4. Selecione o modelo 'dreamshaper_8.safetensors'"
echo ""
echo "📚 Documentação: https://github.com/comfy-org/docs"
echo "🌐 Modelos adicionais: https://civitai.com ou https://huggingface.co"