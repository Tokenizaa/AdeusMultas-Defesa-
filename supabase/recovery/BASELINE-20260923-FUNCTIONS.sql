-- BASELINE FUNCTIONS — 2026-09-23
-- Source: canonical Supabase project llmxnpgjpxcvyrqjkfwb
-- Scope: application-defined public functions only.
-- Extension-owned vector/citext functions are intentionally excluded.
-- CURRENT STATE ONLY. Do not replay historical migrations blindly.

CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(query_embedding vector, match_threshold double precision DEFAULT 0.45, match_count integer DEFAULT 20, filter_source_id text DEFAULT NULL::text, filter_document_type text DEFAULT NULL::text, filter_jurisdiction text DEFAULT NULL::text)
 RETURNS TABLE(chunk_id text, document_id text, document_title text, document_type text, version text, source_id text, source_name text, authority text, heading text, article_number text, content text, similarity double precision, metadata jsonb)
 LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
 RETURN QUERY
 SELECT c.id,d.id,d.title,d.document_type,v.version,s.id,s.name,s.authority,c.heading,c.article_number,c.content,1-(e.embedding <=> query_embedding),c.metadata
 FROM public.knowledge_embeddings e
 JOIN public.knowledge_chunks c ON c.id=e.chunk_id
 JOIN public.knowledge_document_versions v ON v.id=c.document_version_id
 JOIN public.knowledge_documents d ON d.id=c.document_id
 JOIN public.knowledge_sources s ON s.id=c.source_id
 WHERE (1-(e.embedding <=> query_embedding)) >= match_threshold
 AND (filter_source_id IS NULL OR c.source_id=filter_source_id)
 AND (filter_document_type IS NULL OR c.document_type=filter_document_type)
 AND (filter_jurisdiction IS NULL OR c.jurisdiction=filter_jurisdiction)
 AND d.status='ACTIVE'
 ORDER BY similarity DESC LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.emit_event(p_event_type text,p_aggregate_type text DEFAULT NULL::text,p_aggregate_id text DEFAULT NULL::text,p_user_id uuid DEFAULT NULL::uuid,p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id UUID;
BEGIN
 INSERT INTO public.platform_events(event_type,aggregate_type,aggregate_id,user_id,payload)
 VALUES(p_event_type,p_aggregate_type,p_aggregate_id,p_user_id,p_payload) RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT auth.uid(); $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $function$
DECLARE desired_role text:=NEW.raw_user_meta_data->>'role'; final_role user_role:='citizen';
BEGIN
 IF desired_role IN ('citizen','admin') THEN final_role:=desired_role::user_role; END IF;
 INSERT INTO public.user_profiles(user_id,email,name,role)
 VALUES(NEW.id,NEW.email,COALESCE(NEW.raw_user_meta_data->>'name',NEW.email),final_role);
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_user_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 UPDATE public.user_profiles SET name=COALESCE(NEW.raw_user_meta_data->>'name',name),phone=COALESCE(NEW.raw_user_meta_data->>'phone',phone),email=COALESCE(NEW.email,email),updated_at=NOW()
 WHERE user_id=NEW.id;
 RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $function$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id uuid,new_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 UPDATE public.user_profiles SET role=new_role,updated_at=NOW() WHERE id=target_user_id;
 UPDATE auth.users SET raw_user_meta_data=jsonb_set(COALESCE(raw_user_meta_data,'{}'::jsonb),'{role}',to_jsonb(new_role)) WHERE id=target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role_by_email(target_user_email text,new_role text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE target_user_id UUID; result_json JSON;
BEGIN
 SELECT id INTO target_user_id FROM public.user_profiles WHERE email=target_user_email LIMIT 1;
 IF target_user_id IS NULL THEN SELECT id INTO target_user_id FROM auth.users WHERE email=target_user_email LIMIT 1; END IF;
 IF target_user_id IS NULL THEN RETURN json_build_object('success',false,'message','Usuário não encontrado'); END IF;
 INSERT INTO public.user_profiles(id,email,role,updated_at) VALUES(target_user_id,target_user_email,new_role,NOW())
 ON CONFLICT(id) DO UPDATE SET role=EXCLUDED.role,updated_at=NOW();
 UPDATE auth.users SET raw_user_meta_data=jsonb_set(COALESCE(raw_user_meta_data,'{}'::jsonb),'{role}',to_jsonb(new_role)) WHERE id=target_user_id;
 result_json=json_build_object('success',true,'user_id',target_user_id,'email',target_user_email,'role',new_role);
 RETURN result_json;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_documenso_envelopes_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'pg_catalog'
AS $function$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.domain_to_uuid(domain_id text) RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path TO 'pg_catalog'
AS $function$
DECLARE ns_hex TEXT:='6f0a9d2e8c474b3a9f15d7e0b2c4a681'; ns_raw BYTEA; name_raw BYTEA; sha_bytes BYTEA; versioned BYTEA; result TEXT;
BEGIN
 ns_raw:=decode(ns_hex,'hex'); name_raw:=convert_to(domain_id,'UTF8'); sha_bytes:=extensions.digest(ns_raw||name_raw,'sha1');
 versioned:=substring(sha_bytes,1,16); versioned:=set_byte(versioned,6,(get_byte(versioned,6)&15)|80); versioned:=set_byte(versioned,8,(get_byte(versioned,8)&63)|128);
 result:=encode(versioned,'hex');
 RETURN(substr(result,1,8)||'-'||substr(result,9,4)||'-'||substr(result,13,4)||'-'||substr(result,17,4)||'-'||substr(result,21))::UUID;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$ SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id=auth.uid() AND role='admin'::public.user_role); $function$;

CREATE OR REPLACE FUNCTION public.current_role_name() RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'pg_catalog'
AS $function$ SELECT role FROM public.user_profiles WHERE user_id=auth.uid() $function$;

-- Security review flags preserved as observations:
-- current_role_name() and is_admin() are SECURITY DEFINER and currently externally executable.
-- admin_update_user_role* currently reference user_profiles.id in parts of their implementation;
-- this is recorded state and is NOT silently corrected during recovery.
