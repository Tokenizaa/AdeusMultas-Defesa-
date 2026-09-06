-- FASE 1.3: baseline de segurança para storage.objects.
-- Princípio: acesso privado por padrão; marketing-assets é o único bucket público.

DROP POLICY IF EXISTS "Public read marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin insert marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin update marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete marketing assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin read ai policy assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin read lgpd exports" ON storage.objects;
DROP POLICY IF EXISTS "Admin read skill assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin read whatsapp media" ON storage.objects;

CREATE POLICY "Public read marketing assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'marketing-assets');

CREATE POLICY "Admin insert marketing assets"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'marketing-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin update marketing assets"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'marketing-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'marketing-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin delete marketing assets"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'marketing-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin read ai policy assets"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'ai-policy'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin read lgpd exports"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'lgpd-exports'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin read skill assets"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'skill-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admin read whatsapp media"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
