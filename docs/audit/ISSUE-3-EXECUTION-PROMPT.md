# ISSUE #3 — EXECUÇÃO CIRÚRGICA P0

## Objetivo

Corrigir somente:

1. incompatibilidade `user_profiles.id` vs `user_profiles.user_id`;
2. fallback de dados fictícios na criação de PIX/cartão.

Não alterar schema Supabase.
Não refatorar arquitetura.
Não alterar gateway/webhook.
Não iniciar outra issue.

## Evidência

O schema real de `public.user_profiles` possui `user_id uuid` e não possui `id`.

`src/server/routes/admin.ts` atualmente consulta:

```ts
.from('user_profiles')
.select('id, email, name, role, cpf, created_at, updated_at')
```

E o PUT usa o identificador retornado para localizar o perfil.

`src/server/routes/payments.ts` atualmente cria PIX com:

```ts
payer: {
  name: customerName || 'Condutor DefesAi',
  email: customerEmail || 'contato@www.defesai.shop',
  document: (customerCpf || '12345678909').replace(/\D/g, ''),
}
```

O mesmo padrão de fallback fictício existe no caminho de cartão de crédito.

## Correção 1 — admin users

Arquivo:

`src/server/routes/admin.ts`

Alterar somente o necessário:

- trocar `id` por `user_id` nas consultas de `user_profiles`;
- quando a resposta pública da API precisar do campo `id`, mapear explicitamente `user_id -> id` no DTO, sem alterar o banco;
- qualquer `.eq('id', ...)` sobre `user_profiles` deve virar `.eq('user_id', ...)`;
- manter `email`, `name`, `role`, `cpf`, `created_at`, `updated_at`.

Não criar coluna `id`.

## Correção 2 — PIX fail-closed

Arquivo:

`src/server/routes/payments.ts`

Na rota:

```text
POST /pagbank/orders
POST /pix/create
```

Antes de `gateway.createPix()`:

- `customerName` obrigatório;
- `customerEmail` obrigatório e com validação mínima de formato;
- `customerCpf` obrigatório após normalização, com 11 dígitos;
- se qualquer dado estiver ausente/inválido → HTTP 400;
- não chamar o gateway quando a validação falhar;
- remover os três fallbacks fictícios.

Usar somente os dados fornecidos pelo cliente/caso.

Não usar outro dado sintético como substituto.

## Correção 3 — cartão de crédito

Na rota:

```text
POST /credit-card/create
```

Aplicar a mesma regra aos dados do `customer` enviados para PagBank:

- nome obrigatório;
- email obrigatório e minimamente válido;
- CPF obrigatório e normalizado com 11 dígitos;
- ausência/invalidez → HTTP 400;
- nenhuma chamada ao gateway quando inválido;
- remover fallback fictício.

## Validação de CPF

Não criar uma nova biblioteca.

Se já existir helper de CPF no projeto, reutilizar.

Se não existir, nesta fase validar somente presença + normalização + 11 dígitos. Não criar regra adicional de negócio.

## Testes P0

Criar testes unitários/rota seguindo o padrão de testes já existente.

### Admin

1. GET `/admin/users` não gera `42703`.
2. Consulta usa `user_id`.
3. PUT de role atualiza o perfil pelo `user_id`.
4. Resposta continua compatível com a UI.

### PIX

5. ausência de `customerName` → 400.
6. ausência de `customerEmail` → 400.
7. email inválido → 400.
8. ausência de `customerCpf` → 400.
9. CPF com quantidade inválida de dígitos → 400.
10. dados válidos → gateway é chamado com exatamente os dados fornecidos.
11. nenhum fallback contém `Condutor DefesAi`.
12. nenhum fallback contém `contato@www.defesai.shop`.
13. nenhum fallback contém `12345678909`.
14. gateway não é chamado quando os dados são inválidos.

### Cartão

15. mesmos testes 5–14 para `POST /credit-card/create`, exceto a regra específica de gateway.

## Teste adversarial obrigatório

Mockar `gateway.createPix` e enviar payload sem nome/email/CPF.

Esperado:

```text
HTTP 400
createPix NÃO chamado
```

Mockar `pagBankIntegration.createCreditCardOrder` e enviar payload incompleto.

Esperado:

```text
HTTP 400
createCreditCardOrder NÃO chamado
```

## Gates

Executar:

```bash
npm run test:unit
npm run lint
npx tsc --noEmit
npm run build
```

Não modificar testes existentes apenas para fazê-los passar.

## Commit

Um único commit:

```text
fix(admin,payments): enforce real user identity and fail-closed payer data
```

Push para `main`.

## Critério de conclusão

Só fechar a Issue #3 se:

- `user_profiles` não referenciar mais `id` inexistente;
- nenhum fallback fictício for enviado ao gateway;
- payload incompleto falhar antes da chamada externa;
- testes P0 passarem;
- unit/lint/tsc/build passarem;
- working tree limpo;
- SHA completo do commit informado.
