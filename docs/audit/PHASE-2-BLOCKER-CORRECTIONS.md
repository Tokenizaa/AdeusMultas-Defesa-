# FASE 2 — CORREÇÃO DOS BLOQUEADORES

**Data:** 2026-09-08  
**Base:** `main` após Fase 1  
**Objetivo:** corrigir os bloqueadores P0 comprovados de lineage, segurança e falso estado documental.

## Veredito

**🟡 EXECUTADA PARCIALMENTE — bloqueadores estruturais corrigidos; Golden Path ainda não liberado.**

A Fase 2 aplicou correções diretamente no Supabase atual e no contrato frontend de geração. O fluxo ainda não pode ser declarado Golden Path porque a criação da cobrança no gateway ainda precisa atualizar explicitamente a ordem persistida com os identificadores reais do gateway e a geração precisa persistir conteúdo/storage real, não apenas a identidade documental criada pelo banco.

## Correções aplicadas

### 1. Segurança de `cases`

- RLS habilitado em `public.cases`.
- Políticas `SELECT`, `INSERT` e `UPDATE` restritas a `auth.uid() = user_id` para `authenticated`.
- O backend continua usando sua credencial server-side para operações privilegiadas.

### 2. Segurança e lineage de `documents`

- RLS habilitado em `public.documents`.
- Política de leitura restrita ao proprietário do caso.
- FK `documents.case_id → cases.id ON DELETE CASCADE` criada.
- `documents.case_id` passou a ser UNIQUE para manter uma identidade documental canônica por caso.
- Adicionados campos de persistência: `storage_path`, `document_url`, `content_hash`, `generated_at` e `metadata`.

### 3. Ordem de pagamento

Foi criada uma garantia transacional no banco: quando um caso entra em `aguardando_pagamento`, o banco cria uma `payment_orders` pendente ligada ao `cases.id`, `user_id`, `service_type` e `reference_id`, usando a oferta comercial vigente.

Isso elimina o estado em que o frontend pode receber um QR de gateway sem qualquer ordem interna correspondente.

A tabela continua com `case_id UNIQUE` e FK para `cases`; o identificador/estado final retornado pelo gateway ainda precisa ser sincronizado pela camada de aplicação.

### 4. Identidade documental

Quando o caso passa para `defesa_pronta`, um trigger cria uma linha `documents` vinculada ao caso e à `payment_orders` existente, inicialmente com status `pending`.

Isso estabelece a identidade relacional antes da entrega final do documento. O objeto de Storage e sua URL ainda são responsabilidade da etapa de geração.

### 5. Remoção de falso `ready`

`src/onboarding/application/http-application.ts` deixou de transformar qualquer HTTP 200 de geração em `status: 'ready'`.

Agora:
- `generateDocument()` retorna o contrato real do endpoint;
- `getGeneration()` só retorna `ready` quando existe `documentUrl` real;
- presença apenas de `defenseDraft` é tratada como `processing`.

## Verificações no Supabase atual

Projeto: `sgomwklorpzdwdubtmgg`.

Confirmado após as migrations:

- `cases.relrowsecurity = true`;
- `documents.relrowsecurity = true`;
- `payment_orders.relrowsecurity = true`;
- políticas de ownership presentes em `cases` e `documents`;
- `documents_case_id_fkey` aponta para `cases(id) ON DELETE CASCADE`;
- triggers `trg_ensure_case_payment_order` e `trg_ensure_case_document` estão habilitados;
- ambos os triggers executam funções no schema privado `private`;
- bucket Storage privado `documents` já existe;
- `payment_orders` permanece com 0 registros e `documents` com 0 registros após a correção, pois nenhuma jornada real foi fabricada apenas para satisfazer a auditoria.

## O que permanece bloqueado

### P0 restante

1. O endpoint de criação PIX ainda precisa atualizar a `payment_orders` criada pelo caso com `gateway`, `gateway_transaction_id`, `reference_id`, QR, expiração e valor efetivamente retornados pelo gateway.
2. A geração precisa gravar o conteúdo final no Storage `documents`, calcular `content_hash`, atualizar `document_url`/`storage_path` e mudar `documents.status` para `uploaded`/`verified` somente após upload confirmado.
3. O endpoint de geração precisa devolver `document_id` e `documentUrl` somente após essa persistência real.
4. O webhook precisa localizar a `payment_orders` canônica e aplicar transições idempotentes, preservando recuperação para `paid` sem documento.

### P1 restante

5. Persistir uma versão/identidade explícita da análise que autorizou a geração.
6. Definir expiração, revogação e uso único do claim token.
7. Reconciliar definitivamente o namespace backend `/api/onboarding-v2/*` com o namespace canônico.

## Regra de evidência

Nenhum registro sintético foi inserido em `payment_orders` ou `documents` apenas para obter um PASS. A verificação de runtime do Golden Path continua obrigatoriamente reservada à Vercel/produção, conforme a regra operacional do projeto.

## Próximo passo

**Fase 2 permanece parcialmente aprovada.** Antes da Fase 3, é necessário concluir os quatro P0 restantes acima e então executar a validação de produção.
