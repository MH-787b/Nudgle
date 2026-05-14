-- Enable online booking by default for new users
-- Generates a unique 6-char booking code on signup

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Generate a unique booking code
  LOOP
    new_code := public.generate_booking_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE booking_code = new_code);
  END LOOP;

  INSERT INTO public.profiles (id, email, plan, reminders_limit, trial_ends_at, booking_enabled, booking_code)
  VALUES (
    NEW.id,
    NEW.email,
    'trial',
    500,
    NOW() + INTERVAL '14 days',
    true,
    new_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: enable booking + generate codes for existing users who don't have one
UPDATE public.profiles
SET booking_enabled = true
WHERE booking_enabled = false OR booking_enabled IS NULL;

-- Generate codes for profiles missing them
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE booking_code IS NULL LOOP
    LOOP
      new_code := '';
      FOR i IN 1..6 LOOP
        new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE booking_code = new_code);
    END LOOP;
    UPDATE public.profiles SET booking_code = new_code WHERE id = r.id;
  END LOOP;
END $$;
