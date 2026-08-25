---
name: rls-invariant-suite
description: Use quando for criar ou revisar testes de isolamento RLS no Adeus Multa (DefesAi), ou quando uma mudança tocar schema/RLS/policy e precisar provar que dados de um tenant não vazam para outro. Também aciona ao escrever testes cross-tenant, provar Row Level Security, ou adicionar policy nova. É a receita canônica de invariante de banco com Supabase CLI local.
---

# Skill: Invariante RLS — Suíte Cross-Tenant (DefesAi)

## Por que esta skill existe

O Adeus Multa é **multi-tenant**: dados de casos, pagamentos (PIX) e documentos pertencem
a um usuário (tenant). RLS (Row Level Security) é a espinha de isolamento. **Hoje o projeto
tem 4+ migrations RLS mas ZERO teste real de isolamento cross-tenant** — RLS declarado,
não provado. Um bug aqui = vazamento de dado de pagamento/LGPD entre contas.

**Princípio:** RLS não é confiável porque "parece certo no migration" — é confiável porque
**provado**. Rede de segurança: seed de 2 tenants + controle positivo + esperar `0` no
cruzamento.

## Como subir o ambiente (Supabase CLI — não baseline)

O projeto **não é self-host** (sem `baseline.sql`): usa Supabase CLI via
`supabase/config.toml`. Portanto:

1. **Suba o Postgres local do Supabase CLI:**

   ```bash
   supabase start   # usa config.toml; sobe Postgres :54322, GoTrue, Storage
   ```

2. **Recupere a string de conexão** do banco (para `psql`/driver pg):

   ```bash
   supabase status   # mostra a URL do banco (ex.: postgresql://postgres:postgres@localhost:54322/postgres)
   ```

3. **Aplique as migrations** (schema + RLS já aplicados pelo start; se vazio, `supabase db reset`):

   ```bash
   supabase db reset   # reaplica todas as migrations desde o zero + seeds
   ```

4. **Rode a suíte** com a URL do banco em env. O teste conecta via `pg` e usa
   `set role authenticated` + `set_config('request.jwt.claims', ...)` para simular o usuário
   (mesmo caminho `auth.uid() → fn_user_org_ids()` das policies de produção).

5. **Sempre derrube** (trap EXIT): `supabase stop` — o container não pode ficar vivo.

## Receita estrutural de um teste de invariante RLS

Colabore em `tests/invariants/<domain>-rls.test.ts` (crie o dir se não existir).

### 1. Conexão via a URL do Supabase CLI

```ts
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.TEST_DB_URL }); // ex. postgres://postgres:postgres@localhost:54322/postgres
```

> Use `supabase status` para obter `TEST_DB_URL`. Não hardcode porta — Leia de env.

### 2. Simular JWT do tenant (o coração do padrão)

```ts
async function countAs(userId: string, query: string): Promise<number> {
  const r = await pool.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: userId }),
  ]);
  const q = await pool.query(query);
  return Number(q.rows[0]?.count ?? 0);
}
// cru para cada policy de produção: set role authenticated; set_config('request.jwt.claims', '{"sub":"<uuid>"}', false); <query>
```

### 3. Dois tenants + controle positivo

```ts
const TENANT_A = "aaaaaaaa-…"; // uuid fixo (namespace aaaa)
const TENANT_B = "bbbbbbbb-…"; // uuid fixo (namespace bbbb)

// seed idempotente (on conflict do nothing) — para AMBOS tenants
// cru: crossTenant = countAs(TENANT_A, "select count(*) from public.<tabela> where user_id = '<TENANT_B>'")
// esperar: crossTenant === 0   (controle positivo: ownRows >= 1)
```

**Regras:**

- UUIDs **fixos por namespace** (aaa/bbb) → seed idempotente e race-safe.
- **Zero PII real**: emails sintéticos `rls-*@invariant.test`, CPF fictício.
- Para cada tabela tenant-aware (`cases`, `payments`, `documents`, `ai_analyses`, …):
  `crossTenant(USER_A, "…where user_id='<TENANT_B>'") === 0` **E** `ownRows >= 1` (controle positivo).
- **Sanity do superuser**: `select count(distinct user_id) …` = 2 (prova que as linhas cruzadas existem de fato).

### 4. Testes por eixo (traduzir a spec da policy em predicado SQL)

- **Escopo próprio**: `agent não vê cases de outro user`.
- **RBAC**: `viewer NÃO pode inserir payment`, `admin pode deletar`, etc.
- **Erro RLS virando 0**: uma `write` violada (42501 / with-check) conta como **0 linhas
  afetadas** — não um throw. Use `writeCountAs()` com `with … returning` e conte.

```ts
async function writeCountAs(userId, sql) {
  // wrap: `with w as (<sql returning 1>) select count(*) from w`
  // erro RLS no stderr => retorna 0 (violação = bloqueado, é a prova)
}
```

## Onde cada assertion responde

| Pergunta de segurança              | Assertion                                                        |
| ---------------------------------- | ---------------------------------------------------------------- |
| Vaza?                              | `expect(crossTenant).toBe(0)`                                    |
| O seed realmente criou?            | `expect(ownRows).toBeGreaterThanOrEqual(1)`; sanity `distinct=2` |
| Policy de escrita respeita escopo? | `expect(writeCountAs(A, escrita-de-B)).toBe(0)`                  |
| Super-admin/atualização?           | literal de policy conforme spec                                  |

## Regras de manutenção (congelado)

- **Invariantes já criados são CONGELADOS**: adicione, não edite/delete. Edit = provável
  intenção de esconder vazamento.
- Se o invariante exigir schema novo → **migration nova**, não mexer no harness.
- O teste **não passa se `pgvector`/extensões faltarem** — `supabase start` já provisiona.
- CI gap twint: separar de `test` (que roda MSW/mock — não prova RLS). Criar script
  `test:db` que só roda a suíte invariante contra o Supabase local real.

## Anti-padrões

- ❌ Rodar só `bun test` e afirmar "RLS ok" (MSW não toca banco real) → **falso verde**
- ❌ Hardcodear `TEST_DB_URL` no teste (ler de env)
- ❌ Usar email/PII real de usuário
- ❌ Editar invariante para "passar" — o invariante é a prova do isolamento
- ❌ Mockar `pg` — o PONTO é exercitar o Postgres de verdade
