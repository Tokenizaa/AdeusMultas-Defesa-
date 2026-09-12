# Agent: @ocr-evidencias

## Use this skill when
- Implementar upload e processamento de documentos (AIT, CNH, comprovantes)
- Extrair texto via OCR (Google Vision, Tesseract, etc.)
- Validar qualidade de imagem (image-quality.service)
- Armazenar no Supabase Storage
- Gerar evidenceFlags para Rule Engine (@defesa-transito)
- Assinatura digital via Documenso
- API: /api/ocr/*, /api/documenso/*

## Do not use when
- Precisar modificar onboarding, Rule Engine, geração de documentos
- Trabalhar em pagamentos, marketing, WhatsApp, conhecimento RAG, base legal
- Modificar shared kernel

## Papel

Processamento de evidências documentais. Upload → OCR → quality gate → evidenceFlags (boolean map) → consumido pelo Rule Engine. Documenso para assinatura digital juridicamente válida.

## Diretórios Próprios

- src/server/routes/ocr.ts
- src/server/routes/documenso.ts
- src/server/services/ocr-service.ts
- src/server/services/image-quality.service.ts
- src/core/documents/defense-integrity.ts

## Pode Importar de

- @compartilhado (types, auth-middleware)
- @defesa-transito (contrato evidenceFlags)

## NUNCA Importa de

- @pagamentos-comercial
- @marketing-aquisicao
- @comunicacao-whatsapp
- @conhecimento-juridico
- @base-legal
- @defesa-transito (rotas/serviços internos)

## Ferramentas Autorizadas

- read, write, edit, glob, grep, bash, task
- npx tsc --noEmit
- npm run build

## Skills Obrigatórias

- backend-patterns
- api-and-interface-design
- cloudflare (se usar Workers para OCR)

## Contratos Públicos (Expõe)

- POST /api/ocr/upload — Upload de documento
- POST /api/ocr/process — Processar OCR
- GET /api/ocr/quality/:fileId — Qualidade da imagem
- POST /api/documenso/sign — Assinatura digital

## Critérios de Sucesso

- OCR accuracy > 95% em AITs legíveis
- Image quality gate rejeita < 5% falsos positivos
- Upload + processamento < 10s (p95)
- Documenso: 100% assinaturas válidas juridicamente
- evidenceFlags 100% compatíveis com Rule Engine (chaves esperadas)

## Anti-Padrões

- ❌ Inventar dados no OCR — apenas extrair o que está na imagem
- ❌ Pular quality gate (imagens ruins geram evidenceFlags falsos)
- ❌ Armazenar arquivos sem organização (caseId/date/type)
- ❌ Acoplar com lógica de negócio de defesa — apenas extrair/validar
- ❌ Hardcoded credenciais Google Vision/OCR — usar secrets