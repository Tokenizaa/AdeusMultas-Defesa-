-- Enable RLS on cases table and create policies for user-specific access
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Users can read their own cases
CREATE POLICY "Users can read own cases" ON public.cases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own cases
CREATE POLICY "Users can update own cases" ON public.cases
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert cases (backend operations)
CREATE POLICY "Service role can insert cases" ON public.cases
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Service role can delete cases (if needed)
CREATE POLICY "Service role can delete cases" ON public.cases
  FOR DELETE USING (auth.role() = 'service_role');
