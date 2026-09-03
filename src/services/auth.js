import { supabase } from '../lib/supabase';
import { verifyPassword } from '../lib/crypto';

const DEFAULT_PERM = {
  school_scoped: true,
  can_edit_analysis: false,
  can_manage_admin: false,
  can_view_reports: false,
  can_view_planning: false,
};

export async function loginUser(email, password) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Busca usuário na tabela public.users
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, password_hash, role, school_id, active, schools ( id, name )')
    .ilike('email', cleanEmail)
    .single();

  if (error || !user) {
    throw new Error('E-mail ou senha incorretos.');
  }

  if (!user.active) {
    throw new Error('Usuário inativo. Contate o administrador do sistema.');
  }

  // 2. Validação da senha criptografada PBKDF2
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new Error('E-mail ou senha incorretos.');
  }

  // 3. Busca permissões do perfil
  let perm = { ...DEFAULT_PERM };
  let profileLabel = user.role;

  const { data: profile } = await supabase
    .from('access_profiles')
    .select('*')
    .eq('slug', user.role)
    .single();

  if (profile) {
    perm = {
      school_scoped: Boolean(profile.school_scoped),
      can_edit_analysis: Boolean(profile.can_edit_analysis),
      can_manage_admin: Boolean(profile.can_manage_admin),
      can_view_reports: Boolean(profile.can_view_reports),
      can_view_planning: Boolean(profile.can_view_planning),
    };
    profileLabel = profile.label;
  }

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    role_label: profileLabel,
    school_id: user.school_id,
    school_name: user.schools?.name || null,
    perm,
  };

  localStorage.setItem('agenda_user', JSON.stringify(userData));
  return userData;
}

export function getCurrentUser() {
  const saved = localStorage.getItem('agenda_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem('agenda_user');
}
