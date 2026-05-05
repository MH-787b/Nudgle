-- Add reminders_opt_in column to appointments
-- Allows clients to opt out of reminders during WhatsApp booking
ALTER TABLE appointments ADD COLUMN reminders_opt_in boolean NOT NULL DEFAULT true;
