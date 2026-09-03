import { supabase } from '../lib/supabase';

export async function fetchSchools() {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchSchoolDetail(schoolId) {
  const { data: school, error: errS } = await supabase
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single();

  if (errS) throw errS;

  const { data: demands } = await supabase
    .from('demands')
    .select('*')
    .eq('school_id', schoolId)
    .order('id', { ascending: false });

  return {
    school,
    demands: demands || [],
  };
}
