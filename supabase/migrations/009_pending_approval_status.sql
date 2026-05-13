-- Add 'pending_approval' to the appointments status check constraint
-- Used when a client books a slot that conflicts with the owner's Google Calendar
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_status_check
CHECK (status IN ('pending', 'confirmed', 'no_response', 'cancelled', 'pending_approval'));
