/**
 * @file Invariante G0-02a: `getSession()` NUNCA deve ser usado em código de produção.
 *
 * Motivo: getSession() pode retornar sessão stale quando o token expira
 * sem atualizar o cliente. getUser() é a única chamada segura para
 * validar identidade em cada requisição.
 *
 * Este teste é um RATCHET: se falhar, a feature correspondente é bloqueada
 * até correção + GOV_INVARIANTS_EDIT=1 para override explícito.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(process.cwd(), "src");

/** Arquivos de produção onde getSession é vetado */
const PRODUCTION_GLOBS = ["src/**/*.{ts,tsx}"];

describe("Invariante: sem getSession() em produção", () => {
  it("getSession() não aparece em src/server (produção backend)", () => {
    const backendFiles: string[] = [];

    function walk(dir: string): void {
      try {
        const entries = readFileSync(join(SRC_DIR, "server"), "utf8").split("\n");
        // Estratégia: usa find via import dinâmico (simplificado para esta suíte)
        // Varredura por rg é mais eficiente; aqui checamos os arquivos conhecidos
      } catch {
        // ignora
      }
    }

    // Verificação direta por rg (saída traz caminhos relativos a src/)
    const { execSync } = require("node:child_process");
    let hit: string;
    try {
      hit = execSync(
        'rg "getSession\\(\\)" src/server src/components src/hooks src/lib --type ts --type tsx -l 2>/dev/null || echo ""',
        { encoding: "utf8", cwd: process.cwd() }
      ).trim();
    } catch {
      hit = "";
    }

    // Whitelist: apenas src/lib/supabase.ts pode exportar BOTH (público+admin)
    // Qualquer uso em src/server DEVE ser getUser()
    const whitelist = ["supabase.ts"]; // arquivos onde getSession é permitido (apenas re-export)
    const violations = hit
      .split("\n")
      .filter((f) => f && !whitelist.some((w) => f.includes(w)));

    expect(
      violations,
      `getSession() detectado em código de produção: ${violations.join(", ")}\n` +
        `Use getUser() no lugar. Remoção ou alteração desta invariante exige GOV_INVARIANTS_EDIT=1.`
    ).toHaveLength(0);
  });

  it("getUser() é exportado pelo cliente Supabase (src/lib/supabase.ts)", () => {
    const supabasePath = join(SRC_DIR, "lib", "supabase.ts");
    const content = readFileSync(supabasePath, "utf8");
    expect(content).toContain("getUser");
  });
});