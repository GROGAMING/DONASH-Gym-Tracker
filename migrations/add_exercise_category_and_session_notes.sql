-- Add category to exercise_library
ALTER TABLE exercise_library
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

-- Add notes to weekly_sessions
ALTER TABLE weekly_sessions
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
