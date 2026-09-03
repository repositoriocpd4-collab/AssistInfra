import { supabase } from '../lib/supabase';

export async function fetchDashboardStats(user) {
  let query = supabase.from('demands').select('id, priority, status, due_date, cost_estimate, category, school_id, created_at, updated_at');

  if (user?.perm?.school_scoped && user?.school_id) {
    query = query.eq('school_id', user.school_id);
  }

  const { data: demands, error } = await query;
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);

  const stats = {
    total: demands.length,
    urgent: demands.filter((d) => d.priority === 'P1' && d.status !== 'Concluída').length,
    high: demands.filter((d) => d.priority === 'P2' && d.status !== 'Concluída').length,
    overdue: demands.filter((d) => d.due_date && !['Concluída', 'Cancelada'].includes(d.status) && d.due_date < today).length,
    due_soon: demands.filter((d) => {
      if (!d.due_date || ['Concluída', 'Cancelada'].includes(d.status)) return false;
      const diff = (new Date(d.due_date) - new Date(today)) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }).length,
    analysis: demands.filter((d) => d.status === 'Em análise').length,
    progress: demands.filter((d) => ['Em andamento', 'Aguardando material'].includes(d.status)).length,
    contract: demands.filter((d) => ['Aguardando contratação', 'Aguardando empresa'].includes(d.status)).length,
    completed: demands.filter((d) => d.status === 'Concluída').length,
    future: demands.filter((d) => d.status === 'Planejamento futuro').length,
    unassigned: demands.filter((d) => !d.responsible?.trim() && !['Concluída', 'Cancelada'].includes(d.status)).length,
    open_cost: demands
      .filter((d) => !['Concluída', 'Cancelada'].includes(d.status))
      .reduce((acc, d) => acc + (Number(d.cost_estimate) || 0), 0),
  };

  // Demandas que precisam de atenção (ordenadas por urgência)
  const attention = demands
    .filter((d) => !['Concluída', 'Cancelada'].includes(d.status))
    .sort((a, b) => {
      const pOrder = { P1: 1, P2: 2, P3: 3, P4: 4 };
      if (pOrder[a.priority] !== pOrder[b.priority]) {
        return (pOrder[a.priority] || 9) - (pOrder[b.priority] || 9);
      }
      return new Date(b.updated_at) - new Date(a.updated_at);
    })
    .slice(0, 10);

  // Contagem por categoria
  const catCounts = {};
  demands.forEach((d) => {
    if (d.category) {
      catCounts[d.category] = (catCounts[d.category] || 0) + 1;
    }
  });

  return { stats, attention, catCounts, totalDemands: demands };
}

export async function fetchDemands({ status, priority, category, year, school_id, search, archived } = {}, user) {
  let query = supabase
    .from('demands')
    .select('*, schools(id, name, director)')
    .order('id', { ascending: false });

  if (user?.perm?.school_scoped && user?.school_id) {
    query = query.eq('school_id', user.school_id);
  } else if (school_id) {
    query = query.eq('school_id', school_id);
  }

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (category) query = query.eq('category', category);
  if (year) query = query.ilike('created_at', `${year}%`);

  if (archived === 'only') {
    query = query.not('archived_at', 'is', null);
  } else if (archived !== 'all') {
    query = query.is('archived_at', null);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map((d) => ({
    ...d,
    school_name: d.schools?.name || '—',
    director: d.schools?.director || '',
  }));
}

export async function fetchDemandDetail(id) {
  const { data: demand, error: errD } = await supabase
    .from('demands')
    .select('*, schools(*)')
    .eq('id', id)
    .single();

  if (errD || !demand) throw new Error('Demanda não encontrada.');

  const { data: updates } = await supabase
    .from('demand_updates')
    .select('*')
    .eq('demand_id', id)
    .order('created_at', { ascending: false });

  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .eq('demand_id', id)
    .order('created_at', { ascending: false });

  return {
    demand: {
      ...demand,
      school_name: demand.schools?.name || '—',
      director: demand.schools?.director || '',
      school_email: demand.schools?.email || '',
      phone: demand.schools?.phone || '',
      address: demand.schools?.address || '',
    },
    updates: updates || [],
    attachments: attachments || [],
  };
}

export async function createDemand(payload, user) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const insertData = {
    title: payload.title,
    description: payload.description,
    category: payload.category,
    subcategory: payload.subcategory || null,
    location: payload.location || null,
    impact: payload.impact || null,
    affected_people: Number(payload.affected_people) || 0,
    risk: payload.risk ? 1 : 0,
    blocks_activity: payload.blocks_activity ? 1 : 0,
    school_id: user.perm.school_scoped ? user.school_id : Number(payload.school_id),
    priority: payload.priority || 'P3',
    status: 'Nova',
    created_at: now,
    updated_at: now,
    created_by: user.id,
  };

  const { data: created, error } = await supabase
    .from('demands')
    .insert(insertData)
    .select('id')
    .single();

  if (error) throw error;

  const code = `INF-${new Date().getFullYear()}-${String(created.id).padStart(5, '0')}`;
  await supabase.from('demands').update({ code }).eq('id', created.id);

  // Registro automático no histórico
  await supabase.from('demand_updates').insert({
    demand_id: created.id,
    kind: 'Criação',
    message: 'Demanda registrada no sistema.',
    author: user.name,
    created_at: now,
  });

  return { id: created.id, code };
}

export async function updateDemand(id, updates, authorName, changeSummary) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const patch = { ...updates, updated_at: now };

  const { error } = await supabase.from('demands').update(patch).eq('id', id);
  if (error) throw error;

  if (changeSummary) {
    await supabase.from('demand_updates').insert({
      demand_id: id,
      kind: 'Alteração',
      message: changeSummary,
      author: authorName,
      created_at: now,
    });
  }
}

export async function addDemandProgress(id, { kind, message, author, status, responsible, due_date }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const patch = { updated_at: now };

  if (status) patch.status = status;
  if (responsible !== undefined) patch.responsible = responsible;
  if (due_date !== undefined) patch.due_date = due_date;

  await supabase.from('demands').update(patch).eq('id', id);

  await supabase.from('demand_updates').insert({
    demand_id: id,
    kind: kind || 'Andamento',
    message,
    author,
    created_at: now,
  });
}
