/**
 * @file Invariante G0-02c: Nenhuma chave secreta crua no .env.example.
 *
 * .env.example só deve conter NOMES de variáveis, nunca valores reais.
 * Supabase anon/public keys estão OK em exemplo (são públicas por design).
 * Chaves proibidas: service_role, JWT secret, PagBank token, Meta secret, Stripe secret key,
 * Evolution API key, API keys de provedores LLM.
 *
 * RATCHET: se valor secreto aparecer no .env.example, CI falha e feature é bloqueada.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENV_EXAMPLE = join(process.cwd(), ".env.example");

// Chaves cujo valor NÃO pode aparecer com valor preenchido em .env.example
const PROHIBITED_SECRET_PATTERNS = [
  // Padrão genérico: chave com valor = algo que não é placeholder
  /^(PAGBANK_TOKEN|PAGBANK_SECRET|META_APP_SECRET|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|EVOLUTION_API_KEY|EVOLUTION_API_SECRET|OPENAI_API_KEY|ANTHROPIC_API_KEY|NVIDIA_API_KEY|NINEROUTER_KEY|GEMINI_API_KEY|SENDGRID_API_KEY|RESEND_API_KEY|FIREBASE_ADMIN_KEY|JWT_SECRET|SESSION_SECRET)\s*=\s*[^=\n]+$/im,
  // Qualquer valor que NÃO seja placeholder: letras e números, não apenas ${...} ou <...> ou YOUR_*
  /^(?!.*(=.*(\$\{|\<|YOUR_|CHANGE_ME|REPLACE_|TODO_|sk_test_|sk_live_|placeholder|example|xxxx|blank|changeme)))[A-Z_]+(?:_KEY|_SECRET|_TOKEN|_PASSWORD)\s*=\s*\S+/im,
];

describe("Invariante: .env.example sem segredos reais", () => {
  it(".env.example não contém chaves proibidas com valores preenchidos", () => {
    try {
      const content = readFileSync(ENV_EXAMPLE, "utf8");
      const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

      const violations: string[] = [];
      for (const line of lines) {
        // Ignora linhas sem = (comentários técnicos)
        if (!line.includes("=")) continue;
        const [keyRaw] = line.split("=");
        const key = keyRaw.trim().toUpperCase();

        // Allowlist: anon key e public keys são públicas
        const isPublicKey = key.includes("ANON_KEY") || key.includes("PUBLIC_KEY");

        // Detect patterns
        const isSecretKey =
          /_SECRET$|_SECRET_KEY$|_TOKEN$|_PASSWORD$/i.test(key) ||
          [
            "PAGBANK_TOKEN",
            "META_APP_SECRET",
            "EVOLUTION_API_KEY",
            "STRIPE_SECRET_KEY",
          ].includes(key);

        if (isSecretKey && !isPublicKey) {
          violations.push(`Chave suspeita em .env.example: ${keyRaw.trim()}`);
        }
      }

      expect(
        violations,
        `Suspeita de segredo em .env.example:\n${violations.map((v) => "  - " + v).join("\n")}\n` +
          "Valores reais pertencem apenas ao gestor de secrets do provedor (Vercel env / Supabase secrets).\n" +
          "Override exige GOV_INVARIANTS_EDIT=1."
      ).toHaveLength(0);
    } catch (e: any) {
      // Arquivo não existe: considerar erro bloqueante
      expect(
        false,
        `.env.example não encontrado em ${ENV_EXAMPLE}.\n` +
          "Crie o arquivo com placeholders de todas as variáveis de ambiente."
      ).toBe(true);
    }
  });

  it(".env (o arquivo REAL) está em .gitignore", () => {
    const gitignorePath = join(process.cwd(), ".gitignore");
    try {
      const gi = readFileSync(gitignorePath, "utf8");
      const hasEnvIgnore = /^\.env(\/|$|\s)/m.test(gi) || gi.includes(".env");
      expect(
        hasEnvIgnore,
        "'.env' não está em .gitignore — segredos locais podem ser commitados por engano."
      ).toBe(true);
    } catch {
      expect(false, ".gitignore não encontrado.").toBe(true);
    }
  });
});