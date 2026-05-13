export interface Profile {
  id: string;
  email: string;
  business_name: string | null;
  reminder_method: 'sms' | 'email' | 'whatsapp';
  phone: string | null;
  google_calendar_connected: boolean;
  google_refresh_token: string | null;
  google_calendar_blocks_slots: boolean;
  onboarding_completed: boolean;
  reminders_active: boolean;
  gumroad_sale_id: string | null;
  gumroad_subscription_id: string | null;
  plan: PlanType;
  reminders_used_this_month: number;
  reminders_limit: number;
  sms_used_this_month: number;
  default_duration: number;
  booking_enabled: boolean;
  booking_code: string | null;
  timezone: string;
  trial_ends_at: string | null;
  average_appointment_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  appointment_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'no_response' | 'cancelled' | 'pending_approval';
  google_event_id: string | null;
  reminder_24h_sent: boolean;

  reminders_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  appointment_id: string;
  user_id: string;
  channel: 'sms' | 'email' | 'whatsapp';
  message_type: 'reminder_24h' | 'follow_up';
  recipient: string;
  content: string;
  status: 'sent' | 'delivered' | 'failed';
  external_id: string | null;
  sent_at: string;
}

export interface Confirmation {
  id: string;
  appointment_id: string;
  message_id: string | null;
  reply_text: string | null;
  confirmed: boolean;
  received_at: string;
}

export type ReminderChannel = 'sms' | 'email' | 'whatsapp';
export type AppointmentStatus = 'pending' | 'confirmed' | 'no_response' | 'cancelled' | 'pending_approval';
export type PlanType = 'trial' | 'starter' | 'business';

export interface BusinessHour {
  id: string;
  user_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface Conversation {
  id: string;
  business_id: string;
  client_phone: string;
  state: ConversationState;
  context: ConversationContext;
  created_at: string;
  updated_at: string;
}

export type ConversationState = 'selecting_day' | 'selecting_time' | 'confirming' | 'asking_reminder' | 'completed';

export interface ConversationContext {
  days?: { date: string; label: string }[];
  selectedDay?: string;
  slots?: { time: string; label: string }[];
  selectedTime?: string;
  clientName?: string;
}

export interface PlanConfig {
  name: string;
  price: number;
  appointments: number;
  channels: ReminderChannel[];
  smsCap: number;

  hasGoogleCalendar: boolean;
  hasCustomBranding: boolean;
  hasAnalytics: boolean;
  hasRebookPrompt: boolean;
  maxStaff: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  trial: {
    name: 'Free Trial',
    price: 0,
    appointments: 500,
    channels: ['email', 'whatsapp', 'sms'],
    smsCap: 200,

    hasGoogleCalendar: true,
    hasCustomBranding: true,
    hasAnalytics: true,
    hasRebookPrompt: true,
    maxStaff: 1,
  },
  starter: {
    name: 'Starter',
    price: 29,
    appointments: 500,
    channels: ['email', 'whatsapp', 'sms'],
    smsCap: 200,

    hasGoogleCalendar: true,
    hasCustomBranding: true,
    hasAnalytics: true,
    hasRebookPrompt: true,
    maxStaff: 1,
  },
  business: {
    name: 'Business',
    price: 79,
    appointments: 1500,
    channels: ['email', 'whatsapp', 'sms'],
    smsCap: 500,

    hasGoogleCalendar: true,
    hasCustomBranding: true,
    hasAnalytics: true,
    hasRebookPrompt: true,
    maxStaff: 5,
  },
};

export const TRIAL_DURATION_DAYS = 14;

/** Returns true if the user is on a trial that has expired. */
export function isTrialExpired(plan: string, trialEndsAt: string | null): boolean {
  if (plan !== 'trial') return false;
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt) < new Date();
}
