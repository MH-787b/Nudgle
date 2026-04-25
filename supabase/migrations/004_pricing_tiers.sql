-- Migration 004: New pricing tiers (trial/starter/growth/business)
-- Replaces old free/paid plan system

-- Drop old constraint first
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- Migrate existing data BEFORE adding new constraint
UPDATE public.profiles SET plan = 'trial' WHERE plan = 'free';
UPDATE public.profiles SET plan = 'starter' WHERE plan = 'paid';

-- Now add new constraint (all rows are valid)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('trial', 'starter', 'business'));

-- Add trial expiry timestamp (null = no active trial)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Set trial expiry for existing trial users (14 days from now)
UPDATE public.profiles
  SET trial_ends_at = NOW() + INTERVAL '14 days'
  WHERE plan = 'trial' AND trial_ends_at IS NULL;

-- Add SMS usage tracking (separate from total reminders for cap enforcement)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_used_this_month INT DEFAULT 0;

-- Add average appointment value for "Nudgle saved you £X" metric
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS average_appointment_value INT;

-- Update default reminders_limit for new trial users (500 appointments = Growth tier)
ALTER TABLE public.profiles
  ALTER COLUMN reminders_limit SET DEFAULT 500;

-- Update handle_new_user function to set trial defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan, reminders_limit, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    'trial',
    500,
    NOW() + INTERVAL '14 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
