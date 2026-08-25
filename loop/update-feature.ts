#!/usr/bin/env node
/**
 * Atualiza uma feature em plan/features.json.
 *
 * Uso:
 *   node loop/update-feature.ts --id <FEATURE-ID> --passes true \
 *     --verification '{"verdict":"PASS","by":"gov-verifier","at":"<ISO>","commit":"<sha>"}'
 *
 * Proteção: só altera `passes` e `verification` — nunca toca acceptance, title,
 * priority, depends_on, kind, phase ou estrutura do array.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function printHelp(): never {
  console.error(
    "Uso: node loop/update-feature.ts --id <ID> --passes true|false [--verification '<JSON>']"
  );
  process.exit(2);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) printHelp();

  let id: string | null = null;
  let passes: boolean | null = null;
  let verification: Record<string, unknown> | null = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--id" && args[i + 1]) {
      id = args[++i];
    } else if (a === "--passes" && args[i + 1]) {
      const v = args[++i];
      if (v === "true") passes = true;
      else if (v === "false") passes = false;
      else printHelp();
    } else if (a === "--verification" && args[i + 1]) {
      try {
        verification = JSON.parse(args[++i]);
      } catch {
        console.error("--verification: JSON inválido");
        process.exit(2);
      }
    } else if (a === "--help" || a === "-h") {
      printHelp();
    }
  }

  if (!id || passes === null) printHelp();

  const featuresPath = resolve(process.cwd(), "plan/features.json");
  const raw = readFileSync(featuresPath, "utf8");
  const data = JSON.parse(raw) as { features: unknown[] };

  const idx = data.features.findIndex(
    (f: Record<string, unknown>) => f.id === id
  );
  if (idx === -1) {
    console.error(`Feature "${id}" não encontrada em plan/features.json`);
    process.exit(1);
  }

  // Atualiza apenas campos permitidos
  (data.features[idx] as Record<string, unknown>).passes = passes;
  if (verification) {
    (data.features[idx] as Record<string, Record<string, unknown>>).verification =
      verification;
  }

  writeFileSync(featuresPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(
    JSON.stringify(
      { id, passes, verification },
      null,
      2
    )
  );
}

main();