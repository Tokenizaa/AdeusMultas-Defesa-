-- FASE 12.3: Criar função RPC match_knowledge_chunks para retrieval cross-process
-- Esta função é essencial para que o VectorStore consulte pgvector via RPC
-- em processos separados (cross-process retrieval).
-- Baseada na function canônica do baseline llmxnpgjpxcvyrqjkfwb (2026-09-23).

-- Função match_knowledge_chunks para busca vetorial no pgvector
-- Parâmetros:
--   query_embedding: vetor de consulta (vector)
--   match_threshold: threshold de similaridade (default 0.45)
--   match_count: número máximo de resultados (default 20)
--   filter_source_id: filtro opcional por source_id
--   filter_document_type: filtro opcional por document_type
--   filter_jurisdiction: filtro opcional por jurisdição
-- Retorna: TABLE com chunk_id, document_id, document_title, document_type, version,
--   source_id, source_name, authority, heading, article_number, content, similarity, metadata

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    query_embedding vector,
    match_threshold double precision DEFAULT 0.45,
    match_count integer DEFAULT 20,
    filter_source_id text DEFAULT NULL::text,
    filter_document_type text DEFAULT NULL::text,
    filter_jurisdiction text DEFAULT NULL::text
)
RETURNS TABLE(
    chunk_id text,
    document_id text,
    document_title text,
    document_type text,
    version text,
    source_id text,
    source_name text,
    authority text,
    heading text,
    article_number text,
    content text,
    similarity double precision,
    metadata jsonb
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS chunk_id,
        d.id AS document_id,
        d.title AS document_title,
        c.document_type,
        v.version,
        s.id AS source_id,
        s.name AS source_name,
        s.authority,
        c.heading,
        c.article_number,
        c.content,
        1 - (e.embedding <=> query_embedding) AS similarity,
        c.metadata
    FROM public.knowledge_embeddings e
    JOIN public.knowledge_chunks c ON c.id = e.chunk_id
    JOIN public.knowledge_document_versions v ON v.id = c.document_version_id
    JOIN public.knowledge_documents d ON d.id = c.document_id
    JOIN public.knowledge_sources s ON s.id = c.source_id
    WHERE (1 - (e.embedding <=> query_embedding)) >= match_threshold
      AND (filter_source_id IS NULL OR c.source_id = filter_source_id)
      AND (filter_document_type IS NULL OR c.document_type = filter_document_type)
      AND (filter_jurisdiction IS NULL OR c.jurisdiction = filter_jurisdiction)
      AND d.status = 'ACTIVE'
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Grant execute to service_role (used by Cloudflare Worker)
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks(vector, double precision, integer, text, text, text) TO service_role;

-- Comment for documentation
COMMENT ON FUNCTION public.match_knowledge_chunks(vector, double precision, integer, text, text, text) IS
'FASE 12.3: RPC para busca vetorial cross-process no pgvector. Usado pelo VectorStore do Cloudflare Worker para retrieval RAG persistido. FASE 12.3.';