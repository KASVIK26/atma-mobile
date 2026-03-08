-- ============================================================================
-- Migration: Create pending_otps table for teacher OTP authentication
-- ============================================================================

-- Drop table if it exists (for clean migrations)
-- DROP TABLE IF EXISTS public.pending_otps CASCADE;

-- Create pending_otps table
CREATE TABLE IF NOT EXISTS public.pending_otps (
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INT DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_otps_email ON public.pending_otps(email);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_pending_otps_expires_at ON public.pending_otps(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pending_otps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anyone (unauthenticated) to insert OTP records
CREATE POLICY "allow_insert_pending_otps" ON public.pending_otps
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Allow unauthenticated users to select OTP records (for verification)
CREATE POLICY "allow_select_pending_otps" ON public.pending_otps
  FOR SELECT
  USING (true);

-- RLS Policy: Allow updates to pending_otps (for incrementing attempts)
CREATE POLICY "allow_update_pending_otps" ON public.pending_otps
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow deletion of expired OTPs
CREATE POLICY "allow_delete_pending_otps" ON public.pending_otps
  FOR DELETE
  USING (true);

-- Grant permissions
GRANT ALL ON public.pending_otps TO authenticated;
GRANT ALL ON public.pending_otps TO anon;

-- Optional: Create a function to clean up expired OTPs (can be run on a schedule)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pending_otps
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- To run this migration:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Create a new query and paste this entire script
-- 4. Click "Run" to execute
-- ============================================================================
