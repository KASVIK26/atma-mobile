import supabase from '@/lib/supabase';

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via email using Supabase Edge Function
 * For MVP, we'll log it to console. In production, integrate with email service.
 */
export const sendOTPEmail = async (email: string, otp: string, name: string) => {
  try {
    console.log(`[sendOTPEmail] Sending OTP to ${email}`);
    console.log(`[sendOTPEmail] OTP: ${otp}`);
    
    // In production, call Supabase Edge Function or email service
    // For now, just log it - in development you can check console
    // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
    
    return { success: true, error: null };
  } catch (error) {
    console.error('[sendOTPEmail] Error:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * Store OTP temporarily for verification
 * Uses supabase to store in pending_otps table
 */
export const storeOTP = async (email: string, otp: string) => {
  try {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    
    // Insert or update OTP record
    const { error } = await supabase
      .from('pending_otps')
      .upsert({
        email,
        otp,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      }, {
        onConflict: 'email'
      });

    if (error) {
      console.error('[storeOTP] Error:', error);
      throw error;
    }

    console.log('[storeOTP] ✅ OTP stored for:', email);
    return { success: true, error: null };
  } catch (error) {
    console.error('[storeOTP] ❌ Error:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * Verify OTP and return result
 */
export const verifyOTP = async (email: string, otp: string) => {
  try {
    const { data, error } = await supabase
      .from('pending_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      console.error('[verifyOTP] No OTP record found for:', email);
      return { valid: false, error: new Error('OTP not found') };
    }

    // Check if OTP is expired
    if (new Date() > new Date(data.expires_at)) {
      console.error('[verifyOTP] OTP expired for:', email);
      return { valid: false, error: new Error('OTP has expired') };
    }

    // Check if OTP matches
    if (data.otp !== otp) {
      // Increment attempts
      const attempts = (data.attempts || 0) + 1;
      
      // Lock account after 3 failed attempts
      if (attempts >= 3) {
        await supabase
          .from('pending_otps')
          .delete()
          .eq('email', email);
        return { valid: false, error: new Error('Too many failed attempts. Please try again.') };
      }

      // Update attempts
      await supabase
        .from('pending_otps')
        .update({ attempts })
        .eq('email', email);

      console.error('[verifyOTP] Invalid OTP for:', email);
      return { valid: false, error: new Error('Invalid OTP') };
    }

    console.log('[verifyOTP] ✅ OTP verified for:', email);
    return { valid: true, error: null };
  } catch (error) {
    console.error('[verifyOTP] ❌ Error:', error);
    return { valid: false, error: error as Error };
  }
};

/**
 * Clean up OTP after successful verification
 */
export const clearOTP = async (email: string) => {
  try {
    await supabase
      .from('pending_otps')
      .delete()
      .eq('email', email);
    console.log('[clearOTP] ✅ OTP cleared for:', email);
  } catch (error) {
    console.warn('[clearOTP] Warning:', error);
  }
};
