-- Create app_settings table for storing global application settings
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value_int INTEGER,
  value_text TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default required sessions weekly setting (3 if not exists)
INSERT INTO app_settings (key, value_int) 
VALUES ('required_sessions_weekly', 3)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Add comment
COMMENT ON TABLE app_settings IS 'Global application settings';
COMMENT ON COLUMN app_settings.key IS 'Setting key (unique identifier)';
COMMENT ON COLUMN app_settings.value_int IS 'Integer value for numeric settings';
COMMENT ON COLUMN app_settings.value_text IS 'Text value for string settings';

-- Verify the setting was created
SELECT key, value_int, updated_at 
FROM app_settings 
WHERE key = 'required_sessions_weekly';
