# ADR-010: Geração automática de defesa pós-pagamento + limite de 3 gerações

- **Status**: Accepted
- **Data**: 2026-08-26
- **Autor**: @agent-loop (orquestrado pelo usuário) / @backend / @frontend / @testes
- **Contexto**: Correção de bug de fluxo de negócio na geração de defesa de multas + regra de negócio de limite de gerações

---

## Problema

O fluxo de geração de defesa de multas estava invertido em relação à regra de negócio esperada:

1. **Geração manual antes do pagamento**: a defesa era gerada pelo usuário (botão "Gerar Minha Defesa Automática" na tela de estratégia jurídica) antes de o pagamento ser confirmado, quando deveria ser gerada **automaticamente após o pagamento**.
2. **Webhook não gerava defesa**: o webhook de pagamento PagBank apenas marcava o caso como pago (`isPaid = true`) e não disparava a geração da defesa — o caso não chegava ao estado `defesa_pronta` de forma automática.
3. **Sem limite de gerações**: o endpoint `POST /api/cases/:id/generate-defense` permitia chamadas ilimitadas, permitindo que a mesma defesa fosse (re)gerada indefinidamente.
4. **Falta de guarda de pagamento**: o endpoint de geração não verificava se o pagamento já havia sido confirmado, permitindo gerar a defesa sem pagar.

---

## Decisão

Adotar o fluxo automático de geração pós-pagamento, adicionar um campo `generationCount` ao `DefenseDraft` e aplicar guardas no endpoint de geração, estabelecendo um teto de **no máximo 3 gerações por caso**.

### Regras de negócio implementadas

1. **Geração automática após pagamento** — o webhook PagBank, ao confirmar pagamento (status PAID), gera a defesa automaticamente via `RagPipeline.generateDefenseDraft` (função `generateDefenseDraftForDomain` em `src/server/routes/payments.ts`) e seta `generationCount = 1`. O caso chega ao estado `defesa_pronta` com a peça jurídica já montada.
2. **Botão renomeado** — o botão "Gerar Minha Defesa Automática" passou a se chamar **"Gerar Nova Defesa"** (frontend reflete o novo fluxo: a primeira geração é automática; o botão serve para regenerar).
3. **Limite de 3 gerações** — campo `generationCount?: number` adicionado à interface `DefenseDraft`. O endpoint bloqueia com **HTTP 429** quando `generationCount >= 3`. O frontend desabilita o botão e exibe `"X/3 gerações"` ou `"Limite de 3 gerações atingido"`.
4. **Guarda de pagamento** — o endpoint retorna **HTTP 403** quando `!case.isPaid` ("Pagamento não confirmado. Realize o pagamento para gerar a defesa.").

---

## Consequências

### Positivas
- **Fluxo de negócio correto**: a defesa passa a ser gerada automaticamente após a confirmação de pagamento, garantindo que o cliente receba a peça jurídica sem ação manual.
- **Proteção de receita**: a guarda de pagamento (403) impede geração de defesa sem pagamento confirmado.
- **Controle de custos**: o limite de 3 gerações impede chamadas ilimitadas à IA (NVIDIA/9Router), protegendo custos de inferência.
- **Transparência de UI**: o contador `X/3 gerações` informa o usuário sobre o teto, e o botão é desabilitado no limite.

### Negativas
- **Comportamento de quebra para usuários**: casos já pagos mas ainda sem defesa gerada exigem regeneração manual via o botão (que agora respeita o limite). Clientes que já atingiram 3 gerações ficam bloqueados (HTTP 429) até suporte manual.
- **Dependência do webhook**: a geração automática depende do webhook PagBank processar o status PAID; falha na geração automática é não-bloqueante (caso permanece pago), mas exige geração manual posterior.
- **Teto fixo no frontend**: `MAX_GENERATIONS = 3` está hardcoded no `CaseDetailView.tsx`; se o backend alterar o teto, o frontend precisa ser atualizado em sincronia.

---

## Implementação

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/types/index.ts` | Campo `generationCount?: number` adicionado à interface `DefenseDraft` (linha ~171). |
| `server.ts` | Endpoint `POST /api/cases/:id/generate-defense` (linha ~645): guarda de pagamento (403), guarda de limite (429) e incremento de `generationCount`. |
| `src/server/routes/payments.ts` | Webhook PagBank: geração automática da defesa após pagamento confirmado (função `generateDefenseDraftForDomain`, ~linha 105; chamada no webhook, ~linha 514). |
| `src/components/cases/CaseDetailView.tsx` | Botão "Gerar Nova Defesa" + indicador de limite `X/3 gerações` / `"Limite de 3 gerações atingido"` (linha ~420-485). |
| `package.json` | Script `dev` alterado de `tsx server.ts` para `tsx watch server.ts` (recarrega mudanças de backend em dev). |

### Validação E2E (resultados confirmados)

- **Guarda de pagamento**: caso não pago → **HTTP 403** "Pagamento não confirmado".
- **Limite de 3**: chamadas 1, 2 e 3 → **HTTP 200** (`generationCount` 1, 2 e 3); chamada 4 → **HTTP 429** "Limite de 3 gerações atingido".
- **Frontend**: botão "Gerar Nova Defesa" habilitado com `"1/3 gerações"`; desabilitado com `"Limite de 3 gerações atingido"` quando `generationCount >= 3`.
- **Cartão de crédito**: gateway `ggpixapi` bloqueia (400 "Gateway não suporta cartão"); gateway `pagbank` funciona (200, `orderId` gerado, `aguardando_3ds`).