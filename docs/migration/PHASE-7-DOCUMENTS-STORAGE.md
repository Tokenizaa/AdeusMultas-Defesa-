# Fase 7 — Documents / Storage

Data: 2026-09-14

## Escopo

Migrar a geração e persistência do documento final para Cloudflare Worker + Supabase Storage, sem depender do backend Vercel.

## Implementação

- bucket privado `case-documents` no Supabase Storage;
- `POST /api/documents/:caseId/generate` no Worker;
- geração de PDF mínima e determinística no runtime Cloudflare, sem dependência de Express/Vercel;
- documento condicionado a `cases.is_paid = true`;
- persistência em `public.documents`;
- SHA-256 do PDF usado como identificador imutável do objeto;
- metadata de storage, MIME, tamanho, hash e timestamp persistida;
- URL de download assinada por 1 hora;
- `GET /api/documents/:id` com autorização pelo proprietário/admin;
- evento `case.document.generated` persistido em `platform_events`;
- reexecução do mesmo caso reutiliza o registro lógico e o mesmo objeto quando o conteúdo não muda.

## Banco

Migration `phase_7_case_documents_storage`:

- cria/atualiza bucket privado `case-documents`;
- adiciona `storage_path`, `mime_type`, `size_bytes`, `content_hash` e `generated_at` em `documents`;
- cria índices de caso e caminho de storage.

## Testes

`cloudflare/routes/documents.test.ts` valida:

1. geração de um PDF;
2. persistência lógica do documento;
3. armazenamento como `application/pdf`;
4. caminho baseado em UUID do caso + SHA-256;
5. retorno de URL assinada.

## Gate

A implementação está **RUNTIME CONCLUÍDO — GATE PENDENTE** até uma prova real no ambiente Cloudflare com um caso pago, verificando:

1. geração do PDF;
2. objeto existente no bucket privado `case-documents`;
3. registro correspondente em `documents`;
4. download pela URL assinada;
5. hash persistido igual ao conteúdo armazenado;
6. evento `case.document.generated` persistido;
7. ausência de chamada ao Vercel.

Não é necessário PagBank real para executar este gate: pode ser utilizado um caso já marcado como pago no ambiente de homologação, sem alterar o estado comercial do caso.
