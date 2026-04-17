export interface Profile {
  id: string;
  email: string;
  business_name: string | null;
  reminder_method: 'sms' | 'email' | 'whatsapp';
  phone: string | null;
  google_calendar_connected: boolean;
  google_refresh_token: string | null;
  onboarding_completed: boolean;
  reminders_active: boolean;
  gumroad_sale_id: string | null;
  gumroad_subscription_id: string | null;
  plan: 'free' | 'paid';
  reminders_used_this_month: number;
  reminders_limit: number;
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
  status: 'pending' | 'confirmed' | 'no_response' | 'cancelled';
  google_event_id: string | null;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  appointment_id: string;
  user_id: string;
  channel: 'sms' | 'email' | 'whatsapp';
  message_type: 'reminder_24h' | 'reminder_2h' | 'follow_up';
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
export type AppointmentStatus = 'pending' | 'confirmed' | 'no_response' | 'cancelled';
export type PlanType = 'free' | 'paid';

export const PLAN_LIMITS: Record<PlanType, { reminders: number; price: number }> = {
  free: { reminders: 50, price: 0 },
  paid: { reminders: 1000, price: 29 },
};
