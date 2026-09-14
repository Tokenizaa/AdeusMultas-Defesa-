# Fase 2 — OCR

**Status:** CONCLUÍDA
**Runtime:** Cloudflare Workers + Workers AI
**Modelo:** `@cf/moondream/moondream3.1-9B-A2B`

## Objetivo

Retirar a dependência operacional do Vercel para OCR e manter o fluxo anonymous-first usado no onboarding.

## Implementação

A rota nativa foi criada em `cloudflare/routes/ocr.ts`:

- `POST /api/ocr/analyze`
- aceita `multipart/form-data` com `file`/`image`;
- aceita JSON com `image` em Base64/data URI;
- aceita JPEG, PNG, WEBP e GIF;
- limita a entrada a 12 MB;
- não exige autenticação, preservando o fluxo de upload antes do cadastro;
- executa OCR diretamente via binding `AI` do Cloudflare Workers AI;
- extrai `rawText` e campos estruturados de trânsito;
- normaliza campos ausentes para `null`;
- usa o contrato compartilhado da Fase 1 para sucesso/erro;
- não possui fallback ou chamada ao Vercel.

O Workers AI foi escolhido porque o catálogo atual oferece o Moondream 3.1 para tarefas de visão que incluem OCR e saída estruturada. A execução ocorre pelo binding `env.AI.run()`.

## Segurança e limites

O Worker não recebe nenhuma chave de provider externo. O binding `AI` é provisionado pelo Wrangler/Cloudflare, mantendo a inferência dentro da plataforma.

O endpoint rejeita formatos não suportados e entradas acima de 12 MB antes de executar inferência.

## Testes

`cloudflare/routes/ocr.test.ts` cobre:

- rejeição de MIME type não suportado;
- envelope de sucesso;
- normalização dos campos `aitNumber`, `plate` e demais campos estruturados;
- integração do route adapter com um mock do Workers AI.

## Limitação conhecida

A verificação de produção com uma fotografia real depende de o binding Workers AI estar habilitado na conta Cloudflare e do modelo Moondream estar liberado para o Worker. A configuração do binding está versionada em `wrangler.jsonc`.

Não houve remoção de `api/index.mjs` ou do proxy nesta fase. Essas remoções pertencem às fases finais, depois que todas as famílias forem migradas.

## Gate

- [x] Endpoint OCR nativo no Worker
- [x] Workers AI configurado no Wrangler
- [x] Entrada multipart e Base64
- [x] Extração de texto
- [x] Retorno estruturado
- [x] Erros padronizados
- [x] Testes unitários do contrato
- [x] Nenhuma chamada OCR para Vercel no novo caminho
- [x] Backend legado permanece congelado

**Próxima fase:** Knowledge / RAG.
