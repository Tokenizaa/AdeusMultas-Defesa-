# Ticket: Geração automática de defesa pós-pagamento + limite de 3 gerações

- **Tipo**: Bug fix (fluxo de negócio)
- **Prioridade**: Alta
- **Status**: Implementado e validado (E2E)
- **Data**: 2026-08-26
- **Autores**: @backend / @frontend / @testes (orquestrado por @agent-loop)
- **Plataforma**: DefesAi

---

## Descrição do Bug

O fluxo de geração de defesa de multas estava invertido em relação à regra de negócio:

1. A defesa era gerada **manualmente** pelo usuário antes do pagamento (botão "Gerar Minha Defesa Automática"), quando deveria ser gerada **automaticamente após o pagamento ser confirmado**.
2. O webhook de pagamento **não gerava a defesa automaticamente** — apenas marcava o caso como pago.
3. Não havia **limite de gerações** — o endpoint permitia chamadas ilimitadas.
4. O endpoint de geração **não verificava o pagamento** — podia gerar defesa sem pagar.

## Causa Raiz

O webhook PagBank confirmava o pagamento (set `isPaid = true`) mas não disparava o pipeline de geração de defesa, e o endpoint de geração não aplicava guardas de pagamento nem de limite.

## Solução

Aplicar a regra de negócio de geração automática pós-pagamento com teto de 3 gerações:

- **Webhook PagBank** (status PAID) gera a defesa automaticamente via `RagPipeline.generateDefenseDraft` (`generateDefenseDraftForDomain`) e seta `generationCount = 1` (não-bloqueante: se falhar, o caso permanece pago).
- **Botão renomeado** de "Gerar Minha Defesa Automática" para **"Gerar Nova Defesa"**.
- **Limite de 3 gerações**: campo `generationCount?: number` em `DefenseDraft`; endpoint bloqueia com **HTTP 429** quando `generationCount >= 3`; frontend desabilita o botão mostrando `"X/3 gerações"` ou `"Limite de 3 gerações atingido"`.
- **Guarda de pagamento**: `POST /api/cases/:id/generate-defense` retorna **HTTP 403** quando `!case.isPaid`.

## Arquivos Alterados

- `src/types/index.ts` — campo `generationCount?: number` na interface `DefenseDraft` (~linha 171).
- `server.ts` — endpoint `POST /api/cases/:id/generate-defense` (~linha 645): guardas 403/429 + incremento de `generationCount`.
- `src/server/routes/payments.ts` — webhook PagBank: geração automática da defesa (`generateDefenseDraftForDomain`, ~linhas 105 e 514).
- `src/components/cases/CaseDetailView.tsx` — botão "Gerar Nova Defesa" + indicador de limite de 3 gerações (~linhas 420-485).
- `package.json` — script `dev` alterado para `tsx watch server.ts` (hot reload do backend em dev).

## Validação (Testes E2E confirmados)

| Cenário | Resultado |
|---------|-----------|
| Caso não pago → geração | **HTTP 403** "Pagamento não confirmado" |
| Chamadas 1, 2, 3 → geração | **HTTP 200** (`generationCount` 1, 2, 3) |
| Chamada 4 → geração | **HTTP 429** "Limite de 3 gerações atingido" |
| Frontend com `generationCount` < 3 | Botão "Gerar Nova Defesa" habilitado, `"X/3 gerações"` |
| Frontend com `generationCount` >= 3 | Botão desabilitado, `"Limite de 3 gerações atingido"` |
| Cartão de crédito via `ggpixapi` | **400** "Gateway não suporta cartão" (bloqueado) |
| Cartão de crédito via `pagbank` | **200**, `orderId` gerado, `aguardando_3ds` |

---

> Documentação formal de arquitetura: ver [ADR-010](ADR-010-Automatic-Defense-Generation-and-Limit.md).