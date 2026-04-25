-- Add timezone to profiles (defaults to Europe/London for UK businesses)
ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'Europe/London';
