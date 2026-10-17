---
name: e2e-security-payment-performance
description: Validação E2E de isolamento, segurança, pagamentos simulados, idempotência e desempenho do AdeusMultas.
---
# E2E Security, Payment and Performance

Skill local exclusiva deste repositório; nunca copiar para diretórios globais.

## Segurança e integridade
Confirmar projeto/ambiente antes de escrita; validar autenticação, autorização, RLS e isolamento por usuário/caso, proteção de documentos, exposição de PII e segredos. Comparar request, API, DB, análise, minuta e UI. Acesso cruzado confirmado é bloqueante. Não imprimir credenciais.

## Pagamentos
Exigir `E2E_MOCK_PAYMENT=1`. Nunca chamar provedor para transação real. Testar os estados que o produto suporta, callbacks/requisições repetidos, idempotência, falhas e condição de liberação. Zero liberação indevida e zero duplicidade de efeito.

## Desempenho
Medir por operação, com amostra e ambiente declarados. Informar p50/p95/p99 somente quando calculáveis. Verificar metas documentadas atuais; meta histórica de análise gratuita <3s p95 deve ser confirmada contra especificação e runtime atual. Não executar carga agressiva contra produção nem usar média para ocultar cauda longa.

## Dados sintéticos
Identificar registros pela execução atual. Limpar somente esses registros após preservar evidência e verificar relações. Preservar contas administrativas, casos de referência e quaisquer dados não criados pela execução.
