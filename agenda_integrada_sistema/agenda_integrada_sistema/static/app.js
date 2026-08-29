(() => {
  const ctx = window.APP_CONTEXT || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const content = $('#pageContent');
  let schoolsCache = null;

  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const esc = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const num = v => Number(v || 0).toLocaleString('pt-BR');
  const fmtDate = v => {
    if (!v) return '—';
    const raw = String(v).slice(0,10);
    const [y,m,d] = raw.split('-');
    return y && m && d ? `${d}/${m}/${y}` : v;
  };
  const fmtDateTime = v => {
    if (!v) return '—';
    const dt = String(v).replace(' ','T');
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  };
  const priorityLabel = p => ({P1:'Urgente',P2:'Alta',P3:'Programada',P4:'Planejamento/Projeto'}[p] || p || '—');
  const statusClass = s => {
    s=(s||'').toLowerCase();
    if (s.includes('conclu')) return 'completed';
    if (s.includes('execu') || s.includes('programado')) return 'execution';
    if (s.includes('análise') || s.includes('triagem') || s.includes('recebida')) return 'analysis';
    if (s.includes('contrata') || s.includes('empresa')) return 'contract';
    if (s.includes('planejamento') || s.includes('futuro')) return 'future';
    return '';
  };
  const dueInfo = d => {
    if (!d || !d.due_date || ['Concluída','Cancelada'].includes(d.status)) return {text:fmtDate(d?.due_date), cls:''};
    const due = new Date(d.due_date+'T12:00:00');
    const today = new Date(); today.setHours(12,0,0,0);
    const days = Math.round((due-today)/86400000);
    if (days < 0) return {text:`Vencido há ${Math.abs(days)} dia${Math.abs(days)===1?'':'s'}`,cls:'overdue'};
    if (days === 0) return {text:'Vence hoje',cls:'overdue'};
    if (days <= 3) return {text:`Vence em ${days} dias`,cls:'warning'};
    return {text:fmtDate(d.due_date),cls:''};
  };
  const api = async (url, options={}) => {
    const opts = {...options, headers:{...(options.headers||{})}};
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) { location.href='/login'; throw new Error('Sessão expirada'); }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data?.detail || data || 'Não foi possível concluir a operação.');
    return data;
  };
  const toast = (title, message='', type='success') => {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(type==='error'?'warning':'arrow')}<div><strong>${esc(title)}</strong>${message?`<small>${esc(message)}</small>`:''}</div>`;
    $('#toastStack').appendChild(el);
    setTimeout(()=>el.remove(), 4200);
  };
  const setLoading = () => { content.innerHTML = `<div class="page-skeleton"><div class="skeleton sk-title"></div><div class="skeleton sk-subtitle"></div><div class="skeleton-grid"><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div></div></div>`; };
  const empty = (title='Nenhum registro encontrado', text='Ajuste os filtros ou cadastre um novo item.') => `<div class="empty-state"><div class="empty-icon">${icon('search')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;

  function showBackdrop(show=true){ $('#backdrop').hidden=!show; }
  function closeModal(){ $('#modalRoot').innerHTML=''; showBackdrop(false); }
  function modal({title,subtitle='',body='',footer='',mode='drawer',onOpen}){
    showBackdrop(true);
    $('#modalRoot').innerHTML = `<section class="modal ${mode}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="modal-header"><div><h2>${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="close-btn" data-close aria-label="Fechar" data-tooltip="Fechar">${icon('x')}</button></header>
      <div class="modal-body">${body}</div>${footer?`<footer class="modal-footer">${footer}</footer>`:''}
    </section>`;
    $$('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
    onOpen?.($('.modal'));
  }
  $('#backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#backdrop').hidden) closeModal(); });

  async function loadSchools(){
    if (schoolsCache) return schoolsCache;
    schoolsCache = await api('/api/schools');
    return schoolsCache;
  }

  function pageHeader(title, subtitle, actions=''){
    return `<div class="page-header"><div><span class="eyebrow">AGENDA INTEGRADA</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></div>`;
  }

  async function openDemandForm(){
    const schools = await loadSchools();
    const schoolOptions = ctx.user.role==='escola'
      ? `<option value="${ctx.user.school_id}">${esc(ctx.user.school_name||'Minha unidade')}</option>`
      : schools.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
    modal({
      title:'Nova Demanda',
      subtitle:'Registre a necessidade de forma objetiva. Você poderá acompanhar todo o histórico depois.',
      mode:'drawer',
      body:`<div class="stepper">
        <div class="step active" data-step-ind="1"><span class="step-num">1</span><span>Identificação</span></div>
        <div class="step" data-step-ind="2"><span class="step-num">2</span><span>Impacto</span></div>
        <div class="step" data-step-ind="3"><span class="step-num">3</span><span>Revisão</span></div>
      </div>
      <form id="demandForm">
        <section data-step="1" class="form-step">
          <div class="form-grid">
            <div class="field span-2"><label>Unidade Escolar *</label><select class="select" name="school_id" required>${schoolOptions}</select></div>
            <div class="field span-2"><label>Título da demanda *</label><input class="input" name="title" maxlength="140" placeholder="Ex.: Infiltração no telhado da sala 3" required></div>
            <div class="field"><label>Categoria *</label><select class="select" name="category" required><option value="">Selecione...</option>${ctx.categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
            <div class="field"><label>Local / ambiente</label><input class="input" name="location" placeholder="Ex.: Sala 3 · Bloco B"></div>
            <div class="field span-2"><label>Descrição detalhada *</label><textarea class="textarea" name="description" placeholder="Descreva o problema, quando foi percebido e o que está acontecendo atualmente." required></textarea></div>
          </div>
        </section>
        <section data-step="2" class="form-step hidden">
          <div class="form-grid">
            <div class="field span-2"><label>Impacto causado</label><textarea class="textarea" name="impact" placeholder="Ex.: impossibilita o uso da sala em dias de chuva e pode danificar equipamentos."></textarea></div>
            <div class="field"><label>Pessoas afetadas</label><input class="input" type="number" min="0" name="affected_people" placeholder="0"></div>
            <div class="field"><label>Prioridade sugerida</label><select class="select" name="priority"><option value="P3">P3 · Programada</option><option value="P2">P2 · Alta</option><option value="P1">P1 · Urgente</option><option value="P4">P4 · Planejamento/Projeto</option></select></div>
            <div class="field span-2"><label>Sinais de impacto</label><div class="check-grid">
              <label class="check"><input type="checkbox" name="risk"> Há risco à comunidade escolar</label>
              <label class="check"><input type="checkbox" name="blocks_activity"> Impede atividade escolar</label>
            </div></div>
          </div>
          <div class="alert info mt-16">A prioridade final poderá ser ajustada após a análise técnica da Infraestrutura.</div>
        </section>
        <section data-step="3" class="form-step hidden"><div id="demandReview"></div></section>
      </form>`,
      footer:`<button class="btn btn-secondary hidden" id="prevStep">Voltar</button><button class="btn btn-primary" id="nextStep">Continuar</button>`,
      onOpen(root){
        let step=1;
        const form=$('#demandForm',root), next=$('#nextStep'), prev=$('#prevStep');
        const updateStep=()=>{
          $$('[data-step]',root).forEach(s=>s.classList.toggle('hidden', Number(s.dataset.step)!==step));
          $$('[data-step-ind]',root).forEach(s=>{const n=Number(s.dataset.stepInd);s.classList.toggle('active',n===step);s.classList.toggle('done',n<step);});
          prev.classList.toggle('hidden',step===1);
          next.textContent=step===3?'Registrar demanda':'Continuar';
          if(step===3){
            const fd=new FormData(form); const s=schools.find(x=>String(x.id)===fd.get('school_id'));
            $('#demandReview').innerHTML=`<div class="info-card accent"><h3>${icon('clipboard')}Revise antes de registrar</h3><div class="key-value">
              <div class="kv"><span>Unidade Escolar</span><strong>${esc(s?.name||ctx.user.school_name||'—')}</strong></div>
              <div class="kv"><span>Demanda</span><strong>${esc(fd.get('title'))}</strong></div>
              <div class="kv"><span>Categoria · Local</span><strong>${esc(fd.get('category'))} · ${esc(fd.get('location')||'Não informado')}</strong></div>
              <div class="kv"><span>Prioridade sugerida</span><strong>${esc(fd.get('priority'))} · ${priorityLabel(fd.get('priority'))}</strong></div>
            </div></div><div class="alert info">Após o registro, a demanda receberá um código único e ficará disponível para acompanhamento.</div>`;
          }
        };
        prev.addEventListener('click',()=>{step--;updateStep();});
        next.addEventListener('click', async()=>{
          if(step<3){
            const active=$(`[data-step="${step}"]`,root); let valid=true;
            $$('[required]',active).forEach(i=>{if(!i.reportValidity()) valid=false;});
            if(!valid)return; step++;updateStep();return;
          }
          const fd=new FormData(form); const payload=Object.fromEntries(fd.entries());
          payload.risk=form.elements.risk.checked; payload.blocks_activity=form.elements.blocks_activity.checked;
          try{next.disabled=true;next.textContent='Registrando...';const res=await api('/api/demands',{method:'POST',body:payload});closeModal();toast('Demanda registrada',res.code);location.href=`/demandas/${res.id}`;}catch(e){toast('Erro ao registrar',e.message,'error');next.disabled=false;next.textContent='Registrar demanda';}
        });
      }
    });
  }

  async function renderDashboard(){
    setLoading();
    const data=await api('/api/dashboard');
    const s=data.stats;
    const cards=[
      ['total','Total de demandas',s.total,'Registro consolidado','primary','clipboard','Todos os registros',''],
      ['P1','Urgentes (P1)',s.urgent,'Ação imediata necessária','red','warning','Demandas com risco ou impacto crítico','priority=P1'],
      ['analysis','Em análise',s.analysis,'Triagem e avaliação técnica','orange','search','Demandas aguardando decisão técnica','status=Em análise técnica'],
      ['progress','Em andamento',s.progress,'Serviços programados ou em execução','teal','trend','Atendimentos atualmente mobilizados','status=Em execução'],
      ['contract','Aguardando contratação',s.contract,'Dependência administrativa','violet','file','Aquisição, empresa ou licitação necessária','status=Aguardando contratação'],
      ['overdue','Prazo vencido',s.overdue,'Requer atenção da gestão','red','clock','Demandas com prazo ultrapassado','overdue=1'],
      ['completed','Concluídas',s.completed,'Atendimentos finalizados','green','arrow','Demandas encerradas com registro de conclusão','status=Concluída'],
      ['future','Planejamento futuro',s.future,'Exercícios seguintes','blue','calendar','Necessidades previstas para planejamento futuro','status=Planejamento futuro']
    ];
    const maxCat=Math.max(1,...data.categories.map(x=>x.qty));
    content.innerHTML = pageHeader('Visão Geral', ctx.user.role==='escola' ? `Acompanhe as demandas de ${ctx.user.school_name}.` : 'Status atual das demandas de infraestrutura em toda a Rede Municipal.',
      `<a class="btn btn-secondary" href="/api/export/demands.csv">${icon('download')}Exportar</a><button class="btn btn-primary" data-open-demand>${icon('plus')}Nova Demanda</button>`)+
      `<div class="stats-grid">${cards.map(c=>`<article class="stat-card ${c[4]}" data-dashboard-filter="${esc(c[7])}" data-tooltip="${esc(c[6])}"><div class="stat-label">${esc(c[1])}</div><div class="stat-value mono">${num(c[2])}</div><div class="stat-note">${icon(c[5])}${esc(c[3])}</div><div class="stat-icon">${icon(c[5])}</div></article>`).join('')}</div>`+
      `<div class="content-grid">
        <section class="panel"><div class="panel-header"><div><h2>Precisa de atenção</h2><p>Priorizado por criticidade e prazo.</p></div><a class="link-btn" href="/demandas">Ver todas</a></div>
          <div class="attention-list">${data.attention.length?data.attention.map(d=>{const due=dueInfo(d);return `<a class="attention-item" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.school_name)} · ${d.code}</small></div><span class="deadline ${due.cls}">${esc(due.text)}</span></a>`}).join(''):empty('Tudo em dia','Não há demandas críticas neste momento.')}</div>
        </section>
        <section class="panel"><div class="panel-header"><div><h2>Demandas por categoria</h2><p>Concentração atual da carteira.</p></div></div><div class="panel-body mini-chart">${data.categories.map(x=>`<div class="bar-row"><label title="${esc(x.category)}">${esc(x.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8,x.qty/maxCat*100)}%"></div></div><b>${x.qty}</b></div>`).join('')}</div></section>
      </div>
      <section class="panel"><div class="panel-header"><div><h2>Atividade recente</h2><p>Últimas demandas atualizadas.</p></div><a class="link-btn" href="/demandas">Abrir lista completa</a></div>${renderDemandTable(data.recent,true)}</section>
      <section class="panel mt-16"><div class="panel-header"><div><h2>Indicador de execução</h2><p>Percentual das demandas registradas que já foram concluídas.</p></div><strong class="text-teal mono">${s.execution}%</strong></div><div class="panel-body"><div class="bar-track" style="height:14px"><div class="bar-fill" style="width:${Math.min(100,s.execution)}%"></div></div></div></section>`;
    $$('[data-open-demand]',content).forEach(b=>b.addEventListener('click',openDemandForm));
    $$('[data-dashboard-filter]').forEach(card=>card.addEventListener('click',()=>{
      const f=card.dataset.dashboardFilter;
      location.href=f?`/demandas?${f}`:'/demandas';
    }));
  }

  function renderDemandTable(rows, compact=false){
    if(!rows?.length) return empty();
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Demanda</th>${compact?'':'<th>Categoria</th>'}<th>Unidade Escolar</th><th>Prioridade</th><th>Status</th><th>Prazo</th><th>Ações</th></tr></thead><tbody>${rows.map(d=>{
      const due=dueInfo(d);return `<tr data-href="/demandas/${d.id}"><td class="mono"><strong>${esc(d.code)}</strong></td><td class="cell-title"><strong>${esc(d.title)}</strong><small>Atualizado ${fmtDateTime(d.updated_at)}</small></td>${compact?'':`<td>${esc(d.category)}</td>`}<td>${esc(d.school_name||'—')}</td><td><span class="badge ${d.priority}">${d.priority} · ${priorityLabel(d.priority)}</span></td><td><span class="status-badge ${statusClass(d.status)}">${esc(d.status)}</span></td><td><span class="deadline ${due.cls}">${esc(due.text)}</span></td><td><a class="icon-btn" href="/demandas/${d.id}" aria-label="Ver detalhes" data-tooltip="Ver detalhes">${icon('eye')}</a></td></tr>`}).join('')}</tbody></table></div>`;
  }

  async function renderDemands(){
    setLoading();
    const query=new URLSearchParams(location.search);
    const schools=await loadSchools();
    const filters={q:query.get('q')||'',status:query.get('status')||'',priority:query.get('priority')||'',category:query.get('category')||'',year:query.get('year')||'2026',overdue:query.get('overdue')==='1'};
    content.innerHTML = pageHeader('Demandas Escolares','Gerencie, filtre e acompanhe todas as solicitações de infraestrutura.',`<a class="btn btn-secondary" href="/api/export/demands.csv">${icon('download')}Exportar CSV</a><button class="btn btn-primary" data-open-demand>${icon('plus')}Criar Demanda</button>`)+
      `<section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" value="${esc(filters.q)}" placeholder="Código, demanda ou escola..."></div></div>
        <div class="field"><label>Ano</label><select class="select" id="fYear"><option value="">Todos</option>${[2026,2025,2024].map(y=>`<option ${String(y)===filters.year?'selected':''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="select" id="fStatus"><option value="">Todos</option>${ctx.statuses.map(x=>`<option ${x===filters.status?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x=>`<option value="${x}" ${x===filters.priority?'selected':''}>${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x=>`<option ${x===filters.category?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <button class="btn btn-secondary" id="clearFilters">${icon('filter')}Limpar</button>
      </section>
      <div class="filter-chips">${filters.overdue?'<button class="chip active" id="overdueChip">Prazo vencido ×</button>':''}<button class="chip" data-chip-priority="P1">P1 Urgentes</button><button class="chip" data-chip-status="Aguardando contratação">Aguardando contratação</button><button class="chip" data-chip-status="Em execução">Em execução</button><button class="chip" data-chip-status="Planejamento futuro">Planejamento futuro</button><button class="chip" data-chip-status="Concluída">Concluídas</button></div>
      <section class="panel"><div class="panel-header"><div><h2>Carteira de demandas</h2><p id="demandCount">Carregando...</p></div></div><div id="demandTable"></div></section>`;
    $('[data-open-demand]',content).addEventListener('click',openDemandForm);
    const load=async()=>{
      const params=new URLSearchParams();
      const map={q:$('#fQ').value,status:$('#fStatus').value,priority:$('#fPriority').value,category:$('#fCategory').value,year:$('#fYear').value};
      Object.entries(map).forEach(([k,v])=>{if(v)params.set(k,v)}); if(filters.overdue) params.set('overdue','1');
      $('#demandTable').innerHTML=`<div class="empty-state"><p>Atualizando lista...</p></div>`;
      const rows=await api('/api/demands?'+params.toString());
      $('#demandCount').textContent=`${rows.length} registro${rows.length===1?'':'s'} encontrado${rows.length===1?'':'s'}`;
      $('#demandTable').innerHTML=renderDemandTable(rows,false);
    };
    let timer; $('#fQ').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(load,250)});
    ['#fYear','#fStatus','#fPriority','#fCategory'].forEach(id=>$(id).addEventListener('change',load));
    $('#clearFilters').addEventListener('click',()=>{filters.overdue=false;['#fQ','#fStatus','#fPriority','#fCategory'].forEach(id=>$(id).value='');$('#fYear').value='2026';load();});
    $$('[data-chip-status]').forEach(b=>b.addEventListener('click',()=>{$('#fStatus').value=b.dataset.chipStatus;load()}));
    $$('[data-chip-priority]').forEach(b=>b.addEventListener('click',()=>{$('#fPriority').value=b.dataset.chipPriority;load()})); $('#overdueChip')?.addEventListener('click',()=>{filters.overdue=false;$('#overdueChip').remove();load()});
    await load();
  }

  function detailTabContent(name, payload){
    const d=payload.demand;
    if(name==='summary') return `<div class="detail-layout"><div>
      <section class="info-card accent"><h3>${icon('clipboard')}Descrição</h3><p>${esc(d.description)}</p></section>
      <div class="metric-row"><div class="metric"><span>Categoria</span><strong>${esc(d.category)}</strong></div><div class="metric"><span>Custo estimado</span><strong>${money(d.cost_estimate)}</strong></div><div class="metric"><span>Pessoas afetadas</span><strong>${num(d.affected_people)}</strong></div></div>
      <section class="info-card mt-16"><h3>${icon('warning')}Impacto</h3><p>${esc(d.impact||'Impacto não detalhado.')}</p></section>
    </div><aside class="side-stack">
      <section class="info-card"><h3>${icon('school')}Unidade Escolar</h3><div class="key-value"><div class="kv"><span>Unidade</span><strong>${esc(d.school_name)}</strong></div><div class="kv"><span>Direção</span><strong>${esc(d.director||'—')}</strong></div><div class="kv"><span>Local da ocorrência</span><strong>${esc(d.location||'—')}</strong></div><div class="kv"><span>Endereço</span><strong>${esc(d.address||'—')}</strong></div></div></section>
      <section class="info-card"><h3>${icon('warning')}Sinais de atenção</h3>${d.risk?`<div class="impact-item">${icon('warning')}<span>Há risco informado à comunidade escolar.</span></div>`:''}${d.blocks_activity?`<div class="impact-item">${icon('clock')}<span>Impacta ou impede atividade escolar.</span></div>`:''}${!d.risk&&!d.blocks_activity?`<p>Nenhum sinal crítico registrado.</p>`:''}</section>
    </aside></div>`;
    if(name==='technical') return `<div class="detail-layout"><div>
      <section class="info-card accent"><h3>${icon('settings')}Análise Técnica</h3><div class="key-value"><div class="kv"><span>Parecer técnico</span><strong>${esc(d.technical_opinion||'Ainda não registrado.')}</strong></div><div class="kv"><span>Ação definida</span><strong>${esc(d.action_defined||'Ainda não definida.')}</strong></div><div class="kv"><span>Dependências</span><strong>${esc(d.dependencies||'Nenhuma dependência registrada.')}</strong></div></div></section>
      ${ctx.user.role!=='escola'?`<button class="btn btn-primary" id="editTechnical">${icon('edit')}Atualizar análise técnica</button>`:''}
    </div><aside class="side-stack"><section class="info-card"><h3>${icon('user')}Responsabilidade</h3><div class="key-value"><div class="kv"><span>Responsável</span><strong>${esc(d.responsible||'Não definido')}</strong></div><div class="kv"><span>Setor</span><strong>${esc(d.sector||'Não definido')}</strong></div><div class="kv"><span>Prazo</span><strong>${fmtDate(d.due_date)}</strong></div></div></section><section class="info-card"><h3>${icon('info')}Dependências operacionais</h3><div class="check-grid"><span class="check">${d.needs_visit?'✓':'—'} Visita técnica</span><span class="check">${d.needs_budget?'✓':'—'} Orçamento</span><span class="check">${d.needs_material?'✓':'—'} Material</span><span class="check">${d.needs_contract?'✓':'—'} Contratação</span></div></section></aside></div>`;
    if(name==='responses') return `<div class="detail-layout"><div>
      <div class="composer"><textarea id="updateMessage" placeholder="Registre uma devolutiva, orientação, informação complementar ou andamento..."></textarea><div class="composer-actions"><span class="text-muted" style="font-size:10px">A mensagem ficará registrada no histórico.</span><button class="btn btn-primary" id="sendUpdate">${icon('message')}Registrar devolutiva</button></div></div>
      <section class="info-card"><h3>${icon('message')}Linha do tempo de devolutivas</h3>${renderTimeline(payload.updates.filter(x=>x.kind==='Devolutiva'||x.kind==='Status'||x.kind==='Alteração'))}</section>
    </div><aside class="side-stack"><section class="info-card"><h3>${icon('info')}Boa devolutiva</h3><p>Informe o que foi analisado, qual é o próximo passo, quem está responsável e a previsão atualizada.</p></section></aside></div>`;
    if(name==='attachments') return `<section class="info-card"><h3>${icon('paperclip')}Anexos</h3><label class="upload-zone" id="uploadZone">${icon('paperclip')}<strong>Arraste um arquivo ou clique para selecionar</strong><small>PDF, DOCX, XLSX e imagens · até 12 MB</small><input type="file" id="attachmentInput" hidden></label>${renderFiles(payload.attachments)}</section>`;
    if(name==='history') return `<section class="info-card"><h3>${icon('clock')}Histórico completo</h3>${renderTimeline(payload.updates)}</section>`;
    if(name==='planning') return `<div class="detail-layout"><div><section class="info-card accent"><h3>${icon('calendar')}Planejamento</h3>${d.future_year?`<p>Esta demanda está vinculada ao planejamento do exercício de <strong>${d.future_year}</strong>.</p><div class="metric-row mt-16"><div class="metric"><span>Tipo</span><strong>${esc(d.planning_kind||'Planejamento futuro')}</strong></div><div class="metric"><span>Quantidade</span><strong>${num(d.planned_quantity||0)} ${esc(d.planned_unit||'')}</strong></div><div class="metric"><span>Estimativa</span><strong>${money(d.cost_estimate)}</strong></div></div>`:`<p>Esta demanda ainda não foi destinada a um exercício futuro.</p>`}</section>${payload.planning.length?payload.planning.map(p=>`<section class="info-card"><div class="detail-code-line"><span class="badge P4">${esc(p.code)}</span><span class="status-badge future">${esc(p.status)}</span></div><h3 style="margin-top:12px">${esc(p.title)}</h3><div class="metric-row"><div class="metric"><span>Exercício</span><strong>${p.year}</strong></div><div class="metric"><span>Estimativa</span><strong>${money(p.estimated_cost)}</strong></div><div class="metric"><span>Escolas</span><strong>${p.schools_count}</strong></div></div></section>`).join(''):''}</div><aside class="side-stack"><section class="info-card"><h3>${icon('info')}Fluxo futuro</h3><p>Demanda → Planejamento → Consolidação → Processo administrativo → Licitação/Contratação → Execução.</p></section></aside></div>`;
    return '';
  }
  function renderTimeline(items){
    if(!items?.length)return empty('Ainda sem registros','As movimentações aparecerão aqui em ordem cronológica.');
    return `<div class="timeline">${items.map(x=>`<div class="timeline-item"><div class="timeline-meta">${fmtDateTime(x.created_at)} · ${esc(x.author)}</div><strong>${esc(x.kind)}</strong><p>${esc(x.message)}</p></div>`).join('')}</div>`;
  }
  function renderFiles(files){
    if(!files?.length)return `<div class="empty-state" style="padding:24px"><p>Nenhum anexo enviado.</p></div>`;
    return `<div class="file-list">${files.map(f=>`<div class="file-row"><div class="file-icon">${icon('file')}</div><div><strong>${esc(f.filename)}</strong><small>${Math.max(1,Math.round(f.size/1024))} KB · ${fmtDateTime(f.created_at)}</small></div><a href="/uploads/${f.id}" data-tooltip="Baixar anexo">Baixar</a></div>`).join('')}</div>`;
  }

  async function openEditTechnical(d, reload){
    modal({title:'Atualizar análise técnica',subtitle:`${d.code} · ${d.title}`,mode:'drawer',body:`<form id="techForm"><div class="form-grid">
      <div class="field"><label>Prioridade</label><select class="select" name="priority">${Object.keys(ctx.priorities).map(p=>`<option value="${p}" ${p===d.priority?'selected':''}>${p} · ${priorityLabel(p)}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select class="select" name="status">${ctx.statuses.map(s=>`<option ${s===d.status?'selected':''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="field"><label>Responsável</label><input class="input" name="responsible" value="${esc(d.responsible||'')}"></div>
      <div class="field"><label>Setor</label><input class="input" name="sector" value="${esc(d.sector||'')}"></div>
      <div class="field"><label>Prazo previsto</label><input class="input" type="date" name="due_date" value="${esc(d.due_date||'')}"></div>
      <div class="field"><label>Custo estimado (R$)</label><input class="input" type="number" step="0.01" min="0" name="cost_estimate" value="${esc(d.cost_estimate||0)}"></div>
      <div class="field span-2"><label>Parecer técnico</label><textarea class="textarea" name="technical_opinion">${esc(d.technical_opinion||'')}</textarea></div>
      <div class="field span-2"><label>Ação definida</label><textarea class="textarea" name="action_defined">${esc(d.action_defined||'')}</textarea></div>
      <div class="field span-2"><label>Dependências / impedimentos</label><textarea class="textarea" name="dependencies">${esc(d.dependencies||'')}</textarea></div>
      <div class="field span-2"><label>Dependências operacionais</label><div class="check-grid"><label class="check"><input type="checkbox" name="needs_visit" ${d.needs_visit?'checked':''}> Visita técnica</label><label class="check"><input type="checkbox" name="needs_budget" ${d.needs_budget?'checked':''}> Orçamento</label><label class="check"><input type="checkbox" name="needs_material" ${d.needs_material?'checked':''}> Material</label><label class="check"><input type="checkbox" name="needs_contract" ${d.needs_contract?'checked':''}> Contratação</label></div></div>
      <div class="field"><label>Exercício futuro</label><input class="input" type="number" min="2026" max="2035" name="future_year" value="${esc(d.future_year||'')}" placeholder="Ex.: 2027"></div>
    </div></form>`,footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveTechnical">Salvar alterações</button>`,onOpen(root){
      $('#saveTechnical').addEventListener('click',async()=>{const f=$('#techForm');const fd=new FormData(f);const payload=Object.fromEntries(fd.entries());['needs_visit','needs_budget','needs_material','needs_contract'].forEach(k=>payload[k]=f.elements[k].checked);try{await api(`/api/demands/${d.id}`,{method:'PUT',body:payload});closeModal();toast('Análise atualizada','O histórico da demanda foi registrado.');await reload();}catch(e){toast('Não foi possível salvar',e.message,'error')}});
    }});
  }

  async function renderDemandDetail(){
    setLoading();
    const id=Number(document.body.dataset.entityId); let payload=await api(`/api/demands/${id}`); let active='summary';
    const render=()=>{
      const d=payload.demand, due=dueInfo(d);
      content.innerHTML=`<div class="breadcrumb"><a href="/demandas">Demandas</a><span>›</span><span>${esc(d.code)}</span></div>
        <div class="detail-head"><div><div class="detail-code-line"><span class="code-label">${esc(d.code)}</span><span class="badge ${d.priority}">${d.priority} · ${priorityLabel(d.priority)}</span><span class="status-badge ${statusClass(d.status)}">${esc(d.status)}</span><span class="deadline ${due.cls}">${esc(due.text)}</span></div><h1>${esc(d.title)}</h1></div><div class="page-actions">${ctx.user.role!=='escola'?`<button class="btn btn-secondary" id="editDemand">${icon('edit')}Editar análise</button>`:''}<button class="btn btn-primary" id="quickUpdate">${icon('message')}Devolutiva</button></div></div>
        <nav class="tabs" aria-label="Detalhes da demanda"><button class="tab ${active==='summary'?'active':''}" data-tab="summary">Resumo</button><button class="tab ${active==='technical'?'active':''}" data-tab="technical">Análise Técnica</button><button class="tab ${active==='responses'?'active':''}" data-tab="responses">Devolutivas</button><button class="tab ${active==='attachments'?'active':''}" data-tab="attachments">Anexos <span class="badge P3">${payload.attachments.length}</span></button><button class="tab ${active==='history'?'active':''}" data-tab="history">Histórico</button><button class="tab ${active==='planning'?'active':''}" data-tab="planning">Planejamento</button></nav>
        <div id="tabContent">${detailTabContent(active,payload)}</div>`;
      const reload=async()=>{payload=await api(`/api/demands/${id}`);render()};
      $$('[data-tab]',content).forEach(b=>b.addEventListener('click',()=>{active=b.dataset.tab;render()}));
      $('#editDemand')?.addEventListener('click',()=>openEditTechnical(d,reload));
      $('#editTechnical')?.addEventListener('click',()=>openEditTechnical(d,reload));
      const goResponses=()=>{active='responses';render();setTimeout(()=>$('#updateMessage')?.focus(),20)};
      $('#quickUpdate')?.addEventListener('click',goResponses);
      $('#sendUpdate')?.addEventListener('click',async()=>{const ta=$('#updateMessage');if(!ta.value.trim()){toast('Escreva uma devolutiva','O campo de mensagem está vazio.','error');return}try{await api(`/api/demands/${id}/updates`,{method:'POST',body:{kind:'Devolutiva',message:ta.value.trim()}});toast('Devolutiva registrada');await reload();active='responses';render();}catch(e){toast('Erro ao registrar',e.message,'error')}});
      const zone=$('#uploadZone'); const input=$('#attachmentInput');
      if(zone&&input){zone.addEventListener('click',()=>input.click());input.addEventListener('change',()=>input.files[0]&&upload(input.files[0]));['dragover','dragenter'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('drag')}));['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('drag')}));zone.addEventListener('drop',e=>e.dataTransfer.files[0]&&upload(e.dataTransfer.files[0]));}
      async function upload(file){const fd=new FormData();fd.append('file',file);try{toast('Enviando anexo',file.name);await api(`/api/demands/${id}/attachments`,{method:'POST',body:fd});payload=await api(`/api/demands/${id}`);active='attachments';render();toast('Anexo enviado',file.name)}catch(e){toast('Falha no envio',e.message,'error')}}
    };
    render();
  }


  async function openFutureDemandForm(){
    const schools=await loadSchools();
    const schoolOptions=ctx.user.role==='escola'?`<option value="${ctx.user.school_id}">${esc(ctx.user.school_name||'Minha unidade')}</option>`:schools.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
    modal({title:'Nova Demanda Futura',subtitle:'Registre uma necessidade dos próximos exercícios para planejamento, aquisição, contratação ou licitação.',mode:'drawer',body:`<form id="futureDemandForm"><div class="form-grid">
      <div class="field span-2"><label>Unidade Escolar *</label><select class="select" name="school_id" required>${schoolOptions}</select></div>
      <div class="field"><label>Exercício pretendido *</label><select class="select" name="future_year" required>${[2027,2028,2029,2030,2031].map(y=>`<option>${y}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo de necessidade *</label><select class="select" name="planning_kind"><option>Aquisição futura</option><option>Contratação futura</option><option>Obra futura</option><option>Projeto futuro</option><option>Serviço continuado</option></select></div>
      <div class="field span-2"><label>Objeto necessário *</label><input class="input" name="title" required placeholder="Ex.: Aquisição de 8 aparelhos de ar-condicionado"></div>
      <div class="field"><label>Categoria *</label><select class="select" name="category">${ctx.categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantidade</label><input class="input" type="number" min="0" step="0.01" name="planned_quantity"></div>
      <div class="field"><label>Unidade de medida</label><input class="input" name="planned_unit" placeholder="un, m², serviço..."></div>
      <div class="field"><label>Estimativa inicial (R$)</label><input class="input" type="number" min="0" step="0.01" name="cost_estimate"></div>
      <div class="field span-2"><label>Descrição / especificação inicial *</label><textarea class="textarea" name="description" required placeholder="Descreva o que a unidade necessita e as características já conhecidas."></textarea></div>
      <div class="field span-2"><label>Justificativa</label><textarea class="textarea" name="impact" placeholder="Explique por que a necessidade deve entrar no planejamento do exercício escolhido."></textarea></div>
      <div class="field span-2"><label>Dependências previstas</label><div class="check-grid"><label class="check"><input type="checkbox" name="needs_budget" checked> Necessita orçamento</label><label class="check"><input type="checkbox" name="needs_contract" checked> Necessita contratação/licitação</label><label class="check"><input type="checkbox" name="needs_material"> Necessita aquisição de material</label><label class="check"><input type="checkbox" name="needs_visit"> Necessita visita/projeto técnico</label></div></div>
    </div></form>`,footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveFutureDemand">Registrar demanda futura</button>`,onOpen(){
      $('#saveFutureDemand').addEventListener('click',async()=>{const f=$('#futureDemandForm');if(!f.reportValidity())return;const payload=Object.fromEntries(new FormData(f).entries());payload.priority='P4';payload.status='Planejamento futuro';['needs_budget','needs_contract','needs_material','needs_visit'].forEach(k=>payload[k]=f.elements[k].checked);try{const res=await api('/api/demands',{method:'POST',body:payload});closeModal();toast('Demanda futura registrada',`${res.code} · Exercício ${payload.future_year}`);location.href=`/demandas/${res.id}`;}catch(e){toast('Erro ao registrar',e.message,'error')}});
    }});
  }

  async function openPlanningForm(){
    const planning=await api('/api/planning');
    const years=[...new Set([2027,2028,2029,2030,...planning.year_stats.map(x=>x.year)])].sort();
    modal({title:'Novo item de Planejamento',subtitle:'Registre uma necessidade para aquisição, contratação, obra ou projeto futuro.',mode:'drawer',body:`<form id="planningForm"><div class="form-grid">
      <div class="field"><label>Exercício *</label><select class="select" name="year" required>${years.map(y=>`<option>${y}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo *</label><select class="select" name="kind"><option>Aquisição futura</option><option>Contratação futura</option><option>Obra futura</option><option>Projeto futuro</option><option>Serviço continuado</option></select></div>
      <div class="field span-2"><label>Objeto / título *</label><input class="input" name="title" required placeholder="Ex.: Aquisição de aparelhos de ar-condicionado"></div>
      <div class="field"><label>Categoria *</label><select class="select" name="category">${ctx.categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select class="select" name="status"><option>Identificada</option><option>Em análise</option><option>Em levantamento</option><option>Consolidada</option><option>Aprovada para planejamento</option><option>Aguardando estimativa</option><option>Aguardando orçamento</option><option>Prevista no exercício</option></select></div>
      <div class="field"><label>Quantidade</label><input class="input" type="number" min="0" step="0.01" name="quantity"></div>
      <div class="field"><label>Unidade de medida</label><input class="input" name="unit" placeholder="un, m², escolas..."></div>
      <div class="field"><label>Estimativa inicial (R$)</label><input class="input" type="number" min="0" step="0.01" name="estimated_cost"></div>
      <div class="field"><label>Escolas envolvidas</label><input class="input" type="number" min="1" name="schools_count" value="1"></div>
      <div class="field span-2"><label>Justificativa</label><textarea class="textarea" name="justification" placeholder="Justifique a necessidade e o benefício esperado."></textarea></div>
    </div></form>`,footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="savePlanning">Salvar planejamento</button>`,onOpen(){
      $('#savePlanning').addEventListener('click',async()=>{const f=$('#planningForm');if(!f.reportValidity())return;try{const res=await api('/api/planning',{method:'POST',body:Object.fromEntries(new FormData(f).entries())});closeModal();toast('Planejamento registrado',res.code);renderPlanning()}catch(e){toast('Erro ao salvar',e.message,'error')}});
    }});
  }

  async function renderPlanning(){
    setLoading(); const data=await api('/api/planning'); const years=[...new Set(data.year_stats.map(x=>x.year))].sort(); const selected=Number(new URLSearchParams(location.search).get('year')||years[0]||2027);
    const stats=data.year_stats.find(x=>x.year===selected)||{items:0,total_cost:0,schools:0};
    content.innerHTML=`<section class="planning-hero"><div><span class="eyebrow" style="color:#7fe2df">PLANEJAMENTO E CONTRATAÇÕES</span><h1>Planejamento Futuro</h1><p>Consolide necessidades da rede e transforme demandas em aquisições, contratações, obras e projetos.</p></div><div><label class="form-label" style="color:#d8e8f7">EXERCÍCIO</label><select id="planningYear" class="year-select">${years.map(y=>`<option ${y===selected?'selected':''}>${y}</option>`).join('')}</select></div></section>
      <div class="stats-grid"><article class="stat-card blue"><div class="stat-label">Orçamento estimado</div><div class="stat-value" style="font-size:28px">${money(stats.total_cost)}</div><div class="stat-note">${icon('money')}Visão consolidada do exercício</div></article><article class="stat-card teal"><div class="stat-label">Itens consolidados</div><div class="stat-value">${num(stats.items)}</div><div class="stat-note">${icon('clipboard')}Objetos em planejamento</div></article><article class="stat-card orange"><div class="stat-label">Escolas impactadas</div><div class="stat-value">${num(stats.schools)}</div><div class="stat-note">${icon('school')}Soma das unidades vinculadas</div></article><article class="stat-card violet"><div class="stat-label">Ciclo administrativo</div><div class="stat-value" style="font-size:21px;margin-top:13px">Planejar → Licitar</div><div class="stat-note">${icon('trend')}Rastreabilidade do início à execução</div></article></div>
      ${pageHeader(`Planejamento ${selected}`,'Itens previstos, consolidados e em preparação para contratação.',`<button class="btn btn-secondary" id="planningHelp">${icon('info')}Como funciona</button><button class="btn btn-secondary" id="newFutureDemand">${icon('plus')}Nova Demanda Futura</button>${ctx.user.role!=='escola'?`<button class="btn btn-primary" id="newPlanning">${icon('plus')}Consolidar Item</button>`:''}`)}
      <section class="panel"><div class="panel-header"><div><h2>Demandas de aquisição e contratação</h2><p>Itens consolidados para o exercício selecionado.</p></div><div class="search-field" style="width:260px">${icon('search')}<input class="input" id="planningQ" placeholder="Pesquisar planejamento..."></div></div><div id="planningTable"></div></section>`;
    const load=async()=>{const q=$('#planningQ')?.value||'';const res=await api(`/api/planning?year=${selected}&q=${encodeURIComponent(q)}`);$('#planningTable').innerHTML=renderPlanningTable(res.items)};
    $('#planningYear').addEventListener('change',e=>location.href=`/planejamento?year=${e.target.value}`); $('#newFutureDemand')?.addEventListener('click',openFutureDemandForm); $('#newPlanning')?.addEventListener('click',openPlanningForm); let t;$('#planningQ').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(load,200)});$('#planningHelp').addEventListener('click',()=>modal({title:'Fluxo do Planejamento',mode:'center',body:`<div class="info-card accent"><h3>${icon('trend')}Do registro à execução</h3><p><strong>Demanda da escola</strong> → Análise técnica → Planejamento futuro → Consolidação → Processo administrativo → Licitação/Contratação → Contrato → Execução.</p></div><div class="alert info">A consolidação permite agrupar necessidades semelhantes de várias unidades sem perder o vínculo com cada escola de origem.</div>`})); await load();
  }
  function renderPlanningTable(items){
    if(!items.length)return empty('Nenhum item neste exercício','Cadastre uma necessidade futura ou altere o exercício.');
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Objeto consolidado</th><th>Tipo</th><th>Escolas</th><th>Estimativa</th><th>Status</th><th>Ações</th></tr></thead><tbody>${items.map(p=>`<tr><td class="mono"><strong>${esc(p.code)}</strong></td><td class="cell-title"><strong>${esc(p.title)}</strong><small>${esc(p.category)} · ${p.year}</small></td><td>${esc(p.kind)}</td><td>${num(p.schools_count)}</td><td>${money(p.estimated_cost)}</td><td><span class="status-badge future">${esc(p.status)}</span></td><td><button class="icon-btn" data-tooltip="Detalhes do planejamento">${icon('eye')}</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function renderSchools(){
    setLoading(); const schools=await loadSchools();
    content.innerHTML=pageHeader('Unidades Escolares','Visão 360° do histórico de infraestrutura por Unidade Escolar.',`<button class="btn btn-secondary" id="schoolFilter">${icon('filter')}Ordenar por criticidade</button>`)+`<div class="school-grid" id="schoolGrid">${schools.map(renderSchoolCard).join('')}</div>`;
    let critical=false;$('#schoolFilter').addEventListener('click',()=>{critical=!critical;const arr=[...schools].sort((a,b)=>critical?(b.urgent-a.urgent||b.total_demands-a.total_demands):a.name.localeCompare(b.name));$('#schoolGrid').innerHTML=arr.map(renderSchoolCard).join('');bindSchools();});bindSchools();
    function bindSchools(){$$('[data-school-id]').forEach(c=>c.addEventListener('click',()=>openSchool360(Number(c.dataset.schoolId))))}
  }
  function renderSchoolCard(s){const exec=s.total_demands?Math.round((s.completed||0)/s.total_demands*100):0;return `<article class="school-card" data-school-id="${s.id}"><div class="school-card-head"><div class="school-icon">${icon('school')}</div>${s.urgent?`<span class="badge P1">${s.urgent} urgente${s.urgent===1?'':'s'}</span>`:`<span class="badge P4">Sem urgências</span>`}</div><h3>${esc(s.name)}</h3><p>${esc(s.director||'Direção não informada')}</p><div class="school-stats"><div class="school-stat"><strong>${num(s.total_demands)}</strong><span>Demandas</span></div><div class="school-stat"><strong>${num(s.completed)}</strong><span>Concluídas</span></div><div class="school-stat"><strong>${exec}%</strong><span>Execução</span></div></div></article>`}
  async function openSchool360(id){const data=await api(`/api/schools/${id}`),s=data.school,rows=data.demands;modal({title:'Visão 360° da Unidade Escolar',subtitle:s.name,mode:'drawer',body:`<section class="info-card accent"><h3>${icon('school')}${esc(s.name)}</h3><div class="key-value"><div class="kv"><span>Direção</span><strong>${esc(s.director||'—')}</strong></div><div class="kv"><span>Contato</span><strong>${esc(s.phone||'—')} · ${esc(s.email||'—')}</strong></div><div class="kv"><span>Endereço</span><strong>${esc(s.address||'—')}</strong></div></div></section><section class="info-card"><h3>${icon('clipboard')}Histórico de demandas</h3>${rows.length?rows.map(d=>`<a class="attention-item" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.code)} · ${esc(d.status)}</small></div><span class="badge ${d.priority}">${d.priority}</span></a>`).join(''):empty()}</section>`});}

  async function renderReports(){
    setLoading(); const dash=await api('/api/dashboard');
    content.innerHTML=pageHeader('Relatórios','Extraia dados gerenciais e acompanhe os indicadores da Agenda Integrada.',`<a class="btn btn-primary" href="/api/export/demands.csv">${icon('download')}Exportar carteira completa</a>`)+`<div class="report-grid">
      ${[
        ['Carteira de Demandas','Todas as demandas com prioridade, status, prazo, responsável e estimativa.','clipboard','/api/export/demands.csv'],
        ['Demandas Urgentes','Recorte das solicitações P1 que exigem atenção imediata.','warning','/api/export/demands.csv?priority=P1'],
        ['Demandas Concluídas','Atendimentos encerrados para prestação de contas e acompanhamento.','arrow','/api/export/demands.csv?status=Concluída'],
        ['Aguardando Contratação','Necessidades dependentes de contratação, empresa ou processo licitatório.','file','/api/export/demands.csv?status=Aguardando contratação'],
        ['Planejamento Futuro','Itens programados para exercícios posteriores e consolidação de aquisições.','calendar','/planejamento'],
        ['Visão por Unidade Escolar','Acompanhe criticidade, volume e execução por escola.','school','/escolas']
      ].map(r=>`<article class="report-card"><div class="report-icon">${icon(r[2])}</div><h3>${r[0]}</h3><p>${r[1]}</p><a class="btn btn-secondary" href="${r[3]}">${icon(r[3].includes('export')?'download':'eye')}${r[3].includes('export')?'Exportar CSV':'Abrir visão'}</a></article>`).join('')}</div>
      <section class="panel mt-16"><div class="panel-header"><div><h2>Resumo executivo</h2><p>Indicadores atuais para reuniões e pactuações.</p></div></div><div class="panel-body"><div class="metric-row"><div class="metric"><span>Total de demandas</span><strong>${num(dash.stats.total)}</strong></div><div class="metric"><span>Urgentes</span><strong class="text-red">${num(dash.stats.urgent)}</strong></div><div class="metric"><span>Percentual de execução</span><strong class="text-teal">${dash.stats.execution}%</strong></div></div></div></section>`;
  }

  async function renderAdmin(){
    setLoading(); const a=await api('/api/admin/summary');
    content.innerHTML=pageHeader('Administração','Configurações, cadastros-base e integridade do ambiente.',`<button class="btn btn-secondary" id="adminInfo">${icon('info')}Sobre esta versão</button>`)+`<div class="admin-grid"><div class="admin-card"><div class="admin-value">${num(a.schools)}</div><div class="admin-label">Unidades Escolares</div></div><div class="admin-card"><div class="admin-value">${num(a.users)}</div><div class="admin-label">Usuários</div></div><div class="admin-card"><div class="admin-value">${num(a.demands)}</div><div class="admin-label">Demandas</div></div><div class="admin-card"><div class="admin-value">${num(a.planning)}</div><div class="admin-label">Itens de planejamento</div></div><div class="admin-card"><div class="admin-value">${num(a.attachments)}</div><div class="admin-label">Anexos</div></div><div class="admin-card"><div class="admin-value">${Math.max(1,Math.round(a.db_size/1024))} KB</div><div class="admin-label">Base local</div></div></div>
      <section class="panel"><div class="panel-header"><div><h2>Cadastros e parâmetros</h2><p>Estruturas que sustentam o fluxo institucional.</p></div></div><div class="panel-body"><div class="config-list"><div class="config-item">${icon('school')}<div><strong>Unidades Escolares</strong><small>Cadastro e informações institucionais.</small></div><a class="btn btn-secondary" href="/escolas">Abrir</a></div><div class="config-item">${icon('user')}<div><strong>Perfis e permissões</strong><small>Gestor, Unidade Escolar e Planejamento.</small></div><button class="btn btn-secondary" data-disabled>Estruturado</button></div><div class="config-item">${icon('clipboard')}<div><strong>Status e prioridades</strong><small>Fluxo P1–P4 e estados operacionais.</small></div><button class="btn btn-secondary" data-disabled>Parametrizado</button></div><div class="config-item">${icon('calendar')}<div><strong>Exercícios futuros</strong><small>Planejamento plurianual e consolidação.</small></div><a class="btn btn-secondary" href="/planejamento">Abrir</a></div></div></div></section>`;
    $('#adminInfo').addEventListener('click',()=>modal({title:'Sobre esta versão',mode:'center',body:`<div class="info-card accent"><h3>${icon('info')}Versão funcional demonstrativa</h3><p>Esta implementação possui backend FastAPI, banco SQLite, autenticação por sessão, perfis, CRUD de demandas, histórico, devolutivas, anexos, planejamento futuro, filtros, exportação CSV e interface responsiva.</p></div><div class="alert info">Antes de produção, altere a chave de sessão e as senhas demonstrativas e configure infraestrutura de hospedagem, backup, HTTPS e banco corporativo.</div>`}));$$('[data-disabled]').forEach(b=>b.addEventListener('click',()=>toast('Parâmetro estruturado','A edição administrativa completa pode ser conectada à base institucional na etapa de implantação.')));
  }

  async function renderAbout(){
    setLoading();
    const a=await api('/api/about');
    const roleIcons={gestor:'settings',escola:'school',planejamento:'calendar'};
    const roleLabel={gestor:'Gestor',escola:'Unidade Escolar',planejamento:'Planejamento'};
    content.innerHTML=`${pageHeader('Sobre o Sistema','Versão, tecnologia, perfis de acesso e roteiro de evolução da Agenda Integrada.',
        `<span class="badge P4" data-tooltip="Versão da aplicação">v${esc(a.version)}</span><span class="badge P3" data-tooltip="Identidade visual em uso">${esc(a.visual_version)}</span>`)}
      <div class="content-grid">
        <div>
          <section class="info-card accent">
            <h3 data-tooltip="Para que este sistema existe">${icon('info')}O que é a Agenda Integrada</h3>
            <p>A Agenda Integrada centraliza as demandas de infraestrutura das Unidades Escolares da ${esc(a.organization)}, do registro pela escola até a devolutiva técnica, execução e planejamento de exercícios futuros. O objetivo é dar clareza sobre prioridades, rastreabilidade sobre decisões e visibilidade sobre prazos e custos.</p>
          </section>
          <section class="panel mt-16">
            <div class="panel-header"><div><h2 data-tooltip="Quem acessa o sistema e o que cada perfil pode fazer">Perfis de acesso</h2><p>Cada perfil enxerga e movimenta o fluxo de um jeito diferente.</p></div></div>
            <div class="panel-body"><div class="config-list">${a.roles.map(r=>`<div class="config-item" data-tooltip="${esc(r.description)}">${icon(roleIcons[r.role]||'user')}<div><strong>${esc(roleLabel[r.role]||r.role)}</strong><small>${esc(r.description)}</small></div></div>`).join('')}</div></div>
          </section>
          <section class="panel mt-16">
            <div class="panel-header"><div><h2>Roteiro para produção</h2><p>Antes do uso institucional em larga escala, recomenda-se:</p></div></div>
            <div class="panel-body"><div class="check-grid">${[
              ['Banco corporativo','Substituir SQLite por PostgreSQL ou banco corporativo.'],
              ['Segurança de sessão','Alterar a chave AGENDA_SECRET e as credenciais demonstrativas.'],
              ['HTTPS','Configurar certificado e tráfego criptografado.'],
              ['Backup','Definir política de backup do banco e dos anexos.'],
              ['Autenticação institucional','Integrar login único (Gov.br ou SSO), se houver.'],
              ['Permissões (RBAC)','Revisar perfis conforme a estrutura real da Secretaria.'],
              ['Armazenamento de anexos','Configurar armazenamento persistente e seguro.'],
              ['Auditoria','Registrar IP e trilha de auditoria conforme normas do ambiente.'],
            ].map(x=>`<div class="check" data-tooltip="${esc(x[1])}" style="cursor:default">${icon('arrow')}<span>${esc(x[0])}</span></div>`).join('')}</div></div>
          </section>
        </div>
        <div class="side-stack">
          <section class="info-card">
            <h3 data-tooltip="Componentes usados na construção do sistema">${icon('settings')}Tecnologia</h3>
            <div class="key-value">
              <div class="kv"><span>Backend</span><strong>${esc(a.stack.backend)}</strong></div>
              <div class="kv"><span>Banco de dados</span><strong>${esc(a.stack.database)}</strong></div>
              <div class="kv"><span>Frontend</span><strong>${esc(a.stack.frontend)}</strong></div>
              <div class="kv"><span>Templates</span><strong>${esc(a.stack.templates)}</strong></div>
              <div class="kv"><span>Sessão</span><strong>${esc(a.stack.session)}</strong></div>
              <div class="kv"><span>Porta local</span><strong class="mono">${esc(a.port)}</strong></div>
            </div>
          </section>
          <section class="info-card">
            <h3 data-tooltip="Onde consultar mais detalhes">${icon('file')}Documentação</h3>
            <p>O documento <strong>PRD.md</strong>, incluído na raiz do projeto, descreve objetivos, personas, requisitos funcionais e não funcionais e o roadmap completo desta versão.</p>
          </section>
          <section class="info-card">
            <h3 data-tooltip="Precisa de ajuda para usar o sistema?">${icon('help')}Suporte</h3>
            <p>Em caso de dúvidas de uso, consulte a Central de Ajuda no menu lateral ou procure a Equipe de Infraestrutura da Secretaria.</p>
            <button class="btn btn-secondary mt-12" id="aboutHelp" data-tooltip="Abrir guia rápido de uso">${icon('help')}Abrir Central de Ajuda</button>
          </section>
        </div>
      </div>`;
    $('#aboutHelp')?.addEventListener('click',()=>$('[data-help]')?.click());
  }

  // Global interactions
  $$('[data-open-demand]').forEach(b=>b.addEventListener('click',openDemandForm));
  $('#menuButton')?.addEventListener('click',()=>{$('#sidebar').classList.add('open');showBackdrop(true)});
  $('#sideClose')?.addEventListener('click',()=>{$('#sidebar').classList.remove('open');showBackdrop(false)});
  $('#backdrop')?.addEventListener('click',()=>$('#sidebar').classList.remove('open'));
  $$('.side-menu .nav-item').forEach(a=>a.addEventListener('click',()=>{
    if (a.hasAttribute('data-help')) return;
    $('#sidebar')?.classList.remove('open');
  }));

  // Preferências visuais inspiradas no padrão Gov.br/Cidades fornecido pela Prefeitura.
  const applyTheme = dark => {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('agenda-dark-mode', dark ? '1' : '0');
  };
  applyTheme(localStorage.getItem('agenda-dark-mode') === '1');
  $('#darkModeToggle')?.addEventListener('click',()=>applyTheme(!document.body.classList.contains('dark-mode')));

  const applyLargeText = large => {
    document.body.classList.toggle('text-large', large);
    localStorage.setItem('agenda-large-text', large ? '1' : '0');
  };
  applyLargeText(localStorage.getItem('agenda-large-text') === '1');
  $('#accessibilityToggle')?.addEventListener('click',()=>{
    const large=!document.body.classList.contains('text-large');
    applyLargeText(large);
    toast(large ? 'Texto ampliado' : 'Tamanho padrão', large ? 'A interface foi ampliada para facilitar a leitura.' : 'A interface voltou ao tamanho padrão.', 'success');
  });
  $('#userMenuButton')?.addEventListener('click',()=>{const m=$('#userMenu');m.hidden=!m.hidden;$('#notificationPanel').hidden=true});
  $('#notificationButton')?.addEventListener('click',async()=>{const p=$('#notificationPanel');p.hidden=!p.hidden;$('#userMenu').hidden=true;if(!p.hidden){const d=await api('/api/dashboard');const n=[];if(d.stats.urgent)n.push([`${d.stats.urgent} demanda(s) urgente(s)`,`Prioridade P1 requer acompanhamento imediato.`]);if(d.stats.overdue)n.push([`${d.stats.overdue} prazo(s) vencido(s)`,`Revise prazos e registre reprogramações quando necessário.`]);if(d.stats.contract)n.push([`${d.stats.contract} aguardando contratação`,`Itens dependem de encaminhamento administrativo.`]);if(!n.length)n.push(['Nenhuma pendência crítica','Os principais indicadores estão sob controle.']);p.innerHTML=`<div class="notification-head"><strong>Notificações</strong><small class="text-muted">Agora</small></div>${n.map(x=>`<div class="notification-item"><span class="n-dot"></span><div><strong>${esc(x[0])}</strong><small>${esc(x[1])}</small></div></div>`).join('')}`;$('#notificationDot').hidden=true;}});
  $('[data-help]')?.addEventListener('click',e=>{e.preventDefault();modal({title:'Central de Ajuda',mode:'center',body:`<div class="info-card accent"><h3>${icon('help')}Como usar a Agenda Integrada</h3><p><strong>1.</strong> Registre a demanda com clareza e impacto.<br><strong>2.</strong> A Infraestrutura classifica prioridade, ação, responsável e prazo.<br><strong>3.</strong> Toda devolutiva fica registrada na linha do tempo.<br><strong>4.</strong> Necessidades que dependem de projeto, aquisição ou contratação podem seguir para Planejamento Futuro.</p></div>`})});

  // Global search
  const gs=$('#globalSearch'), gr=$('#globalSearchResults'); let gst;
  gs?.addEventListener('input',()=>{clearTimeout(gst);const q=gs.value.trim();if(q.length<2){gr.hidden=true;return}gst=setTimeout(async()=>{try{const rows=await api(`/api/demands?q=${encodeURIComponent(q)}`);gr.innerHTML=rows.slice(0,6).map(d=>`<a class="search-result" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.code)} · ${esc(d.school_name)}</small></div></a>`).join('') || `<div class="search-result"><div><strong>Nenhum resultado</strong><small>Tente outro termo.</small></div></div>`;gr.hidden=false;}catch{}},250)});
  document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap'))gr.hidden=true;if(!e.target.closest('#userMenuButton')&&!e.target.closest('#userMenu'))$('#userMenu').hidden=true;if(!e.target.closest('#notificationButton')&&!e.target.closest('#notificationPanel'))$('#notificationPanel').hidden=true;});

  async function init(){
    try{
      if(page==='dashboard') await renderDashboard();
      else if(page==='demands') await renderDemands();
      else if(page==='demand-detail') await renderDemandDetail();
      else if(page==='planning') await renderPlanning();
      else if(page==='schools') await renderSchools();
      else if(page==='reports') await renderReports();
      else if(page==='admin') await renderAdmin();
      else if(page==='about') await renderAbout();
    }catch(e){content.innerHTML=`${pageHeader('Não foi possível carregar esta tela','O sistema encontrou um erro ao buscar os dados.')}<div class="alert error">${esc(e.message)}</div>`;console.error(e)}
  }
  init();
})();
