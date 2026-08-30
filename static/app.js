(() => {
  const ctx = window.APP_CONTEXT || {};
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const page = document.body.dataset.page;
  const content = $('#pageContent');
  let schoolsCache = null;
  let staffCache = null;

  // Ícones, cores e dicas por categoria — vêm do servidor (tabela `categories`, editável em
  // Administração). CATEGORY_ICONS/COLORS/HINTS abaixo derivam de ctx.categoryMeta, com um
  // fallback neutro para qualquer categoria sem configuração (não deveria acontecer em uso normal).
  const CATEGORY_META = ctx.categoryMeta || {};
  const CATEGORY_ICONS = {}, CATEGORY_COLORS = {}, CATEGORY_HINTS = {};
  Object.keys(CATEGORY_META).forEach(name => {
    CATEGORY_ICONS[name] = CATEGORY_META[name].icon || 'wrench';
    CATEGORY_COLORS[name] = CATEGORY_META[name].color || 'blue';
    CATEGORY_HINTS[name] = CATEGORY_META[name].hint || '';
  });
  const URGENCY_CHOICES = [
    {value:'P3', title:'Pode esperar', hint:'Não atrapalha o dia a dia agora', icon:'clock'},
    {value:'P2', title:'Precisa de atenção logo', hint:'Já incomoda a rotina da escola', icon:'warning'},
    {value:'P1', title:'É urgente', hint:'Risco agora ou impede a aula', icon:'bolt'}
  ];
  const REACH_CHOICES = [
    {value:5, title:'Poucas pessoas', hint:'Uma sala ou um pequeno grupo', icon:'users'},
    {value:30, title:'Muitas pessoas', hint:'Vários alunos e funcionários', icon:'users'},
    {value:150, title:'Quase todo mundo', hint:'A escola inteira é afetada', icon:'globe'}
  ];
  // Agrupamento temático das categorias no assistente de registro (passo 1) — só para
  // organizar a busca em abas (Infraestrutura/Manutenção/Serviços/Administrativo/Outros);
  // não existe coluna "grupo" no banco, então isso é só uma classificação de exibição no
  // front-end, sem alterar a tabela `categories` nem nenhuma API. Categoria não listada
  // aqui cai automaticamente em "Outros".
  const CATEGORY_GROUPS = {
    'Acessibilidade':'infra','Alvenaria':'infra','Climatização':'infra','Cobertura/Telhado':'infra',
    'Elétrica':'infra','Equipamentos':'infra','Estrutura':'infra','Hidráulica':'infra','Iluminação':'infra',
    'Iluminação Externa':'infra','Iluminação Interna':'infra','Instalação':'infra','Isolamento':'infra',
    'Mobiliário':'infra','Obra':'infra','Obra/Reparo':'infra','Pintura':'infra','Portas e janelas':'infra',
    'Reforma':'infra','Refrigeração':'infra','Saneamento':'infra','Segurança':'infra','Serralheria':'infra',
    'Área externa':'infra',
    'Bombeiro Hidráulico':'manutencao','Capina':'manutencao','Conserto':'manutencao','Corte':'manutencao',
    'Dedetização':'manutencao','Desalojamento de pombos':'manutencao','Desinfecção':'manutencao',
    'Desratização':'manutencao','Jardinagem':'manutencao','Limpeza':'manutencao','Manutenção':'manutencao',
    'Montagem':'manutencao','Poda de árvore':'manutencao','Poda e Roçada':'manutencao','Reparo':'manutencao',
    'Serviço de solda':'manutencao','Substituição':'manutencao','Troca':'manutencao','Vacall':'manutencao',
    'Agendamento':'servicos','Assistência':'servicos','Automação':'servicos','Avaliação':'servicos',
    'Comunicado':'servicos','Consultoria':'servicos','Inspeção':'servicos','Inspeção Gás':'servicos',
    'Levantamento':'servicos','Reciclagem':'servicos','Retirada':'servicos','Retorno':'servicos',
    'Transporte':'servicos','Visita técnica':'servicos','Vistoria':'servicos',
    'Aquisição':'administrativo','Boletim de Ocorrência':'administrativo','Conta Luz':'administrativo',
    'Declaração':'administrativo','Informação':'administrativo','Relatório':'administrativo',
    'Resposta':'administrativo','Solicitação':'administrativo'
  };
  const CATEGORY_TABS = [
    {key:'usadas', label:'Mais usadas', icon:'star'},
    {key:'infra', label:'Infraestrutura', icon:'building'},
    {key:'manutencao', label:'Manutenção', icon:'wrench'},
    {key:'servicos', label:'Serviços', icon:'clipboard'},
    {key:'administrativo', label:'Administrativo', icon:'user'},
    {key:'outros', label:'Outros', icon:'dots'}
  ];

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
  const PRIORITY_FALLBACK = {P1:'Urgente',P2:'Alta',P3:'Programada',P4:'Planejamento/Projeto'};
  const priorityLabel = p => (ctx.priorities && ctx.priorities[p] && ctx.priorities[p].label) || PRIORITY_FALLBACK[p] || p || '—';
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

  async function loadStaff(){
    if (staffCache) return staffCache;
    staffCache = await api('/api/staff');
    return staffCache;
  }

  // Tipos de ação para a providência/encaminhamento registrado numa demanda (aba Resumo).
  const PROV_ACTION_TYPES = [
    {key:'manutencao', label:'Manutenção', icon:'wrench', color:'blue'},
    {key:'obra', label:'Obra', icon:'building', color:'green'},
    {key:'visita', label:'Visita técnica', icon:'user', color:'violet'},
    {key:'processo', label:'Processo administrativo', icon:'file', color:'orange'},
    {key:'urgente', label:'Alerta urgente', icon:'bell', color:'red'}
  ];
  const PROV_PRIORITIES = ['Baixa','Média','Alta'];

  function pageHeader(title, subtitle, actions=''){
    return `<div class="page-header"><div><span class="eyebrow">AGENDA INTEGRADA</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></div>`;
  }

  async function openDemandForm(){
    const [schools,catCounts] = await Promise.all([loadSchools(), api('/api/demands/category-counts')]);
    const counts = catCounts.counts||{};
    const schoolOptions = ctx.user.perm.school_scoped
      ? `<option value="${ctx.user.school_id}">${esc(ctx.user.school_name||'Minha unidade')}</option>`
      : schools.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
    const state = {categories:[], items:[],
      priority:'P3', reach:30, customReach:false, blocks_activity:false, risk:false, photo:null};
    const MAX_CATEGORIES = 3;

    // "Mais frequentes" = as categorias mais usadas de fato no histórico de demandas
    // (contagem real, mesma origem do filtro de Categoria na tela de Demandas) — nunca
    // uma lista inventada. Com pouco ou nenhum uso ainda, cai de volta para a ordem
    // cadastrada em Administração, então a seção nunca fica vazia.
    const FREQUENT_N = 6;
    const frequentCats = [...ctx.categories]
      .sort((a,b)=>(counts[b]||0)-(counts[a]||0))
      .slice(0,FREQUENT_N);
    const categoryCard = c => `<button type="button" class="category-card" data-category="${esc(c)}" data-group="${esc(CATEGORY_GROUPS[c]||'outros')}" data-name="${esc(c.toLowerCase())}" aria-pressed="false" data-tooltip="${esc(CATEGORY_HINTS[c]||c)}"><span class="category-icon">${icon(CATEGORY_ICONS[c]||'clipboard')}</span><strong>${esc(c)}</strong></button>`;

    modal({
      title:'Registrar Demanda/CI',
      subtitle:'Conte pra gente o que está acontecendo. Sua demanda gera soluções.',
      mode:'center',
      body:`<div class="stepper">
        <div class="step active" data-step-ind="1"><span class="step-num">1</span><span>O que houve</span></div>
        <div class="step" data-step-ind="2"><span class="step-num">2</span><span>Detalhes</span></div>
        <div class="step" data-step-ind="3"><span class="step-num">3</span><span>Impacto</span></div>
        <div class="step" data-step-ind="4"><span class="step-num">4</span><span>Enviar</span></div>
      </div>
      <form id="demandForm">
        <section data-step="1" class="form-step">
          ${!ctx.user.perm.school_scoped?`<div class="field span-2 mb-16"><label>Unidade Escolar *</label><select class="select" name="school_id" required>${schoolOptions}</select></div>`:''}
          <p class="wizard-question">Qual é o tipo de problema?</p>
          <p class="wizard-hint">Toque em até 3 opções que mais se parecem com o que você está vendo.</p>
          <p class="wizard-hint" id="categoryPickHint">Nenhum problema selecionado ainda.</p>
          <div class="category-toolbar">
            <div class="search-field">${icon('search')}<input class="input" id="categorySearch" placeholder="Pesquisar tipo de demanda..."></div>
            <div class="category-tabs" id="categoryTabs" role="tablist">
              ${CATEGORY_TABS.map((t,i)=>`<button type="button" class="category-tab${i===0?' active':''}" data-group-tab="${t.key}">${icon(t.icon)}${esc(t.label)}</button>`).join('')}
            </div>
          </div>
          <div id="categorySections">
            <div class="category-section" id="frequentSection">
              <p class="category-section-title">${icon('star')}Mais frequentes</p>
              <div class="category-grid">${frequentCats.map(categoryCard).join('')}</div>
            </div>
            <div class="category-section">
              <p class="category-section-title" id="allCategoriesTitle">Todos os tipos de demanda</p>
              <div class="category-grid" id="categoryGrid" role="group" aria-label="Tipo de problema — escolha até 3">
                ${ctx.categories.map(categoryCard).join('')}
              </div>
              <p class="wizard-hint hidden" id="categoryEmptyHint">Nenhum tipo de demanda encontrado para essa busca.</p>
            </div>
          </div>
        </section>

        <section data-step="2" class="form-step hidden">
          <div id="detailsFields"></div>
          <p class="wizard-question mt-16">Tem uma foto? <span class="wizard-optional">(opcional, mas ajuda muito)</span></p>
          <label class="upload-zone upload-zone-compact" id="photoZone">${icon('camera')}<strong>Toque para escolher uma foto</strong><small id="photoName">Nenhuma foto selecionada</small><input type="file" id="photoInput" accept="image/*,.pdf" hidden></label>
        </section>

        <section data-step="3" class="form-step hidden">
          <p class="wizard-question">Isso é urgente?</p>
          <div class="choice-grid" id="urgencyGrid" role="radiogroup" aria-label="Nível de urgência">
            ${URGENCY_CHOICES.map(u=>`<button type="button" class="choice-card ${u.value==='P3'?'active':''}" data-priority="${u.value}"><span class="choice-icon">${icon(u.icon)}</span><strong>${esc(u.title)}</strong><small>${esc(u.hint)}</small></button>`).join('')}
          </div>
          <div class="choice-grid choice-grid-3" id="reachGrid" role="radiogroup" aria-label="Pessoas afetadas">
            ${REACH_CHOICES.map(r=>`<button type="button" class="choice-card ${r.value===30?'active':''}" data-reach="${r.value}"><span class="choice-icon">${icon(r.icon)}</span><strong>${esc(r.title)}</strong><small>${esc(r.hint)}</small></button>`).join('')}
          </div>
          <button type="button" class="link-btn mt-12" id="toggleCustomReach">${icon('grid')}Prefiro informar um número exato</button>
          <div class="field mt-12 hidden" id="customReachField"><label>Número aproximado de pessoas</label><input class="input" type="number" min="0" name="affected_people_custom" placeholder="0"></div>
          <p class="wizard-question mt-16">Isso impede alguma atividade da escola?</p>
          <div class="toggle-row"><button type="button" class="toggle-btn toggle-btn-no" data-toggle="blocks_activity" data-val="0">${icon('x-circle')}Não</button><button type="button" class="toggle-btn toggle-btn-yes" data-toggle="blocks_activity" data-val="1">${icon('check-circle')}Sim</button></div>
          <p class="wizard-question mt-16">Alguém pode se machucar por causa disso?</p>
          <div class="toggle-row"><button type="button" class="toggle-btn toggle-btn-no" data-toggle="risk" data-val="0">${icon('x-circle')}Não</button><button type="button" class="toggle-btn toggle-btn-yes" data-toggle="risk" data-val="1">${icon('check-circle')}Sim</button></div>
        </section>

        <section data-step="4" class="form-step hidden"><div id="demandReview"></div></section>
      </form>`,
      footer:`<button class="btn btn-secondary hidden" id="prevStep">Voltar</button><button class="btn btn-primary" id="nextStep" disabled>Continuar</button>`,
      onOpen(root){
        let step=1;
        const form=$('#demandForm',root), next=$('#nextStep'), prev=$('#prevStep');
        const totalSteps=4;

        const syncNextEnabled=()=>{
          if(step===1) next.disabled = !state.categories.length || (!ctx.user.perm.school_scoped && !form.elements.school_id.value);
          else if(step===2) next.disabled = !state.items.length || state.items.some(it=>!it.description.trim());
          else next.disabled=false;
        };

        // Passo 1 — até 3 categorias em cards visuais
        const updateCategoryHint=()=>{
          const hint=$('#categoryPickHint',root);
          if(!hint) return;
          if(!state.categories.length) hint.textContent='Nenhum problema selecionado ainda.';
          else if(state.categories.length<MAX_CATEGORIES) hint.textContent=`${state.categories.length} de ${MAX_CATEGORIES} selecionados: ${state.categories.join(', ')}.`;
          else hint.textContent=`Limite de ${MAX_CATEGORIES} atingido: ${state.categories.join(', ')}. Toque em um selecionado para trocar.`;
        };
        // Uma mesma categoria pode aparecer duas vezes na tela (em "Mais frequentes" e em
        // "Todos os tipos de demanda"), então toda seleção precisa refletir em TODAS as
        // instâncias com o mesmo data-category, não só no botão clicado.
        const cardsFor=cat=>$$(`.category-card[data-category="${cat}"]`,root);
        const refreshCategoryOrder=()=>{
          $$('.category-card',root).forEach(b=>{
            const pos=state.categories.indexOf(b.dataset.category);
            let badge=b.querySelector('.category-order');
            if(pos>-1){
              if(!badge){ badge=document.createElement('span'); badge.className='category-order'; b.appendChild(badge); }
              badge.textContent=String(pos+1);
            } else if(badge){ badge.remove(); }
          });
        };
        $$('.category-card',root).forEach(b=>b.addEventListener('click',()=>{
          const cat=b.dataset.category;
          const idx=state.categories.indexOf(cat);
          const dupCards=cardsFor(cat);
          if(idx>-1){
            state.categories.splice(idx,1);
            const itemIdx=state.items.findIndex(it=>it.category===cat);
            if(itemIdx>-1) state.items.splice(itemIdx,1);
            dupCards.forEach(el=>{el.classList.remove('selected');el.setAttribute('aria-pressed','false');});
          } else {
            if(state.categories.length>=MAX_CATEGORIES){
              toast(`Escolha no máximo ${MAX_CATEGORIES}`,'Toque em um tipo já selecionado para liberar espaço.','error');
              return;
            }
            state.categories.push(cat);
            state.items.push({category:cat, location:'', description:'', title:''});
            dupCards.forEach(el=>{el.classList.add('selected');el.setAttribute('aria-pressed','true');});
          }
          refreshCategoryOrder();
          updateCategoryHint();
          syncNextEnabled();
        }));

        // Busca e abas por grupo temático (Mais usadas/Infraestrutura/Manutenção/...)
        // filtram só a exibição dos cartões — não mexem no estado de seleção.
        let activeGroup='usadas';
        const applyCategoryFilter=()=>{
          const q=($('#categorySearch',root)?.value||'').trim().toLowerCase();
          const frequentSection=$('#frequentSection',root);
          const allTitle=$('#allCategoriesTitle',root);
          const emptyHint=$('#categoryEmptyHint',root);
          const tabLabel=CATEGORY_TABS.find(t=>t.key===activeGroup)?.label||'Todos os tipos de demanda';
          if(q){
            frequentSection.classList.add('hidden');
            allTitle.textContent=`Resultados para "${q}"`;
          }else if(activeGroup==='usadas'){
            frequentSection.classList.remove('hidden');
            allTitle.textContent='Todos os tipos de demanda';
          }else{
            frequentSection.classList.add('hidden');
            allTitle.textContent=tabLabel;
          }
          let visibleCount=0;
          $$('#categoryGrid .category-card',root).forEach(card=>{
            const matchesQ=!q||card.dataset.name.includes(q);
            const matchesGroup=q||activeGroup==='usadas'||card.dataset.group===activeGroup;
            const show=matchesQ&&matchesGroup;
            card.classList.toggle('hidden',!show);
            if(show) visibleCount++;
          });
          emptyHint.classList.toggle('hidden',visibleCount>0);
        };
        let searchTimer;
        $('#categorySearch',root)?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(applyCategoryFilter,120);});
        $$('[data-group-tab]',root).forEach(t=>t.addEventListener('click',()=>{
          activeGroup=t.dataset.groupTab;
          $$('[data-group-tab]',root).forEach(x=>x.classList.toggle('active',x===t));
          applyCategoryFilter();
        }));
        form.elements.school_id?.addEventListener('change',syncNextEnabled);

        // Passo 2 — local e descrição, um bloco por tipo de problema escolhido
        const renderDetailsFields = () => {
          const container=$('#detailsFields',root);
          if(!container) return;
          const multi = state.items.length>1;
          container.innerHTML = (multi?`<p class="wizard-question">Conte os detalhes de cada problema</p><p class="wizard-hint">Você escolheu ${state.items.length} tipos — cada um vira uma demanda com seu próprio código.</p>`:'') +
            state.items.map((it,i)=>{const c=CATEGORY_COLORS[it.category]||'blue';return `
            <div class="detail-block ${multi?'':'detail-block-single'}" ${multi?`style="border-left:4px solid var(--${c})"`:''}>
              <div class="detail-block-head" style="color:var(--${c})"><span class="detail-icon-badge" style="background:var(--${c}-soft);color:var(--${c})">${icon(CATEGORY_ICONS[it.category]||'clipboard')}</span><strong>${i+1}. ${esc(it.category)}</strong></div>
              <p class="wizard-question">Onde isso está acontecendo?</p>
              <div class="field span-2"><input class="input" data-field="location" data-idx="${i}" placeholder="Ex.: Sala 3, banheiro do pátio, cozinha..." autocomplete="off" value="${esc(it.location)}"></div>
              <p class="wizard-question mt-16">Descreva com suas palavras</p>
              <p class="wizard-hint">O que está acontecendo, desde quando e o que você já percebeu.</p>
              <div class="field span-2"><textarea class="textarea" data-field="description" data-idx="${i}" placeholder="Ex.: Está caindo água do teto da sala 3 sempre que chove, desde a semana passada.">${esc(it.description)}</textarea></div>
              ${!multi?`<div class="field span-2 mt-16"><label>Nome curto para essa demanda</label><input class="input" data-field="title" data-idx="${i}" maxlength="140" placeholder="Preenchemos pra você — pode ajustar se quiser" value="${esc(it.title)}"></div>`:''}
            </div>`}).join('');
          const suggestItemTitle=(i)=>{
            const it=state.items[i];
            const suggestion=[it.category, it.location].filter(Boolean).join(' — ') || it.category || '';
            const titleInput=container.querySelector(`[data-field="title"][data-idx="${i}"]`);
            if(titleInput && (!titleInput.value || titleInput.dataset.auto==='1')){ titleInput.value=suggestion; titleInput.dataset.auto='1'; it.title=suggestion; }
          };
          $$('[data-field]',container).forEach(el=>{
            const i=Number(el.dataset.idx), field=el.dataset.field;
            el.addEventListener('input',()=>{
              if(field==='title') el.dataset.auto='0';
              state.items[i][field]=el.value;
              if(field==='location') suggestItemTitle(i);
              syncNextEnabled();
            });
          });
          state.items.forEach((it,i)=>suggestItemTitle(i));
        };
        $('#photoInput',root)?.addEventListener('change',e=>{
          const f=e.target.files[0]; state.photo=f||null;
          $('#photoName').textContent = f ? `${f.name} · ${Math.max(1,Math.round(f.size/1024))} KB` : 'Nenhuma foto selecionada';
          $('#photoZone').classList.toggle('has-file', !!f);
        });

        // Passo 3 — urgência, alcance e alternâncias sim/não
        $$('#urgencyGrid .choice-card',root).forEach(b=>b.addEventListener('click',()=>{
          $$('#urgencyGrid .choice-card',root).forEach(x=>x.classList.remove('active'));
          b.classList.add('active'); state.priority=b.dataset.priority;
        }));
        $$('#reachGrid .choice-card',root).forEach(b=>b.addEventListener('click',()=>{
          $$('#reachGrid .choice-card',root).forEach(x=>x.classList.remove('active'));
          b.classList.add('active'); state.reach=Number(b.dataset.reach); state.customReach=false;
          $('#customReachField').classList.add('hidden');
        }));
        $('#toggleCustomReach',root)?.addEventListener('click',()=>{
          state.customReach=true;
          $$('#reachGrid .choice-card',root).forEach(x=>x.classList.remove('active'));
          $('#customReachField').classList.remove('hidden');
          $('[name=affected_people_custom]',form).focus();
        });
        $$('.toggle-btn',root).forEach(b=>b.addEventListener('click',()=>{
          const key=b.dataset.toggle;
          $$(`.toggle-btn[data-toggle="${key}"]`,root).forEach(x=>x.classList.remove('active'));
          b.classList.add('active'); state[key]=b.dataset.val==='1';
        }));
        // valores padrão visuais
        $(`.toggle-btn[data-toggle="blocks_activity"][data-val="0"]`,root).classList.add('active');
        $(`.toggle-btn[data-toggle="risk"][data-val="0"]`,root).classList.add('active');

        const priorityLabelFriendly = p => URGENCY_CHOICES.find(u=>u.value===p)?.title || priorityLabel(p);

        const updateStep=()=>{
          $$('[data-step]',root).forEach(s=>s.classList.toggle('hidden', Number(s.dataset.step)!==step));
          $$('[data-step-ind]',root).forEach(s=>{const n=Number(s.dataset.stepInd);s.classList.toggle('active',n===step);s.classList.toggle('done',n<step);});
          prev.classList.toggle('hidden',step===1);
          next.textContent=step===totalSteps?(state.items.length>1?'Enviar demandas':'Enviar demanda'):'Continuar';
          if(step===2) renderDetailsFields();
          syncNextEnabled();
          if(step===totalSteps){
            const selectedSchoolId = ctx.user.perm.school_scoped ? ctx.user.school_id : form.elements.school_id?.value;
            const s=schools.find(x=>String(x.id)===String(selectedSchoolId));
            const reach = state.customReach ? (Number($('[name=affected_people_custom]',form).value)||0) : state.reach;
            $('#demandReview').innerHTML=`<div class="info-card accent"><h3>${icon('check-circle')}Confira antes de enviar</h3><div class="key-value">
              <div class="kv"><span>Unidade Escolar</span><strong>${esc(s?.name||ctx.user.school_name||'—')}</strong></div>
              <div class="kv"><span>Urgência</span><strong>${esc(priorityLabelFriendly(state.priority))}</strong></div>
              <div class="kv"><span>Pessoas afetadas (aprox.)</span><strong>${num(reach)}</strong></div>
              <div class="kv"><span>Impede atividade escolar?</span><strong>${state.blocks_activity?'Sim':'Não'}</strong></div>
              <div class="kv"><span>Risco de acidente?</span><strong>${state.risk?'Sim':'Não'}</strong></div>
              <div class="kv"><span>Foto anexada</span><strong>${state.photo?esc(state.photo.name):'Nenhuma'}</strong></div>
            </div></div>
            <div class="alert info">${state.items.length>1?`Serão registradas ${state.items.length} demandas, uma para cada tipo de problema — cada uma recebe um código único.`:'Depois de enviada, a demanda recebe um código único e você poderá acompanhar todo o andamento.'}</div>
            ${state.items.map((it,i)=>`<section class="info-card mt-12"><h3>${icon(CATEGORY_ICONS[it.category]||'clipboard')}${state.items.length>1?`${i+1}. `:''}${esc(it.category)}</h3><div class="key-value"><div class="kv"><span>Local</span><strong>${esc(it.location||'Não informado')}</strong></div><div class="kv"><span>Descrição</span><strong>${esc(it.description)}</strong></div></div></section>`).join('')}`;
          }
        };
        prev.addEventListener('click',()=>{step--;updateStep();});
        next.addEventListener('click', async()=>{
          if(step===1 && !state.categories.length) return;
          if(step===2 && (!state.items.length || state.items.some(it=>!it.description.trim()))) return;
          if(step<totalSteps){ step++; updateStep(); return; }
          const reach = state.customReach ? (Number($('[name=affected_people_custom]',form).value)||0) : state.reach;
          const schoolId = ctx.user.perm.school_scoped ? ctx.user.school_id : form.elements.school_id.value;
          const created=[], failed=[];
          next.disabled=true; next.textContent='Enviando...';
          for(const it of state.items){
            const title = (it.title||'').trim() || [it.category, it.location].filter(Boolean).join(' — ') || it.category;
            const payload = {
              school_id: schoolId,
              title,
              description: it.description,
              category: it.category,
              location: it.location,
              priority: state.priority,
              affected_people: reach,
              blocks_activity: state.blocks_activity,
              risk: state.risk,
            };
            try{
              const res = await api('/api/demands',{method:'POST',body:payload});
              created.push({...res, category:it.category});
              if(state.photo){
                const fd=new FormData(); fd.append('file', state.photo);
                try{ await api(`/api/demands/${res.id}/attachments`,{method:'POST',body:fd}); }
                catch(err){ toast('Demanda registrada, mas a foto não pôde ser enviada', `${res.code}: ${err.message}`, 'error'); }
              }
            }catch(err){ failed.push({category:it.category, message:err.message}); }
          }
          if(created.length){
            closeModal();
            if(created.length>1) toast('Demandas registradas com sucesso!', `${created.length} códigos gerados: ${created.map(c=>c.code).join(', ')}.`);
            else toast('Demanda registrada com sucesso!', `Código ${created[0].code} — acompanhe o andamento a qualquer momento.`);
            if(failed.length) toast('Algumas demandas não puderam ser enviadas', failed.map(f=>`${f.category}: ${f.message}`).join(' · '), 'error');
            location.href = created.length>1 ? '/demandas' : `/demandas/${created[0].id}`;
          } else {
            toast('Não foi possível enviar', failed.map(f=>f.message).join(' · ') || 'Tente novamente.', 'error');
            next.disabled=false; next.textContent=state.items.length>1?'Enviar demandas':'Enviar demanda';
          }
        });
        updateStep();
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
      ['P2','Alta prioridade (P2)',s.high,'Já incomoda a rotina, sem risco imediato','orange','bolt','Demandas de prioridade alta em aberto','priority=P2'],
      ['analysis','Em análise',s.analysis,'Triagem e avaliação técnica','orange','search','Demandas aguardando decisão técnica','status=Em análise técnica'],
      ['progress','Em andamento',s.progress,'Serviços programados ou em execução','teal','trend','Atendimentos atualmente mobilizados','status=Em execução'],
      ['contract','Aguardando contratação',s.contract,'Dependência administrativa','violet','file','Aquisição, empresa ou licitação necessária','status=Aguardando contratação'],
      ['overdue','Prazo vencido',s.overdue,'Requer atenção da gestão','red','clock','Demandas com prazo ultrapassado','overdue=1'],
      ['due_soon','Vence em 7 dias',s.due_soon,'Ainda dá tempo de agir','orange','clock','Prazo dentro dos próximos 7 dias, ainda não vencido','due_soon=1'],
      ['completed','Concluídas',s.completed,'Atendimentos finalizados','green','arrow','Demandas encerradas com registro de conclusão','status=Concluída'],
      ['future','Planejamento futuro',s.future,'Exercícios seguintes','blue','calendar','Necessidades previstas para planejamento futuro','status=Planejamento futuro'],
      ['unassigned','Sem responsável',s.unassigned,'Falta indicar quem vai cuidar disso','violet','user','Demandas em aberto sem responsável definido','unassigned=1'],
      ['open_cost','Custo em aberto',s.open_cost,'Estimativa do que ainda não foi concluído','blue','money','Soma do custo estimado de tudo que está em aberto','','money']
    ];
    const byKey=Object.fromEntries(cards.map(c=>[c[0],c]));
    const statGroups=[
      ['VISÃO GERAL',['total']],
      ['PRIORIDADES',['P1','P2']],
      ['PRAZOS CRÍTICOS',['overdue','due_soon']],
      ['ANDAMENTO DAS DEMANDAS',['analysis','progress','contract']],
      ['PLANEJAMENTO',['completed','future']],
      ['RESPONSABILIDADE',['unassigned']],
      ['CUSTO EM ABERTO',['open_cost']],
    ];
    const statTile=c=>{
      const alertCls = (c[0]==='unassigned' && c[2]>0) ? ' stat-tile-alert' : '';
      return `<article class="stat-tile ${c[4]}${alertCls}" data-dashboard-filter="${esc(c[7])}" data-tooltip="${esc(c[6])}"><div class="stat-tile-icon">${icon(c[5])}</div><div class="stat-tile-body"><div class="stat-tile-value mono">${c[8]==='money'?money(c[2]):num(c[2])}</div><div class="stat-tile-label">${esc(c[1])}</div><div class="stat-tile-note">${esc(c[3])}</div></div></article>`;
    };
    const statsGroupsHtml=`<div class="stats-groups">${statGroups.map(([label,keys])=>{
      const isCost = label==='CUSTO EM ABERTO';
      const cards = `<div class="stat-group-label">${esc(label)}</div><div class="stat-group-cards">${keys.map(k=>statTile(byKey[k])).join('')}</div>`;
      if(!isCost) return `<div class="stat-group">${cards}</div>`;
      return `<div class="stat-group stat-group-cost"><div>${cards}</div><button class="btn-cost-detail" type="button" data-tooltip="Ver o detalhamento do custo em aberto por categoria">${icon('eye')}<span>Ver detalhes</span></button></div>`;
    }).join('')}</div>`;
    const maxCat=Math.max(1,...data.categories.map(x=>x.qty));
    const CAT_PALETTE=['#005A9C','#0f7b79','#1a7c44','#c67c00','#6f42c1','#b71c1c','#0d3c75','#4ade95'];
    const totalCat=data.categories.reduce((sum,x)=>sum+x.qty,0)||1;
    let catAcc=0;
    const catGradient=data.categories.map((x,i)=>{const color=CAT_PALETTE[i%CAT_PALETTE.length];const start=catAcc/totalCat*360;catAcc+=x.qty;const end=catAcc/totalCat*360;return `${color} ${start}deg ${end}deg`;}).join(', ');
    const heroCopy = ctx.user.perm.school_scoped
      ? {eyebrow:'PRECISOU DE ALGO?', title:'Viu um problema na escola? Conte pra gente.', text:'Leva menos de 2 minutos. Escolha o tipo de problema, descreva com suas palavras e, se quiser, envie uma foto.'}
      : {eyebrow:'REGISTRO RÁPIDO', title:'Uma escola reportou algo? Registre em segundos.', text:'Use o assistente guiado para abrir uma demanda com categoria, urgência e impacto já organizados.'};
    content.innerHTML =
      `<section class="report-hero"><a class="report-hero-export" href="/api/export/demands.csv" data-tooltip="Baixar a lista completa em CSV">${icon('download')}<span>Exportar</span></a><div class="report-hero-copy"><span class="eyebrow">${heroCopy.eyebrow}</span><h2>${heroCopy.title}</h2><p>${heroCopy.text}</p></div><button class="btn-report" data-open-demand data-tooltip="Abrir o assistente de registro em 4 passos">${icon('plus')}Registrar Demanda/CI</button></section>`+
      statsGroupsHtml+
      `<div class="content-grid">
        <section class="panel"><div class="panel-header"><div><h2>Precisa de atenção</h2><p>Priorizado por criticidade e prazo.</p></div><a class="link-btn" href="/demandas">Ver todas</a></div>
          <div class="attention-list">${data.attention.length?data.attention.map(d=>{const due=dueInfo(d);return `<a class="attention-item" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.school_name)} · ${d.code}</small></div><span class="deadline ${due.cls}">${esc(due.text)}</span></a>`}).join(''):empty('Tudo em dia','Não há demandas críticas neste momento.')}</div>
        </section>
        <section class="panel"><div class="panel-header"><div><h2>Demandas por categoria</h2><p>Concentração atual da carteira. Clique para ver as demandas.</p></div></div><div class="panel-body">${data.categories.length?`<div class="category-donut-wrap"><div class="category-donut" style="background:conic-gradient(${catGradient})"><div class="category-donut-hole"><strong>${num(totalCat)}</strong><span>Total</span></div></div><div class="category-legend mini-chart">${data.categories.map((x,i)=>`<div class="bar-row" data-dashboard-filter="category=${encodeURIComponent(x.category)}" data-tooltip="Ver demandas de ${esc(x.category)}"><label title="${esc(x.category)}"><span class="legend-dot" style="background:${CAT_PALETTE[i%CAT_PALETTE.length]}"></span>${esc(x.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8,x.qty/maxCat*100)}%;background:${CAT_PALETTE[i%CAT_PALETTE.length]}"></div></div><b>${x.qty}</b></div>`).join('')}</div></div><a class="link-btn category-see-all" href="/demandas" data-tooltip="Ver todas as demandas por categoria">Ver todas as categorias ${icon('arrow')}</a>`:empty('Sem categorias','Ainda não há demandas categorizadas.')}</div></section>
      </div>
      <section class="panel"><div class="panel-header"><div><h2>Atividade recente</h2><p>Últimas demandas atualizadas.</p></div><a class="link-btn" href="/demandas">Abrir lista completa</a></div>${renderDemandTable(data.recent,true)}</section>
      <section class="panel mt-16"><div class="panel-header"><div><h2>Indicador de execução</h2><p>Percentual das demandas registradas que já foram concluídas.</p></div><strong class="text-teal mono">${s.execution}%</strong></div><div class="panel-body"><div class="bar-track" style="height:14px"><div class="bar-fill" style="width:${Math.min(100,s.execution)}%"></div></div></div></section>`;
    $$('[data-open-demand]',content).forEach(b=>b.addEventListener('click',openDemandForm));
    $$('[data-dashboard-filter]').forEach(card=>card.addEventListener('click',()=>{
      const f=card.dataset.dashboardFilter;
      location.href=f?`/demandas?${f}`:'/demandas';
    }));
    $('.btn-cost-detail',content)?.addEventListener('click',()=>openCostDetail(data));
  }

  function openCostDetail(data){
    const s=data.stats;
    const breakdown=data.cost_breakdown||[];
    const top=data.cost_top||[];
    const maxB=Math.max(1,...breakdown.map(x=>x.cost||0));
    const body=`
      <div class="metric-row" style="grid-template-columns:repeat(2,1fr)">
        <div class="metric"><span>Total em aberto</span><strong>${money(s.open_cost)}</strong></div>
        <div class="metric"><span>Categorias com custo pendente</span><strong>${num(breakdown.length)}</strong></div>
      </div>
      ${breakdown.length?`<div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Por categoria</h3><div class="mini-chart">${breakdown.map(c=>`<div class="bar-row" data-dashboard-filter="category=${encodeURIComponent(c.category)}" data-tooltip="Ver demandas de ${esc(c.category)}"><label title="${esc(c.category)}">${esc(c.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8,(c.cost||0)/maxB*100)}%"></div></div><b>${money(c.cost||0)}</b></div>`).join('')}</div></div>`:''}
      ${top.length?`<div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Maiores custos em aberto</h3><div class="side-stack">${top.map(d=>`<a class="info-card" href="/demandas/${d.id}" style="display:block;text-decoration:none;color:inherit;margin-bottom:0;padding:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong style="font-size:13px">${esc(d.title)}</strong><span class="badge ${d.priority}">${d.priority}</span></div><p style="margin:4px 0 8px;color:var(--muted);font-size:11.5px">${esc(d.school_name)} · ${d.code}</p><strong class="mono">${money(d.cost_estimate||0)}</strong></a>`).join('')}</div></div>`:''}
      ${!breakdown.length&&!top.length?empty('Sem custos em aberto','Não há demandas em aberto com custo estimado no momento.'):''}
    `;
    modal({title:'Custo em Aberto — Detalhamento',subtitle:'Estimativa do que ainda não foi concluído',mode:'drawer',body});
    $$('#modalRoot [data-dashboard-filter]').forEach(row=>row.addEventListener('click',()=>{
      location.href=`/demandas?${row.dataset.dashboardFilter}`;
    }));
  }

  function renderDemandTable(rows, compact=false, filterable=false, filters=null){
    if(!rows?.length) return empty();
    const th=(label,field)=>{
      if(!filterable||!field) return `<th>${label}</th>`;
      const active = filters && filters[field];
      return `<th class="th-filter${active?' active':''}" data-th-filter="${field}">${label}${icon('chevron')}</th>`;
    };
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Demanda</th>${compact?'':th('Categoria','category')}<th>Unidade Escolar</th>${th('Prioridade','priority')}${th('Status','status')}<th>Prazo</th><th>Ações</th></tr></thead><tbody>${rows.map(d=>{
      const due=dueInfo(d);return `<tr data-href="/demandas/${d.id}" class="${d.status==='Concluída'?'row-done':''}"><td class="mono" data-label="ID"><strong>${esc(d.code)}</strong></td><td class="cell-title" data-label="Demanda"><strong>${esc(d.title)}</strong><small>Atualizado ${fmtDateTime(d.updated_at)}</small></td>${compact?'':`<td data-label="Categoria">${esc(d.category)}</td>`}<td data-label="Unidade Escolar">${esc(d.school_name||'—')}</td><td data-label="Prioridade"><span class="badge ${d.priority}">${d.priority} · ${priorityLabel(d.priority)}</span></td><td data-label="Status"><span class="status-badge ${statusClass(d.status)}">${esc(d.status)}</span></td><td data-label="Prazo"><span class="deadline ${due.cls}">${esc(due.text)}</span></td><td data-label="Ações"><a class="icon-btn" href="/demandas/${d.id}" aria-label="Ver detalhes" data-tooltip="Ver detalhes">${icon('eye')}</a></td></tr>`}).join('')}</tbody></table></div>`;
  }

  async function renderDemands(){
    setLoading();
    const query=new URLSearchParams(location.search);
    const [schools,dash,catCounts]=await Promise.all([loadSchools(), api('/api/dashboard'), api('/api/demands/category-counts')]);
    const ds=dash.stats;
    const counts=catCounts.counts||{};
    const filters={q:query.get('q')||'',status:query.get('status')||'',priority:query.get('priority')||'',category:query.get('category')||'',year:query.get('year')||'2026',overdue:query.get('overdue')==='1',due_soon:query.get('due_soon')==='1',unassigned:query.get('unassigned')==='1'};
    content.innerHTML = pageHeader('Demandas Escolares','Gerencie, filtre e acompanhe todas as solicitações de infraestrutura.',`<a class="btn btn-secondary" href="/api/export/demands.csv" data-tooltip="Baixar a lista filtrada em CSV">${icon('download')}Exportar CSV</a><button class="btn btn-primary" data-open-demand data-tooltip="Abrir o assistente de registro">${icon('plus')}Registrar Demanda/CI</button>`)+
      `<section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" value="${esc(filters.q)}" placeholder="Código, demanda ou escola..."></div></div>
        <div class="field"><label>Ano</label><select class="select" id="fYear"><option value="">Todos</option>${[2026,2025,2024].map(y=>`<option ${String(y)===filters.year?'selected':''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="select" id="fStatus"><option value="">Todos</option>${ctx.statuses.map(x=>`<option ${x===filters.status?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x=>`<option value="${x}" ${x===filters.priority?'selected':''}>${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x=>`<option value="${esc(x)}" ${x===filters.category?'selected':''}>${esc(x)} (${num(counts[x]||0)})</option>`).join('')}</select></div>
        <button class="btn btn-secondary" id="clearFilters">${icon('filter')}Limpar</button>
      </section>
      <div class="quick-filters">
        <div class="chip-group">${[
          filters.overdue?['overdueChip','Prazo vencido']:null,
          filters.due_soon?['dueSoonChip','Vence em 7 dias']:null,
          filters.unassigned?['unassignedChip','Sem responsável']:null,
        ].filter(Boolean).map(([id,label])=>`<button class="chip active" id="${id}">${esc(label)} ×</button>`).join('')}<button class="chip-v2 chip-red" data-chip-priority="P1">${icon('warning')}<span>P1 Urgentes</span><b>${num(ds.urgent)}</b></button><button class="chip-v2 chip-orange" data-chip-status="Aguardando contratação">${icon('clock')}<span>Aguardando contratação</span><b>${num(ds.contract)}</b></button><button class="chip-v2 chip-blue" data-chip-status="Em execução">${icon('trend')}<span>Em execução</span><b>${num(ds.progress)}</b></button><button class="chip-v2 chip-violet" data-chip-status="Planejamento futuro">${icon('calendar')}<span>Planejamento futuro</span><b>${num(ds.future)}</b></button><button class="chip-v2 chip-green" data-chip-status="Concluída" id="completedChip">${icon('check-circle')}<span>Concluídas</span><b>${num(ds.completed)}</b></button></div>
        <div class="quick-filters-divider"></div>
        <label class="toggle-field" data-tooltip="Mostra ou oculta demandas concluídas na tabela abaixo">
          <div class="toggle-field-copy">${icon('eye')}<div><strong>Exibir concluídas</strong><small>Mostra ou oculta demandas concluídas.</small></div></div>
          <span class="switch"><input type="checkbox" id="toggleCompleted" checked><span class="switch-track"></span></span>
        </label>
      </div>
      <section class="panel" id="demandsPanel"><div class="panel-header"><div><h2>Carteira de demandas</h2><p id="demandCount">Carregando...</p></div></div><div id="demandTable"></div></section>`;
    $('[data-open-demand]',content).addEventListener('click',openDemandForm);
    const load=async()=>{
      const params=new URLSearchParams();
      const map={q:$('#fQ').value,status:$('#fStatus').value,priority:$('#fPriority').value,category:$('#fCategory').value,year:$('#fYear').value};
      Object.entries(map).forEach(([k,v])=>{if(v)params.set(k,v)});
      if(filters.overdue) params.set('overdue','1');
      if(filters.due_soon) params.set('due_soon','1');
      if(filters.unassigned) params.set('unassigned','1');
      $('#demandTable').innerHTML=`<div class="empty-state"><p>Atualizando lista...</p></div>`;
      const rows=await api('/api/demands?'+params.toString());
      // "Exibir concluídas" é um filtro só de exibição, aplicado sobre os dados já
      // carregados — não muda a consulta ao backend nem os outros filtros.
      const showCompleted=$('#toggleCompleted')?.checked !== false;
      const visibleRows=showCompleted?rows:rows.filter(d=>d.status!=='Concluída');
      $('#demandCount').textContent=`${visibleRows.length} registro${visibleRows.length===1?'':'s'} encontrado${visibleRows.length===1?'':'s'}`;
      $('#demandTable').innerHTML=renderDemandTable(visibleRows,false,true,{category:$('#fCategory').value,priority:$('#fPriority').value,status:$('#fStatus').value});
    };
    const THFILTER_OPTIONS={
      category:()=>ctx.categories.map(x=>({value:x,label:x})),
      priority:()=>Object.keys(ctx.priorities).map(x=>({value:x,label:`${x} · ${priorityLabel(x)}`})),
      status:()=>ctx.statuses.map(x=>({value:x,label:x}))
    };
    const FIELD_SELECT={category:'#fCategory',priority:'#fPriority',status:'#fStatus'};
    const closeThMenu=()=>{ $('#thFilterMenu')?.remove(); };
    $('#demandsPanel').addEventListener('click',e=>{
      const t=e.target.closest('[data-th-filter]');
      if(!t) return;
      e.stopPropagation();
      const field=t.dataset.thFilter;
      const existing=$('#thFilterMenu');
      const already=existing && existing.dataset.for===field;
      closeThMenu();
      if(already) return;
      const rect=t.getBoundingClientRect();
      const menu=document.createElement('div');
      menu.className='th-filter-menu'; menu.id='thFilterMenu'; menu.dataset.for=field;
      menu.style.top=(rect.bottom+6)+'px'; menu.style.left=Math.min(rect.left,window.innerWidth-220)+'px';
      menu.innerHTML=`<button data-val="">Todas</button>`+THFILTER_OPTIONS[field]().map(o=>`<button data-val="${esc(o.value)}">${esc(o.label)}</button>`).join('');
      document.body.appendChild(menu);
      menu.addEventListener('click',ev=>{
        const b=ev.target.closest('button'); if(!b) return;
        $(FIELD_SELECT[field]).value=b.dataset.val;
        closeThMenu(); load();
      });
    });
    document.addEventListener('click',e=>{ if(!e.target.closest('.th-filter-menu') && !e.target.closest('[data-th-filter]')) closeThMenu(); });
    let timer; $('#fQ').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(load,250)});
    ['#fYear','#fStatus','#fPriority','#fCategory'].forEach(id=>$(id).addEventListener('change',load));
    $('#clearFilters').addEventListener('click',()=>{filters.overdue=false;filters.due_soon=false;filters.unassigned=false;['#fQ','#fStatus','#fPriority','#fCategory'].forEach(id=>$(id).value='');$('#fYear').value='2026';$('#overdueChip')?.remove();$('#dueSoonChip')?.remove();$('#unassignedChip')?.remove();load();});
    $$('[data-chip-status]').forEach(b=>b.addEventListener('click',()=>{
      $('#fStatus').value=b.dataset.chipStatus;
      // Ao clicar em "Concluídas", garante que o toggle "Exibir concluídas" esteja
      // ligado — senão o filtro de exibição esconderia o próprio resultado pedido.
      if(b.dataset.chipStatus==='Concluída' && $('#toggleCompleted')) $('#toggleCompleted').checked=true;
      load();
    }));
    $$('[data-chip-priority]').forEach(b=>b.addEventListener('click',()=>{$('#fPriority').value=b.dataset.chipPriority;load()}));
    $('#toggleCompleted')?.addEventListener('change',load);
    $('#overdueChip')?.addEventListener('click',()=>{filters.overdue=false;$('#overdueChip').remove();load()});
    $('#dueSoonChip')?.addEventListener('click',()=>{filters.due_soon=false;$('#dueSoonChip').remove();load()});
    $('#unassignedChip')?.addEventListener('click',()=>{filters.unassigned=false;$('#unassignedChip').remove();load()});
    await load();
  }

  function detailTabContent(name, payload){
    const d=payload.demand;
    if(name==='summary'){
      const catColor=CATEGORY_COLORS[d.category]||'blue', catIcon=CATEGORY_ICONS[d.category]||'clipboard';
      const provType=PROV_ACTION_TYPES.find(t=>t.key===d.prov_action_type);
      const provStep = !d.prov_action_type ? 0 : (!d.prov_responsible ? 1 : (statusClass(d.status)==='completed' ? 4 : (statusClass(d.status)==='execution' ? 3 : 2)));
      const defaultResp = d.prov_responsible || (ctx.user ? ctx.user.name : '');
      const staffOptions = (payload.staff||[]).map(s=>`<option value="${esc(s.name)}" ${s.name===defaultResp?'selected':''}>${esc(s.name)}</option>`).join('');
      return `<div class="detail-layout"><div>
      <section class="info-card accent"><h3>${icon('clipboard')}Descrição</h3><p>${esc(d.description)}</p></section>
      <div class="info-stat-row">
        <div class="info-stat"><span class="info-stat-icon" style="background:var(--${catColor}-soft);color:var(--${catColor})">${icon(catIcon)}</span><div><span>Categoria</span><strong>${esc(d.category)}</strong></div></div>
        <div class="info-stat"><span class="info-stat-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('money')}</span><div><span>Custo estimado</span><strong>${money(d.cost_estimate)}</strong></div></div>
        <div class="info-stat"><span class="info-stat-icon" style="background:var(--violet-soft);color:var(--violet)">${icon('users')}</span><div><span>Pessoas afetadas</span><strong>${num(d.affected_people)}</strong></div></div>
      </div>
      ${d.subcategory?`<p class="wizard-hint mt-12">Também identificado como: <strong>${esc(d.subcategory)}</strong></p>`:''}
      <section class="info-card mt-16"><h3>${icon('warning')}Impacto</h3><p>${esc(d.impact||'Impacto não detalhado.')}</p></section>

      <section class="info-card mt-16 prov-form-card">
        <h3>${icon('send')}Providência / Encaminhamento</h3>
        <p class="wizard-hint">Registre a ação tomada para essa demanda e mantenha a escola informada.</p>
        <p class="wizard-question mt-16">Tipo de ação</p>
        <div class="prov-type-row" id="provTypeRow">${PROV_ACTION_TYPES.map(t=>`<button type="button" class="prov-type-chip ${d.prov_action_type===t.key?'active':''}" data-prov-type="${t.key}" style="--chip-color:var(--${t.color});--chip-soft:var(--${t.color}-soft)"><span class="prov-type-icon">${icon(t.icon)}</span>${esc(t.label)}</button>`).join('')}</div>
        <div class="prov-form-grid mt-16">
          <div class="field"><label>Responsável</label><select class="select" id="provResponsible"><option value="">Selecionar responsável...</option>${staffOptions}</select></div>
          <div class="field"><label>Prazo</label><input class="input" type="date" id="provDueDate" value="${esc(d.prov_due_date||'')}"></div>
          <div class="field"><label>Prioridade</label><select class="select" id="provPriority"><option value="">Selecionar...</option>${PROV_PRIORITIES.map(p=>`<option ${p===d.prov_priority?'selected':''}>${p}</option>`).join('')}</select></div>
          <div class="field span-3"><label>Observação</label><textarea class="textarea" id="provNote" placeholder="Detalhe a providência tomada ou o encaminhamento dado...">${esc(d.prov_note||'')}</textarea></div>
        </div>
        <div class="prov-form-footer">
          <button type="button" class="attach-btn" id="provAttachBtn">${icon('paperclip')}Anexar documento</button>
          <input type="file" id="provAttachInput" hidden>
          <label class="prov-notify-row"><span>Notificar escola</span><span class="switch"><input type="checkbox" id="provNotify" ${d.prov_notify_school?'checked':''}><span class="switch-track"></span></span></label>
        </div>
        <div class="prov-form-actions">
          <button type="button" class="btn btn-secondary" id="saveProvidence">${icon('bookmark')}Salvar providência</button>
          <button type="button" class="btn btn-primary" id="saveProvidenceNotify">${icon('send')}Salvar e enviar devolutiva</button>
        </div>
      </section>

      <section class="info-card mt-16 flow-card">
        <h3>${icon('trend')}Fluxo da providência</h3>
        <div class="flow-stepper">
          <div class="flow-step ${provStep>=1?'done':''}"><div class="flow-step-marker"><span class="flow-step-num">1</span><span class="flow-step-badge">${icon('building')}</span></div><strong>Providência registrada</strong><small>Encaminhamento criado e tipo de ação definido</small></div>
          <div class="flow-connector ${provStep>=2?'done':''}"></div>
          <div class="flow-step ${provStep>=2?'done':''}"><div class="flow-step-marker outline">${icon('user')}</div><strong>Responsável designado</strong><small>Equipe ou setor assumiu o encaminhamento</small></div>
          <div class="flow-connector ${provStep>=3?'done':''}"></div>
          <div class="flow-step ${provStep>=3?'done':''}"><div class="flow-step-marker outline"><span class="flow-step-num">3</span></div><strong>Em execução</strong><small>Ação em andamento junto à unidade</small></div>
          <div class="flow-connector ${provStep>=4?'done':''}"></div>
          <div class="flow-step ${provStep>=4?'done':''}"><div class="flow-step-marker outline">${icon('check-circle')}</div><strong>Providência concluída</strong><small>Encaminhamento finalizado e escola notificada</small></div>
        </div>
      </section>
    </div><aside class="side-stack">
      <section class="info-card"><h3>${icon('school')}Unidade Escolar</h3><div class="key-value"><div class="kv"><span>Unidade</span><strong>${esc(d.school_name)}</strong></div><div class="kv"><span>Direção</span><strong>${esc(d.director||'—')}</strong></div><div class="kv"><span>Local da ocorrência</span><strong>${esc(d.location||'—')}</strong></div><div class="kv"><span>Endereço</span><strong>${esc(d.address||'—')}</strong></div></div></section>
      <section class="info-card providence-status"><h3>${icon('send')}Status da providência</h3>${provType?`<div class="prov-status-type" style="--chip-color:var(--${provType.color});--chip-soft:var(--${provType.color}-soft)"><span class="prov-type-icon">${icon(provType.icon)}</span>${esc(provType.label)}</div><div class="key-value mt-12"><div class="kv"><span>Responsável</span><strong>${esc(d.prov_responsible||'Não definido')}</strong></div><div class="kv"><span>Prazo</span><strong>${fmtDate(d.prov_due_date)}</strong></div><div class="kv"><span>Prioridade</span><strong>${esc(d.prov_priority||'Não definida')}</strong></div></div>`:`<p>Nenhuma providência registrada ainda.</p>`}</section>
      <section class="info-card"><h3>${icon('warning')}Sinais de atenção</h3>${d.risk?`<div class="impact-item">${icon('warning')}<span>Há risco informado à comunidade escolar.</span></div>`:''}${d.blocks_activity?`<div class="impact-item">${icon('clock')}<span>Impacta ou impede atividade escolar.</span></div>`:''}${!d.risk&&!d.blocks_activity?`<p>Nenhum sinal crítico registrado.</p>`:''}</section>
    </aside></div>`;
    }
    if(name==='technical') return `<div class="detail-layout"><div>
      <section class="info-card accent"><h3>${icon('settings')}Análise Técnica</h3><div class="key-value"><div class="kv"><span>Parecer técnico</span><strong>${esc(d.technical_opinion||'Ainda não registrado.')}</strong></div><div class="kv"><span>Ação definida</span><strong>${esc(d.action_defined||'Ainda não definida.')}</strong></div><div class="kv"><span>Dependências</span><strong>${esc(d.dependencies||'Nenhuma dependência registrada.')}</strong></div></div></section>
      ${ctx.user.perm.can_edit_analysis?`<button class="btn btn-primary" id="editTechnical">${icon('edit')}Atualizar análise técnica</button>`:''}
    </div><aside class="side-stack"><section class="info-card"><h3>${icon('user')}Responsabilidade</h3><div class="key-value"><div class="kv"><span>Responsável</span><strong>${esc(d.responsible||'Não definido')}</strong></div><div class="kv"><span>Setor</span><strong>${esc(d.sector||'Não definido')}</strong></div><div class="kv"><span>Prazo</span><strong>${fmtDate(d.due_date)}</strong></div></div></section><section class="info-card"><h3>${icon('info')}Dependências operacionais</h3><div class="check-grid"><span class="check">${d.needs_visit?'✓':'—'} Visita técnica</span><span class="check">${d.needs_budget?'✓':'—'} Orçamento</span><span class="check">${d.needs_material?'✓':'—'} Material</span><span class="check">${d.needs_contract?'✓':'—'} Contratação</span></div></section></aside></div>`;
    if(name==='responses') return `<div class="detail-layout"><div>
      <div class="composer"><textarea id="updateMessage" placeholder="Registre uma devolutiva, orientação, informação complementar ou andamento..."></textarea><div class="composer-actions"><span class="text-muted" style="font-size:10px">A mensagem ficará registrada no histórico.</span><button class="btn btn-primary" id="sendUpdate">${icon('message')}Registrar devolutiva</button></div></div>
      <section class="info-card"><h3>${icon('message')}Linha do tempo de devolutivas</h3>${renderTimeline(payload.updates.filter(x=>x.kind==='Devolutiva'||x.kind==='Status'||x.kind==='Alteração'))}</section>
    </div><aside class="side-stack"><section class="info-card"><h3>${icon('info')}Boa devolutiva</h3><p>Informe o que foi analisado, qual é o próximo passo, quem está responsável e a previsão atualizada.</p></section></aside></div>`;
    if(name==='attachments') return `<section class="info-card"><h3>${icon('paperclip')}Anexos</h3><label class="upload-zone" id="uploadZone">${icon('paperclip')}<strong>Arraste um arquivo ou clique para selecionar</strong><small>PDF, DOCX, XLSX e imagens · até 12 MB</small><input type="file" id="attachmentInput" hidden></label>${renderFiles(payload.attachments)}</section>`;
    if(name==='history') return `<section class="info-card"><h3>${icon('clock')}Histórico completo</h3>${renderTimeline(payload.updates)}</section>`;
    if(name==='planning') return `<div class="detail-layout"><div><section class="info-card accent"><h3>${icon('calendar')}Planejamento</h3>${d.future_year?`<p>Esta demanda está vinculada ao planejamento do exercício de <strong>${d.future_year}</strong>.</p><div class="metric-row mt-16"><div class="metric"><span>Tipo</span><strong>${esc(d.planning_kind||'Planejamento futuro')}</strong></div><div class="metric"><span>Quantidade</span><strong>${num(d.planned_quantity||0)} ${esc(d.planned_unit||'')}</strong></div><div class="metric"><span>Estimativa</span><strong>${money(d.cost_estimate)}</strong></div></div>`:`<p>Esta demanda ainda não foi destinada a um exercício futuro.</p>`}</section>
      ${ctx.user.perm.can_edit_analysis?`<button class="btn btn-primary" id="editPlanningLink">${icon('calendar')}${d.future_year?'Editar planejamento':'Destinar a um exercício futuro'}</button>`:''}
      ${payload.planning.length?payload.planning.map(p=>`<section class="info-card mt-16"><div class="detail-code-line"><span class="badge P4">${esc(p.code)}</span><span class="status-badge future">${esc(p.status)}</span></div><h3 style="margin-top:12px">${esc(p.title)}</h3><div class="metric-row"><div class="metric"><span>Exercício</span><strong>${p.year}</strong></div><div class="metric"><span>Estimativa</span><strong>${money(p.estimated_cost)}</strong></div><div class="metric"><span>Escolas</span><strong>${p.schools_count}</strong></div></div></section>`).join(''):''}</div><aside class="side-stack"><section class="info-card"><h3>${icon('info')}Fluxo futuro</h3><p>Demanda → Planejamento → Consolidação → Processo administrativo → Licitação/Contratação → Execução.</p></section></aside></div>`;
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

  // Aba "Planejamento" da demanda — usa os mesmos campos de planejamento futuro
  // (future_year, planning_kind, planned_quantity, planned_unit) já aceitos pelo
  // PUT /api/demands/{id} (mesma rota usada em "Editar análise"), só que num formulário
  // dedicado e acessível direto na aba, em vez de misturado com a análise técnica.
  const PLANNING_KINDS = ['Aquisição futura','Contratação futura','Obra futura','Projeto futuro','Serviço continuado'];
  async function openEditPlanning(d, reload){
    modal({title:'Planejamento Futuro',subtitle:`${d.code} · ${d.title}`,mode:'drawer',body:`<form id="planningLinkForm"><div class="form-grid">
      <div class="field"><label>Exercício futuro</label><input class="input" type="number" min="2026" max="2035" name="future_year" value="${esc(d.future_year||'')}" placeholder="Ex.: 2027"></div>
      <div class="field"><label>Tipo de necessidade</label><select class="select" name="planning_kind"><option value="">Não definido</option>${PLANNING_KINDS.map(k=>`<option ${k===d.planning_kind?'selected':''}>${esc(k)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantidade</label><input class="input" type="number" min="0" step="0.01" name="planned_quantity" value="${esc(d.planned_quantity||'')}"></div>
      <div class="field"><label>Unidade de medida</label><input class="input" name="planned_unit" value="${esc(d.planned_unit||'')}" placeholder="un, m², serviço..."></div>
      <div class="field span-2"><label>Estimativa de custo (R$)</label><input class="input" type="number" min="0" step="0.01" name="cost_estimate" value="${esc(d.cost_estimate||0)}"></div>
    </div><p class="wizard-hint mt-12">Deixe o exercício em branco para remover o vínculo desta demanda com o planejamento futuro.</p></form>`,
      footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="savePlanningLink">Salvar planejamento</button>`,onOpen(){
      $('#savePlanningLink').addEventListener('click',async()=>{
        const f=$('#planningLinkForm');
        const payload=Object.fromEntries(new FormData(f).entries());
        try{
          await api(`/api/demands/${d.id}`,{method:'PUT',body:payload});
          closeModal();
          toast('Planejamento atualizado', payload.future_year?`Demanda destinada ao exercício ${payload.future_year}.`:'Vínculo com exercício futuro removido.');
          await reload();
        }catch(e){ toast('Não foi possível salvar', e.message, 'error'); }
      });
    }});
  }

  async function renderDemandDetail(){
    setLoading();
    const id=Number(document.body.dataset.entityId);
    let [payload,staff]=await Promise.all([api(`/api/demands/${id}`), loadStaff().catch(()=>[])]);
    payload.staff=staff; let active='summary';
    const render=()=>{
      const d=payload.demand, due=dueInfo(d);
      content.innerHTML=`<div class="breadcrumb"><a href="/demandas">Demandas</a><span>›</span><span>${esc(d.code)}</span></div>
        <div class="detail-head"><div><div class="detail-code-line"><span class="code-label">${esc(d.code)}</span><span class="badge ${d.priority}">${d.priority} · ${priorityLabel(d.priority)}</span><span class="status-badge ${statusClass(d.status)}">${esc(d.status)}</span><span class="deadline ${due.cls}">${esc(due.text)}</span></div><h1>${esc(d.title)}</h1></div><div class="page-actions">${ctx.user.perm.can_edit_analysis?`<button class="btn btn-secondary" id="editDemand">${icon('edit')}Editar análise</button>`:''}<button class="btn btn-primary" id="quickUpdate">${icon('message')}Devolutiva</button></div></div>
        <nav class="tabs" aria-label="Detalhes da demanda"><button class="tab ${active==='summary'?'active':''}" data-tab="summary">${icon('file')}Resumo</button><button class="tab ${active==='technical'?'active':''}" data-tab="technical">${icon('settings')}Análise Técnica</button><button class="tab ${active==='responses'?'active':''}" data-tab="responses">${icon('message')}Devolutivas</button><button class="tab ${active==='attachments'?'active':''}" data-tab="attachments">${icon('paperclip')}Anexos <span class="badge P3">${payload.attachments.length}</span></button><button class="tab ${active==='history'?'active':''}" data-tab="history">${icon('clock')}Histórico</button><button class="tab ${active==='planning'?'active':''}" data-tab="planning">${icon('calendar')}Planejamento</button><button class="tab tab-accent" data-tab="providencias">${icon('send')}Providências</button></nav>
        <div id="tabContent">${detailTabContent(active,payload)}</div>`;
      const reload=async()=>{payload=await api(`/api/demands/${id}`);payload.staff=staff;render()};
      $$('[data-tab]',content).forEach(b=>b.addEventListener('click',()=>{
        if(b.dataset.tab==='providencias'){ active='summary'; render(); setTimeout(()=>$('.prov-form-card')?.scrollIntoView({behavior:'smooth',block:'start'}),20); return; }
        active=b.dataset.tab; render();
      }));
      $('#editDemand')?.addEventListener('click',()=>openEditTechnical(d,reload));
      $('#editTechnical')?.addEventListener('click',()=>openEditTechnical(d,reload));
      $('#editPlanningLink')?.addEventListener('click',()=>openEditPlanning(d,reload));
      $$('#provTypeRow .prov-type-chip',content).forEach(chip=>chip.addEventListener('click',()=>{
        const already=chip.classList.contains('active');
        $$('#provTypeRow .prov-type-chip',content).forEach(c=>c.classList.remove('active'));
        if(!already) chip.classList.add('active');
      }));
      const provAttachInput=$('#provAttachInput');
      $('#provAttachBtn')?.addEventListener('click',()=>provAttachInput?.click());
      provAttachInput?.addEventListener('change',()=>provAttachInput.files[0]&&upload(provAttachInput.files[0]));
      const saveProv=async(sendUpdate)=>{
        const type=$('#provTypeRow .prov-type-chip.active')?.dataset.provType||'';
        const body={
          prov_action_type:type,
          prov_responsible:$('#provResponsible').value,
          prov_due_date:$('#provDueDate').value,
          prov_priority:$('#provPriority').value,
          prov_note:$('#provNote').value,
          prov_notify_school:$('#provNotify').checked
        };
        try{
          await api(`/api/demands/${id}`,{method:'PUT',body});
          if(sendUpdate){
            const typeLabel=PROV_ACTION_TYPES.find(t=>t.key===type)?.label||'Providência';
            const msg=(body.prov_note||'').trim() || `Providência registrada: ${typeLabel}${body.prov_responsible?` · Responsável: ${body.prov_responsible}`:''}${body.prov_due_date?` · Prazo: ${fmtDate(body.prov_due_date)}`:''}`;
            await api(`/api/demands/${id}/updates`,{method:'POST',body:{kind:'Devolutiva',message:msg}});
          }
          toast(sendUpdate?'Providência salva e devolutiva enviada':'Providência salva');
          await reload();
        }catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      };
      $('#saveProvidence')?.addEventListener('click',()=>saveProv(false));
      $('#saveProvidenceNotify')?.addEventListener('click',()=>saveProv(true));
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
    const schoolOptions=ctx.user.perm.school_scoped?`<option value="${ctx.user.school_id}">${esc(ctx.user.school_name||'Minha unidade')}</option>`:schools.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
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
      <div class="stats-grid" id="planningStatsGrid">
        <article class="stat-card blue" data-planning-insight data-tooltip="Ver detalhamento do planejamento do exercício"><div class="stat-label">Orçamento estimado</div><div class="stat-value" style="font-size:28px">${money(stats.total_cost)}</div><div class="stat-note">${icon('money')}Visão consolidada do exercício</div></article>
        <article class="stat-card teal" data-planning-insight data-tooltip="Ver detalhamento do planejamento do exercício"><div class="stat-label">Itens consolidados</div><div class="stat-value">${num(stats.items)}</div><div class="stat-note">${icon('clipboard')}Objetos em planejamento</div></article>
        <article class="stat-card orange" data-planning-insight data-tooltip="Ver quais unidades escolares são impactadas"><div class="stat-label">Escolas impactadas</div><div class="stat-value">${num(stats.schools)}</div><div class="stat-note">${icon('school')}Soma das unidades vinculadas</div></article>
        <article class="stat-card violet" data-planning-insight data-tooltip="Ver detalhamento do planejamento do exercício"><div class="stat-label">Ciclo administrativo</div><div class="stat-value" style="font-size:21px;margin-top:13px">Planejar → Licitar</div><div class="stat-note">${icon('trend')}Rastreabilidade do início à execução</div></article>
      </div>
      ${pageHeader(`Planejamento ${selected}`,'Itens previstos, consolidados e em preparação para contratação.',`<button class="btn btn-secondary" id="planningHelp">${icon('info')}Como funciona</button><button class="btn btn-secondary" id="newFutureDemand">${icon('plus')}Nova Demanda Futura</button>${ctx.user.perm.can_edit_analysis?`<button class="btn btn-primary" id="newPlanning">${icon('plus')}Consolidar Item</button>`:''}`)}
      <section class="panel"><div class="panel-header"><div><h2>Demandas de aquisição e contratação</h2><p>Itens consolidados para o exercício selecionado.</p></div><div class="search-field" style="width:260px">${icon('search')}<input class="input" id="planningQ" placeholder="Pesquisar planejamento..."></div></div><div id="planningTable"></div></section>`;
    const load=async()=>{const q=$('#planningQ')?.value||'';const res=await api(`/api/planning?year=${selected}&q=${encodeURIComponent(q)}`);$('#planningTable').innerHTML=renderPlanningTable(res.items)};
    $('#planningYear').addEventListener('change',e=>location.href=`/planejamento?year=${e.target.value}`); $('#newFutureDemand')?.addEventListener('click',openFutureDemandForm); $('#newPlanning')?.addEventListener('click',openPlanningForm); let t;$('#planningQ').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(load,200)});$('#planningHelp').addEventListener('click',()=>modal({title:'Fluxo do Planejamento',mode:'center',body:`<div class="info-card accent"><h3>${icon('trend')}Do registro à execução</h3><p><strong>Demanda da escola</strong> → Análise técnica → Planejamento futuro → Consolidação → Processo administrativo → Licitação/Contratação → Contrato → Execução.</p></div><div class="alert info">A consolidação permite agrupar necessidades semelhantes de várias unidades sem perder o vínculo com cada escola de origem.</div>`}));
    $$('[data-planning-insight]',$('#planningStatsGrid')).forEach(card=>card.addEventListener('click',()=>openPlanningInsights(selected)));
    await load();
  }

  async function openPlanningInsights(year){
    modal({title:'Impacto por Unidade Escolar',subtitle:`Exercício ${year}`,mode:'drawer',body:`<div class="empty-state">${icon('clock')}<p>Carregando...</p></div>`});
    let data;
    try{ data=await api(`/api/planning/insights?year=${year}`); }
    catch(e){ $('#modalRoot .modal-body').innerHTML=`<div class="alert error">Não foi possível carregar os dados deste exercício.</div>`; return; }
    const s=data.summary;
    const catMax=Math.max(1,...data.by_category.map(x=>x.cost||0));
    const body=`
      <div class="metric-row" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric"><span>Itens consolidados</span><strong>${num(s.items)}</strong></div>
        <div class="metric"><span>Orçamento estimado</span><strong>${money(s.total_cost)}</strong></div>
        <div class="metric"><span>Escolas (estimativa)</span><strong>${num(s.schools_estimate)}</strong></div>
      </div>
      <div class="alert info mt-16">${icon('school')} <strong>${num(s.schools_confirmed)} unidade${s.schools_confirmed===1?'':'s'}</strong> identificada${s.schools_confirmed===1?'':'s'} por vínculo direto com demandas cadastradas nos itens deste exercício${s.schools_confirmed!==s.schools_estimate?` — a soma estimada manualmente nos itens é de ${num(s.schools_estimate)}.`:'.'}</div>
      ${s.schools_confirmed_list.length?`<div class="mt-16"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Unidades identificadas</strong><div class="filter-chips" style="margin-top:8px">${s.schools_confirmed_list.map(x=>`<span class="chip" style="cursor:default">${icon('school')}${esc(x.name)}</span>`).join('')}</div></div>`:''}
      ${data.by_category.length?`<div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Orçamento por categoria</h3><div class="mini-chart">${data.by_category.map(c=>`<div class="bar-row"><label title="${esc(c.category)}">${esc(c.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8,(c.cost||0)/catMax*100)}%"></div></div><b>${money(c.cost||0)}</b></div>`).join('')}</div></div>`:''}
      <div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Detalhamento por item</h3><div class="side-stack">${data.items.length?data.items.map(it=>`<div class="info-card" style="margin-bottom:0;padding:14px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong style="font-size:13px">${esc(it.title)}</strong><span class="status-badge future" style="white-space:nowrap">${esc(it.status)}</span></div>
        <p style="margin:4px 0 8px;color:var(--muted);font-size:11.5px">${esc(it.category)} · ${esc(it.kind)} · ${money(it.estimated_cost)}</p>
        ${it.linked_schools.length?`<div class="filter-chips">${it.linked_schools.map(x=>`<span class="chip" style="cursor:default">${icon('school')}${esc(x.name)}</span>`).join('')}</div>`:`<small class="text-muted">${num(it.schools_count)} unidade${it.schools_count===1?'':'s'} — estimativa manual, sem vínculo com demandas específicas cadastradas</small>`}
      </div>`).join(''):empty('Nenhum item neste exercício','')}</div></div>`;
    $('#modalRoot .modal-body').innerHTML=body;
  }
  function renderPlanningTable(items){
    if(!items.length)return empty('Nenhum item neste exercício','Cadastre uma necessidade futura ou altere o exercício.');
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Objeto consolidado</th><th>Tipo</th><th>Escolas</th><th>Estimativa</th><th>Status</th><th>Ações</th></tr></thead><tbody>${items.map(p=>`<tr><td class="mono" data-label="Código"><strong>${esc(p.code)}</strong></td><td class="cell-title" data-label="Objeto consolidado"><strong>${esc(p.title)}</strong><small>${esc(p.category)} · ${p.year}</small></td><td data-label="Tipo">${esc(p.kind)}</td><td data-label="Escolas">${num(p.schools_count)}</td><td data-label="Estimativa">${money(p.estimated_cost)}</td><td data-label="Status"><span class="status-badge future">${esc(p.status)}</span></td><td data-label="Ações"><button class="icon-btn" data-tooltip="Detalhes do planejamento" aria-label="Detalhes do planejamento">${icon('eye')}</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function renderSchools(){
    setLoading();
    const query=new URLSearchParams(location.search);
    const [schools,allDemands,dash,catCounts]=await Promise.all([loadSchools(), api('/api/demands'), api('/api/dashboard'), api('/api/demands/category-counts')]);
    const ds=dash.stats;
    const counts=catCounts.counts||{};
    const schoolsById=new Map(schools.map(s=>[s.id,s]));
    const filters={q:query.get('q')||'',year:query.get('year')||'2026',status:query.get('status')||'',priority:query.get('priority')||'',category:query.get('category')||''};
    let showCompleted=true, critical=false;
    content.innerHTML=pageHeader('Unidades Escolares','Visão 360° do histórico de infraestrutura por Unidade Escolar.',
      `<div class="search-field" style="width:280px">${icon('search')}<input class="input" id="schoolQ" placeholder="Nome, direção ou código..."></div><button class="btn btn-secondary" id="schoolFilter">${icon('filter')}Ordenar por criticidade</button>`)
      +`<section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" value="${esc(filters.q)}" placeholder="Código, demanda ou escola..."></div></div>
        <div class="field"><label>Ano</label><select class="select" id="fYear"><option value="">Todos</option>${[2026,2025,2024].map(y=>`<option ${String(y)===filters.year?'selected':''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="select" id="fStatus"><option value="">Todos</option>${ctx.statuses.map(x=>`<option ${x===filters.status?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x=>`<option value="${x}" ${x===filters.priority?'selected':''}>${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x=>`<option value="${esc(x)}" ${x===filters.category?'selected':''}>${esc(x)} (${num(counts[x]||0)})</option>`).join('')}</select></div>
        <button class="btn btn-secondary" id="clearFilters">${icon('filter')}Limpar</button>
      </section>
      <div class="quick-filters">
        <div class="chip-group">
          <button class="chip-v2 chip-red" data-chip-priority="P1">${icon('warning')}<span>P1 Urgentes</span><b>${num(ds.urgent)}</b></button>
          <button class="chip-v2 chip-orange" data-chip-status="Aguardando contratação">${icon('clock')}<span>Aguardando contratação</span><b>${num(ds.contract)}</b></button>
          <button class="chip-v2 chip-blue" data-chip-status="Em execução">${icon('trend')}<span>Em execução</span><b>${num(ds.progress)}</b></button>
          <button class="chip-v2 chip-violet" data-chip-status="Planejamento futuro">${icon('calendar')}<span>Planejamento futuro</span><b>${num(ds.future)}</b></button>
          <button class="chip-v2 chip-green" data-chip-status="Concluída" id="completedChip">${icon('check-circle')}<span>Concluídas</span><b>${num(ds.completed)}</b></button>
        </div>
        <div class="quick-filters-divider"></div>
        <label class="toggle-field" data-tooltip="Mostra ou oculta demandas concluídas nos cartões e nos filtros acima">
          <div class="toggle-field-copy">${icon('eye')}<div><strong>Exibir concluídas</strong><small>Mostra ou oculta demandas concluídas.</small></div></div>
          <span class="switch"><input type="checkbox" id="toggleCompleted" checked><span class="switch-track"></span></span>
        </label>
      </div>
      <div class="school-grid" id="schoolGrid"></div>`;
    // Filtro do card de filtros — aplicado sobre as demandas reais já carregadas, agrupadas
    // por escola. Uma unidade só é ocultada quando algum filtro de narrowing (status,
    // prioridade, categoria ou busca) está ativo E ela não tem nenhuma demanda correspondente
    // — sem filtro de narrowing, todas as unidades aparecem (mesmo as com zero demandas),
    // igual ao comportamento original desta tela.
    const yearOf=d=>(d.created_at||'').slice(0,4);
    const matchesFilters=d=>{
      if(filters.year && yearOf(d)!==filters.year) return false;
      if(filters.status && d.status!==filters.status) return false;
      if(filters.priority && d.priority!==filters.priority) return false;
      if(filters.category && d.category!==filters.category) return false;
      if(!showCompleted && d.status==='Concluída') return false;
      if(filters.q){
        const q=filters.q.trim().toLowerCase();
        const schoolName=(schoolsById.get(d.school_id)?.name||'').toLowerCase();
        if(!(d.code||'').toLowerCase().includes(q) && !(d.title||'').toLowerCase().includes(q) && !schoolName.includes(q)) return false;
      }
      return true;
    };
    const apply=()=>{
      const narrowing=!!(filters.status||filters.priority||filters.category||filters.q);
      const headerQ=$('#schoolQ').value.trim().toLowerCase();
      const bySchool=new Map();
      allDemands.forEach(d=>{ if(matchesFilters(d)){ if(!bySchool.has(d.school_id)) bySchool.set(d.school_id,[]); bySchool.get(d.school_id).push(d); } });
      let list=schools.filter(s=>{
        if(headerQ && ![s.name,s.director,s.code].some(v=>(v||'').toLowerCase().includes(headerQ))) return false;
        if(narrowing && !(bySchool.get(s.id)||[]).length) return false;
        return true;
      });
      list=[...list].sort((a,b)=>{
        if(!critical) return a.name.localeCompare(b.name);
        const ua=(bySchool.get(a.id)||[]).filter(d=>d.priority==='P1').length, ub=(bySchool.get(b.id)||[]).filter(d=>d.priority==='P1').length;
        return ub-ua || (bySchool.get(b.id)||[]).length-(bySchool.get(a.id)||[]).length;
      });
      $('#schoolGrid').innerHTML=list.length?list.map(s=>renderSchoolCard(s,bySchool.get(s.id)||[])).join(''):empty('Nenhuma unidade encontrada','Ajuste os filtros ou o termo de busca.');
      bindSchools();
    };
    function bindSchools(){$$('[data-school-id]').forEach(c=>c.addEventListener('click',()=>openSchool360(Number(c.dataset.schoolId))))}
    $('#schoolFilter').addEventListener('click',()=>{critical=!critical;$('#schoolFilter').classList.toggle('active',critical);apply();});
    let t;$('#schoolQ').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(apply,200);});
    let t2;$('#fQ').addEventListener('input',()=>{clearTimeout(t2);t2=setTimeout(()=>{filters.q=$('#fQ').value;apply();},250);});
    ['#fYear','#fStatus','#fPriority','#fCategory'].forEach(id=>$(id).addEventListener('change',()=>{
      filters.year=$('#fYear').value; filters.status=$('#fStatus').value; filters.priority=$('#fPriority').value; filters.category=$('#fCategory').value;
      apply();
    }));
    $('#clearFilters').addEventListener('click',()=>{
      filters.q='';filters.status='';filters.priority='';filters.category='';filters.year='2026';
      $('#fQ').value='';$('#fStatus').value='';$('#fPriority').value='';$('#fCategory').value='';$('#fYear').value='2026';
      apply();
    });
    $$('[data-chip-status]').forEach(b=>b.addEventListener('click',()=>{
      filters.status=b.dataset.chipStatus; $('#fStatus').value=filters.status;
      if(b.dataset.chipStatus==='Concluída'){ showCompleted=true; $('#toggleCompleted').checked=true; }
      apply();
    }));
    $$('[data-chip-priority]').forEach(b=>b.addEventListener('click',()=>{ filters.priority=b.dataset.chipPriority; $('#fPriority').value=filters.priority; apply(); }));
    $('#toggleCompleted').addEventListener('change',()=>{ showCompleted=$('#toggleCompleted').checked; apply(); });
    apply();
  }
  // Monta o texto do tooltip com a lista de demandas de uma unidade escolar, a partir
  // dos dados reais já carregados (sem chamada extra de API por cartão/hover).
  function schoolTooltipText(list){
    if(!list||!list.length) return 'Nenhuma demanda registrada nesta unidade.';
    const MAX=6;
    const lines=list.slice(0,MAX).map(d=>`• ${fmtDate(d.created_at)} — ${d.title} — ${d.priority} · ${d.status}`);
    if(list.length>MAX) lines.push(`+ ${list.length-MAX} demanda${list.length-MAX===1?'':'s'}`);
    return lines.join('\n');
  }
  function renderSchoolCard(s,list){
    list = list||[];
    const total=list.length;
    const completed=list.filter(d=>d.status==='Concluída').length;
    const urgent=list.filter(d=>d.priority==='P1').length;
    const exec=total?Math.round(completed/total*100):0;
    const accentCls=urgent?'school-card-urgent':'school-card-ok';
    return `<article class="school-card ${accentCls}" data-school-id="${s.id}" data-tooltip-list="${esc(schoolTooltipText(list))}"><div class="school-card-head"><div class="school-icon">${icon('school')}</div>${urgent?`<span class="badge P1">${urgent} urgente${urgent===1?'':'s'}</span>`:`<span class="badge P4">Sem urgências</span>`}</div><h3>${esc(s.name)}</h3><p>${esc(s.director||'Direção não informada')}</p><div class="school-stats"><div class="school-stat"><div class="school-stat-top">${icon('clipboard')}<span>Demandas</span></div><strong>${num(total)}</strong></div><div class="school-stat"><div class="school-stat-top">${icon('check-circle')}<span>Concluídas</span></div><strong>${num(completed)}</strong></div><div class="school-stat"><div class="school-stat-top">${icon('trend')}<span>Execução</span></div><strong>${exec}%</strong></div></div></article>`;
  }
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

  const ADMIN_ICON_SET = ['bolt','drop','roof','paint','wind','wrench','brick','wheelchair','chair','monitor','shield','drain','column','tree','bulb','door','hammer','crane','cart','dots','clipboard','building','file','warning','money','report','camera','settings','school','calendar','grid','paperclip','message','trend'];
  const ADMIN_COLOR_SET = [['red','Vermelho'],['orange','Laranja'],['teal','Verde-água'],['violet','Violeta'],['green','Verde'],['blue','Azul']];
  const statePill = (active,onLabel='Ativo',offLabel='Inativo') => `<span class="badge" style="background:var(--${active?'green':'red'}-soft);color:var(--${active?'green':'red'})">${active?onLabel:offLabel}</span>`;
  function confirmAction(title, message, {confirmLabel='Confirmar', danger=true}={}){
    return new Promise(resolve=>{
      let settled=false;
      const root=$('#modalRoot');
      const mo=new MutationObserver(()=>{ if(!root.innerHTML && !settled){ settled=true; mo.disconnect(); resolve(false); } });
      mo.observe(root,{childList:true});
      modal({title,mode:'center',body:`<div class="alert ${danger?'error':'info'}">${esc(message)}</div>`,
        footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn ${danger?'btn-danger':'btn-primary'}" id="confirmOk">${esc(confirmLabel)}</button>`,
        onOpen(){ $('#confirmOk').addEventListener('click',()=>{ settled=true; mo.disconnect(); closeModal(); resolve(true); }); }
      });
    });
  }

  async function renderAdmin(){
    if(!ctx.user.perm.can_manage_admin){ location.href='/'; return; }
    const TABS=[['geral','Visão Geral','grid'],['categorias','Categorias','clipboard'],['prioridades','Prioridades','warning'],['kanban','Colunas do Kanban','kanban'],['escolas','Unidades Escolares','school'],['perfis','Perfis de Acesso','user'],['usuarios','Usuários','user']];
    let active = new URLSearchParams(location.search).get('tab') || 'geral';
    if(!TABS.some(t=>t[0]===active)) active='geral';
    async function paint(){
      content.innerHTML = pageHeader('Administração','Configurações, cadastros-base e integridade do ambiente.',`<button class="btn btn-secondary" id="adminInfo">${icon('info')}Sobre esta versão</button>`)
        + `<nav class="tabs" aria-label="Seções de administração">${TABS.map(t=>`<button class="tab ${active===t[0]?'active':''}" data-atab="${t[0]}">${icon(t[2])}${t[1]}</button>`).join('')}</nav>
        <div id="adminTabBody"><div class="page-skeleton"><div class="skeleton sk-title"></div><div class="skeleton sk-subtitle"></div></div></div>`;
      $('#adminInfo').addEventListener('click',()=>modal({title:'Sobre esta versão',mode:'center',body:`<div class="info-card accent"><h3>${icon('info')}Versão funcional demonstrativa</h3><p>Esta implementação possui backend FastAPI, banco SQLite, autenticação por sessão, perfis, CRUD de demandas, histórico, devolutivas, anexos, planejamento futuro, filtros, exportação CSV e interface responsiva.</p></div><div class="alert info">Antes de produção, altere a chave de sessão e as senhas demonstrativas e configure infraestrutura de hospedagem, backup, HTTPS e banco corporativo.</div>`}));
      $$('[data-atab]').forEach(b=>b.addEventListener('click',()=>{ if(active===b.dataset.atab)return; active=b.dataset.atab; history.replaceState(null,'',`/administracao?tab=${active}`); paint(); }));
      const body=$('#adminTabBody');
      try{
        if(active==='geral') await renderAdminGeral(body);
        else if(active==='categorias') await renderAdminCategorias(body);
        else if(active==='prioridades') await renderAdminPrioridades(body);
        else if(active==='kanban') await renderAdminKanban(body);
        else if(active==='escolas') await renderAdminEscolas(body);
        else if(active==='perfis') await renderAdminPerfis(body);
        else if(active==='usuarios') await renderAdminUsuarios(body);
      }catch(e){ body.innerHTML = `<div class="alert error">${esc(e.message)}</div>`; }
    }
    await paint();
  }

  async function renderAdminGeral(body){
    const a = await api('/api/admin/summary');
    body.innerHTML = `<div class="admin-grid">
      <div class="admin-card"><div class="admin-value">${num(a.schools)}</div><div class="admin-label">Unidades Escolares</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.users)}</div><div class="admin-label">Usuários</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.demands)}</div><div class="admin-label">Demandas</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.planning)}</div><div class="admin-label">Itens de planejamento</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.attachments)}</div><div class="admin-label">Anexos</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.categories)}</div><div class="admin-label">Categorias ativas</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.profiles)}</div><div class="admin-label">Perfis de acesso</div></div>
      <div class="admin-card"><div class="admin-value">${Math.max(1,Math.round(a.db_size/1024))} KB</div><div class="admin-label">Base local</div></div>
    </div>
    <section class="panel mt-16"><div class="panel-header"><div><h2>Cadastros e parâmetros</h2><p>Use as abas acima para editar categorias, prioridades, colunas do Kanban, unidades escolares, perfis de acesso e usuários.</p></div></div><div class="panel-body"><div class="config-list">
      <div class="config-item">${icon('clipboard')}<div><strong>Categorias</strong><small>Ícone, cor e texto de apoio de cada categoria de demanda.</small></div><button class="btn btn-secondary" data-goto="categorias">Abrir</button></div>
      <div class="config-item">${icon('warning')}<div><strong>Prioridades</strong><small>Rótulo e orientação de P1 a P4.</small></div><button class="btn btn-secondary" data-goto="prioridades">Abrir</button></div>
      <div class="config-item">${icon('kanban')}<div><strong>Colunas do Kanban</strong><small>Títulos, cores e status de cada coluna do quadro.</small></div><button class="btn btn-secondary" data-goto="kanban">Abrir</button></div>
      <div class="config-item">${icon('school')}<div><strong>Unidades Escolares</strong><small>Cadastro, ativação e exclusão de unidades.</small></div><button class="btn btn-secondary" data-goto="escolas">Abrir</button></div>
      <div class="config-item">${icon('user')}<div><strong>Perfis de acesso</strong><small>Crie perfis personalizados com permissões próprias.</small></div><button class="btn btn-secondary" data-goto="perfis">Abrir</button></div>
      <div class="config-item">${icon('user')}<div><strong>Usuários</strong><small>Cadastro, perfil e situação de cada usuário.</small></div><button class="btn btn-secondary" data-goto="usuarios">Abrir</button></div>
    </div></div></section>`;
    $$('[data-goto]',body).forEach(b=>b.addEventListener('click',()=>{ $(`[data-atab="${b.dataset.goto}"]`)?.click(); }));
  }

  async function renderAdminCategorias(body){
    const rows = await api('/api/admin/categories');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Categorias</h2><p>Ícone, cor e texto de apoio exibidos ao registrar uma demanda.</p></div><button class="btn btn-primary" id="newCategory">${icon('plus')}Nova categoria</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Categoria</th><th>Ícone</th><th>Cor</th><th>Texto de apoio</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.length?rows.map(c=>`<tr class="${c.active?'':'row-inactive'}"><td><strong>${esc(c.name)}</strong></td><td>${icon(c.icon)}</td><td><span class="color-dot" style="background:var(--${c.color})"></span>${esc(c.color)}</td><td>${esc(c.hint||'—')}</td><td>${statePill(!!c.active,'Ativa','Inativa')}</td><td class="row-actions"><button class="icon-btn" data-edit="${c.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-del="${c.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button></td></tr>`).join(''):`<tr><td colspan="6">${empty('Nenhuma categoria cadastrada')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newCategory').addEventListener('click',()=>openCategoryForm(null,body));
    $$('[data-edit]',body).forEach(b=>b.addEventListener('click',()=>openCategoryForm(rows.find(r=>r.id===Number(b.dataset.edit)),body)));
    $$('[data-del]',body).forEach(b=>b.addEventListener('click',async()=>{
      const c=rows.find(r=>r.id===Number(b.dataset.del));
      const ok=await confirmAction('Excluir categoria',`Tem certeza de que deseja excluir "${c.name}"? Esta ação não pode ser desfeita.`,{confirmLabel:'Excluir'});
      if(!ok) return;
      try{ await api(`/api/admin/categories/${c.id}`,{method:'DELETE'}); toast('Categoria excluída'); renderAdminCategorias(body); }
      catch(e){ toast('Não foi possível excluir',e.message,'error'); }
    }));
  }

  function openCategoryForm(cat, body){
    const editing = !!cat;
    let selIcon = cat?.icon || 'wrench';
    let selColor = cat?.color || 'blue';
    modal({title: editing?'Editar categoria':'Nova categoria', mode:'drawer', body:`<form id="categoryForm"><div class="form-grid">
      <div class="field span-2"><label>Nome *</label><input class="input" name="name" required maxlength="60" value="${esc(cat?.name||'')}"></div>
      <div class="field span-2"><label>Texto de apoio</label><input class="input" name="hint" maxlength="140" value="${esc(cat?.hint||'')}" placeholder="Ex.: Fiação, tomada, quadro de força..."></div>
      <div class="field span-2"><label>Ícone</label><div class="icon-picker" id="iconPicker">${ADMIN_ICON_SET.map(i=>`<button type="button" class="icon-pick ${i===selIcon?'active':''}" data-icon="${i}" data-tooltip="${i}" aria-label="${i}">${icon(i)}</button>`).join('')}</div></div>
      <div class="field span-2"><label>Cor</label><div class="color-picker" id="colorPicker">${ADMIN_COLOR_SET.map(([v,l])=>`<button type="button" class="color-pick ${v===selColor?'active':''}" data-color="${v}" data-tooltip="${l}" style="background:var(--${v})" aria-label="${l}"></button>`).join('')}</div></div>
      ${editing?`<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${cat.active?'checked':''}> Categoria ativa</label></div>`:''}
    </div></form>`,
    footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveCategory">${editing?'Salvar':'Criar categoria'}</button>`,
    onOpen(){
      $$('#iconPicker [data-icon]').forEach(b=>b.addEventListener('click',()=>{selIcon=b.dataset.icon;$$('#iconPicker [data-icon]').forEach(x=>x.classList.toggle('active',x===b));}));
      $$('#colorPicker [data-color]').forEach(b=>b.addEventListener('click',()=>{selColor=b.dataset.color;$$('#colorPicker [data-color]').forEach(x=>x.classList.toggle('active',x===b));}));
      $('#saveCategory').addEventListener('click',async()=>{
        const f=$('#categoryForm'); if(!f.reportValidity())return;
        const payload=Object.fromEntries(new FormData(f).entries());
        payload.icon=selIcon; payload.color=selColor;
        if(editing) payload.active = f.elements['active'] ? f.elements['active'].checked : true;
        try{
          if(editing) await api(`/api/admin/categories/${cat.id}`,{method:'PUT',body:payload});
          else await api('/api/admin/categories',{method:'POST',body:payload});
          closeModal(); toast(editing?'Categoria atualizada':'Categoria criada'); renderAdminCategorias(body);
        }catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      });
    }});
  }

  async function renderAdminPrioridades(body){
    const rows = await api('/api/admin/priorities');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Prioridades</h2><p>Rótulo e orientação exibidos para cada nível de prioridade. Os códigos P1–P4 são fixos.</p></div></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Rótulo</th><th>Orientação</th><th>Ações</th></tr></thead><tbody>
      ${rows.map(p=>`<tr><td><span class="badge ${p.code}">${p.code}</span></td><td><strong>${esc(p.label)}</strong></td><td>${esc(p.hint||'—')}</td><td class="row-actions"><button class="icon-btn" data-edit="${p.code}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button></td></tr>`).join('')}
      </tbody></table></div>
    </div></section>`;
    $$('[data-edit]',body).forEach(b=>b.addEventListener('click',()=>openPriorityForm(rows.find(r=>r.code===b.dataset.edit),body)));
  }

  function openPriorityForm(p, body){
    modal({title:`Editar prioridade ${p.code}`,mode:'center',body:`<form id="priorityForm"><div class="form-grid">
      <div class="field span-2"><label>Rótulo *</label><input class="input" name="label" required maxlength="60" value="${esc(p.label)}"></div>
      <div class="field span-2"><label>Orientação</label><textarea class="textarea" name="hint" maxlength="200">${esc(p.hint||'')}</textarea></div>
    </div></form>`,
    footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="savePriority">Salvar</button>`,
    onOpen(){
      $('#savePriority').addEventListener('click',async()=>{
        const f=$('#priorityForm'); if(!f.reportValidity())return;
        const payload=Object.fromEntries(new FormData(f).entries());
        try{ await api(`/api/admin/priorities/${p.code}`,{method:'PUT',body:payload}); closeModal(); toast('Prioridade atualizada'); renderAdminPrioridades(body); }
        catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      });
    }});
  }

  async function renderAdminKanban(body){
    const rows = await api('/api/admin/kanban-stages');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Colunas do Kanban</h2><p>Título, cor e status agrupados em cada coluna do quadro.</p></div><button class="btn btn-primary" id="newStage">${icon('plus')}Nova coluna</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Coluna</th><th>Cor</th><th>Status incluídos</th><th>Status padrão</th><th>Ações</th></tr></thead><tbody>
      ${rows.length?rows.map(s=>`<tr><td><strong>${esc(s.label)}</strong>${s.hint?`<small>${esc(s.hint)}</small>`:''}</td><td><span class="color-dot" style="background:var(--${s.accent})"></span>${esc(s.accent)}</td><td>${s.statuses.map(x=>`<span class="badge P4">${esc(x)}</span>`).join(' ')}</td><td>${esc(s.target_status)}</td><td class="row-actions"><button class="icon-btn" data-edit="${s.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-del="${s.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button></td></tr>`).join(''):`<tr><td colspan="5">${empty('Nenhuma coluna cadastrada')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newStage').addEventListener('click',()=>openStageForm(null,body,rows));
    $$('[data-edit]',body).forEach(b=>b.addEventListener('click',()=>openStageForm(rows.find(r=>r.id===Number(b.dataset.edit)),body,rows)));
    $$('[data-del]',body).forEach(b=>b.addEventListener('click',async()=>{
      const s=rows.find(r=>r.id===Number(b.dataset.del));
      const ok=await confirmAction('Excluir coluna',`Excluir a coluna "${s.label}"? Só é possível quando ela não tiver nenhum status vinculado.`,{confirmLabel:'Excluir'});
      if(!ok) return;
      try{ await api(`/api/admin/kanban-stages/${s.id}`,{method:'DELETE'}); toast('Coluna excluída'); renderAdminKanban(body); }
      catch(e){ toast('Não foi possível excluir',e.message,'error'); }
    }));
  }

  function openStageForm(stage, body, allStages){
    const editing = !!stage;
    let selColor = stage?.accent || 'blue';
    let selStatuses = new Set(stage?.statuses || []);
    const usedElsewhere = new Set();
    allStages.filter(s=>!editing||s.id!==stage.id).forEach(s=>s.statuses.forEach(x=>usedElsewhere.add(x)));
    modal({title: editing?'Editar coluna':'Nova coluna', mode:'drawer', body:`<form id="stageForm"><div class="form-grid">
      <div class="field span-2"><label>Título *</label><input class="input" name="label" required maxlength="60" value="${esc(stage?.label||'')}"></div>
      <div class="field span-2"><label>Descrição curta</label><input class="input" name="hint" maxlength="140" value="${esc(stage?.hint||'')}"></div>
      <div class="field span-2"><label>Cor</label><div class="color-picker" id="stageColorPicker">${ADMIN_COLOR_SET.map(([v,l])=>`<button type="button" class="color-pick ${v===selColor?'active':''}" data-color="${v}" data-tooltip="${l}" style="background:var(--${v})" aria-label="${l}"></button>`).join('')}</div></div>
      <div class="field span-2"><label>Status incluídos nesta coluna *</label><div class="check-grid" id="statusPicker">${ctx.statuses.map(st=>`<label class="check ${usedElsewhere.has(st)?'check-disabled':''}"><input type="checkbox" value="${esc(st)}" ${selStatuses.has(st)?'checked':''} ${usedElsewhere.has(st)?'disabled':''}> ${esc(st)}${usedElsewhere.has(st)?' (em outra coluna)':''}</label>`).join('')}</div></div>
      <div class="field span-2"><label>Status padrão ao mover um cartão para cá</label><select class="select" id="targetStatus"></select></div>
    </div></form>`,
    footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveStage">${editing?'Salvar':'Criar coluna'}</button>`,
    onOpen(){
      $$('#stageColorPicker [data-color]').forEach(b=>b.addEventListener('click',()=>{selColor=b.dataset.color;$$('#stageColorPicker [data-color]').forEach(x=>x.classList.toggle('active',x===b));}));
      const refreshTarget=()=>{ const sel=$('#targetStatus'); sel.innerHTML=[...selStatuses].map(s=>`<option ${stage&&s===stage.target_status?'selected':''}>${esc(s)}</option>`).join('')||'<option value="">Selecione ao menos um status</option>'; };
      refreshTarget();
      $$('#statusPicker input[type=checkbox]').forEach(cb=>cb.addEventListener('change',()=>{ if(cb.checked) selStatuses.add(cb.value); else selStatuses.delete(cb.value); refreshTarget(); }));
      $('#saveStage').addEventListener('click',async()=>{
        const f=$('#stageForm'); if(!f.reportValidity())return;
        if(!selStatuses.size){ toast('Selecione ao menos um status','','error'); return; }
        const payload={label:f.elements.label.value, hint:f.elements.hint.value, accent:selColor, statuses:[...selStatuses], target_status:$('#targetStatus').value||[...selStatuses][0]};
        try{
          if(editing) await api(`/api/admin/kanban-stages/${stage.id}`,{method:'PUT',body:payload});
          else await api('/api/admin/kanban-stages',{method:'POST',body:payload});
          closeModal(); toast(editing?'Coluna atualizada':'Coluna criada'); renderAdminKanban(body);
        }catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      });
    }});
  }

  async function renderAdminEscolas(body){
    const rows = await api('/api/schools?include_inactive=1');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Unidades Escolares</h2><p>Cadastro, ativação e exclusão de unidades escolares.</p></div><button class="btn btn-primary" id="newSchool">${icon('plus')}Nova unidade</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Unidade</th><th>Direção</th><th>Contato</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.length?rows.map(s=>`<tr class="${s.active?'':'row-inactive'}"><td><strong>${esc(s.name)}</strong>${s.code?`<small>${esc(s.code)}</small>`:''}</td><td>${esc(s.director||'—')}</td><td>${esc(s.phone||'—')}${s.email?` · ${esc(s.email)}`:''}</td><td>${statePill(!!s.active)}</td><td class="row-actions"><button class="icon-btn" data-edit="${s.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-toggle="${s.id}" data-tooltip="${s.active?'Desativar':'Ativar'}" aria-label=\"${s.active?'Desativar':'Ativar'}\">${icon(s.active?'x':'check-circle')}</button><button class="icon-btn" data-del="${s.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button></td></tr>`).join(''):`<tr><td colspan="5">${empty('Nenhuma unidade cadastrada')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newSchool').addEventListener('click',()=>openSchoolForm(null,body));
    $$('[data-edit]',body).forEach(b=>b.addEventListener('click',()=>openSchoolForm(rows.find(r=>r.id===Number(b.dataset.edit)),body)));
    $$('[data-toggle]',body).forEach(b=>b.addEventListener('click',async()=>{
      const s=rows.find(r=>r.id===Number(b.dataset.toggle));
      try{ const res=await api(`/api/admin/schools/${s.id}/toggle-active`,{method:'POST'}); toast(res.active?'Unidade ativada':'Unidade desativada'); schoolsCache=null; renderAdminEscolas(body); }
      catch(e){ toast('Não foi possível atualizar',e.message,'error'); }
    }));
    $$('[data-del]',body).forEach(b=>b.addEventListener('click',async()=>{
      const s=rows.find(r=>r.id===Number(b.dataset.del));
      const ok=await confirmAction('Excluir unidade',`Excluir "${s.name}"? Só é possível quando não houver demandas ou usuários vinculados a ela.`,{confirmLabel:'Excluir'});
      if(!ok) return;
      try{ await api(`/api/admin/schools/${s.id}`,{method:'DELETE'}); toast('Unidade excluída'); schoolsCache=null; renderAdminEscolas(body); }
      catch(e){ toast('Não foi possível excluir',e.message,'error'); }
    }));
  }

  function openSchoolForm(school, body){
    const editing = !!school;
    modal({title: editing?'Editar unidade escolar':'Nova unidade escolar', mode:'drawer', body:`<form id="schoolForm"><div class="form-grid">
      <div class="field span-2"><label>Nome *</label><input class="input" name="name" required maxlength="140" value="${esc(school?.name||'')}"></div>
      <div class="field"><label>Código</label><input class="input" name="code" maxlength="30" value="${esc(school?.code||'')}"></div>
      <div class="field"><label>Direção</label><input class="input" name="director" maxlength="140" value="${esc(school?.director||'')}"></div>
      <div class="field"><label>Telefone</label><input class="input" name="phone" maxlength="30" value="${esc(school?.phone||'')}"></div>
      <div class="field"><label>E-mail</label><input class="input" type="email" name="email" maxlength="140" value="${esc(school?.email||'')}"></div>
      <div class="field span-2"><label>Endereço</label><input class="input" name="address" maxlength="220" value="${esc(school?.address||'')}"></div>
    </div></form>`,
    footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveSchool">${editing?'Salvar':'Criar unidade'}</button>`,
    onOpen(){
      $('#saveSchool').addEventListener('click',async()=>{
        const f=$('#schoolForm'); if(!f.reportValidity())return;
        const payload=Object.fromEntries(new FormData(f).entries());
        try{
          if(editing) await api(`/api/admin/schools/${school.id}`,{method:'PUT',body:payload});
          else await api('/api/admin/schools',{method:'POST',body:payload});
          closeModal(); toast(editing?'Unidade atualizada':'Unidade criada'); schoolsCache=null; renderAdminEscolas(body);
        }catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      });
    }});
  }

  async function renderAdminPerfis(body){
    const rows = await api('/api/admin/profiles');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Perfis de Acesso</h2><p>Crie perfis personalizados combinando as permissões abaixo, ou ajuste os perfis padrão do sistema.</p></div><button class="btn btn-primary" id="newProfile">${icon('plus')}Novo perfil</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Perfil</th><th>Escopo</th><th>Permissões</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.map(p=>`<tr class="${p.active?'':'row-inactive'}"><td><strong>${esc(p.label)}</strong><small>${esc(p.slug)}${p.is_system?' · perfil do sistema':''}</small></td><td>${p.school_scoped?'Restrito à própria escola':'Visão da rede'}</td><td>${[p.can_edit_analysis?'Análise técnica':null,p.can_manage_admin?'Administração':null,p.can_view_reports?'Relatórios':null,p.can_view_planning?'Planejamento':null].filter(Boolean).map(x=>`<span class="badge P4">${x}</span>`).join(' ')||'—'}</td><td>${statePill(!!p.active)}</td><td class="row-actions"><button class="icon-btn" data-edit="${p.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button>${p.is_system?'':`<button class="icon-btn" data-del="${p.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button>`}</td></tr>`).join('')}
      </tbody></table></div>
    </div></section>`;
    $('#newProfile').addEventListener('click',()=>openProfileForm(null,body));
    $$('[data-edit]',body).forEach(b=>b.addEventListener('click',()=>openProfileForm(rows.find(r=>r.id===Number(b.dataset.edit)),body)));
    $$('[data-del]',body).forEach(b=>b.addEventListener('click',async()=>{
      const p=rows.find(r=>r.id===Number(b.dataset.del));
      const ok=await confirmAction('Excluir perfil',`Excluir o perfil "${p.label}"? Só é possível quando nenhum usuário estiver com esse perfil.`,{confirmLabel:'Excluir'});
      if(!ok) return;
      try{ await api(`/api/admin/profiles/${p.id}`,{method:'DELETE'}); toast('Perfil excluído'); renderAdminPerfis(body); }
      catch(e){ toast('Não foi possível excluir',e.message,'error'); }
    }));
  }

  function openProfileForm(profile, body){
    const editing = !!profile;
    modal({title: editing?`Editar perfil${profile.is_system?' do sistema':''}`:'Novo perfil de acesso', mode:'drawer', body:`<form id="profileForm"><div class="form-grid">
      <div class="field span-2"><label>Nome do perfil *</label><input class="input" name="label" required maxlength="60" value="${esc(profile?.label||'')}"></div>
      <div class="field span-2"><label>Descrição</label><input class="input" name="description" maxlength="200" value="${esc(profile?.description||'')}"></div>
      <div class="field span-2"><label>Permissões</label><div class="check-grid">
        <label class="check"><input type="checkbox" name="school_scoped" ${profile?.school_scoped?'checked':''}> Restrito à própria unidade escolar</label>
        <label class="check"><input type="checkbox" name="can_edit_analysis" ${profile?.can_edit_analysis??true?'checked':''}> Pode editar a análise técnica</label>
        <label class="check"><input type="checkbox" name="can_manage_admin" ${profile?.can_manage_admin?'checked':''}> Acesso à Administração</label>
        <label class="check"><input type="checkbox" name="can_view_reports" ${profile?.can_view_reports??true?'checked':''}> Acesso a Relatórios</label>
        <label class="check"><input type="checkbox" name="can_view_planning" ${profile?.can_view_planning??true?'checked':''}> Acesso ao Planejamento Futuro</label>
      </div></div>
      ${editing?`<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${profile.active?'checked':''}> Perfil ativo</label></div>`:''}
    </div></form>`,
    footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveProfile">${editing?'Salvar':'Criar perfil'}</button>`,
    onOpen(){
      $('#saveProfile').addEventListener('click',async()=>{
        const f=$('#profileForm'); if(!f.reportValidity())return;
        const payload=Object.fromEntries(new FormData(f).entries());
        ['school_scoped','can_edit_analysis','can_manage_admin','can_view_reports','can_view_planning'].forEach(k=>payload[k]=f.elements[k].checked);
        if(editing) payload.active=f.elements.active.checked;
        try{
          if(editing) await api(`/api/admin/profiles/${profile.id}`,{method:'PUT',body:payload});
          else await api('/api/admin/profiles',{method:'POST',body:payload});
          closeModal(); toast(editing?'Perfil atualizado':'Perfil criado'); renderAdminPerfis(body);
        }catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      });
    }});
  }

  async function renderAdminUsuarios(body){
    const [rows, profiles] = await Promise.all([api('/api/admin/users'), api('/api/admin/profiles')]);
    const schools = await loadSchools();
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Usuários</h2><p>Cadastro, perfil de acesso e situação de cada usuário do sistema.</p></div><button class="btn btn-primary" id="newUser">${icon('plus')}Novo usuário</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Unidade Escolar</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.length?rows.map(u=>`<tr class="${u.active?'':'row-inactive'}"><td><strong>${esc(u.name)}</strong>${u.id===ctx.user.id?' <small>(você)</small>':''}</td><td>${esc(u.email)}</td><td>${esc(u.profile_label||u.role)}</td><td>${esc(u.school_name||'—')}</td><td>${statePill(!!u.active)}</td><td class="row-actions"><button class="icon-btn" data-edit="${u.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button></td></tr>`).join(''):`<tr><td colspan="6">${empty('Nenhum usuário cadastrado')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newUser').addEventListener('click',()=>openUserForm(null,body,profiles,schools));
    $$('[data-edit]',body).forEach(b=>b.addEventListener('click',()=>openUserForm(rows.find(r=>r.id===Number(b.dataset.edit)),body,profiles,schools)));
  }

  function openUserForm(user, body, profiles, schools){
    const editing = !!user;
    const isSelf = editing && user.id===ctx.user.id;
    modal({title: editing?'Editar usuário':'Novo usuário', mode:'drawer', body:`<form id="userForm"><div class="form-grid">
      <div class="field span-2"><label>Nome *</label><input class="input" name="name" required maxlength="140" value="${esc(user?.name||'')}"></div>
      <div class="field span-2"><label>E-mail *</label><input class="input" type="email" name="email" required maxlength="140" value="${esc(user?.email||'')}"></div>
      <div class="field span-2"><label>${editing?'Nova senha (deixe em branco para manter)':'Senha *'}</label><input class="input" type="password" name="password" ${editing?'':'required'} minlength="4" autocomplete="new-password"></div>
      <div class="field span-2"><label>Perfil de acesso *</label><select class="select" name="role" id="userRoleField" required>${profiles.filter(p=>p.active||p.slug===user?.role).map(p=>`<option value="${p.slug}" ${p.slug===user?.role?'selected':''}>${esc(p.label)}</option>`).join('')}</select></div>
      <div class="field span-2" id="userSchoolWrap"></div>
      ${editing?`<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${user.active?'checked':''} ${isSelf?'disabled':''}> Usuário ativo</label>${isSelf?'<small>Você não pode desativar seu próprio usuário.</small>':''}</div>`:''}
    </div></form>`,
    footer:`<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveUser">${editing?'Salvar':'Criar usuário'}</button>`,
    onOpen(){
      const updateSchoolField=()=>{
        const p=profiles.find(x=>x.slug===$('#userRoleField').value);
        const wrap=$('#userSchoolWrap');
        if(p?.school_scoped){
          wrap.innerHTML = `<label>Unidade Escolar *</label><select class="select" name="school_id" required><option value="">Selecione...</option>${schools.map(s=>`<option value="${s.id}" ${Number(user?.school_id)===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`;
        } else {
          wrap.innerHTML = '';
        }
      };
      updateSchoolField();
      $('#userRoleField').addEventListener('change',updateSchoolField);
      $('#saveUser').addEventListener('click',async()=>{
        const f=$('#userForm'); if(!f.reportValidity())return;
        const payload=Object.fromEntries(new FormData(f).entries());
        if(!payload.password) delete payload.password;
        if(!payload.school_id) delete payload.school_id; else payload.school_id=Number(payload.school_id);
        if(editing) payload.active = isSelf ? true : f.elements.active.checked;
        try{
          if(editing) await api(`/api/admin/users/${user.id}`,{method:'PUT',body:payload});
          else await api('/api/admin/users',{method:'POST',body:payload});
          closeModal(); toast(editing?'Usuário atualizado':'Usuário criado'); renderAdminUsuarios(body);
        }catch(e){ toast('Não foi possível salvar',e.message,'error'); }
      });
    }});
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
    $('#aboutHelp')?.addEventListener('click',openShortcutsHelp);
  }

  // ============================================================
  // QUADRO KANBAN — visão por etapa ou por prioridade, com
  // arrastar-e-soltar para mudar o andamento das demandas.
  // ============================================================
  const STAGE_GROUPS = (ctx.kanbanStages || []).map(s => ({key:s.stage_key, label:s.label, hint:s.hint||'', accent:s.accent||'blue', statuses:s.statuses||[], target:s.target_status}));
  const STATUS_TO_STAGE = {};
  STAGE_GROUPS.forEach(g=>g.statuses.forEach(s=>STATUS_TO_STAGE[s]=g.key));
  const stageKeyForStatus = s => STATUS_TO_STAGE[s] || (STAGE_GROUPS[0] && STAGE_GROUPS[0].key) || 'aguardando';
  const PRIORITY_GROUPS = ['P1','P2','P3','P4'].map(p=>({key:p, label:`${p} · ${priorityLabel(p)}`, hint:URGENCY_CHOICES.find(u=>u.value===p)?.hint || '', accent:{P1:'red',P2:'orange',P3:'blue',P4:'green'}[p], target:p}));

  function kanbanCard(d){
    const due=dueInfo(d);
    const canEdit = ctx.user.perm.can_edit_analysis;
    return `<article class="kanban-card" ${canEdit?'draggable="true"':''} tabindex="0" role="button" data-id="${d.id}" aria-label="Abrir demanda ${esc(d.code)} — ${esc(d.title)}">
      <div class="kc-top">
        <span class="badge ${d.priority}">${d.priority}</span>
        ${due.cls?`<span class="deadline ${due.cls}" data-tooltip="Prazo">${esc(due.text)}</span>`:''}
        ${canEdit?`<button type="button" class="kc-edit" data-edit data-tooltip="Editar análise técnica" aria-label="Editar análise técnica">${icon('edit')}</button>`:''}
      </div>
      <h4 class="kc-title">${esc(d.title)}</h4>
      <div class="kc-meta">${icon(CATEGORY_ICONS[d.category]||'clipboard')}<span>${esc(d.category)}</span></div>
      <div class="kc-foot">
        <span class="kc-school" data-tooltip="${esc(d.school_name||'')}">${icon('school')}${esc(d.school_name||'—')}</span>
        ${d.cost_estimate?`<span class="kc-cost">${money(d.cost_estimate)}</span>`:''}
      </div>
      ${d.responsible?`<div class="kc-owner" data-tooltip="Responsável: ${esc(d.responsible)}"><span class="avatar sm">${esc((d.responsible||'?')[0])}</span><small>${esc(d.responsible)}</small></div>`:''}
      <div class="kc-code mono">${esc(d.code)}</div>
    </article>`;
  }

  async function renderKanban(){
    setLoading();
    const [schools,catCounts] = await Promise.all([loadSchools(), api('/api/demands/category-counts')]);
    const counts = catCounts.counts||{};
    const state = {
      q:'', category:'', priority:'', groupBy:'stage', hideDone:false,
      school_id: ctx.user.perm.school_scoped ? String(ctx.user.school_id) : '',
    };
    const schoolField = ctx.user.perm.school_scoped
      ? `<div class="field"><label>Unidade Escolar</label><select class="select" id="fSchool" disabled><option>${esc(ctx.user.school_name||'Minha unidade')}</option></select></div>`
      : `<div class="field"><label>Unidade Escolar</label><select class="select" id="fSchool"><option value="">Todas</option>${schools.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>`;

    content.innerHTML = pageHeader('Quadro Kanban', 'Visualize e movimente as demandas por etapa do fluxo ou por prioridade, com arrastar e soltar.',
        `<a class="btn btn-secondary" href="/api/export/demands.csv" data-tooltip="Baixar a lista completa em CSV">${icon('download')}Exportar</a><button class="btn btn-primary" data-open-demand data-tooltip="Abrir o assistente de registro">${icon('plus')}Registrar Demanda/CI</button>`)+
      `<div class="kanban-metrics" id="kanbanMetrics"></div>
      <section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" placeholder="Código, demanda ou escola..."></div></div>
        ${schoolField}
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x=>`<option value="${esc(x)}">${esc(x)} (${num(counts[x]||0)})</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x=>`<option value="${x}">${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Agrupar por</label><select class="select" id="fGroupBy"><option value="stage">Etapa do fluxo</option><option value="priority">Prioridade</option></select></div>
        <button class="btn btn-secondary" id="clearKanbanFilters">${icon('filter')}Limpar</button>
      </section>
      <div class="kanban-toolbar">
        <label class="chip" id="hideDoneChip" role="button">${icon('check-circle')}Ocultar concluídas e canceladas</label>
        <span class="hint" id="kanbanHint"></span>
      </div>
      <div class="kanban-board" id="kanbanBoard" aria-live="polite"></div>`;

    $('[data-open-demand]',content).addEventListener('click',openDemandForm);

    const load = async () => {
      const params = new URLSearchParams();
      if(state.q) params.set('q', state.q);
      if(state.category) params.set('category', state.category);
      if(state.priority) params.set('priority', state.priority);
      let rows = await api('/api/demands?'+params.toString());
      if(state.school_id) rows = rows.filter(d=>String(d.school_id)===String(state.school_id));
      if(state.hideDone) rows = rows.filter(d=>d.status!=='Concluída' && d.status!=='Cancelada');
      renderBoard(rows);
    };

    const renderBoard = rows => {
      const total = rows.length;
      const urgent = rows.filter(d=>d.priority==='P1' && d.status!=='Concluída' && d.status!=='Cancelada').length;
      const overdue = rows.filter(d=>dueInfo(d).cls==='overdue').length;
      const openCost = rows.filter(d=>d.status!=='Concluída' && d.status!=='Cancelada').reduce((a,d)=>a+(d.cost_estimate||0),0);
      $('#kanbanMetrics').innerHTML = `
        <div class="km"><span>${num(total)}</span><small>Demandas no quadro</small></div>
        <div class="km km-red"><span>${num(urgent)}</span><small>Urgentes (P1) em aberto</small></div>
        <div class="km km-orange"><span>${num(overdue)}</span><small>Com prazo vencido</small></div>
        <div class="km km-blue"><span>${money(openCost)}</span><small>Custo estimado em aberto</small></div>`;
      $('#kanbanHint').textContent = !ctx.user.perm.can_edit_analysis
        ? 'Toque em uma demanda para ver os detalhes.'
        : 'Arraste um cartão para outra coluna para mudar o andamento, ou use o lápis para editar.';

      const groups = state.groupBy==='priority' ? PRIORITY_GROUPS : STAGE_GROUPS;
      const byGroup = new Map(groups.map(g=>[g.key,[]]));
      rows.forEach(d=>{
        const key = state.groupBy==='priority' ? d.priority : stageKeyForStatus(d.status);
        (byGroup.get(key)||byGroup.get(groups[0].key)).push(d);
      });

      $('#kanbanBoard').innerHTML = groups.map(g=>{
        const items = byGroup.get(g.key)||[];
        const cost = items.filter(d=>d.status!=='Concluída' && d.status!=='Cancelada').reduce((a,d)=>a+(d.cost_estimate||0),0);
        return `<section class="kanban-column" data-accent="${g.accent}">
          <header class="kanban-col-head"><div><h3>${esc(g.label)}</h3><p>${esc(g.hint)}</p></div><span class="kanban-count">${items.length}</span></header>
          ${cost?`<div class="kanban-col-cost">${money(cost)} em aberto</div>`:''}
          <div class="kanban-col-body" data-drop="${g.key}">${items.length?items.map(kanbanCard).join(''):`<div class="kanban-empty">Nenhuma demanda aqui</div>`}</div>
        </section>`;
      }).join('');

      const rowsById = new Map(rows.map(d=>[d.id,d]));
      $$('.kanban-card',content).forEach(card=>{
        const goToDemand = () => location.href=`/demandas/${card.dataset.id}`;
        card.addEventListener('click', e=>{ if(e.target.closest('[data-edit]')) return; goToDemand(); });
        card.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); goToDemand(); } });
        card.querySelector('[data-edit]')?.addEventListener('click', e=>{
          e.stopPropagation();
          const d = rowsById.get(Number(card.dataset.id));
          if(d) openEditTechnical(d, load);
        });
        if(ctx.user.perm.can_edit_analysis){
          card.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', card.dataset.id); e.dataTransfer.effectAllowed='move'; card.classList.add('dragging'); });
          card.addEventListener('dragend', ()=>{ card.classList.remove('dragging'); $$('.kanban-col-body',content).forEach(b=>b.classList.remove('drag-over')); });
        }
      });

      if(ctx.user.perm.can_edit_analysis){
        $$('.kanban-col-body',content).forEach(body=>{
          body.addEventListener('dragover', e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; body.classList.add('drag-over'); });
          body.addEventListener('dragleave', e=>{ if(!body.contains(e.relatedTarget)) body.classList.remove('drag-over'); });
          body.addEventListener('drop', async e=>{
            e.preventDefault(); body.classList.remove('drag-over');
            const id = Number(e.dataTransfer.getData('text/plain'));
            const d = rowsById.get(id);
            if(!d) return;
            const targetKey = body.dataset.drop;
            const currentKey = state.groupBy==='priority' ? d.priority : stageKeyForStatus(d.status);
            if(currentKey===targetKey) return;
            const targetGroup = groups.find(g=>g.key===targetKey);
            const field = state.groupBy==='priority' ? 'priority' : 'status';
            const value = targetGroup.target;
            try{
              await api(`/api/demands/${id}`,{method:'PUT',body:{[field]:value}});
              toast('Demanda movida', `${d.code} → ${targetGroup.label}`);
              await load();
            }catch(err){ toast('Não foi possível mover', err.message, 'error'); }
          });
        });
      }
    };

    let t;
    $('#fQ').addEventListener('input',()=>{ state.q=$('#fQ').value; clearTimeout(t); t=setTimeout(load,250); });
    $('#fCategory').addEventListener('change',()=>{ state.category=$('#fCategory').value; load(); });
    $('#fPriority').addEventListener('change',()=>{ state.priority=$('#fPriority').value; load(); });
    $('#fGroupBy').addEventListener('change',()=>{ state.groupBy=$('#fGroupBy').value; load(); });
    if(!ctx.user.perm.school_scoped) $('#fSchool').addEventListener('change',()=>{ state.school_id=$('#fSchool').value; load(); });
    $('#hideDoneChip').addEventListener('click',()=>{ state.hideDone=!state.hideDone; $('#hideDoneChip').classList.toggle('active',state.hideDone); load(); });
    $('#clearKanbanFilters').addEventListener('click',()=>{
      state.q='';state.category='';state.priority='';state.hideDone=false;
      $('#fQ').value='';$('#fCategory').value='';$('#fPriority').value='';$('#hideDoneChip').classList.remove('active');
      if(!ctx.user.perm.school_scoped){ state.school_id=''; $('#fSchool').value=''; }
      load();
    });
    await load();
  }

  // Global interactions
  $$('[data-open-demand]').forEach(b=>b.addEventListener('click',openDemandForm));
  $('#menuButton')?.addEventListener('click',()=>{$('#sidebar').classList.add('open');showBackdrop(true)});
  $('#sideClose')?.addEventListener('click',()=>{$('#sidebar').classList.remove('open');showBackdrop(false)});
  $('#backdrop')?.addEventListener('click',()=>$('#sidebar').classList.remove('open'));
  $$('.side-menu .nav-item').forEach(a=>a.addEventListener('click',()=>{
    $('#sidebar')?.classList.remove('open');
  }));
  $('#navBack')?.addEventListener('click',()=>history.back());

  // Mantém a régua --header-h atualizada para o menu lateral fixo (desktop) começar exatamente abaixo do cabeçalho.
  const syncHeaderHeight = () => {
    const h = $('.govbr-header')?.offsetHeight || 0;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  };
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('load', syncHeaderHeight);

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
  const SHORTCUTS = [
    {key:'N', label:'Registrar Demanda/CI', action:()=>openDemandForm()},
    {key:'P', label:'Ir para o Painel', href:'/'},
    {key:'D', label:'Ir para Demandas', href:'/demandas'},
    {key:'K', label:'Ir para o Quadro Kanban', href:'/kanban'},
    ...(ctx.user.perm.can_view_planning ? [{key:'F', label:'Ir para Planejamento Futuro', href:'/planejamento'}] : []),
    {key:'E', label:'Ir para Unidades Escolares', href:'/escolas'},
    ...(ctx.user.perm.can_view_reports ? [{key:'R', label:'Ir para Relatórios', href:'/relatorios'}] : []),
    ...(ctx.user.perm.can_manage_admin ? [{key:'A', label:'Ir para Administração', href:'/administracao'}] : []),
    {key:'S', label:'Ir para Sobre o Sistema', href:'/sobre'},
    {key:'B', label:'Voltar para a página anterior', action:()=>history.back()},
    {key:'Esc', label:'Fechar uma janela aberta', action:()=>closeModal()},
    {key:'?', label:'Abrir esta lista de atalhos', action:()=>openShortcutsHelp()},
  ];
  function openShortcutsHelp(){
    modal({title:'Central de Ajuda',mode:'center',body:`<div class="info-card accent"><h3>${icon('help')}Como usar a Agenda Integrada</h3><p><strong>1.</strong> Registre a demanda com clareza e impacto.<br><strong>2.</strong> A Infraestrutura classifica prioridade, ação, responsável e prazo.<br><strong>3.</strong> Toda devolutiva fica registrada na linha do tempo.<br><strong>4.</strong> Necessidades que dependem de projeto, aquisição ou contratação podem seguir para Planejamento Futuro.</p></div>
      <section class="info-card mt-16"><h3>${icon('grid')}Atalhos de teclado</h3><div class="shortcut-list">${SHORTCUTS.map(s=>`<div class="shortcut-row"><kbd class="key-hint">${esc(s.key)}</kbd><span>${esc(s.label)}</span></div>`).join('')}</div><p class="wizard-hint mt-12">Os atalhos não funcionam enquanto você estiver digitando em um campo.</p></section>`});
  }
  document.addEventListener('keydown', e=>{
    const tag=(e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea'||tag==='select'||e.target.isContentEditable) return;
    if(!$('#backdrop').hidden) return;
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(e.key==='?'){ e.preventDefault(); openShortcutsHelp(); return; }
    const match=SHORTCUTS.find(s=>s.key.toLowerCase()===e.key.toLowerCase() && s.key!=='?' && s.key!=='Esc');
    if(!match) return;
    e.preventDefault();
    if(match.action) match.action(); else if(match.href) location.href=match.href;
  });
  $('#shortcutsHelp')?.addEventListener('click',openShortcutsHelp);

  // Global search
  const gs=$('#globalSearch'), gr=$('#globalSearchResults'); let gst;
  gs?.addEventListener('input',()=>{clearTimeout(gst);const q=gs.value.trim();if(q.length<2){gr.hidden=true;return}gst=setTimeout(async()=>{try{const rows=await api(`/api/demands?q=${encodeURIComponent(q)}`);gr.innerHTML=rows.slice(0,6).map(d=>`<a class="search-result" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.code)} · ${esc(d.school_name)}</small></div></a>`).join('') || `<div class="search-result"><div><strong>Nenhum resultado</strong><small>Tente outro termo.</small></div></div>`;gr.hidden=false;}catch{}},250)});
  document.addEventListener('click',e=>{if(!e.target.closest('.global-search-wrap'))gr.hidden=true;if(!e.target.closest('#userMenuButton')&&!e.target.closest('#userMenu'))$('#userMenu').hidden=true;if(!e.target.closest('#notificationButton')&&!e.target.closest('#notificationPanel'))$('#notificationPanel').hidden=true;});

  // Clicar em qualquer célula (td) de uma linha de tabela de demandas abre os detalhes —
  // reaproveita o atributo data-href já presente em cada <tr> de renderDemandTable().
  // Delegado no container principal da página, então funciona tanto na tabela completa
  // de Demandas quanto na tabela compacta "Atividade recente" do Painel, e continua
  // funcionando depois de qualquer atualização de filtro (a tabela é recriada, o
  // container que recebe o clique não). Clique em um link ou botão dentro da linha
  // (ex.: o ícone de "Ver detalhes") continua indo direto para o próprio destino.
  content.addEventListener('click',e=>{
    if(e.target.closest('a,button')) return;
    const tr=e.target.closest('tr[data-href]');
    if(tr) location.href=tr.dataset.href;
  });

  async function init(){
    try{
      if(page==='dashboard') await renderDashboard();
      else if(page==='demands') await renderDemands();
      else if(page==='demand-detail') await renderDemandDetail();
      else if(page==='kanban') await renderKanban();
      else if(page==='planning') await renderPlanning();
      else if(page==='schools') await renderSchools();
      else if(page==='reports') await renderReports();
      else if(page==='admin') await renderAdmin();
      else if(page==='about') await renderAbout();
    }catch(e){content.innerHTML=`${pageHeader('Não foi possível carregar esta tela','O sistema encontrou um erro ao buscar os dados.')}<div class="alert error">${esc(e.message)}</div>`;console.error(e)}
  }
  init();
})();
