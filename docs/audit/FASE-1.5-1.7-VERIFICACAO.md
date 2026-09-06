# FASE 1.5–1.7 — Verificação Storage

## FASE 1.5 — Validação de arquivos

**Resultado: VERIFIED**

Evidências no Supabase real (`llmxnpgjpxcvyrqjkfwb`):

- `marketing-assets`: público, 50 MiB, allowlist `image/png`, `image/jpeg`, `image/webp`, `video/mp4`.
- `ai-policy`: privado, 20 MiB, allowlist PDF/Markdown/TXT.
- `lgpd-exports`: privado, 50 MiB, allowlist PDF/JSON.
- `skill-assets`: privado, 5 MiB, MIME irrestrito por configuração; acesso autenticado de leitura limitado a admin.
- `whatsapp-media`: privado, 50 MiB, MIME irrestrito por configuração; acesso autenticado de leitura limitado a admin.
- Os 8 objetos existentes estão exclusivamente em `marketing-assets`.
- Os 8 objetos estão dentro da allowlist do bucket e não apresentam nomes inválidos, traversal, caminhos absolutos ou segmentos `..`.

A ausência de fluxo de upload de usuário no código atual impede atribuir ao cliente controle direto sobre MIME/path. O Storage continua sendo a segunda camada de enforcement. A validação segue allowlist onde o bucket possui tipos definidos.

## FASE 1.6 — Correções

**Resultado: VERIFIED / sem correção adicional necessária.**

Não foi aplicada alteração arbitrária aos buckets `skill-assets` e `whatsapp-media`, pois seus MIME types não foram reduzidos sem evidência de um contrato funcional que justificasse a restrição. Ambos permanecem privados e sem política de leitura para usuários comuns.

## FASE 1.7 — Download / acesso

**Resultado: VERIFIED quanto ao controle de acesso configurado.**

Policies reais em `storage.objects`:

- `marketing-assets`: leitura pública, coerente com o bucket público.
- escrita/update/delete em `marketing-assets`: somente `authenticated` com `user_profiles.role = admin`.
- `ai-policy`, `lgpd-exports`, `skill-assets`, `whatsapp-media`: leitura somente para `authenticated` com papel admin.
- Não existe policy de leitura para usuário autenticado comum nos buckets privados.
- Service role permanece como caminho backend privilegiado e não depende de policies de usuário.

Não há atualmente evidência de fluxo público de download de objetos privados por usuário final que possa ser testado como uma funcionalidade existente. Portanto não foi inventado um fluxo nem uma policy de acesso que ampliasse a superfície.

## Conclusão

As subfases 1.5, 1.6 e 1.7 foram verificadas contra o estado real do Storage. Nenhum bloqueador crítico permanece nesta parte da FASE 1.

Fontes de referência de segurança: OWASP File Upload Cheat Sheet e documentação oficial do Supabase Storage.