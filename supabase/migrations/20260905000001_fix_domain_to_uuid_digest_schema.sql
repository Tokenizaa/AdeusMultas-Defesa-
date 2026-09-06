-- FASE 1.2 REPRODUTIBILIDADE: corrigir resolução do digest() no Supabase.
--
-- pgcrypto está instalado no schema `extensions` neste projeto Supabase.
-- A versão anterior chamava digest() sem qualificação, o que pode falhar
-- dependendo do search_path do ambiente.
--
-- A função é recriada de forma idempotente usando extensions.digest().

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.domain_to_uuid(domain_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    ns_hex TEXT := '6f0a9d2e8c474b3a9f15d7e0b2c4a681';
    ns_raw BYTEA;
    name_raw BYTEA;
    sha_bytes BYTEA;
    versioned BYTEA;
    result TEXT;
BEGIN
    ns_raw := decode(ns_hex, 'hex');
    name_raw := domain_id::BYTEA;
    sha_bytes := extensions.digest(ns_raw || name_raw, 'sha1');
    versioned := substring(sha_bytes, 1, 16);
    versioned := set_byte(versioned, 6, (get_byte(versioned, 6) & 15) | 80);
    versioned := set_byte(versioned, 8, (get_byte(versioned, 8) & 63) | 128);
    result := encode(versioned, 'hex');
    RETURN substr(result, 1, 8) || '-' ||
           substr(result, 9, 4) || '-' ||
           substr(result, 13, 4) || '-' ||
           substr(result, 17, 4) || '-' ||
           substr(result, 21);
END;
$$;
