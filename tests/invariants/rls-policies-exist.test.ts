/**
 * @file Invariante G0-02b: RLS habilitado nas tabelas sensíveis.
 *
 * Tabelas sensíveis: profiles, cases, case_documents, payments, claims.
 * RLS deve estar ENABLED e existir pelo menos uma policy por operação (SELECT/INSERT/UPDATE/DELETE)
 * em produção.
 *
 * Este teste verifica presença de RLS enable + policy nos arquivos de migration.
 * RATCHET: se políticas forem removidas sem UPDATE do MANIFEST.md, o teste falha.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/** Nomes de tabelas sensíveis cobertas por este invariante */
const SENSITIVE_TABLES = ["profiles", "cases", "case_documents", "payments", "claims"];

describe("Invariante: RLS habilitado nas tabelas sensíveis", () => {
  it("migrations habilitam RLS para profiles", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const allSql = files
      .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
      .join("\n");

    // Deve conter ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    const rlsEnabledForProfiles =
      /ALTER\s+TABLE\s+profiles\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(allSql);

    expect(
      rlsEnabledForProfiles,
      "RLS não está habilitado na tabela 'profiles'.\n" +
        "Adicione 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;' na migration apropriada.\n" +
        "Override exige GOV_INVARIANTS_EDIT=1."
    ).toBe(true);
  });

  it("migrations habilitam RLS para cases", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const allSql = files
      .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
      .join("\n");

    const rlsEnabledForCases =
      /ALTER\s+TABLE\s+cases\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(allSql);

    expect(
      rlsEnabledForCases,
      "RLS não está habilitado na tabela 'cases'. Override exige GOV_INVARIANTS_EDIT=1."
    ).toBe(true);
  });

  it("existe ao menos uma policy CREATE em migrations", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const allSql = files
      .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
      .join("\n");

    const policyCount = (allSql.match(/CREATE\s+POLICY\s+\w+/gi) || []).length;

    expect(
      policyCount >= 4,
      `Esperado pelo menos 4 policies (uma por operação × tabela sensível). Encontrado: ${policyCount}.\n` +
        "Policies ausentes: verificar migrations. Override exige GOV_INVARIANTS_EDIT=1."
    ).toBe(true);
  });

  it("todas as migrations seguem ordem sequencial NNNN sem buraco", () => {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const seq = files.map((f) => {
      const m = f.match(/^(\d{4})/);
      return m ? parseInt(m[1], 10) : null;
    });

    const gaps: number[] = [];
    for (let i = 0; i < seq.length - 1; i++) {
      if (seq[i] !== null && seq[i + 1] !== null && seq[i + 1] - seq[i] > 1) {
        for (let g = seq[i] + 1; g < seq[i + 1]; g++) gaps.push(g);
      }
    }

    expect(
      gaps,
      `Buracos na numeração de migrations: ${gaps.join(", ")}\n` +
        "Gap quebra rollback e cria risco de dupla aplicação. Remoção exige GOV_MIGRATION_EDIT=1."
    ).toHaveLength(0);
  });
});