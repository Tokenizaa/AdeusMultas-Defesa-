# Roadmap — Payments & Production Golden Path

> Roadmap operacional para tornar o domínio de pagamentos determinístico, seguro e comprovável em produção, e então fechar o Golden Path ponta a ponta.
>
> **Status atual:** 🔴 OPEN — não fechar a Fase 4 / Golden Path enquanto os gates P0/P1 abaixo não estiverem comprovados.
>
> **Regra de evidência:** código, mocks, testes locais ou execução em localhost não equivalem a prova de produção. O fechamento das etapas de produção exige evidência real e reproduzível.

## 1. Modelo comercial e de gateways — decisão canônica

### Regra de negócio

- `GGPIXAPI` é gateway de **produção**.
- `PagBank` é gateway de **produção**.
- `PagBank sandbox` é o ambiente de homologação/teste do provedor.
- `testAdapter` é somente para testes internos e **nunca pode ser selecionável em produção**.
- O gateway ativo de produção pode ser alterado pelo painel administrativo.
- A alteração do gateway afeta somente **novos pagamentos**.
- Um pagamento já criado permanece vinculado ao gateway que o criou, independentemente de futuras trocas administrativas.

### Critério de aceite

- Produção permite selecionar somente `ggpixapi` ou `pagbank`.
- `testAdapter` é rejeitado explicitamente em `NODE_ENV=production`.
- A seleção administrativa é persistida e auditável.
- Novos `PaymentOrder/PaymentAttempt` usam o gateway ativo no momento da criação.
- Pagamentos existentes continuam sendo consultados, reconciliados e processados pelo gateway originalmente vinculado.

---

## 2. FASE 1 — Payment Domain Invariants

**Status:** ⬜ OPEN

Definir e codificar as invariantes que não podem ser violadas:

- identidade imutável do pagamento;
- caso associado;
- gateway de criação;
- ambiente do gateway (`production` / `sandbox`);
- valor canônico e moeda;
- oferta comercial utilizada;
- estado do pagamento;
- transação externa/provider reference;
- timestamps de criação, confirmação e atualização;
- origem e identidade de eventos de webhook.

### Gate

Nenhuma rota, adapter ou webhook poderá marcar pagamento como pago sem satisfazer as invariantes canônicas.

---

## 3. FASE 2 — Gateway Selection Determinístico

**Status:** ⬜ OPEN

Consolidar o `GatewayManager` como única autoridade para seleção do gateway.

### Requisitos

- `getActiveGateway()` deve retornar a configuração efetivamente ativa.
- `setActiveGateway()` deve aceitar somente gateways permitidos pelo ambiente.
- Produção: `ggpixapi | pagbank`.
- Produção: `test` → hard fail.
- Sandbox/testes: `pagbank` pode usar ambiente sandbox conforme configuração.
- A seleção não deve sofrer fallback silencioso que contradiga a configuração administrativa.
- Toda alteração deve gerar auditoria.

### Gate

Testes automatizados comprovam todas as combinações válidas e inválidas.

---

## 4. FASE 3 — PaymentOrder / PaymentAttempt

**Status:** ⬜ OPEN

Auditar o schema real do Supabase e alinhar o modelo persistido ao domínio.

### Objetivo

Separar claramente:

```text
Case
  └── PaymentOrder
        ├── PaymentAttempt #1 → Gateway A
        ├── PaymentAttempt #2 → Gateway A
        └── PaymentAttempt #3 → Gateway B
```

O modelo deve permitir retry/reissue sem perder a identidade histórica de cada tentativa.

### Campos/invariantes a validar

- `payment_order_id`;
- `case_id`;
- `attempt_id`;
- `gateway_id`;
- `gateway_environment`;
- `provider_order_id / transaction_id`;
- `amount` em representação determinística;
- `currency`;
- `commercial_offer_id`;
- `status`;
- `idempotency_key`;
- `provider_event_id`;
- timestamps;
- metadata mínima para auditoria.

### Gate

Schema, constraints, índices, RLS e código devem representar o mesmo contrato. Nenhum estado financeiro crítico pode depender exclusivamente de memória do processo.

---

## 5. FASE 4 — Payment Reconciliation Central

**Status:** ⬜ OPEN — P0

Criar/centralizar uma camada de reconciliação responsável por transformar eventos externos em estado financeiro interno.

### Fluxo canônico

```text
Provider webhook / status query
        ↓
Gateway adapter
        ↓
Normalized Payment Event
        ↓
Payment Reconciliation
        ↓
PaymentOrder / PaymentAttempt
        ↓
Case paid-state
        ↓
Defense generation gate
```

### Regras obrigatórias

Antes de aceitar `PAID`:

1. validar assinatura/autenticidade;
2. identificar gateway e ambiente;
3. localizar a tentativa correta;
4. validar provider reference;
5. validar valor do provedor contra o valor persistido/canônico;
6. validar moeda;
7. validar transição de estado;
8. aplicar idempotência;
9. persistir o evento/resultado;
10. somente então liberar o estado pago e a geração da defesa.

### Gate P0

Um webhook com valor divergente, tentativa inexistente, gateway incorreto ou evento duplicado não pode transformar um caso em `PAID`.

---

## 6. FASE 5 — GGPIXAPI Security & Idempotency

**Status:** ⬜ OPEN — P0

### Segurança

- definir o mecanismo oficial de autenticação/validação do webhook;
- produção deve rejeitar configuração de segurança ausente/inválida;
- não aceitar silenciosamente webhook não autenticado;
- registrar motivo de rejeição sem expor segredo.

### Idempotência

- remover IDs de evento baseados em `Date.now()` como identidade durável;
- persistir identificador determinístico do evento/transação;
- criar constraint única adequada no banco;
- segunda entrega do mesmo evento deve ser no-op idempotente.

### PIX

- produção nunca deve entregar ao cliente um PIX local/fabricado quando a criação no provedor falhar;
- código/QR exibido ao usuário deve ser derivado da resposta válida do provedor.

### Gate P0

Testes cobrem assinatura, configuração ausente, evento duplicado, valor divergente e falha do provedor.

---

## 7. FASE 6 — PagBank Sandbox Real

**Status:** ⬜ OPEN

Usar o sandbox real do PagBank para homologar o fluxo financeiro sem cobrança real.

### Escopo

- criação de PIX sandbox;
- persistência da tentativa;
- consulta de status;
- webhook sandbox quando disponível;
- reconciliação;
- idempotência;
- falhas e retries;
- crédito/débito conforme suporte existente e necessário.

### Gate

O fluxo deve atravessar a integração real do PagBank sandbox, não `testAdapter` nem mock local.

---

## 8. FASE 7 — PagBank Production

**Status:** ⬜ BLOCKED — depende de aprovação/configuração do PagBank

### Escopo

- credenciais de produção configuradas com segurança;
- ambiente explicitamente `production`;
- criação real de pagamento somente quando o provedor estiver aprovado e pronto;
- webhook de produção autenticado;
- reconciliação de valor/status;
- persistência durável;
- observabilidade e auditoria.

### Regra

Não executar cobrança real de cliente durante homologação. A etapa só fecha com evidência de integração de produção segura e, quando aplicável, teste controlado autorizado.

---

## 9. FASE 8 — GGPIXAPI Production

**Status:** ⬜ OPEN

### Escopo

- credenciais de produção;
- criação real de PIX;
- resposta real do provedor;
- webhook autenticado;
- reconciliação;
- idempotência;
- persistência durável;
- tratamento de indisponibilidade;
- auditoria.

### Gate

O fluxo deve provar criação e reconciliação de uma transação de produção autorizada, sem utilizar fallback local.

---

## 10. FASE 9 — Admin Gateway Switch + Pending Payments

**Status:** ⬜ OPEN — P1

Provar o comportamento crítico de troca de gateway:

```text
Gateway A ativo
    ↓
Payment #1 criado → Gateway A
    ↓
Admin troca para Gateway B
    ↓
Payment #2 criado → Gateway B
    ↓
Payment #1 continua sendo consultado/reconciliado no Gateway A
```

### Correções obrigatórias

- `/pix/status/:txId` não pode depender exclusivamente do gateway atualmente ativo;
- lookup deve resolver a tentativa/pagamento persistido e seu gateway vinculado;
- adapter correto deve ser selecionado a partir do pagamento existente;
- retries não podem migrar silenciosamente de gateway;
- histórico financeiro deve permanecer íntegro após qualquer troca administrativa.

### Gate

Teste automatizado + teste integrado demonstram coexistência de pagamentos pendentes em gateways diferentes.

---

## 11. FASE 10 — Persistence & Serverless Reliability

**Status:** ⬜ OPEN — P1

Eliminar dependências financeiras críticas de estado apenas em memória.

### Pontos

- `Map`/`Set` em adapters não podem ser a única fonte de verdade;
- webhook idempotency deve ser persistida;
- status deve sobreviver a cold start;
- pagamento deve poder ser reconciliado em outra instância Vercel;
- erros de persistência financeira não devem ser silenciosamente descartados.

### Gate

Simular cold start/instância diferente e demonstrar que o pagamento continua reconciliável.

---

## 12. FASE 11 — Credit Card / Gateway Abstraction

**Status:** ⬜ OPEN — P1

Eliminar bypass de provider específico nas rotas de pagamento.

### Regra

A rota deve depender da abstração `PaymentGateway`, e não diretamente de `pagBankIntegration`, salvo comportamento explicitamente justificado e documentado.

### Gate

Testes demonstram que a regra de seleção, persistência e reconciliação permanece centralizada.

---

## 13. FASE 12 — Commercial Integrity

**Status:** ⬜ OPEN — P0/P1

Garantir que o valor financeiro seja sempre derivado da oferta comercial canônica.

### Regras

- cliente não controla o preço final enviado ao provider;
- valor persistido deve corresponder à oferta autorizada;
- webhook deve reconciliar contra o valor esperado;
- divergência → rejeição/estado de investigação, nunca `PAID` automático;
- uma mesma tentativa não pode trocar de oferta/valor silenciosamente.

### Gate

Testes de tampering e mismatch de valor passam em todos os gateways.

---

## 14. FASE 13 — Payment → Document Generation Gate

**Status:** ⬜ OPEN — P0

Centralizar a regra que libera a geração da defesa após pagamento confirmado.

### Regra

```text
PAID reconciliado
    AND
PaymentOrder íntegro
    AND
Case elegível
    ↓
Defense generation
```

Nenhuma rota de webhook deve gerar documento apenas por receber um payload `PAID` sem passar pela reconciliação canônica.

### Gate

- pagamento falso → não gera;
- valor divergente → não gera;
- evento duplicado → não gera segunda vez;
- pagamento válido → pode gerar;
- retry de geração → respeita idempotência/limite do domínio.

---

## 15. FASE 14 — Golden Path Production E2E

**Status:** 🔴 BLOCKED

### Fluxo final

```text
Production UI
  ↓
Onboarding
  ↓
Case persistence
  ↓
Evidence
  ↓
Analysis
  ↓
Qualification
  ↓
Commercial offer
  ↓
Payment order
  ↓
Real production gateway
  ↓
Real provider confirmation/webhook
  ↓
Payment reconciliation
  ↓
Case PAID
  ↓
Defense generation
  ↓
Document persisted
  ↓
Document retrievable by user
```

### Evidência obrigatória

- URL de produção;
- execução Playwright em produção;
- caso real de teste identificável;
- `payment_order` persistido;
- gateway/attempt persistidos;
- evento de pagamento/reconciliação;
- estado final do caso;
- documento persistido;
- evidência de ausência de uso de `testAdapter`;
- logs/artefatos da execução;
- nenhuma dependência de localhost/mock para o resultado final.

### Regra de fechamento

Sem essa evidência, a Fase 4/Golen Path permanece aberta mesmo que todos os testes locais estejam verdes.

---

## 16. Ordem de execução

| Ordem | Fase | Prioridade | Status |
|---:|---|---|---|
| 1 | Payment Domain Invariants | P0 | ⬜ |
| 2 | Gateway Selection Determinístico | P0 | ⬜ |
| 3 | PaymentOrder / PaymentAttempt | P0 | ⬜ |
| 4 | Payment Reconciliation Central | P0 | ⬜ |
| 5 | GGPIX Security & Idempotency | P0 | ⬜ |
| 6 | PagBank Sandbox Real | P0 | ⬜ |
| 7 | Commercial Integrity | P0 | ⬜ |
| 8 | Payment → Document Gate | P0 | ⬜ |
| 9 | Persistence / Serverless Reliability | P1 | ⬜ |
| 10 | Admin Switch + Pending Payments | P1 | ⬜ |
| 11 | Credit Card / Gateway Abstraction | P1 | ⬜ |
| 12 | PagBank Production | P0 | 🔒 |
| 13 | GGPIXAPI Production | P0 | ⬜ |
| 14 | Golden Path Production E2E | P0 | 🔴 |

---

## 17. Definition of Done

O roadmap só pode ser marcado como concluído quando:

- [ ] `GGPIXAPI` e `PagBank` são tratados como gateways de produção;
- [ ] `PagBank sandbox` é o ambiente real de homologação do PagBank;
- [ ] `testAdapter` é impossível de selecionar em produção;
- [ ] gateway fica vinculado à tentativa/pagamento na criação;
- [ ] troca administrativa afeta somente novos pagamentos;
- [ ] pagamentos antigos continuam reconciliáveis pelo gateway original;
- [ ] valores são derivados e reconciliados contra a oferta canônica;
- [ ] webhooks são autenticados;
- [ ] webhooks são idempotentes de forma durável;
- [ ] PIX local/fabricado não é exposto após falha do provider em produção;
- [ ] estado financeiro crítico é persistido no Supabase;
- [ ] status não depende de memória local da instância;
- [ ] geração de documento exige pagamento reconciliado;
- [ ] testes unitários/integrados relevantes estão verdes;
- [ ] PagBank sandbox foi validado com provider real;
- [ ] gateways de produção foram validados conforme autorização e segurança;
- [ ] Golden Path foi executado em `https://www.defesai.shop`;
- [ ] artefatos da execução foram preservados;
- [ ] nenhum mock/localhost foi usado como prova final de produção.

---

## 18. Histórico e contexto

Este roadmap consolida os achados da auditoria de pagamentos realizada após a implementação do Golden Path de produção. Ele complementa os ADRs existentes, especialmente o ADR-009 (`payment_orders`) e o ADR-010 (geração automática de defesa pós-pagamento).

**Última revisão:** 2026-09-08
