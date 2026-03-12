-- Migration: add S&C block structure to session_template_exercises
-- Run once in Supabase SQL editor. Idempotent via IF NOT EXISTS / DO NOTHING patterns.

-- block_label: human label e.g. "Warm Up", "Block A", "Conditioning"
alter table public.session_template_exercises
  add column if not exists block_label text null;

-- block_color: token for UI colour coding
-- allowed values: 'warmup' | 'a' | 'b' | 'c' | 'conditioning' | 'extra'
alter table public.session_template_exercises
  add column if not exists block_color text null;

-- group_index: which superset/tri-set group within the block (0 = standalone exercise)
alter table public.session_template_exercises
  add column if not exists group_index int not null default 0;

-- coaching_notes: optional per-exercise coaching cue
alter table public.session_template_exercises
  add column if not exists coaching_notes text null;

-- rest_seconds: rest time after this exercise/group in seconds
alter table public.session_template_exercises
  add column if not exists rest_seconds int null;
