---
name: supabase-repository-pattern
description: Use quando criar, modificar ou revisar repositórios de dados no Adeus Multa (DefesAi) — qualquer arquivo em src/repositories/ ou camada de acesso a dados Supabase. Garante o padrão canônico: client Supabase + Mapper.toDomain na borda + throwo erro + filtro por owner. Aciona ao escrever query SQL no cliente Supabase, criar repositório novo, ou revisar um existente.
---

# Skill: Padrão de Repository Supabase (DefesAi)

## Por que este padrão

O projeto isola o acesso a dados em `src/repositories/*.ts`. Cada repositório:

1. **Importa** o client canônico `supabase` de `@/integrations/supabase/client`.
2. **Recebe/queries models de domínio** (`src/domain/**/*.model.ts`) via Mapper.
3. **Cria retorna** `Model` de domínio — **nunca** linha crua da tabela.

Repositório = tradução **tabela ↔ domínio**; regra de negócio não vive aqui (vive no domain/feature).

## Template canônico

```ts
import { supabase } from "@/integrations/supabase/client";
import type { OrderModel } from "@/domain/order/order.model";
import { OrderMapper } from "@/domain/order/order.mapper";

class OrderRepository {
  async findAll(): Promise<OrderModel[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data?.map(OrderMapper.toDomain) ?? [];
  }

  async findById(id: string): Promise<OrderModel | null> {
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle(); // null se não achar — nunca .single() cru
    if (error) throw error;
    return data ? OrderMapper.toDomain(data) : null;
  }

  async findByOwner(ownerId: string): Promise<OrderModel[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", ownerId) // ❗ sempre filtra pelo owner se tabela tenant-aware
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data?.map(OrderMapper.toDomain) ?? [];
  }

  async create(data: Omit<OrderModel, "id" | "createdAt" | "updatedAt">): Promise<OrderModel> {
    const { data: row, error } = await supabase
      .from("orders")
      .insert(OrderMapper.toInsert(data))
      .select()
      .single();
    if (error) throw error;
    return OrderMapper.toDomain(row);
  }
}

export const orderRepository = new OrderRepository();
```

## Padrões/anti-padrões

**Sempre:**

- `error` checado e `throw` (nunca `return data` ignorando `error`).
- Filtro por **owner** (`.eq("user_id", …)` / `.eq("organization_id", …)`) em query tenant-aware.
- Usar `.maybeSingle()` p/ busca por chave única (null se ausente); `.single()` só quando tem
  certeza absoluta.
- Retornar **`Mapper.toDomain`** p/ cada row — a fronteira agora é o Mapper, não supabase.
- Exportar **singleton** `export const xRepository = new XRepository()`.
- Nome do método descreve intenção (ex.: `findActiveByUserId`), seleciona só colunas necessárias via relations (`*` em casos usa `select("*, vehicle:vehicle_id(*), infractions(*)")`).

**Nunca:**

- ❌ Retornar linha crua do Supabase no return público.
- ❌ `if (error) { console.log(error); return null; }` — erro que esconde é bug silencioso.
- ❌ Query sem filtro de owner em tabela com `user_id`/`organization_id` (vaza dados cross-tenant).
- ❌ Lógica de negócio dentro do repository (só tradução).

## Como criar um repositório novo

1. **Crie o Model de domínio** em `src/domain/<entidade>/<entidade>.model.ts` (se não existe).
2. **Crie o Mapper** (`<entidade>.mapper.ts`): `toDomain(row)`, `toInsert(entity)`.
3. **Crie `<entidade>.repository.ts`** seguindo o template — importa `supabase` + model + mapper.
4. **Exporte** instância singleton.
5. **Teste** (`<entidade>.repository.test.ts`) — veja a seção Testes.

## Testar repositório

- Prefira **integração com Supabase local real** (rls-invariant-suite) quando a rota envolve RLS.
- Para lógica pura (mapper), teste direto.
- Use `tests/integration/` (MSW) para contratos de API, **não** para RLS (não toca Postgres).

## Referência no repo

- `src/repositories/case.repository.ts` (join + `?`)
- `src/repositories/payment.repository.ts` (findByCaseId/findByUserId)
- `src/repositories/journey*.repository.ts` (write + read)
