# Fase 1 — Contratos e Kernel Compartilhado

**Status:** IMPLEMENTADA — fundação criada, adoção incremental pendente
**Branch:** `phase-0`

## Objetivo

Criar uma fronteira comum para as APIs Cloudflare sem copiar o backend Express legado.

## Contrato canônico

`src/shared/api/contracts.ts` define:

- envelope de sucesso `{ ok: true, data, requestId? }`;
- envelope de erro `{ ok: false, error }`;
- códigos de erro padronizados;
- contexto mínimo de request;
- versão do contrato.

`src/shared/api/http.ts` fornece helpers para respostas JSON e geração de `requestId`.

## Regras

1. Novas rotas Cloudflare devem usar os contratos compartilhados.
2. Rotas legadas não serão alteradas apenas para conformidade cosmética.
3. Durante a migração, cada família será adaptada individualmente e testada contra seu consumidor.
4. O contrato compartilhado não deve conter regra de domínio.
5. Regras de domínio pertencem aos módulos canônicos; adapters HTTP apenas traduzem entrada/saída.
6. `api/index.mjs` permanece congelado.

## O que ainda falta nesta fase

- adoção pelos adapters Cloudflare existentes;
- contexto de autenticação compartilhado;
- middleware único de erros e observabilidade;
- schemas de request/response por família;
- testes de contrato;
- mappers canônicos de domínio que ainda estejam duplicados.

Esses itens devem ser implementados antes do gate definitivo da Fase 1.

## Gate

A Fase 1 só será marcada como concluída quando todas as novas rotas migradas usarem a fronteira compartilhada e os testes de contrato passarem.
