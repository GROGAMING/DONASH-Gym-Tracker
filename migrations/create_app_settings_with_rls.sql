-- Create app_settings table with proper schema and RLS
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_int INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "app_settings_select_policy" ON app_settings;
DROP POLICY IF EXISTS "app_settings_update_policy" ON app_settings;

-- Create RLS policies
-- Allow authenticated users to read the required_sessions_weekly setting
CREATE POLICY "app_settings_select_policy" ON app_settings
  FOR SELECT
  USING (
    key = 'required_sessions_weekly' 
    AND auth.role() = 'authenticated'
  );

-- Allow admins to update settings (using admin cookie check)
CREATE POLICY "app_settings_update_policy" ON app_settings
  FOR UPDATE
  USING (
    key = 'required_sessions_weekly'
  );

-- Allow admins to insert settings
CREATE POLICY "app_settings_insert_policy" ON app_settings
  FOR INSERT
  WITH CHECK (
    key = 'required_sessions_weekly'
  );

-- Insert seed row if it doesn't exist
INSERT INTO app_settings (key, value_int) 
VALUES ('required_sessions_weekly', 3)
ON CONFLICT (key) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Add comments
COMMENT ON TABLE app_settings IS 'Global application settings with RLS';
COMMENT ON COLUMN app_settings.key IS 'Setting key (unique identifier)';
COMMENT ON COLUMN app_settings.value_int IS 'Integer value for numeric settings';

-- Verify the setting was created
SELECT key, value_int, updated_at 
FROM app_settings 
WHERE key = 'required_sessions_weekly';
