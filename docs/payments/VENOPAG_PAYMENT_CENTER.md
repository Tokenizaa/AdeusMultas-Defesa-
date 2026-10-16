# Módulo financeiro VenoPag

Documentação oficial: https://venopagments.com/docs/

A área `/admin/payments` concentra pagamentos PIX, afiliados, comissões e status do gateway. As rotas administrativas exigem sessão válida e papel admin; credenciais nunca são expostas ao navegador.

## Integração

- Cash In: `POST https://venopagments.com/api/cashin` com `X-Client-Id` e `X-Client-Secret`.
- Split: `splits: [{ username, percentage }]`; percentual aplicado sobre o valor bruto.
- Webhook: validação HMAC sobre o corpo bruto e consulta de status antes de liberar o caso.
- Reversões posteriores (`contested`, `chargedback`, `refunded`) precisam continuar refletidas no sistema.
- A VenoPag informa que não existe sandbox público; testes E2E movimentam dinheiro real.

## Afiliados

`affiliate_gateway_profiles` associa UUID interno ao username VenoPag, percentual e ativação. A migration `supabase/migrations/20261016000001_create_affiliate_gateway_profiles.sql` deve ser aplicada ao projeto Supabase `llmxnpgjpxcvyrqjkfwb` antes de configurar splits. O deploy do Worker não aplica migrations SQL automaticamente.

Novas cobranças procuram relações de indicação ativas (níveis 1 a 3), resolvem os perfis VenoPag ativos e enviam splits ao Cash In. Sem relação/mapeamento ativo, não há split. Percentuais somados acima de 100% bloqueiam a cobrança antes de chamar o gateway. Pagamentos já emitidos não são alterados.

O username deve existir na VenoPag. A configuração do split não marca comissão contábil como paga e não dispara saques. O módulo não simula pagamentos nem registra liquidação sem confirmação financeira.

## Rotas protegidas

- `GET /api/admin/payments`
- `GET /api/admin/payments/gateway`
- `GET /api/admin/payments/affiliates`
- `PUT /api/admin/payments/affiliates/:userId`
- `GET /api/admin/payments/commissions`

Os registros E2E conhecidos permanecem no histórico e são excluídos dos indicadores financeiros. Receita aprovada considera ordens `PAID`; estornos, contestações e chargebacks são reversões, não receita positiva.