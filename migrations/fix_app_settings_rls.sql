-- Create app_settings table with proper schema
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value_int INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "app_settings_select_policy" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_update_policy" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_insert_policy" ON public.app_settings;

-- Create RLS policies for authenticated users
-- Allow authenticated users to read the required_sessions_weekly setting
CREATE POLICY "app_settings_select_policy" ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (key = 'required_sessions_weekly');

-- Allow authenticated users to insert (for seeding)
CREATE POLICY "app_settings_insert_policy" ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (key = 'required_sessions_weekly');

-- Allow authenticated users to update (we'll rely on the API route for admin auth)
CREATE POLICY "app_settings_update_policy" ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (key = 'required_sessions_weekly')
  WITH CHECK (key = 'required_sessions_weekly');

-- Insert seed row if it doesn't exist
INSERT INTO public.app_settings (key, value_int)
VALUES ('required_sessions_weekly', 3)
ON CONFLICT (key) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(key);

-- Add comments
COMMENT ON TABLE public.app_settings IS 'Global application settings with RLS';
COMMENT ON COLUMN public.app_settings.key IS 'Setting key (unique identifier)';
COMMENT ON COLUMN public.app_settings.value_int IS 'Integer value for numeric settings';

-- Verify the setting was created
SELECT key, value_int, updated_at 
FROM public.app_settings 
WHERE key = 'required_sessions_weekly';
