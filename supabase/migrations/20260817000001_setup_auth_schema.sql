-- Create profiles table extending auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  phone_e164 TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policy for inserting profiles (service role only)
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Create function to sync auth.users to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone_e164, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_e164', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update profiles when auth.users updated
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', name),
    phone_e164 = COALESCE(NEW.raw_user_meta_data->>'phone_e164', phone_e164),
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
CREATE INDEX IF NOT EXISTS idx_profiles_phone_e164 ON public.profiles(phone_e164);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON COLUMN public.profiles.id IS 'UUID referencing auth.users';
COMMENT ON COLUMN public.profiles.name IS 'User full name';
COMMENT ON COLUMN public.profiles.phone_e164 IS 'Phone number in E.164 format (unique)';
COMMENT ON COLUMN public.profiles.created_at IS 'Profile creation timestamp';
COMMENT ON COLUMN public.profiles.updated_at IS 'Profile last update timestamp';