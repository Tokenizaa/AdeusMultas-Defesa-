# FASE 8 — Auditoria dos Documentos Recuperados

**Data:** 2026-09-24 | **Natureza:** auditoria exclusiva dos 2 PDFs recuperados (escopo fechado — sem raspagem, sem nova recuperação, sem análise de cobertura).

## Commit-base

```
49a2d34a879dc46f6ab757359fac9adb5e5770cf  (HEAD = origin/main)
```

## Arquivos auditados

1. `legal_collected_2026_09_23/federal/contran_res_796_2020_recuperado.pdf`
2. `legal_collected_2026_09_23/states/AM/memo_753_2026_recuperado.pdf`

## Resultado individual

| Verificação | CONTRAN 796/2020 | Memo 753/2026 AM |
|---|---|---|
| 1. Existência física | ✅ existe (84350 B) | ✅ existe (284405 B) |
| 2. Tamanho | ✅ 84350 | ✅ 284405 |
| 3. `file` | ✅ PDF 1.4, 2 páginas | ✅ PDF 1.7, 2 páginas |
| 4. Magic bytes `%PDF-` | ✅ `25 50 44 46 2d` | ✅ `25 50 44 46 2d` |
| 5. Não é HTML/JSON/erro | ✅ inicia com objetos PDF reais (`1 0 obj`) | ✅ inicia com objetos PDF reais; metadado `/Author` |
| 6. SHA-256 calculado | `5bc7bade164377fce6abe301b8ae59a7de7a008598c3011a7fe6cb177fdd0c1d` | `59b023ada37e71cdb21c2ed4be9dca59ec2c5cf54323f0e2c1f001deb8434439` |
| 7. SHA-256 esperado | `5bc7bade164377fce6abe301b8ae59a7de7a008598c3011a7fe6cb177fdd0c1d` ✅ igual | `59b023ada37e71cdb21c2ed4be9dca59ec2c5cf54323f0e2c1f001deb8434439` ✅ igual |
| 8. Referência no inventário | ✅ linha `SRC_FED_CONTRAN_796_2020_RECUPERADO` (hash + caminho corretos) | ✅ linha `SRC_AM_MEMO_753_2026_RECUPERADO` (hash + caminho corretos) |
| 9. Conteúdo PDF válido/legível | ✅ estrutura PDF íntegra (pdftotext indisponível no ambiente; validação por estrutura de objetos reais) | ✅ idem, com metadado autoral |
| 10. Divergências | nenhuma | nenhuma |

## Classificação

- `CONTRAN 796/2020` → **VALIDO_RECUPERADO**
- `Memo 753/2026 AM` → **VALIDO_RECUPERADO**

## Conclusão geral

Os 2 documentos recuperados passaram em todas as verificações (existência, tamanho, MIME/file, magic bytes, ausência de payload de erro, SHA-256 idêntico ao registrado, referência correta no inventário e conteúdo PDF íntegro). Nenhuma divergência encontrada entre hash calculado e hash registrado.

## Preservação das evidências inválidas

Confirmado — os payloads da tentativa original permanecem intocados:

- `legal_collected_2026_09_23/federal/contran_res_796_2020.pdf` — 26 B (JSON `{"error_type":"NotFound"}`) ✅ preservado
- `legal_collected_2026_09_23/states/AM/memo_753_2026_opttran_detran.pdf` — 248529 B (HTML de erro) ✅ preservado

Nenhum arquivo foi modificado, substituído, renomeado ou apagado nesta auditoria. Nenhuma classificação de UF foi alterada.