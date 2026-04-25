-- Migration 006: Apply all missing columns/tables from migrations 002-005
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)

-- ═══ From 002: Booking bot ═══

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_duration INT DEFAULT 30;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false;

-- booking_code needs UNIQUE — add column first, then constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'booking_code') THEN
    ALTER TABLE public.profiles ADD COLUMN booking_code TEXT UNIQUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '17:00',
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(user_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_phone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'selecting_day' CHECK (state IN ('selecting_day', 'selecting_time', 'confirming', 'completed')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (safe: drops if exists first)
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'Users can view own business hours') THEN
    CREATE POLICY "Users can view own business hours" ON public.business_hours FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'Users can insert own business hours') THEN
    CREATE POLICY "Users can insert own business hours" ON public.business_hours FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'Users can update own business hours') THEN
    CREATE POLICY "Users can update own business hours" ON public.business_hours FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_hours' AND policyname = 'Users can delete own business hours') THEN
    CREATE POLICY "Users can delete own business hours" ON public.business_hours FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view own conversations') THEN
    CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = business_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_phone ON public.conversations(client_phone, updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON public.conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_business_hours_user ON public.business_hours(user_id);

-- ═══ From 003: Timezone ═══

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';

-- ═══ From 004: Pricing tiers ═══

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

UPDATE public.profiles SET plan = 'trial' WHERE plan = 'free';
UPDATE public.profiles SET plan = 'starter' WHERE plan = 'paid';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('trial', 'starter', 'business'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

UPDATE public.profiles
  SET trial_ends_at = NOW() + INTERVAL '14 days'
  WHERE plan = 'trial' AND trial_ends_at IS NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sms_used_this_month INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS average_appointment_value INT;

ALTER TABLE public.profiles ALTER COLUMN reminders_limit SET DEFAULT 500;

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

-- ═══ From 005: Remove growth tier ═══

UPDATE public.profiles SET plan = 'starter' WHERE plan = 'growth';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('trial', 'starter', 'business'));
