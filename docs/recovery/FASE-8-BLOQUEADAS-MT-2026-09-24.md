# FASE 8 — UF Bloqueada — MT (Revalidação)

**Data:** 2026-09-24 | **Natureza:** revalidação de UF bloqueada na primeira rodada (lote de fechamento).
**Commit-base:** c97fa2ec32dda9582f06daf71e130692d3df8647

## Fontes investigadas
www.detran.mt.gov.br = 000 (TLS conecta, resposta HTTP nunca retorna; F5 BigIP)

www.cetran.mt.gov.br = 000 (timeout)

## Documentos encontrados
Nenhum documento oficial válido acessível nas rotas testadas.

## Documentos recuperados
0.

## Status HTTP / MIME
Todos os acessos resultaram em 000 (timeout/indisponível), 403 (bot-block Akamai/Cloudflare) ou 503 (service unavailable). Nenhum payload de documento (PDF/HTML válido) obtido.

## Classificação final
MT: **RECUPERACAO_BLOQUEADA** — fontes oficiais inacessíveis nesta execução (limitada a 2 rotas oficiais por alvo). 0 documentos coletados.
