-- Trial no longer starts on signup — starts when user adds card via Gumroad
-- trial_ends_at stays NULL until Gumroad webhook fires

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
    NULL,
    true,
    new_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
