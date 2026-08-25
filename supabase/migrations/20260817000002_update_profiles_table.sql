-- Make sure we're working with the public schema
SET search_path TO public;

-- Add phone_e164 uniqueness constraint to existing profiles table
-- First, check if there are any duplicate phone numbers that would prevent creating a unique index
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT phone 
    FROM user_profiles 
    WHERE phone IS NOT NULL 
    GROUP BY phone 
    HAVING COUNT(*) > 1
  ) dup;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot create unique index on phone: found % duplicate phone numbers', duplicate_count
    USING HINT = 'Resolve duplicate phone numbers before applying this migration.';
  END IF;
END $$;

-- Create unique index on phone field (treating it as E.164 format)
DO $$
BEGIN
  -- Try to create the unique index
  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone_unique ON user_profiles(phone);
EXCEPTION
  WHEN undefined_column THEN
    -- If phone column doesn't exist, we'll handle it below
    RAISE NOTICE 'Phone column does not exist yet';
  WHEN others THEN
    RAISE NOTICE 'Could not create unique index on phone: %', SQLERRM;
END $$;

-- Enable RLS on profiles table if not already enabled
DO $$
BEGIN
  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN invalid_object_definition THEN
    -- RLS might already be enabled
    NULL;
END $$;

-- Create policy for users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for inserting profiles (service role only)
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create function to sync auth.users to profiles
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, phone, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update profiles when auth.users updated
DROP FUNCTION IF EXISTS public.handle_user_update();
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Update table comment
COMMENT ON TABLE public.user_profiles IS 'User profiles extending auth.users';

-- Update column comments
COMMENT ON COLUMN public.user_profiles.id IS 'UUID referencing auth.users';
COMMENT ON COLUMN public.user_profiles.name IS 'User full name';
COMMENT ON COLUMN public.user_prophones IS 'Phone number (should be in E.164 format)';
COMMENT ON COLUMN public.user_profiles.created_at IS 'Profile creation timestamp';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'Profile last update timestamp';