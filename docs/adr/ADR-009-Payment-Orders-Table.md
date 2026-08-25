# ADR-009: Criação da tabela `payment_orders`

- **Status**: Accepted
- **Data**: 2026-08-24
- **Autor**: @agent-loop (orquestrado pelo usuário)
- **Contexto**: Auditoria Admin + eliminação de fallback hardcode em KPIs

---

## Problema

Os KPIs do Admin (`totalRevenue`, ticket médio, volume faturado) dependem de `case.payment.amount`, que é um campo JSONB dentro de `cases`. Isso causa:

1. **Fallback hardcode**: quando `payment.amount` está ausente, o backend usa `PRICING.DEFAULT_PRICE` (89.90), inflando receita artificialmente.
2. **Sem histórico**: não há rastro de transações por gateway (PagBank vs GGPIXAPI).
3. **Webhook não-persistente**: a confirmação de PIX atualiza o `case` em memória e no Supabase, mas não há entidade própria de pedidos para reconciliar.

---

## Decisão

Criar tabela `payment_orders` no Supabase com os campos essenciais de transação, independente do `case`. O `case` continua referenciando o pedido via `payment_orders.id` (FK) ou `case.payment.transactionId`.

### Schema

```sql
CREATE TABLE public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('pagbank', 'ggpixapi')),
  gateway_transaction_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  amount_in_cents INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_gateway_txn
  ON public.payment_orders (gateway, gateway_transaction_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_case_id
  ON public.payment_orders (case_id);

CREATE OR REPLACE FUNCTION public.update_payment_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_orders_updated_at();

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payment orders"
  ON public.payment_orders FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'admin'));

CREATE POLICY "Service can insert payment orders"
  ON public.payment_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update payment orders"
  ON public.payment_orders FOR UPDATE
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.payment_orders TO authenticated;
GRANT SELECT ON public.payment_orders TO anon;
```

---

## Consequências

### Positivas
- **KPIs confiáveis**: `totalRevenue` passa a ser `SUM(amount)` de `payment_orders` com `status = 'paid'`, sem fallback.
- **Rastreabilidade**: histórico completo de transações por gateway.
- **Reconciliação**: Admin pode cruzar `payment_orders` com `cases` para auditoria.

### Negativas
- **Dependência de migração**: necessário aplicar a migration antes de usar.
- **Dados legados**: pedidos confirmados antes da migration precisam ser backfill (script separado, fora deste ADR).

---

## Implementação

1. Aplicar migration no Supabase (via MCP ou CLI).
2. Atualizar `webhook-handler.ts` para persistir em `payment_orders` além de `caseRepository`.
3. Atualizar `adminQueryService.getPayments()` para ler de `payment_orders` (ou manter fallback para `case.payment` durante transição).
4. Atualizar `admin.ts` `/overview` para calcular `totalRevenue` via `payment_orders` (elimina fallback `PRICING`).