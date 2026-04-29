-- Add toggle for whether Google Calendar blocks booking slots
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_calendar_blocks_slots BOOLEAN DEFAULT true;
