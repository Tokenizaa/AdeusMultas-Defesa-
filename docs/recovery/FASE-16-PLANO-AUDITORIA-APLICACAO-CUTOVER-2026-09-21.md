# FASE 16 — AUDITORIA DA APLICAÇÃO E PREPARAÇÃO DO CUTOVER

Data: 2026-09-21
Branch: `recovery/sgom-db-reconstruction`

## Próximas fases oficiais

| Fase | Objetivo | Status |
|---|---|---|
| 16 | Auditar código, configurações e dependências Supabase | ✅ CONCLUÍDA |
| 17 | Reconectar aplicação ao LLMX em ambiente controlado | ⬜ |
| 18 | Validar Auth, RLS e Storage através da aplicação | ⬜ |
| 19 | Validar Golden Path completo | ⬜ |
| 20 | Validar pagamentos e integrações | ⬜ |
| 21 | Executar testes E2E e browser | ⬜ |
| 22 | Auditoria final de produção | ⬜ |
| 23 | Cutover controlado | ⬜ |
| 24 | Monitoramento pós-cutover | ⬜ |

## Regra operacional

Nenhuma fase de cutover deve alterar produção antes das fases 16–22 apresentarem evidência suficiente. O LLMX não será zerado, truncado ou recriado.

## Fase 16 — escopo

Auditar:
- referências a projetos/ref antigos do Supabase;
- SUPABASE_URL, project ref e chaves;
- variáveis locais e configurações Vercel;
- clientes Supabase no frontend e backend;
- Auth;
- Storage;
- Edge Functions;
- migrations e configuração local;
- URLs/callbacks;
- PagBank;
- integrações externas;
- testes E2E;
- documentação operacional.

## Resultado esperado

Gerar uma matriz: recurso → configuração atual → origem → alvo LLMX → risco → ação necessária.

Nenhuma credencial secreta será gravada no Git.

## Critério de saída da Fase 16

A aplicação deve ter um mapa inequívoco de todas as dependências Supabase e de todas as alterações necessárias para o ambiente controlado. Somente então será iniciada a Fase 17.

## Encerramento da Fase 16

Auditoria registrada em `docs/recovery/FASE-16-AUDITORIA-APLICACAO-CONFIGURACOES-2026-09-21.md`.

Próxima execução: **Fase 17 — Reconexão controlada ao LLMX**.

Bloqueador identificado: `vercel.json` ainda referencia o projeto antigo `sgomwklorpzdwdubtmgg`, enquanto `supabase/config.toml` referencia o LLMX `llmxnpgjpxcvyrqjkfwb`.

Nenhuma alteração de banco, produção ou credencial foi realizada na Fase 16.
