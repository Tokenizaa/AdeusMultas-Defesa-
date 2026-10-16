# Módulo financeiro VenoPag

Documentação oficial: https://venopagments.com/docs/

A área `/admin/payments` concentra pagamentos PIX, afiliados, comissões e status do gateway. As rotas administrativas exigem sessão válida e papel admin; credenciais nunca são expostas ao navegador.

## Integração

- Cash In: `POST https://venopagments.com/api/cashin` com `X-Client-Id` e `X-Client-Secret`.
- Split: `splits: [{ username, percentage }]`; percentual aplicado sobre o valor bruto.
- Webhook: a VenoPag não assina callbacks. O endpoint usa token secreto na URL HTTPS e consulta o status oficial antes de alterar o pagamento; o payload do webhook sozinho nunca confirma pagamento.
- Reversões posteriores (`contested`, `chargedback`, `refunded`) precisam continuar refletidas no sistema.
- A VenoPag informa que não existe sandbox público; testes E2E movimentam dinheiro real.

## Afiliados

`affiliate_gateway_profiles` associa UUID interno ao username VenoPag, percentual e ativação. As migrations `20261016011422_create_affiliate_gateway_profiles.sql` e `20261016011930_commission_ledger_unique_index_nonpartial.sql` estão aplicadas no Supabase `llmxnpgjpxcvyrqjkfwb`. O deploy do Worker não aplica migrations SQL automaticamente.

Ao cadastrar um afiliado no módulo financeiro, o sistema gera um código de indicação se ainda não houver um. O app mantém `?ref=CODIGO` durante o login/cadastro e envia o código ao criar o PIX. O backend valida o código, grava a relação direta sem sobrescrever atribuição anterior e percorre a cadeia de até três níveis. Os perfis VenoPag ativos são enviados como splits no Cash In. Sem relação/mapeamento ativo, não há split. Percentuais somados acima de 100% bloqueiam a cobrança antes de chamar o gateway. Pagamentos já emitidos não são alterados. A comissão esperada é registrada no ledger com chave única por pagamento/beneficiário/nível; a confirmação do webhook marca como paga e reversões posteriores revertem o ledger.

`VENO_WEBHOOK_SECRET` é enviado como token não adivinhável na URL cadastrada na cobrança; não registre a URL completa em logs. O username do split deve existir na VenoPag. A configuração do split não marca comissão contábil como paga e não dispara saques. O módulo não simula pagamentos nem registra liquidação sem confirmação financeira.

## Rotas protegidas

- `GET /api/admin/payments`
- `GET /api/admin/payments/gateway`
- `GET /api/admin/payments/affiliates`
- `PUT /api/admin/payments/affiliates/:userId`
- `GET /api/admin/payments/commissions`

Os registros E2E conhecidos permanecem no histórico e são excluídos dos indicadores financeiros. Receita aprovada considera ordens `PAID`; estornos, contestações e chargebacks são reversões, não receita positiva.