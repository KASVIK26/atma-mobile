import supabase from '@/lib/supabase';

/**
 * Look up instructor in the instructors table
 * Used during teacher signup to validate if they're authorized to register
 * @param universityId UUID of the university
 * @param name Full name of the instructor
 * @param email Email address
 * @returns Instructor record if found, null otherwise
 */
export const lookupInstructor = async (universityId: string, name: string, email: string) => {
  try {
    console.log('[lookupInstructor] Searching for instructor:', { universityId, name, email });

    const { data, error } = await supabase
      .from('instructors')
      .select('*')
      .eq('university_id', universityId)
      .eq('name', name)
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        console.log('[lookupInstructor] ℹ️ Instructor not found');
        return { found: false, isActive: null, instructor: null };
      }
      console.error('[lookupInstructor] ❌ Query error:', error);
      throw error;
    }

    console.log('[lookupInstructor] ✅ Instructor found:', {
      id: data.id,
      name: data.name,
      email: data.email,
      isActive: data.is_active,
      hasUser: !!data.user_id,
    });

    return {
      found: true,
      isActive: data.is_active,
      instructor: data,
    };
  } catch (error) {
    console.error('[lookupInstructor] ❌ Exception:', error);
    throw error as Error;
  }
};

/**
 * Verify instructor lookup result for signup eligibility
 * @param lookupResult Result from lookupInstructor
 * @returns { eligible: boolean, message?: string }
 */
export const checkInstructorSignupEligibility = (lookupResult: any) => {
  if (!lookupResult.found) {
    return {
      eligible: false,
      message: 'Instructor not found in the system. Please contact your administrator.',
    };
  }

  if (lookupResult.isActive) {
    return {
      eligible: false,
      message: 'This instructor account is already registered. Please sign in instead.',
    };
  }

  return {
    eligible: true,
    message: null,
  };
};
