-- WhatsApp Booking Bot: business hours, conversations, profile columns

-- Add booking columns to profiles
ALTER TABLE public.profiles ADD COLUMN default_duration INT DEFAULT 30;
ALTER TABLE public.profiles ADD COLUMN booking_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN booking_code TEXT UNIQUE;

-- Business hours (0=Mon, 1=Tue, ... 6=Sun)
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '17:00',
  is_closed BOOLEAN DEFAULT false,
  UNIQUE(user_id, day_of_week)
);

-- Conversations (WhatsApp booking state tracking)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_phone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'selecting_day' CHECK (state IN ('selecting_day', 'selecting_time', 'confirming', 'completed')),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own business hours" ON public.business_hours FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business hours" ON public.business_hours FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business hours" ON public.business_hours FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business hours" ON public.business_hours FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = business_id);

-- Indexes
CREATE INDEX idx_conversations_phone ON public.conversations(client_phone, updated_at);
CREATE INDEX idx_conversations_business ON public.conversations(business_id);
CREATE INDEX idx_business_hours_user ON public.business_hours(user_id);
