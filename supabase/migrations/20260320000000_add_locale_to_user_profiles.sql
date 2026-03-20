-- Add locale column to user_profiles for translating push notifications
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';
