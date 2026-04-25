-- Migration 005: Remove growth tier, rename to starter
-- Growth features are now in Starter at £39/mo

-- Migrate any growth users to starter
UPDATE public.profiles SET plan = 'starter' WHERE plan = 'growth';

-- Update constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('trial', 'starter', 'business'));
