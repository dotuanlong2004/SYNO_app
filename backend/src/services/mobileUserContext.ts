'use strict';

type SupabaseLike = {
  from: (table: string) => any;
};

type ResolveMobileUserContextInput = {
  supabase: SupabaseLike;
  userId: string;
  profile?: Record<string, any> | null;
  userMetadata?: Record<string, any> | null;
};

export async function resolveMobileUserContext({
  supabase,
  userId,
  profile,
  userMetadata,
}: ResolveMobileUserContextInput) {
  const resolvedRole = String(profile?.role || userMetadata?.role || 'parent').toLowerCase();
  const resolvedSchoolId = String(profile?.school_id || userMetadata?.school_id || '1');

  let resolvedClassId = profile?.class_id || userMetadata?.class_id || null;
  let resolvedStudentCode = profile?.student_code || userMetadata?.student_code || null;

  if (resolvedRole === 'parent') {
    const { data: linkedStudent, error: linkedError } = await supabase
      .from('students')
      .select('student_code, class_name')
      .eq('parent_id', userId)
      .eq('school_id', resolvedSchoolId)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!linkedError && linkedStudent) {
      resolvedStudentCode = linkedStudent.student_code || resolvedStudentCode || null;
      resolvedClassId = linkedStudent.class_name || resolvedClassId || null;
    } else if (resolvedStudentCode) {
      const { data: byCode } = await supabase
        .from('students')
        .select('class_name')
        .eq('student_code', resolvedStudentCode)
        .eq('school_id', resolvedSchoolId)
        .limit(1)
        .maybeSingle();
      resolvedClassId = byCode?.class_name || resolvedClassId || null;
    }
  }

  return {
    role: resolvedRole,
    school_id: resolvedSchoolId,
    class_id: resolvedClassId,
    student_code: resolvedStudentCode,
    full_name: profile?.full_name || userMetadata?.full_name || '',
  };
}
