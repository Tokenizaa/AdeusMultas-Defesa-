# Shared API Kernel

Este diretório é a fronteira HTTP compartilhada da migração Cloudflare.

## Regra de adoção

Uma rota migrada deve:

1. autenticar usando o middleware compartilhado da camada Cloudflare;
2. produzir respostas através dos contratos `ApiResponse`;
3. preservar o payload de domínio existente quando houver consumidor legado;
4. usar `requestId` para rastreabilidade;
5. não importar Express, Vercel ou código de `api/index.mjs`.

## Compatibilidade

A adoção do envelope canônico deve ser feita por família de API, com testes de contrato. Não se deve alterar dezenas de endpoints simultaneamente apenas para padronização.
