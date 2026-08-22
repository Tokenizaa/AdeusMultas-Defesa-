# Templates de Prompts para Geração de Vídeos

## Estrutura Base do Prompt

```
[Qualidade] + [Tipo de Vídeo] + [Conteúdo] + [Estilo] + [Movimento] + [Cores]
```

## 1. Reels/TikTok Curtos (5-15 segundos)

### Template Base
```
professional marketing video for traffic law firm, [TOPICO], smooth camera movement, modern office environment, clean design, educational content, high quality, professional lighting, corporate style
```

### Exemplos

```
# Dica Rápida de Trânsito
professional marketing video for traffic law firm, quick traffic law tip, smooth camera movement, modern office environment, clean design, educational content, high quality, professional lighting, corporate style

# Alerta de Multa
professional marketing video for traffic law firm, fine alert notification concept, smooth camera movement, modern office environment, clean design, educational content, high quality, professional lighting, corporate style

# Pergunta e Resposta
professional marketing video for traffic law firm, Q&A format legal advice, smooth camera movement, modern office environment, clean design, educational content, high quality, professional lighting, corporate style
```

### Configurações
- **Duração:** 81 frames (5 segundos a 16fps)
- **Resolução:** 832x480 (vertical: 480x832)
- **Formato:** MP4 H.264

## 2. Vídeos Explicativos (15-30 segundos)

### Template Base
```
educational explainer video about traffic law, smooth transitions, professional animation style, clean modern graphics, informative content, high quality production, corporate blue color scheme, legal education visual
```

### Exemplos

```
# Processo de Defesa
educational explainer video about traffic law, defense process explanation, smooth transitions, professional animation style, clean modern graphics, informative content, high quality production, corporate blue color scheme, legal education visual

# Direitos do Motorista
educational explainer video about traffic law, driver rights explanation, smooth transitions, professional animation style, clean modern graphics, informative content, high quality production, corporate blue color scheme, legal education visual

# Como Contestar Multa
educational explainer video about traffic law, fine contest process, smooth transitions, professional animation style, clean modern graphics, informative content, high quality production, corporate blue color scheme, legal education visual
```

### Configurações
- **Duração:** 121 frames (7.5 segundos a 16fps)
- **Resolução:** 832x480 (vertical: 480x832)
- **Formato:** MP4 H.264

## 3. Talking Head com Avatar

### Template Base
```
professional talking head video, person speaking to camera, clean background, professional lighting, corporate setting, educational content delivery, high quality video, smooth motion
```

### Exemplos

```
# Apresentação do Escritório
professional talking head video, lawyer introducing law firm, person speaking to camera, clean background, professional lighting, corporate setting, educational content delivery, high quality video, smooth motion

# Conselho Jurídico
professional talking head video, legal advice delivery, person speaking to camera, clean background, professional lighting, corporate setting, educational content delivery, high quality video, smooth motion

# Depoimento
professional talking head video, client testimonial format, person speaking to camera, clean background, professional lighting, corporate setting, educational content delivery, high quality video, smooth motion
```

### Configurações
- **Duração:** 81 frames (5 segundos a 16fps)
- **Resolução:** 832x480 (vertical: 480x832)
- **Formato:** MP4 H.264
- **Requer:** Imagem de referência do avatar

## 4. Infográficos Animados

### Template Base
```
animated infographic video, smooth data visualization animation, professional motion graphics, educational content, legal statistics, clean modern design, blue color scheme, smooth transitions, high quality production
```

### Exemplos

```
# Estatísticas de Multas
animated infographic video, traffic fine statistics animation, smooth data visualization animation, professional motion graphics, educational content, legal statistics, clean modern design, blue color scheme, smooth transitions, high quality production

# Fluxo de Processo
animated infographic video, legal process flowchart animation, smooth data visualization animation, professional motion graphics, educational content, legal statistics, clean modern design, blue color scheme, smooth transitions, high quality production

# Comparativo de Sinalizações
animated infographic video, traffic sign comparison animation, smooth data visualization animation, professional motion graphics, educational content, legal statistics, clean modern design, blue color scheme, smooth transitions, high quality production
```

### Configurações
- **Duração:** 81 frames (5 segundos a 16fps)
- **Resolução:** 832x480 (vertical: 480x832)
- **Formato:** MP4 H.264

## Prompts Negativos Base

### Para Todos os Vídeos
```
low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering, inconsistent lighting
```

### Para Talking Head
```
low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering, face distortion, inconsistent identity
```

### Para Infográficos
```
low quality, blurry, distorted, ugly, noisy, grainy, watermark, amateur, unprofessional, dark, gloomy, violent, inappropriate content, flickering, jarring animations, poor motion graphics
```

## Configurações de Vídeo

### Wan 1.3B (Recomendado para Marketing)
- **Steps:** 20
- **CFG:** 6.0
- **Sampler:** euler
- **Scheduler:** normal
- **Frame Rate:** 16 fps
- **Formato:** H.264 MP4

### Wan 14B (Alta Qualidade)
- **Steps:** 20
- **CFG:** 6.0
- **Sampler:** euler
- **Scheduler:** normal
- **Frame Rate:** 16 fps
- **Formato:** H.264 MP4
- **VRAM:** 20GB+

### AnimateDiff (Alternativo Rápido)
- **Steps:** 20
- **CFG:** 7.5
- **Sampler:** dpmpp_2m
- **Scheduler:** karras
- **Frame Rate:** 8 fps
- **Formato:** GIF/MP4

## Resoluções por Plataforma

| Plataforma | Resolução | Proporção | FPS |
|------------|-----------|-----------|-----|
| Instagram Reel | 1080x1920 | 9:16 | 30 |
| TikTok | 1080x1920 | 9:16 | 30 |
| YouTube Shorts | 1080x1920 | 9:16 | 30 |
| Instagram Feed | 1080x1080 | 1:1 | 30 |
| Facebook Feed | 1280x720 | 16:9 | 30 |
| LinkedIn Feed | 1920x1080 | 16:9 | 30 |

## Duração Recomendada por Tipo

| Tipo | Duração | Frames (16fps) |
|------|---------|----------------|
| Reel/TikTok | 5-15s | 81-241 |
| Explainer | 15-30s | 241-481 |
| Talking Head | 5-15s | 81-241 |
| Infográfico Animado | 5-15s | 81-241 |

## Parâmetros de Qualidade

### Draft (Rápido)
- **Steps:** 15
- **CFG:** 5.0
- **Resolução:** 512x512 / 512x288

### Production (Qualidade)
- **Steps:** 25
- **CFG:** 6.0
- **Resolução:** 1024x1024 / 832x480

### Premium (Máxima Qualidade)
- **Steps:** 30
- **CFG:** 7.0
- **Resolução:** 1024x1024 / 832x480
