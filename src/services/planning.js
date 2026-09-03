import { supabase } from '../lib/supabase';

export async function fetchPlanning() {
  const { data: items, error } = await supabase
    .from('planning_items')
    .select('*')
    .order('year', { ascending: true });

  if (error) throw error;
  return items || [];
}

export async function createPlanningItem(payload) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const insertData = {
    year: Number(payload.year),
    title: payload.title,
    category: payload.category,
    kind: payload.kind || 'Aquisição futura',
    status: payload.status || 'Identificada',
    estimated_cost: Number(payload.estimated_cost) || 0,
    quantity: Number(payload.quantity) || 0,
    unit: payload.unit || 'UN',
    justification: payload.justification || '',
    schools_count: Number(payload.schools_count) || 1,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('planning_items')
    .insert(insertData)
    .select('id')
    .single();

  if (error) throw error;

  const code = `PLAN-${payload.year}-${String(data.id).padStart(4, '0')}`;
  await supabase.from('planning_items').update({ code }).eq('id', data.id);
  return { id: data.id, code };
}
