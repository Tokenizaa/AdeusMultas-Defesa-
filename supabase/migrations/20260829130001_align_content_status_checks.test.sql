-- Test SQL for verifying CHECK constraint alignment
-- Manual verification queries for editorial_content.status vs content_versions.status
-- Run these manually to confirm constraint alignment

-- 1. Verify editorial_content.status CHECK constraint matches content_versions.status
SELECT 
  'editorial_content' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.editorial_content'::regclass
  AND contype = 'c'
  AND conname = 'editorial_content_status_check';

-- 2. Verify content_versions.status CHECK constraint
SELECT 
  'content_versions' as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.content_versions'::regclass
  AND contype = 'c'
  AND conname = 'content_versions_status_check';

-- 3. Test all 7 valid status values can be INSERTed into editorial_content
-- (Run each INSERT separately, then DELETE to clean up)
-- 
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-rascunho', 'Test Rascunho', 'instagram', 'carrossel', 'rascunho', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');
--
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-em_revisao', 'Test Em Revisao', 'instagram', 'carrossel', 'em_revisao', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');
--
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-aprovado_qualidade', 'Test Aprovado', 'instagram', 'carrossel', 'aprovado_qualidade', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');
--
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-reprovado_qualidade', 'Test Reprovado', 'instagram', 'carrossel', 'reprovado_qualidade', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');
--
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-agendado', 'Test Agendado', 'instagram', 'carrossel', 'agendado', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');
--
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-publicado', 'Test Publicado', 'instagram', 'carrossel', 'publicado', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');
--
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-arquivado', 'Test Arquivado', 'instagram', 'carrossel', 'arquivado', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');

-- 4. Verify invalid status is REJECTED
-- This should fail with CHECK constraint violation:
-- INSERT INTO public.editorial_content (id, title, channel, format, status, legal_theme, copy_text, hashtags, scheduled_date, estimated_reach, visual_prompt, author_agent, quality_review_score, audience)
-- VALUES ('test-invalid', 'Test Invalid', 'instagram', 'carrossel', 'invalid_status', 'Test Theme', 'Test copy', ARRAY['#test'], NOW(), 1000, 'Test prompt', '@test', 9.0, 'B2C');

-- 5. Clean up test data (run after successful inserts)
-- DELETE FROM public.editorial_content WHERE id LIKE 'test-%';

-- 6. Verify both tables now have identical status domains
WITH ec AS (
  SELECT unnest(string_to_array(
    regexp_replace(
      pg_get_constraintdef(oid),
      '.*status IN \(([^)]+)\).*',
      '\1'
    ),
    ','
  )) as status
  FROM pg_constraint
  WHERE conrelid = 'public.editorial_content'::regclass
    AND conname = 'editorial_content_status_check'
),
cv AS (
  SELECT unnest(string_to_array(
    regexp_replace(
      pg_get_constraintdef(oid),
      '.*status IN \(([^)]+)\).*',
      '\1'
    ),
    ','
  )) as status
  FROM pg_constraint
  WHERE conrelid = 'public.content_versions'::regclass
    AND conname = 'content_versions_status_check'
)
SELECT 
  'editorial_content' as table_name,
  array_agg(trim(status)) as allowed_statuses
FROM ec
UNION ALL
SELECT 
  'content_versions' as table_name,
  array_agg(trim(status)) as allowed_statuses
FROM cv;

-- Expected output: both tables show identical 7 statuses:
-- 'rascunho','em_revisao','aprovado_qualidade','reprovado_qualidade','agendado','publicado','arquivado'