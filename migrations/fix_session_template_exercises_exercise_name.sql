-- Ensure session_template_exercises has exercise_name column
-- Some environments may have created the column as "name" instead.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session_template_exercises'
      AND column_name = 'exercise_name'
  ) THEN
    -- ok
    NULL;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session_template_exercises'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.session_template_exercises RENAME COLUMN name TO exercise_name;
  ELSE
    ALTER TABLE public.session_template_exercises ADD COLUMN exercise_name text;
  END IF;
END $$;

-- Backfill if we had to add the column (best-effort)
UPDATE public.session_template_exercises
SET exercise_name = COALESCE(exercise_name, '')
WHERE exercise_name IS NULL;
