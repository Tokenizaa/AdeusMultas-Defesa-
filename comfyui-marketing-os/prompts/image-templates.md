# Templates de Prompts para Geração de Imagens

## Estrutura Base do Prompt

```
[Qualidade] + [Estilo] + [Conteúdo] + [Cores] + [Composição] + [Detalhes Técnicos]
```

## 1. Posts para Redes Sociais

### Instagram/Facebook/LinkedIn

**Template:**
```
professional marketing image for brazilian traffic law firm, [TOPICO], clean modern design, blue and white color scheme, [ELEMENTO_VISUAL], high quality, sharp details, professional lighting, corporate style, trustworthy appearance
```

**Exemplos:**

```
# Multa de Trânsito
professional marketing image for brazilian traffic law firm, traffic violation fine concept, clean modern design, blue and white color scheme, car with warning symbol, high quality, sharp details, professional lighting, corporate style, trustworthy appearance

# CNH Suspensa
professional marketing image for brazilian traffic law firm, suspended driver license concept, clean modern design, blue and white color scheme, license card with prohibition symbol, high quality, sharp details, professional lighting, corporate style, trustworthy appearance

# Consultoria Jurídica
professional marketing image for brazilian traffic law firm, legal consultation concept, clean modern design, blue and white color scheme, professional lawyer with client, high quality, sharp details, professional lighting, corporate style, trustworthy appearance
```

### Instagram Story (9:16)

**Template:**
```
vertical story format, professional marketing image for brazilian traffic law firm, [TOPICO], clean modern design, blue and white color scheme, [ELEMENTO_VISUAL], high quality, sharp details, professional lighting, mobile-first composition
```

## 2. Headers de Blog

**Template:**
```
professional blog header image for legal website, [TOPICO], modern minimalist design, blue gradient background, abstract geometric shapes, clean typography space, corporate professional, high resolution, sharp details
```

**Exemplos:**

```
# Direito de Trânsito
professional blog header image for legal website, traffic law expertise, modern minimalist design, blue gradient background, abstract geometric shapes, clean typography space, corporate professional, high resolution, sharp details

# Débitos de Trânsito
professional blog header image for legal website, traffic debt management, modern minimalist design, blue gradient background, abstract geometric shapes, clean typography space, corporate professional, high resolution, sharp details

# Recursos de Multas
professional blog header image for legal website, fine appeal process, modern minimalist design, blue gradient background, abstract geometric shapes, clean typography space, corporate professional, high resolution, sharp details
```

## 3. Infográficos Jurídicos

**Template:**
```
professional infographic design for traffic law education, [TOPICO], clean data visualization, blue and white color scheme, icons and charts, educational content layout, modern flat design, organized information hierarchy, legal document style, professional typography
```

**Exemplos:**

```
# Pontuação da CNH
professional infographic design for traffic law education, driver license points system, clean data visualization, blue and white color scheme, icons and charts, educational content layout, modern flat design, organized information hierarchy, legal document style, professional typography

# Processo de Defesa
professional infographic design for traffic law education, defense process flowchart, clean data visualization, blue and white color scheme, icons and charts, educational content layout, modern flat design, organized information hierarchy, legal document style, professional typography

# Tipos de Multas
professional infographic design for traffic law education, types of traffic fines comparison, clean data visualization, blue and white color scheme, icons and charts, educational content layout, modern flat design, organized information hierarchy, legal document style, professional typography
```

## 4. Cards de Frases

**Template:**
```
elegant quote card design, minimalist background, soft gradient blue tones, space for text overlay, professional social media graphic, clean composition, modern typography area, subtle texture, premium quality, lawyer professional aesthetic
```

**Exemplos:**

```
# Dica Jurídica
elegant quote card design, minimalist background, soft gradient blue tones, space for text overlay, professional social media graphic, clean composition, modern typography area, subtle texture, premium quality, lawyer professional aesthetic

# Frase Motivacional
elegant quote card design, minimalist background, soft gradient blue tones, space for text overlay, professional social media graphic, clean composition, modern typography area, subtle texture, premium quality, lawyer professional aesthetic

# Alerta Legal
elegant quote card design, minimalist background, soft gradient blue tones, space for text overlay, professional social media graphic, clean composition, modern typography area, subtle texture, premium quality, lawyer professional aesthetic
```

## 5. Carrossel Educativo

**Template:**
```
educational carousel slide design, consistent visual theme, blue and white color scheme, numbered steps layout, professional infographic style, clean modern design, legal education content, organized information blocks, step by step guide visual
```

**Exemplos:**

```
# 5 Passos para Contestar Multa
educational carousel slide design, consistent visual theme, blue and white color scheme, numbered steps layout, professional infographic style, clean modern design, legal education content, organized information blocks, step by step guide visual

# Como Renovar a CNH
educational carousel slide design, consistent visual theme, blue and white color scheme, numbered steps layout, professional infographic style, clean modern design, legal education content, organized information blocks, step by step guide visual

# Direitos do Motorista
educational carousel slide design, consistent visual theme, blue and white color scheme, numbered steps layout, professional infographic style, clean modern design, legal education content, organized information blocks, step by step guide visual
```

## Prompts Negativos Base

### Para Imagens
```
low quality, blurry, distorted, ugly, deformed, noisy, grainy, watermark, text overlay, amateur, unprofessional, dark, gloomy, violent, inappropriate content
```

### Para Infográficos
```
low quality, blurry, distorted, ugly, noisy, grainy, amateur, unprofessional, cluttered, messy layout, unreadable text, poor design, childish, cartoonish
```

### Para Cards de Frases
```
low quality, blurry, distorted, ugly, noisy, grainy, amateur, unprofessional, cluttered, busy background, too many elements, distracting, cheap looking, stock photo feel
```

## Variações de Cores

### Esquema Principal (Azul Corporativo)
- Azul escuro: #1E3A5F
- Azul médio: #2E5A8F
- Azul claro: #4A90D9
- Branco: #FFFFFF
- Cinza claro: #F5F5F5

### Esquema Alternativo (Verde Jurídico)
- Verde escuro: #1B5E20
- Verde médio: #2E7D32
- Verde claro: #4CAF50
- Branco: #FFFFFF
- Cinza claro: #F5F5F5

### Esquema Premium (Dourado)
- Azul escuro: #1E3A5F
- Dourado: #C9A227
- Branco: #FFFFFF
- Cinza escuro: #333333
- Cinza claro: #F5F5F5

## Parâmetros de Geração

### FLUX (Recomendado para Marketing)
- **Steps:** 25-30
- **CFG:** 3.5
- **Sampler:** euler
- **Scheduler:** normal
- **Resolução:** 1024x1024 (posts), 1344x768 (headers)

### SDXL (Alternativo)
- **Steps:** 30-40
- **CFG:** 7.0
- **Sampler:** dpmpp_2m
- **Scheduler:** karras
- **Resolução:** 1024x1024

### SD1.5 (Econômico)
- **Steps:** 20-30
- **CFG:** 7.0
- **Sampler:** dpmpp_2m
- **Scheduler:** karras
- **Resolução:** 512x512
