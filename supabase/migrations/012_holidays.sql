-- Holidays table: date ranges when the business is closed
CREATE TABLE public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT holidays_date_range CHECK (end_date >= start_date)
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holidays" ON public.holidays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own holidays" ON public.holidays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own holidays" ON public.holidays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own holidays" ON public.holidays FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_holidays_user ON public.holidays(user_id);
CREATE INDEX idx_holidays_dates ON public.holidays(user_id, start_date, end_date);
