(() => {
  const ctx = window.APP_CONTEXT || {};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
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
    { value: 'P3', title: 'Pode esperar', hint: 'Não atrapalha o dia a dia agora', icon: 'clock' },
    { value: 'P2', title: 'Precisa de atenção logo', hint: 'Já incomoda a rotina da escola', icon: 'warning' },
    { value: 'P1', title: 'É urgente', hint: 'Risco agora ou impede a aula', icon: 'bolt' }
  ];
  const REACH_CHOICES = [
    { value: 5, title: 'Poucas pessoas', hint: 'Uma sala ou um pequeno grupo', icon: 'users' },
    { value: 30, title: 'Muitas pessoas', hint: 'Vários alunos e funcionários', icon: 'users' },
    { value: 150, title: 'Quase todo mundo', hint: 'A escola inteira é afetada', icon: 'globe' }
  ];
  // --- Unidades de medida por categoria (referência fornecida pelo usuário) ---
  // Catálogo de unidades de medida. `codigo` é a chave estável (referenciada por
  // CATEGORIA_UNIDADES); `simbolo` é o que fica gravado em demands.planned_unit e
  // planning_items.unit. `g` agrupa as opções no <select>.
  const UNIDADES_MEDIDA_LIST = [
    // Contagem e embalagem
    {codigo:"UN",nome:"Unidade",simbolo:"un",g:"cont"},
    {codigo:"PC",nome:"Peça",simbolo:"pç",g:"cont"},
    {codigo:"PAR",nome:"Par",simbolo:"par",g:"cont"},
    {codigo:"DZ",nome:"Dúzia",simbolo:"dz",g:"cont"},
    {codigo:"CTO",nome:"Cento",simbolo:"cto",g:"cont"},
    {codigo:"MIL",nome:"Milheiro",simbolo:"mil",g:"cont"},
    {codigo:"CJ",nome:"Conjunto",simbolo:"cj",g:"cont"},
    {codigo:"KIT",nome:"Kit",simbolo:"kit",g:"cont"},
    {codigo:"JG",nome:"Jogo",simbolo:"jg",g:"cont"},
    {codigo:"PCT",nome:"Pacote",simbolo:"pct",g:"cont"},
    {codigo:"CX",nome:"Caixa",simbolo:"cx",g:"cont"},
    {codigo:"FD",nome:"Fardo",simbolo:"fd",g:"cont"},
    {codigo:"RL",nome:"Rolo",simbolo:"rl",g:"cont"},
    {codigo:"BOB",nome:"Bobina",simbolo:"bob",g:"cont"},
    {codigo:"CART",nome:"Cartela",simbolo:"cart",g:"cont"},
    {codigo:"BL",nome:"Bloco",simbolo:"bl",g:"cont"},
    {codigo:"SC",nome:"Saco",simbolo:"sc",g:"cont"},
    {codigo:"ENV",nome:"Envelope",simbolo:"env",g:"cont"},
    {codigo:"FR",nome:"Frasco",simbolo:"fr",g:"cont"},
    {codigo:"GL",nome:"Galão",simbolo:"gal",g:"cont"},
    {codigo:"LT",nome:"Lata",simbolo:"lt",g:"cont"},
    {codigo:"TB",nome:"Tubo",simbolo:"tb",g:"cont"},
    {codigo:"BR",nome:"Barra",simbolo:"br",g:"cont"},
    // Construção e manutenção
    {codigo:"BD",nome:"Balde",simbolo:"bd",g:"obra"},
    {codigo:"CH",nome:"Chapa",simbolo:"ch",g:"obra"},
    {codigo:"PL",nome:"Placa",simbolo:"pl",g:"obra"},
    // Comprimento
    {codigo:"MM",nome:"Milímetro",simbolo:"mm",g:"comp"},
    {codigo:"CM",nome:"Centímetro",simbolo:"cm",g:"comp"},
    {codigo:"M",nome:"Metro",simbolo:"m",g:"comp"},
    {codigo:"KM",nome:"Quilômetro",simbolo:"km",g:"comp"},
    // Área
    {codigo:"MM2",nome:"Milímetro quadrado",simbolo:"mm²",g:"area"},
    {codigo:"CM2",nome:"Centímetro quadrado",simbolo:"cm²",g:"area"},
    {codigo:"M2",nome:"Metro quadrado",simbolo:"m²",g:"area"},
    {codigo:"KM2",nome:"Quilômetro quadrado",simbolo:"km²",g:"area"},
    {codigo:"HA",nome:"Hectare",simbolo:"ha",g:"area"},
    // Volume
    {codigo:"MM3",nome:"Milímetro cúbico",simbolo:"mm³",g:"vol"},
    {codigo:"CM3",nome:"Centímetro cúbico",simbolo:"cm³",g:"vol"},
    {codigo:"M3",nome:"Metro cúbico",simbolo:"m³",g:"vol"},
    // Capacidade e líquidos
    {codigo:"ML",nome:"Mililitro",simbolo:"mL",g:"cap"},
    {codigo:"CL",nome:"Centilitro",simbolo:"cL",g:"cap"},
    {codigo:"L",nome:"Litro",simbolo:"L",g:"cap"},
    {codigo:"KL",nome:"Quilolitro",simbolo:"kL",g:"cap"},
    // Massa e peso
    {codigo:"MG",nome:"Miligrama",simbolo:"mg",g:"massa"},
    {codigo:"G",nome:"Grama",simbolo:"g",g:"massa"},
    {codigo:"KG",nome:"Quilograma",simbolo:"kg",g:"massa"},
    {codigo:"T",nome:"Tonelada",simbolo:"t",g:"massa"},
    // Tempo
    {codigo:"S",nome:"Segundo",simbolo:"s",g:"tempo"},
    {codigo:"MIN",nome:"Minuto",simbolo:"min",g:"tempo"},
    {codigo:"H",nome:"Hora",simbolo:"h",g:"tempo"},
    {codigo:"DIA",nome:"Dia",simbolo:"dia",g:"tempo"},
    {codigo:"SEM",nome:"Semana",simbolo:"sem",g:"tempo"},
    {codigo:"MES",nome:"Mês",simbolo:"mês",g:"tempo"},
    {codigo:"ANO",nome:"Ano",simbolo:"ano",g:"tempo"},
    // Serviços
    {codigo:"SERV",nome:"Serviço",simbolo:"sv",g:"serv"},
    {codigo:"HTEC",nome:"Hora técnica",simbolo:"h/téc",g:"serv"},
    {codigo:"DIARIA",nome:"Diária",simbolo:"diária",g:"serv"},
    {codigo:"EVT",nome:"Evento",simbolo:"evt",g:"serv"},
    {codigo:"VIS",nome:"Visita",simbolo:"vis",g:"serv"},
    {codigo:"PTO",nome:"Ponto",simbolo:"pto",g:"serv"},
    {codigo:"APL",nome:"Aplicação",simbolo:"aplic.",g:"serv"},
    // Energia e eletricidade
    {codigo:"W",nome:"Watt",simbolo:"W",g:"energia"},
    {codigo:"KW",nome:"Quilowatt",simbolo:"kW",g:"energia"},
    {codigo:"WH",nome:"Watt-hora",simbolo:"Wh",g:"energia"},
    {codigo:"KWH",nome:"Quilowatt-hora",simbolo:"kWh",g:"energia"},
    {codigo:"V",nome:"Volt",simbolo:"V",g:"energia"},
    {codigo:"A",nome:"Ampere",simbolo:"A",g:"energia"},
    {codigo:"MA",nome:"Miliampere",simbolo:"mA",g:"energia"},
    {codigo:"OHM",nome:"Ohm",simbolo:"Ω",g:"energia"},
    {codigo:"HZ",nome:"Hertz",simbolo:"Hz",g:"energia"},
    // Pressão, temperatura e velocidade
    {codigo:"PA",nome:"Pascal",simbolo:"Pa",g:"fisica"},
    {codigo:"KPA",nome:"Quilopascal",simbolo:"kPa",g:"fisica"},
    {codigo:"BAR",nome:"Bar",simbolo:"bar",g:"fisica"},
    {codigo:"PSI",nome:"PSI",simbolo:"psi",g:"fisica"},
    {codigo:"C",nome:"Grau Celsius",simbolo:"°C",g:"fisica"},
    {codigo:"K",nome:"Kelvin",simbolo:"K",g:"fisica"},
    {codigo:"MS",nome:"Metro por segundo",simbolo:"m/s",g:"fisica"},
    {codigo:"KMH",nome:"Quilômetro por hora",simbolo:"km/h",g:"fisica"},
    // Documentos e logística
    {codigo:"DOC",nome:"Documento",simbolo:"doc.",g:"doc"},
    {codigo:"LAU",nome:"Laudo",simbolo:"laudo",g:"doc"},
    {codigo:"FAT",nome:"Fatura",simbolo:"fatura",g:"doc"},
    {codigo:"VIAG",nome:"Viagem",simbolo:"viagem",g:"doc"},
    {codigo:"CARGA",nome:"Carga",simbolo:"carga",g:"doc"},
    // Índices
    {codigo:"PCTG",nome:"Porcentagem",simbolo:"%",g:"indice"},
  ];
  const UNIDADES_MEDIDA_BY_CODE = Object.fromEntries(UNIDADES_MEDIDA_LIST.map(u => [u.codigo, u]));

  const UNIDADE_GRUPOS = [
    ['cont', 'Contagem e embalagem'],
    ['obra', 'Construção e manutenção'],
    ['comp', 'Comprimento'],
    ['area', 'Área'],
    ['vol', 'Volume'],
    ['cap', 'Capacidade e líquidos'],
    ['massa', 'Massa e peso'],
    ['tempo', 'Tempo'],
    ['serv', 'Serviços'],
    ['energia', 'Energia e eletricidade'],
    ['fisica', 'Pressão, temperatura e velocidade'],
    ['doc', 'Documentos e logística'],
    ['indice', 'Índices']
  ];

  // As unidades que cobrem quase toda demanda de infraestrutura sobem para o topo
  // da lista; as demais continuam acessíveis nos grupos abaixo.
  const UNIDADES_MAIS_USADAS = ['UN', 'PC', 'PAR', 'CJ', 'KIT', 'CX', 'PCT', 'SC', 'RL', 'BOB', 'BR', 'CH', 'PL', 'TB', 'FR', 'GL',
    'M', 'M2', 'M3', 'MM', 'CM', 'KM', 'ML', 'L', 'G', 'KG', 'T', 'H', 'DIA', 'SERV', 'PTO', 'PCTG'];

  // Monta as <option> de unidade de medida. `sugeridas` recebe os códigos que a
  // categoria da demanda recomenda (CATEGORIA_UNIDADES) e vira o primeiro grupo.
  // Cada unidade aparece uma única vez, na posição mais alta em que se qualifica.
  function unitOptionsHTML(selecionada = '', sugeridas = [], rotuloSugeridas = 'Sugeridas para esta demanda') {
    const usados = new Set();
    const rotuloGrupo = Object.fromEntries(UNIDADE_GRUPOS);
    const opt = u => {
      usados.add(u.codigo);
      return `<option value="${esc(u.simbolo)}" data-keywords="${esc(rotuloGrupo[u.g] || '')}" ${u.simbolo === selecionada ? 'selected' : ''}>${esc(u.nome)} — ${esc(u.simbolo)}</option>`;
    };
    const grupo = (label, lista) => lista.length ? `<optgroup label="${esc(label)}">${lista.map(opt).join('')}</optgroup>` : '';
    const byCode = c => UNIDADES_MEDIDA_BY_CODE[c];
    const livre = u => u && !usados.has(u.codigo);

    let html = `<option value="" ${selecionada ? '' : 'selected'}>Selecionar unidade...</option>`;
    // Valor gravado que não existe no catálogo (dados antigos) não pode sumir.
    if (selecionada && !UNIDADES_MEDIDA_LIST.some(u => u.simbolo === selecionada)) {
      html += `<optgroup label="Valor atual"><option value="${esc(selecionada)}" selected>${esc(selecionada)}</option></optgroup>`;
    }
    html += grupo(rotuloSugeridas, sugeridas.map(byCode).filter(livre));
    html += grupo('Mais usadas', UNIDADES_MAIS_USADAS.map(byCode).filter(livre));
    UNIDADE_GRUPOS.forEach(([key, label]) => {
      html += grupo(label, UNIDADES_MEDIDA_LIST.filter(u => u.g === key && livre(u)));
    });
    return html;
  }
  const CATEGORIA_UNIDADES = {
    "Elétrica":{usar:true,permitidas:["UN","M","RL","CX","PCT","KIT","JG","PC"],porItem:{"fio/cabo":["M","RL"],"lâmpada":["UN","CX","PCT"],"disjuntor":["UN","CX"],"conector":["UN","PCT","CX"],"interruptor":["UN","CX","PCT"],"tomada":["UN","CX","PCT"],"eletroduto":["M","BR"],"fita isolante":["RL","UN"],"quadro elétrico":["UN","KIT"]}},
    "Hidráulica":{usar:true,permitidas:["UN","M","BR","RL","CX","PCT","KIT","L","KG"],porItem:{"cano/tubo":["M","BR"],"conexão":["UN","PCT","CX"],"torneira":["UN"],"registro":["UN"],"mangueira":["M","RL"],"fita veda rosca":["RL","UN"],"adesivo pvc":["ML","L","UN"]}},
    "Cobertura/Telhado":{usar:true,permitidas:["UN","M","M2","RL","CX","PCT","SC","KG"],porItem:{}},
    "Pintura":{usar:true,permitidas:["L","ML","GL","BD","LT","KG","UN","RL","M2","SERV"],porItem:{"tinta":["L","GL","BD","LT"],"massa corrida":["KG","BD","SC"],"rolo":["UN"],"pincel":["UN"],"lixa":["UN","PCT"],"área a pintar":["M2"]}},
    "Climatização":{usar:true,permitidas:["UN","PC","KIT","M","RL","CX","KG","SERV","H"],porItem:{}},
    "Serralheria":{usar:true,permitidas:["UN","PC","M","M2","BR","KG","KIT","SERV"],porItem:{}},
    "Alvenaria":{usar:true,permitidas:["UN","M","M2","M3","SC","KG","CX","SERV"],porItem:{}},
    "Acessibilidade":{usar:true,permitidas:["UN","M","M2","BR","RL","KIT","SERV"],porItem:{}},
    "Mobiliário":{usar:true,permitidas:["UN","PC","PAR","JG","CJ","KIT"],porItem:{}},
    "Equipamentos":{usar:true,permitidas:["UN","PC","KIT","CJ","PAR","JG"],porItem:{}},
    "Segurança":{usar:true,permitidas:["UN","PC","KIT","CJ","M","RL","CX","PCT","SERV"],porItem:{}},
    "Saneamento":{usar:true,permitidas:["UN","M","M3","L","KG","SC","SERV","H"],porItem:{}},
    "Estrutura":{usar:true,permitidas:["UN","M","M2","M3","BR","KG","SC","SERV"],porItem:{}},
    "Área externa":{usar:true,permitidas:["M","M2","M3","UN","KG","SC","L","SERV"],porItem:{}},
    "Iluminação":{usar:true,permitidas:["UN","PC","CX","PCT","KIT","M","RL"],porItem:{"lâmpada":["UN","CX","PCT"],"luminária":["UN","CX"],"refletor":["UN"],"soquete":["UN","PCT"],"fio/cabo":["M","RL"]}},
    "Portas e janelas":{usar:true,permitidas:["UN","PC","M","M2","KIT","JG","SERV"],porItem:{}},
    "Reforma":{usar:true,permitidas:["UN","M","M2","M3","KG","L","SC","CX","SERV","H"],porItem:{}},
    "Obra":{usar:true,permitidas:["UN","M","M2","M3","KG","T","L","SC","SERV","H"],porItem:{}},
    "Aquisição":{usar:true,permitidas:["UN","PC","PAR","JG","KIT","CJ","CX","PCT","RL","M","M2","M3","L","KG"],porItem:{}},
    "Outros":{usar:true,permitidas:["UN","PC","PAR","JG","KIT","CJ","CX","PCT","RL","M","M2","M3","L","KG","SERV","H"],porItem:{}},
    "Agendamento":{usar:false,permitidas:[],porItem:{}},
    "Assistência":{usar:true,permitidas:["SERV","H","DIA","VIS"],porItem:{}},
    "Automação":{usar:true,permitidas:["UN","PC","KIT","CJ","M","RL","CX","PCT","SERV"],porItem:{}},
    "Avaliação":{usar:true,permitidas:["LAU","VIS","SERV","H"],porItem:{}},
    "Boletim de Ocorrência":{usar:false,permitidas:[],porItem:{}},
    "Bombeiro Hidráulico":{usar:true,permitidas:["SERV","H","DIA","VIS"],porItem:{}},
    "Capina":{usar:true,permitidas:["M2","SERV","H","DIA"],porItem:{}},
    "Comunicado":{usar:false,permitidas:[],porItem:{}},
    "Conserto":{usar:true,permitidas:["SERV","H","PC","UN"],porItem:{}},
    "Consultoria":{usar:true,permitidas:["SERV","H","DIA","VIS"],porItem:{}},
    "Conta Luz":{usar:false,permitidas:[],porItem:{}},
    "Corte":{usar:false,permitidas:[],porItem:{}},
    "Declaração":{usar:false,permitidas:[],porItem:{}},
    "Dedetização":{usar:true,permitidas:["M2","L","ML","APL","SERV"],porItem:{}},
    "Desratização":{usar:true,permitidas:["M2","KG","G","APL","SERV"],porItem:{}},
    "Desalojamento de pombos":{usar:true,permitidas:["M2","APL","SERV","H"],porItem:{}},
    "Desinfecção":{usar:true,permitidas:["M2","L","ML","APL","SERV"],porItem:{}},
    "Iluminação Interna":{usar:true,permitidas:["UN","PC","CX","PCT","KIT","M","RL"],porItem:{"lâmpada":["UN","CX","PCT"],"luminária":["UN","CX"],"soquete":["UN","PCT"],"fio/cabo":["M","RL"]}},
    "Iluminação Externa":{usar:true,permitidas:["UN","PC","CX","PCT","KIT","M","RL"],porItem:{"lâmpada":["UN","CX","PCT"],"refletor":["UN"],"luminária/poste":["UN"],"fio/cabo":["M","RL"]}},
    "Informação":{usar:false,permitidas:[],porItem:{}},
    "Inspeção":{usar:true,permitidas:["VIS","LAU","SERV","H"],porItem:{}},
    "Inspeção Gás":{usar:true,permitidas:["VIS","LAU","SERV","H"],porItem:{}},
    "Instalação":{usar:true,permitidas:["UN","PC","KIT","M","M2","SERV","H"],porItem:{}},
    "Isolamento":{usar:true,permitidas:["M","M2","RL","UN","PCT","SERV"],porItem:{}},
    "Jardinagem":{usar:true,permitidas:["M2","M3","UN","KG","SC","L","SERV","H"],porItem:{}},
    "Levantamento":{usar:true,permitidas:["VIS","LAU","SERV","H"],porItem:{}},
    "Limpeza":{usar:true,permitidas:["M2","M3","L","KG","UN","PCT","SERV","H"],porItem:{}},
    "Manutenção":{usar:true,permitidas:["SERV","H","DIA","VIS","PC","UN"],porItem:{}},
    "Montagem":{usar:true,permitidas:["SERV","H","UN","PC","KIT","CJ"],porItem:{}},
    "Obra/Reparo":{usar:true,permitidas:["UN","M","M2","M3","KG","L","SC","SERV","H"],porItem:{}},
    "Poda de árvore":{usar:true,permitidas:["UN","SERV","H","DIA"],porItem:{}},
    "Poda e Roçada":{usar:true,permitidas:["M2","SERV","H","DIA"],porItem:{}},
    "Reciclagem":{usar:true,permitidas:["KG","T","M3","CX","PCT","UN","SERV"],porItem:{}},
    "Refrigeração":{usar:true,permitidas:["UN","PC","KIT","M","KG","SERV","H"],porItem:{}},
    "Relatório":{usar:false,permitidas:[],porItem:{}},
    "Reparo":{usar:true,permitidas:["SERV","H","PC","UN"],porItem:{}},
    "Resposta":{usar:false,permitidas:[],porItem:{}},
    "Retirada":{usar:true,permitidas:["UN","PC","KG","T","M3","CARGA","SERV"],porItem:{}},
    "Retorno":{usar:false,permitidas:[],porItem:{}},
    "Serviço de solda":{usar:true,permitidas:["SERV","H","M","KG","PC","UN"],porItem:{}},
    "Solicitação":{usar:false,permitidas:[],porItem:{}},
    "Substituição":{usar:true,permitidas:["UN","PC","KIT","SERV","H"],porItem:{}},
    "Transporte":{usar:true,permitidas:["VIAG","CARGA","UN","KG","T","M3","SERV"],porItem:{}},
    "Troca":{usar:true,permitidas:["UN","PC","KIT","SERV","H"],porItem:{}},
    "Vacall":{usar:true,permitidas:["M3","SERV","H","VIAG"],porItem:{}},
    "Visita técnica":{usar:true,permitidas:["VIS","SERV","H"],porItem:{}},
    "Vistoria":{usar:true,permitidas:["VIS","LAU","SERV","H"],porItem:{}},
  };
  const CATEGORIA_UNIDADES_DEFAULT = {usar:true,permitidas:['UN','PC','KIT','CJ','M','M2','L','KG','SERV','H'],porItem:{}};
  // Agrupamento temático das categorias no assistente de registro (passo 1) — só para
  // organizar a busca em abas (Infraestrutura/Manutenção/Serviços/Administrativo/Outros);
  // não existe coluna "grupo" no banco, então isso é só uma classificação de exibição no
  // front-end, sem alterar a tabela `categories` nem nenhuma API. Categoria não listada
  // aqui cai automaticamente em "Outros".
  const CATEGORY_GROUPS = {
    'Acessibilidade': 'infra', 'Alvenaria': 'infra', 'Climatização': 'infra', 'Cobertura/Telhado': 'infra',
    'Elétrica': 'infra', 'Equipamentos': 'infra', 'Estrutura': 'infra', 'Hidráulica': 'infra', 'Iluminação': 'infra',
    'Iluminação Externa': 'infra', 'Iluminação Interna': 'infra', 'Instalação': 'infra', 'Isolamento': 'infra',
    'Mobiliário': 'infra', 'Obra': 'infra', 'Obra/Reparo': 'infra', 'Pintura': 'infra', 'Portas e janelas': 'infra',
    'Reforma': 'infra', 'Refrigeração': 'infra', 'Saneamento': 'infra', 'Segurança': 'infra', 'Serralheria': 'infra',
    'Área externa': 'infra',
    'Bombeiro Hidráulico': 'manutencao', 'Capina': 'manutencao', 'Conserto': 'manutencao', 'Corte': 'manutencao',
    'Dedetização': 'manutencao', 'Desalojamento de pombos': 'manutencao', 'Desinfecção': 'manutencao',
    'Desratização': 'manutencao', 'Jardinagem': 'manutencao', 'Limpeza': 'manutencao', 'Manutenção': 'manutencao',
    'Montagem': 'manutencao', 'Poda de árvore': 'manutencao', 'Poda e Roçada': 'manutencao', 'Reparo': 'manutencao',
    'Serviço de solda': 'manutencao', 'Substituição': 'manutencao', 'Troca': 'manutencao', 'Vacall': 'manutencao',
    'Agendamento': 'servicos', 'Assistência': 'servicos', 'Automação': 'servicos', 'Avaliação': 'servicos',
    'Comunicado': 'servicos', 'Consultoria': 'servicos', 'Inspeção': 'servicos', 'Inspeção Gás': 'servicos',
    'Levantamento': 'servicos', 'Reciclagem': 'servicos', 'Retirada': 'servicos', 'Retorno': 'servicos',
    'Transporte': 'servicos', 'Visita técnica': 'servicos', 'Vistoria': 'servicos',
    'Aquisição': 'administrativo', 'Boletim de Ocorrência': 'administrativo', 'Conta Luz': 'administrativo',
    'Declaração': 'administrativo', 'Informação': 'administrativo', 'Relatório': 'administrativo',
    'Resposta': 'administrativo', 'Solicitação': 'administrativo'
  };
  const CATEGORY_TABS = [
    { key: 'usadas', label: 'Mais usadas', icon: 'star' },
    { key: 'infra', label: 'Infraestrutura', icon: 'building' },
    { key: 'manutencao', label: 'Manutenção', icon: 'wrench' },
    { key: 'servicos', label: 'Serviços', icon: 'clipboard' },
    { key: 'administrativo', label: 'Administrativo', icon: 'user' },
    { key: 'outros', label: 'Outros', icon: 'dots' }
  ];

  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const esc = (v = '') => String(v ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = v => Number(v || 0).toLocaleString('pt-BR');
  const fmtDate = v => {
    if (!v) return '—';
    const raw = String(v).slice(0, 10);
    const [y, m, d] = raw.split('-');
    return y && m && d ? `${d}/${m}/${y}` : v;
  };
  const fmtDateTime = v => {
    if (!v) return '—';
    const dt = String(v).replace(' ', 'T');
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  // ===== Calendário customizado (substitui <input type="date"> nativo) =====
  // Mantém o input original (agora hidden) com o valor ISO "YYYY-MM-DD" que o
  // resto do código já lê via #id, e adiciona um input de exibição dd/mm/aaaa
  // + um popover de calendário. A data "de hoje" nunca fica gravada em estado —
  // é sempre recalculada com `new Date()` no momento em que é usada (abertura
  // do calendário e clique em "Hoje"), então o calendário nunca mostra um mês
  // desatualizado.
  const DP_DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const DP_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dpPad2 = n => String(n).padStart(2, '0');
  const dpTodayISO = () => { const t = new Date(); return `${t.getFullYear()}-${dpPad2(t.getMonth() + 1)}-${dpPad2(t.getDate())}`; };
  const dpISOtoBR = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return y && m && d ? `${d}/${m}/${y}` : ''; };
  const dpISOParts = iso => { if (!iso) return null; const [y, m, d] = iso.split('-').map(Number); return (y && m && d) ? { y, m, d } : null; };

  let dpActiveClose = null; // fecha o popover aberto no momento, se houver

  function dpCloseActive() {
    if (dpActiveClose) { dpActiveClose(); dpActiveClose = null; }
  }

  function dpBuildGrid(viewYear, viewMonth, selectedISO) {
    // viewMonth: 0-11. Primeiro dia da semana exibido = domingo anterior (ou o próprio dia 1).
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = first.getDay(); // 0=domingo
    const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);
    const todayISO = dpTodayISO();
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + i);
      const iso = `${cellDate.getFullYear()}-${dpPad2(cellDate.getMonth() + 1)}-${dpPad2(cellDate.getDate())}`;
      const outside = cellDate.getMonth() !== viewMonth;
      const isSelected = iso === selectedISO;
      const isToday = iso === todayISO;
      const cls = ['dp-day'];
      if (outside) cls.push('is-outside');
      if (isSelected) cls.push('is-selected');
      if (isToday) cls.push('is-today');
      cells += `<button type="button" class="${cls.join(' ')}" data-dp-date="${iso}">${cellDate.getDate()}</button>`;
    }
    return cells;
  }

  function dpPanelHTML(viewYear, viewMonth, selectedISO) {
    return `
      <div class="dp-header">
        <span class="dp-month-label">${DP_MONTHS[viewMonth]} de ${viewYear}</span>
        <div class="dp-nav">
          <button type="button" class="dp-nav-btn dp-nav-prev" data-dp-nav="-1" aria-label="Mês anterior" data-tooltip="Mês anterior">${icon('chevron')}</button>
          <button type="button" class="dp-nav-btn dp-nav-next" data-dp-nav="1" aria-label="Próximo mês" data-tooltip="Próximo mês">${icon('chevron')}</button>
        </div>
      </div>
      <div class="dp-dow-row">${DP_DOW.map(d => `<span>${d}</span>`).join('')}</div>
      <div class="dp-grid">${dpBuildGrid(viewYear, viewMonth, selectedISO)}</div>
      <div class="dp-footer">
        <button type="button" class="dp-link" data-dp-clear>Limpar</button>
        <button type="button" class="dp-link" data-dp-today>Hoje</button>
      </div>`;
  }

  function dpOpen(wrap) {
    dpCloseActive();
    const hidden = $('#' + wrap.dataset.dpTarget);
    const display = $('.datepicker-display', wrap);
    if (!hidden || !display) return;

    const selectedParts = dpISOParts(hidden.value) || dpISOParts(dpTodayISO());
    let viewYear = selectedParts.y, viewMonth = selectedParts.m - 1;

    const panel = document.createElement('div');
    panel.className = 'popover dp-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Selecionar data');
    panel.innerHTML = dpPanelHTML(viewYear, viewMonth, hidden.value || '');
    document.body.appendChild(panel);

    const positionPanel = () => {
      const r = display.getBoundingClientRect();
      const panelW = panel.offsetWidth || 280;
      let left = r.left;
      if (left + panelW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - panelW - 8);
      panel.style.left = `${left}px`;
      panel.style.top = `${r.bottom + 6}px`;
    };
    positionPanel();

    const rerender = () => { panel.innerHTML = dpPanelHTML(viewYear, viewMonth, hidden.value || ''); };

    const pick = iso => {
      hidden.value = iso;
      display.value = dpISOtoBR(iso);
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    };

    panel.addEventListener('click', e => {
      const navBtn = e.target.closest('[data-dp-nav]');
      const dayBtn = e.target.closest('[data-dp-date]');
      if (navBtn) {
        viewMonth += Number(navBtn.dataset.dpNav);
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        else if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        rerender();
      } else if (dayBtn) {
        pick(dayBtn.dataset.dpDate);
      } else if (e.target.closest('[data-dp-clear]')) {
        hidden.value = '';
        display.value = '';
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      } else if (e.target.closest('[data-dp-today]')) {
        pick(dpTodayISO());
      }
    });

    const onDocClick = e => { if (!panel.contains(e.target) && !wrap.contains(e.target)) close(); };
    const onKeydown = e => { if (e.key === 'Escape') close(); };
    const onScroll = () => positionPanel();
    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', onScroll, true);

    function close() {
      panel.remove();
      document.removeEventListener('mousedown', onDocClick, true);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', onScroll, true);
      if (dpActiveClose === close) dpActiveClose = null;
    }
    dpActiveClose = close;
  }

  function initDatePickers(root = document) {
    $$('[data-datepicker]', root).forEach(wrap => {
      if (wrap.dataset.dpWired) return;
      wrap.dataset.dpWired = '1';
      const hidden = $('#' + wrap.dataset.dpTarget);
      const display = $('.datepicker-display', wrap);
      if (hidden && display) display.value = dpISOtoBR(hidden.value);
      $$('.datepicker-display, .datepicker-icon-btn', wrap).forEach(el => el.addEventListener('click', () => dpOpen(wrap)));
    });
  }

  // ---------------------------------------------------------------------------
  // Campo de busca sobre um <select> (combobox).
  // O <select> real continua no DOM e continua sendo a fonte do valor — FormData,
  // sel.value e todo o código existente seguem funcionando sem saber do combo.
  // Basta marcar o select com data-search.
  // ---------------------------------------------------------------------------
  const normalizeText = v => (v ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let comboCloseActive = null;

  function enhanceSearchableSelects(root = document) {
    $$('select[data-search]', root).forEach(sel => {
      if (sel.dataset.comboWired) return;
      sel.dataset.comboWired = '1';

      const readItems = () => {
        const out = [];
        [...sel.children].forEach(node => {
          if (node.tagName === 'OPTGROUP') [...node.children].forEach(o => out.push({ value: o.value, label: o.textContent.trim(), group: node.label, keys: o.dataset.keywords || '' }));
          else out.push({ value: node.value, label: node.textContent.trim(), group: '', keys: node.dataset.keywords || '' });
        });
        return out;
      };

      const host = sel.parentElement;
      host.classList.add('has-combo');
      sel.classList.add('combo-hidden');
      sel.setAttribute('tabindex', '-1');
      sel.setAttribute('aria-hidden', 'true');

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input combo-input';
      input.autocomplete = 'off';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-autocomplete', 'list');
      input.placeholder = sel.dataset.searchPlaceholder || 'Digite para buscar...';
      // O navegador se recusa a reportar erro em campo obrigatorio invisivel — e
      // reportValidity() falharia calado. A obrigatoriedade migra para o input.
      if (sel.required) {
        sel.required = false;
        input.required = true;
        input.setAttribute('aria-required', 'true');
      }

      const caret = document.createElement('span');
      caret.className = 'combo-caret';
      caret.innerHTML = icon('chevron');

      sel.after(caret);
      sel.after(input);

      let pop = null, active = -1, shown = [];

      const currentLabel = () => (readItems().find(i => i.value === sel.value) || {}).label || '';
      const syncLabel = () => { input.value = sel.value ? currentLabel() : ''; };
      syncLabel();

      const close = (revert = true) => {
        if (pop) { pop.remove(); pop = null; }
        input.setAttribute('aria-expanded', 'false');
        active = -1;
        if (revert) syncLabel();
        document.removeEventListener('mousedown', onDocDown, true);
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
        if (comboCloseActive === close) comboCloseActive = null;
      };

      const onDocDown = e => { if (pop && !pop.contains(e.target) && e.target !== input && e.target !== caret && !caret.contains(e.target)) close(); };

      const place = () => {
        if (!pop) return;
        if (!input.isConnected) { close(false); return; }
        const r = input.getBoundingClientRect();
        const below = window.innerHeight - r.bottom - 10;
        const above = r.top - 10;
        const openUp = below < 190 && above > below;
        pop.style.left = `${r.left}px`;
        pop.style.width = `${r.width}px`;
        pop.style.maxHeight = `${Math.max(140, Math.min(300, openUp ? above : below))}px`;
        if (openUp) { pop.style.top = 'auto'; pop.style.bottom = `${window.innerHeight - r.top + 4}px`; }
        else { pop.style.bottom = 'auto'; pop.style.top = `${r.bottom + 4}px`; }
      };

      const pick = item => {
        sel.value = item.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        close(false);
        syncLabel();
        input.focus();
      };

      const paintList = query => {
        const q = normalizeText(query);
        const all = readItems();
        // Busca no rótulo e também no grupo: digitar "area" traz as unidades de
        // área, digitar "escola" não descarta nada numa lista de escolas.
        shown = q ? all.filter(i => i.value !== '' && [i.label, i.group, i.keys].some(t => normalizeText(t).includes(q))) : all;
        if (!pop) return;
        if (!shown.length) {
          pop.innerHTML = `<p class="combo-empty">Nenhuma opção corresponde a "${esc(query)}".</p>`;
          return;
        }
        let html = '', lastGroup = null;
        shown.forEach((item, idx) => {
          if (item.group !== lastGroup) {
            if (item.group) html += `<div class="combo-group">${esc(item.group)}</div>`;
            lastGroup = item.group;
          }
          const isCurrent = item.value === sel.value && item.value !== '';
          html += `<div class="combo-option ${idx === active ? 'is-active' : ''} ${isCurrent ? 'is-current' : ''}" role="option" aria-selected="${isCurrent}" data-idx="${idx}">${esc(item.label || 'Selecionar...')}</div>`;
        });
        pop.innerHTML = html;
      };

      const open = () => {
        if (pop) return;
        comboCloseActive?.();
        pop = document.createElement('div');
        pop.className = 'popover combo-pop';
        pop.setAttribute('role', 'listbox');
        document.body.appendChild(pop);
        input.setAttribute('aria-expanded', 'true');
        active = Math.max(0, readItems().findIndex(i => i.value === sel.value));
        paintList('');
        place();
        scrollActive();
        document.addEventListener('mousedown', onDocDown, true);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        comboCloseActive = close;

        pop.addEventListener('mousedown', e => e.preventDefault());
        pop.addEventListener('click', e => {
          const el = e.target.closest('[data-idx]');
          if (el) pick(shown[Number(el.dataset.idx)]);
        });
      };

      const scrollActive = () => {
        const el = pop?.querySelector('.is-active') || pop?.querySelector('.is-current');
        el?.scrollIntoView({ block: 'nearest' });
      };

      const move = delta => {
        if (!pop) { open(); return; }
        if (!shown.length) return;
        active = (active + delta + shown.length) % shown.length;
        paintList(input.dataset.query || '');
        scrollActive();
      };

      input.addEventListener('focus', () => { open(); input.select(); });
      input.addEventListener('click', () => open());
      caret.addEventListener('mousedown', e => { e.preventDefault(); if (pop) close(); else { input.focus(); open(); } });

      input.addEventListener('input', () => {
        input.dataset.query = input.value;
        if (!pop) open();
        active = 0;
        paintList(input.value);
        place();
      });

      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') {
          if (pop && shown[active]) { e.preventDefault(); pick(shown[active]); }
        } else if (e.key === 'Escape') { if (pop) { e.stopPropagation(); close(); } }
        else if (e.key === 'Tab') close();
      });

      input.addEventListener('blur', () => { setTimeout(() => { if (pop && document.activeElement !== input) close(); else if (!pop) syncLabel(); }, 120); });

      // Se outro trecho de código mudar o select por fora, o campo acompanha.
      sel.addEventListener('change', () => { if (!pop) syncLabel(); });
    });
  }

  const PRIORITY_FALLBACK = { P1: 'Urgente', P2: 'Alta', P3: 'Programada', P4: 'Planejamento/Projeto' };
  const priorityLabel = p => (ctx.priorities && ctx.priorities[p] && ctx.priorities[p].label) || PRIORITY_FALLBACK[p] || p || '—';
  const statusClass = s => {
    s = (s || '').toLowerCase();
    if (s.includes('conclu')) return 'completed';
    if (s.includes('execu') || s.includes('programado')) return 'execution';
    if (s.includes('análise') || s.includes('triagem') || s.includes('recebida')) return 'analysis';
    if (s.includes('contrata') || s.includes('empresa')) return 'contract';
    if (s.includes('planejamento') || s.includes('futuro')) return 'future';
    return '';
  };
  const dueInfo = d => {
    if (!d || !d.due_date || ['Concluída', 'Cancelada'].includes(d.status)) return { text: fmtDate(d?.due_date), cls: '' };
    const due = new Date(d.due_date + 'T12:00:00');
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const days = Math.round((due - today) / 86400000);
    if (days < 0) return { text: `Vencido há ${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'}`, cls: 'overdue' };
    if (days === 0) return { text: 'Vence hoje', cls: 'overdue' };
    if (days <= 3) return { text: `Vence em ${days} dias`, cls: 'warning' };
    return { text: fmtDate(d.due_date), cls: '' };
  };
  const api = async (url, options = {}) => {
    const opts = { ...options, headers: { ...(options.headers || {}) } };
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) { location.href = '/login'; throw new Error('Sessão expirada'); }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data?.detail || data || 'Não foi possível concluir a operação.');
    return data;
  };
  const toast = (title, message = '', type = 'success') => {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(type === 'error' ? 'warning' : 'arrow')}<div><strong>${esc(title)}</strong>${message ? `<small>${esc(message)}</small>` : ''}</div>`;
    $('#toastStack').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  };
  const setLoading = () => { content.innerHTML = `<div class="page-skeleton"><div class="skeleton sk-title"></div><div class="skeleton sk-subtitle"></div><div class="skeleton-grid"><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div><div class="skeleton sk-card"></div></div></div>`; };
  const empty = (title = 'Nenhum registro encontrado', text = 'Ajuste os filtros ou cadastre um novo item.') => `<div class="empty-state"><div class="empty-icon">${icon('search')}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;

  function showBackdrop(show = true) { $('#backdrop').hidden = !show; }
  function closeModal() { comboCloseActive?.(); $('#modalRoot').innerHTML = ''; showBackdrop(false); }
  function modal({ title, subtitle = '', body = '', footer = '', mode = 'drawer', sidebar = '', onOpen }) {
    showBackdrop(true);
    $('#modalRoot').innerHTML = `<section class="modal ${mode}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      ${sidebar}
      <header class="modal-header"><div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div><button class="close-btn" data-close aria-label="Fechar" data-tooltip="Fechar">${icon('x')}</button></header>
      <div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}
    </section>`;
    $$('[data-close]').forEach(b => b.addEventListener('click', closeModal));
    enhanceSearchableSelects($('.modal'));
    onOpen?.($('.modal'));
  }
  $('#backdrop')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#backdrop').hidden) closeModal(); });

  // O Fullscreen API do navegador só desenha a subárvore do elemento em tela cheia --
  // #backdrop e #modalRoot vivem no topo do <body>, então quando o mapa (ou qualquer
  // outro elemento) entra em tela cheia eles somem visualmente mesmo continuando a
  // funcionar. Aqui movemos os dois para dentro do elemento em tela cheia enquanto ele
  // estiver ativo, e devolvemos cada um ao seu lugar original ao sair -- assim modais
  // como "Visão 360°" continuam abrindo normalmente com o mapa em tela cheia.
  (function bridgeModalsIntoFullscreen() {
    const backdropEl = $('#backdrop'), modalRootEl = $('#modalRoot');
    if (!backdropEl || !modalRootEl) return;
    const backdropHome = { parent: backdropEl.parentNode, next: backdropEl.nextSibling };
    const modalRootHome = { parent: modalRootEl.parentNode, next: modalRootEl.nextSibling };
    document.addEventListener('fullscreenchange', () => {
      const fsEl = document.fullscreenElement;
      if (fsEl) {
        if (!fsEl.contains(backdropEl)) fsEl.appendChild(backdropEl);
        if (!fsEl.contains(modalRootEl)) fsEl.appendChild(modalRootEl);
      } else {
        backdropHome.parent.insertBefore(backdropEl, backdropHome.next);
        modalRootHome.parent.insertBefore(modalRootEl, modalRootHome.next);
      }
    });
  })();

  async function loadSchools() {
    if (schoolsCache) return schoolsCache;
    schoolsCache = await api('/api/schools');
    return schoolsCache;
  }

  async function loadStaff() {
    if (staffCache) return staffCache;
    staffCache = await api('/api/staff');
    return staffCache;
  }

  // Tipos de ação para a providência/encaminhamento registrado numa demanda (aba Resumo).
  const PROV_ACTION_TYPES = [
    { key: 'manutencao', label: 'Manutenção', icon: 'wrench', color: 'blue' },
    { key: 'obra', label: 'Obra', icon: 'building', color: 'green' },
    { key: 'visita', label: 'Visita técnica', icon: 'user', color: 'violet' },
    { key: 'processo', label: 'Processo administrativo', icon: 'file', color: 'orange' },
    { key: 'urgente', label: 'Alerta urgente', icon: 'bell', color: 'red' }
  ];
  const PROV_PRIORITIES = ['Baixa', 'Média', 'Alta'];

  function pageHeader(title, subtitle, actions = '') {
    const back = page !== 'dashboard' ? `<a class="page-back-link" href="/" data-tooltip="Voltar para a visão geral · tecla P"><svg><use href="#i-chevron"></use></svg><span>Voltar ao Painel</span></a>` : '';
    return `<div class="page-header"><div>${back}<span class="eyebrow">AGENDA INTEGRADA</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="page-actions">${actions}</div></div>`;
  }

  async function openDemandForm() {
    const [schools, catCounts] = await Promise.all([loadSchools(), api('/api/demands/category-counts')]);
    const counts = catCounts.counts || {};
    const schoolOptions = ctx.user.perm.school_scoped
      ? `<option value="${ctx.user.school_id}">${esc(ctx.user.school_name || 'Minha unidade')}</option>`
      : schools.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    const state = {
      categories: [], items: [],
      priority: 'P3', reach: 30, customReach: false, blocks_activity: false, risk: false, photo: null
    };
    const MAX_CATEGORIES = 3;

    // "Mais frequentes" = as categorias mais usadas de fato no histórico de demandas
    // (contagem real, mesma origem do filtro de Categoria na tela de Demandas) — nunca
    // uma lista inventada. Com pouco ou nenhum uso ainda, cai de volta para a ordem
    // cadastrada em Administração, então a seção nunca fica vazia.
    const FREQUENT_N = 6;
    const frequentCats = [...ctx.categories]
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .slice(0, FREQUENT_N);
    const categoryCard = c => `<button type="button" class="category-card category-card-compact" data-category="${esc(c)}" data-group="${esc(CATEGORY_GROUPS[c] || 'outros')}" data-name="${esc(c.toLowerCase())}" aria-pressed="false" data-tooltip="${esc(CATEGORY_HINTS[c] || c)}"><span class="category-icon" style="background:var(--${CATEGORY_COLORS[c] || 'blue'}-soft);color:var(--${CATEGORY_COLORS[c] || 'blue'})">${icon(CATEGORY_ICONS[c] || 'clipboard')}</span><strong>${esc(c)}</strong></button>`;
    const categoryCardFull = c => `<button type="button" class="category-card category-card-full" data-category="${esc(c)}" data-group="${esc(CATEGORY_GROUPS[c] || 'outros')}" data-name="${esc(c.toLowerCase())}" aria-pressed="false" data-tooltip="${esc(CATEGORY_HINTS[c] || c)}"><span class="category-icon" style="background:var(--${CATEGORY_COLORS[c] || 'blue'}-soft);color:var(--${CATEGORY_COLORS[c] || 'blue'})">${icon(CATEGORY_ICONS[c] || 'clipboard')}</span><span class="category-card-text"><strong>${esc(c)}</strong><small>${esc(CATEGORY_HINTS[c] || '')}</small></span></button>`;

    const dwSidebar = `<aside class="dw-sidebar">
      <div class="dw-sidebar-blob"></div>
      <div class="dw-sidebar-badge">${icon('clipboard')}</div>
      <h2 class="dw-sidebar-title">Registrar<br>Demanda/CI</h2>
      <p class="dw-sidebar-subtitle">Conte pra gente o que está acontecendo. Sua demanda gera soluções.</p>
      <ul class="dw-sidebar-benefits">
        <li>${icon('check-circle')}<span>Atendimento mais eficiente</span></li>
        <li>${icon('check-circle')}<span>Acompanhamento em tempo real</span></li>
        <li>${icon('check-circle')}<span>Soluções mais rápidas</span></li>
      </ul>
      <img class="dw-sidebar-illustration" src="/static/images/categoria/lateral_azul.png" alt="" loading="lazy">
      <div class="dw-sidebar-help">
        <span class="dw-help-icon">?</span>
        <div><strong>Dúvidas?</strong><small>Nossa equipe está pronta para ajudar.</small></div>
      </div>
    </aside>`;

    modal({
      title: 'Registrar Demanda/CI',
      subtitle: 'Conte pra gente o que está acontecendo. Sua demanda gera soluções.',
      mode: 'fullscreen demand-wizard',
      sidebar: dwSidebar,
      body: `<div class="stepper dw-stepper">
        <div class="step active" data-step-ind="1"><span class="step-badge-row"><span class="step-num">1</span><span class="step-check">${icon('check-circle')}</span></span><span class="step-text"><strong>O que houve</strong><small>Tipo de problema</small></span></div>
        <div class="step" data-step-ind="2"><span class="step-badge-row"><span class="step-num">2</span><span class="step-check">${icon('check-circle')}</span></span><span class="step-text"><strong>Detalhes</strong><small>Local e descrição</small></span></div>
        <div class="step" data-step-ind="3"><span class="step-badge-row"><span class="step-num">3</span><span class="step-check">${icon('check-circle')}</span></span><span class="step-text"><strong>Impacto</strong><small>Urgência e alcance</small></span></div>
        <div class="step" data-step-ind="4"><span class="step-badge-row"><span class="step-num">4</span><span class="step-check">${icon('check-circle')}</span></span><span class="step-text"><strong>Enviar</strong><small>Revisar e enviar</small></span></div>
      </div>
      <form id="demandForm">
        <section data-step="1" class="form-step">
          ${!ctx.user.perm.school_scoped ? `<div class="field span-2 mb-16"><label>Unidade Escolar *</label><div class="select-wrap"><span class="select-wrap-icon">${icon('school')}</span><select class="select" name="school_id" required data-search data-search-placeholder="Buscar escola pelo nome...">${schoolOptions}</select></div></div>` : ''}
          <div class="wizard-question-row">
            <p class="wizard-question">Qual é o tipo de problema?</p>
            <span class="dw-pill" id="categoryCountPill">${icon('check-circle')}<span>0 de ${MAX_CATEGORIES} selecionados</span></span>
          </div>
          <p class="wizard-hint">Toque em até 3 opções que mais se parecem com o que você está vendo.</p>
          <p class="wizard-hint" id="categoryPickHint">Nenhum problema selecionado ainda.</p>
          <div class="category-toolbar">
            <div class="search-field">${icon('search')}<input class="input" id="categorySearch" placeholder="Pesquisar tipo de demanda..."></div>
            <div class="category-tabs" id="categoryTabs" role="tablist">
              ${CATEGORY_TABS.map((t, i) => `<button type="button" class="category-tab${i === 0 ? ' active' : ''}" data-group-tab="${t.key}">${icon(t.icon)}${esc(t.label)}</button>`).join('')}
            </div>
          </div>
          <div id="categorySections">
            <div class="category-section" id="frequentSection">
              <p class="category-section-title">${icon('star')}Mais frequentes</p>
              <div class="category-grid category-grid-full">${frequentCats.map(categoryCardFull).join('')}</div>
            </div>
            <div class="category-section">
              <div class="category-section-title-row">
                <p class="category-section-title" id="allCategoriesTitle">Todos os tipos de demanda</p>
                <button type="button" class="link-btn dw-view-toggle" id="categoryViewToggle" data-view="grid">${icon('menu')}<span>Ver em lista</span></button>
              </div>
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
            ${URGENCY_CHOICES.map(u => `<button type="button" class="choice-card ${u.value === 'P3' ? 'active' : ''}" data-priority="${u.value}"><span class="choice-icon">${icon(u.icon)}</span><strong>${esc(u.title)}</strong><small>${esc(u.hint)}</small></button>`).join('')}
          </div>
          <div class="choice-grid choice-grid-3" id="reachGrid" role="radiogroup" aria-label="Pessoas afetadas">
            ${REACH_CHOICES.map(r => `<button type="button" class="choice-card ${r.value === 30 ? 'active' : ''}" data-reach="${r.value}"><span class="choice-icon">${icon(r.icon)}</span><strong>${esc(r.title)}</strong><small>${esc(r.hint)}</small></button>`).join('')}
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
      footer: `<div class="dw-footer-security">${icon('shield')}<div><strong>Seus dados estão seguros</strong><small>Utilizamos criptografia e seguimos as melhores práticas de segurança.</small></div></div><div class="dw-footer-actions"><button class="btn btn-secondary hidden" id="prevStep">${icon('arrow')}<span>Voltar</span></button><button class="btn btn-primary dw-next-btn" id="nextStep" disabled><span class="dw-next-main">Continuar</span><span class="dw-next-sub">Próximo passo</span></button></div>`,
      onOpen(root) {
        let step = 1;
        const form = $('#demandForm', root), next = $('#nextStep'), prev = $('#prevStep');
        const totalSteps = 4;
        const reviewPhotoUrls = [];

        const syncNextEnabled = () => {
          if (step === 1) next.disabled = !state.categories.length || (!ctx.user.perm.school_scoped && !form.elements.school_id.value);
          else if (step === 2) next.disabled = !state.items.length || state.items.some(it => !it.description.trim());
          else next.disabled = false;
        };

        // Passo 1 — até 3 categorias em cards visuais
        const updateCategoryHint = () => {
          const hint = $('#categoryPickHint', root);
          const pill = $('#categoryCountPill', root);
          if (pill) { $('span', pill).textContent = `${state.categories.length} de ${MAX_CATEGORIES} selecionados`; pill.classList.toggle('dw-pill-active', state.categories.length > 0); }
          if (!hint) return;
          if (!state.categories.length) hint.textContent = 'Nenhum problema selecionado ainda.';
          else if (state.categories.length < MAX_CATEGORIES) hint.textContent = `${state.categories.length} de ${MAX_CATEGORIES} selecionados: ${state.categories.join(', ')}.`;
          else hint.textContent = `Limite de ${MAX_CATEGORIES} atingido: ${state.categories.join(', ')}. Toque em um selecionado para trocar.`;
        };
        // Uma mesma categoria pode aparecer duas vezes na tela (em "Mais frequentes" e em
        // "Todos os tipos de demanda"), então toda seleção precisa refletir em TODAS as
        // instâncias com o mesmo data-category, não só no botão clicado.
        const cardsFor = cat => $$(`.category-card[data-category="${cat}"]`, root);
        const refreshCategoryOrder = () => {
          $$('.category-card', root).forEach(b => {
            const pos = state.categories.indexOf(b.dataset.category);
            let badge = b.querySelector('.category-order');
            if (pos > -1) {
              if (!badge) { badge = document.createElement('span'); badge.className = 'category-order'; b.appendChild(badge); }
              badge.textContent = String(pos + 1);
            } else if (badge) { badge.remove(); }
          });
        };
        $$('.category-card', root).forEach(b => b.addEventListener('click', () => {
          const cat = b.dataset.category;
          const idx = state.categories.indexOf(cat);
          const dupCards = cardsFor(cat);
          if (idx > -1) {
            state.categories.splice(idx, 1);
            const itemIdx = state.items.findIndex(it => it.category === cat);
            if (itemIdx > -1) state.items.splice(itemIdx, 1);
            dupCards.forEach(el => { el.classList.remove('selected'); el.setAttribute('aria-pressed', 'false'); });
          } else {
            if (state.categories.length >= MAX_CATEGORIES) {
              toast(`Escolha no máximo ${MAX_CATEGORIES}`, 'Toque em um tipo já selecionado para liberar espaço.', 'error');
              return;
            }
            state.categories.push(cat);
            state.items.push({ category: cat, location: '', description: '', title: '' });
            dupCards.forEach(el => { el.classList.add('selected'); el.setAttribute('aria-pressed', 'true'); });
          }
          refreshCategoryOrder();
          updateCategoryHint();
          syncNextEnabled();
        }));

        // Busca e abas por grupo temático (Mais usadas/Infraestrutura/Manutenção/...)
        // filtram só a exibição dos cartões — não mexem no estado de seleção.
        let activeGroup = 'usadas';
        const applyCategoryFilter = () => {
          const q = ($('#categorySearch', root)?.value || '').trim().toLowerCase();
          const frequentSection = $('#frequentSection', root);
          const allTitle = $('#allCategoriesTitle', root);
          const emptyHint = $('#categoryEmptyHint', root);
          const tabLabel = CATEGORY_TABS.find(t => t.key === activeGroup)?.label || 'Todos os tipos de demanda';
          if (q) {
            frequentSection.classList.add('hidden');
            allTitle.textContent = `Resultados para "${q}"`;
          } else if (activeGroup === 'usadas') {
            frequentSection.classList.remove('hidden');
            allTitle.textContent = 'Todos os tipos de demanda';
          } else {
            frequentSection.classList.add('hidden');
            allTitle.textContent = tabLabel;
          }
          let visibleCount = 0;
          $$('#categoryGrid .category-card', root).forEach(card => {
            const matchesQ = !q || card.dataset.name.includes(q);
            const matchesGroup = q || activeGroup === 'usadas' || card.dataset.group === activeGroup;
            const show = matchesQ && matchesGroup;
            card.classList.toggle('hidden', !show);
            if (show) visibleCount++;
          });
          emptyHint.classList.toggle('hidden', visibleCount > 0);
        };
        let searchTimer;
        $('#categorySearch', root)?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyCategoryFilter, 120); });
        $$('[data-group-tab]', root).forEach(t => t.addEventListener('click', () => {
          activeGroup = t.dataset.groupTab;
          $$('[data-group-tab]', root).forEach(x => x.classList.toggle('active', x === t));
          applyCategoryFilter();
        }));
        $('#categoryViewToggle', root)?.addEventListener('click', () => {
          const btn = $('#categoryViewToggle', root);
          const grid = $('#categoryGrid', root);
          const toList = btn.dataset.view === 'grid';
          btn.dataset.view = toList ? 'list' : 'grid';
          grid.classList.toggle('category-grid-list', toList);
          btn.innerHTML = toList ? `${icon('grid')}<span>Ver em grade</span>` : `${icon('menu')}<span>Ver em lista</span>`;
        });
        form.elements.school_id?.addEventListener('change', syncNextEnabled);

        // Passo 2 — local, descrição e foto individual para cada tipo de problema escolhido
        const renderDetailsFields = () => {
          const container = $('#detailsFields', root);
          if (!container) return;
          const multi = state.items.length > 1;
          container.innerHTML = (multi ? `<p class="wizard-question">Conte os detalhes e insira fotos de cada problema</p><p class="wizard-hint">Você escolheu ${state.items.length} tipos — cada um vira uma demanda independente com seu próprio registro e foto.</p>` : '') +
            state.items.map((it, i) => {
              const c = CATEGORY_COLORS[it.category] || 'blue'; return `
            <div class="detail-block ${multi ? '' : 'detail-block-single'}" ${multi ? `style="border-left:4px solid var(--${c})"` : ''}>
              <div class="detail-block-head" style="color:var(--${c})"><span class="detail-icon-badge" style="background:var(--${c}-soft);color:var(--${c})">${icon(CATEGORY_ICONS[it.category] || 'clipboard')}</span><strong>${i + 1}. ${esc(it.category)}</strong></div>
              <p class="wizard-question">Onde isso está acontecendo?</p>
              <div class="field span-2"><input class="input" data-field="location" data-idx="${i}" placeholder="Ex.: Sala 3, banheiro do pátio, cozinha..." autocomplete="off" value="${esc(it.location)}"></div>
              <p class="wizard-question mt-16">Descreva com suas palavras</p>
              <p class="wizard-hint">O que está acontecendo, desde quando e o que você já percebeu.</p>
              <div class="field span-2"><textarea class="textarea" data-field="description" data-idx="${i}" placeholder="Ex.: Está caindo água do teto da sala 3 sempre que chove, desde a semana passada.">${esc(it.description)}</textarea></div>
              <p class="wizard-question mt-16">Foto deste problema <span class="wizard-optional">(específica para ${esc(it.category)})</span></p>
              <label class="upload-zone upload-zone-compact ${it.photo ? 'has-file' : ''}" id="photoZone_${i}">
                ${icon('camera')}
                <strong>${it.photo ? 'Foto selecionada' : `Anexar foto para ${esc(it.category)}`}</strong>
                <small id="photoName_${i}">${it.photo ? `${esc(it.photo.name)} · ${Math.max(1, Math.round(it.photo.size / 1024))} KB` : 'Nenhuma foto selecionada'}</small>
                <input type="file" class="item-photo-input" data-item-photo="${i}" accept="image/*,.pdf" hidden>
              </label>
              ${!multi ? `<div class="field span-2 mt-16"><label>Nome curto para essa demanda</label><input class="input" data-field="title" data-idx="${i}" maxlength="140" placeholder="Preenchemos pra você — pode ajustar se quiser" value="${esc(it.title)}"></div>` : ''}
            </div>`}).join('');
          const suggestItemTitle = (i) => {
            const it = state.items[i];
            const suggestion = [it.category, it.location].filter(Boolean).join(' — ') || it.category || '';
            const titleInput = container.querySelector(`[data-field="title"][data-idx="${i}"]`);
            if (titleInput && (!titleInput.value || titleInput.dataset.auto === '1')) { titleInput.value = suggestion; titleInput.dataset.auto = '1'; it.title = suggestion; }
          };
          $$('[data-field]', container).forEach(el => {
            const i = Number(el.dataset.idx), field = el.dataset.field;
            el.addEventListener('input', () => {
              if (field === 'title') el.dataset.auto = '0';
              state.items[i][field] = el.value;
              if (field === 'location') suggestItemTitle(i);
              syncNextEnabled();
            });
          });
          $$('[data-item-photo]', container).forEach(inp => {
            inp.addEventListener('change', e => {
              const i = Number(inp.dataset.itemPhoto);
              const f = e.target.files[0] || null;
              state.items[i].photo = f;
              const nameEl = $(`#photoName_${i}`, container);
              const zoneEl = $(`#photoZone_${i}`, container);
              if (nameEl) nameEl.textContent = f ? `${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB` : 'Nenhuma foto selecionada';
              if (zoneEl) zoneEl.classList.toggle('has-file', !!f);
            });
          });
          state.items.forEach((it, i) => suggestItemTitle(i));
        };
        $('#photoInput', root)?.addEventListener('change', e => {
          const f = e.target.files[0]; state.photo = f || null;
          $('#photoName').textContent = f ? `${f.name} · ${Math.max(1, Math.round(f.size / 1024))} KB` : 'Nenhuma foto selecionada';
          $('#photoZone').classList.toggle('has-file', !!f);
        });

        // Passo 3 — urgência, alcance e alternâncias sim/não
        $$('#urgencyGrid .choice-card', root).forEach(b => b.addEventListener('click', () => {
          $$('#urgencyGrid .choice-card', root).forEach(x => x.classList.remove('active'));
          b.classList.add('active'); state.priority = b.dataset.priority;
        }));
        $$('#reachGrid .choice-card', root).forEach(b => b.addEventListener('click', () => {
          $$('#reachGrid .choice-card', root).forEach(x => x.classList.remove('active'));
          b.classList.add('active'); state.reach = Number(b.dataset.reach); state.customReach = false;
          $('#customReachField').classList.add('hidden');
        }));
        $('#toggleCustomReach', root)?.addEventListener('click', () => {
          state.customReach = true;
          $$('#reachGrid .choice-card', root).forEach(x => x.classList.remove('active'));
          $('#customReachField').classList.remove('hidden');
          $('[name=affected_people_custom]', form).focus();
        });
        $$('.toggle-btn', root).forEach(b => b.addEventListener('click', () => {
          const key = b.dataset.toggle;
          $$(`.toggle-btn[data-toggle="${key}"]`, root).forEach(x => x.classList.remove('active'));
          b.classList.add('active'); state[key] = b.dataset.val === '1';
        }));
        // valores padrão visuais
        $(`.toggle-btn[data-toggle="blocks_activity"][data-val="0"]`, root).classList.add('active');
        $(`.toggle-btn[data-toggle="risk"][data-val="0"]`, root).classList.add('active');

        const priorityLabelFriendly = p => URGENCY_CHOICES.find(u => u.value === p)?.title || priorityLabel(p);

        const setNextLabel = (main, sub = '') => { next.innerHTML = `${step === totalSteps ? `<span class="dw-next-icon">${icon('send')}</span>` : ''}<span class="dw-next-text"><span class="dw-next-main">${esc(main)}</span>${sub ? `<span class="dw-next-sub">${esc(sub)}</span>` : ''}</span>`; };

        const updateStep = () => {
          $$('[data-step]', root).forEach(s => s.classList.toggle('hidden', Number(s.dataset.step) !== step));
          $$('[data-step-ind]', root).forEach(s => { const n = Number(s.dataset.stepInd); s.classList.toggle('active', n === step); s.classList.toggle('done', n < step); });
          prev.classList.toggle('hidden', step === 1);
          root.classList.toggle('dw-review-mode', step === totalSteps);
          const headerTitleEl = $('.modal-header h2', root), headerSubEl = $('.modal-header p', root);
          if (headerTitleEl) headerTitleEl.textContent = step === totalSteps ? 'Nova demanda' : 'Registrar Demanda/CI';
          if (headerSubEl) headerSubEl.textContent = step === totalSteps ? 'Revise as informações e envie sua demanda' : 'Conte pra gente o que está acontecendo. Sua demanda gera soluções.';
          setNextLabel(step === totalSteps ? (state.items.length > 1 ? 'Enviar demandas' : 'Enviar demanda') : 'Continuar', step === totalSteps ? 'Finalizar registro' : 'Próximo passo');
          if (step === 2) renderDetailsFields();
          syncNextEnabled();
          if (step === totalSteps) {
            const selectedSchoolId = ctx.user.perm.school_scoped ? ctx.user.school_id : form.elements.school_id?.value;
            const s = schools.find(x => String(x.id) === String(selectedSchoolId));
            const reach = state.customReach ? (Number($('[name=affected_people_custom]', form).value) || 0) : state.reach;
            const urgencyChoice = URGENCY_CHOICES.find(u => u.value === state.priority) || URGENCY_CHOICES[0];
            const boolPill = (isYes, yesText, noText) => `<span class="review-pill ${isYes ? 'red' : 'green'}">${icon(isYes ? 'warning' : 'check-circle')}<span>${isYes ? yesText : noText}</span></span>`;
            reviewPhotoUrls.forEach(u => URL.revokeObjectURL(u));
            reviewPhotoUrls.length = 0;
            const photoThumb = (file) => {
              if (!file) return `<div class="review-photo-block"><span class="review-label">Foto deste problema</span><p class="review-photo-empty">Nenhuma foto anexada</p></div>`;
              const url = URL.createObjectURL(file);
              reviewPhotoUrls.push(url);
              return `<div class="review-photo-block"><span class="review-label">Foto deste problema</span><img class="review-photo-thumb" src="${url}" alt="Foto anexada"></div>`;
            };
            $('#demandReview').innerHTML = `<div class="review-summary">
              <div class="review-summary-head">
                <span class="review-summary-badge">${icon('check-circle')}</span>
                <div><h3>Confira antes de enviar</h3><p>Revise os detalhes da sua demanda. Você poderá acompanhar todo o andamento após o envio.</p></div>
              </div>
              <div class="review-grid">
                <div class="review-item"><span class="review-item-icon">${icon('school')}</span><div class="review-item-body"><span class="review-label">Unidade Escolar</span><strong>${esc(s?.name || ctx.user.school_name || '—')}</strong></div></div>
                <div class="review-item"><span class="review-item-icon">${icon(urgencyChoice.icon)}</span><div class="review-item-body"><span class="review-label">Urgência</span><strong>${esc(urgencyChoice.title)}</strong><span class="review-pill blue">${icon('clock')}<span>${esc(urgencyChoice.hint)}</span></span></div></div>
                <div class="review-item"><span class="review-item-icon">${icon('users')}</span><div class="review-item-body"><span class="review-label">Pessoas afetadas (aprox.)</span><span class="review-pill blue">${icon('users')}<span>${num(reach)} pessoas</span></span></div></div>
              </div>
              <div class="review-grid review-grid-2 review-grid-divider">
                <div class="review-item"><span class="review-item-icon">${icon('calendar')}</span><div class="review-item-body"><span class="review-label">Impede atividade escolar?</span>${boolPill(state.blocks_activity, 'Impede', 'Não impede')}</div></div>
                <div class="review-item"><span class="review-item-icon">${icon('shield')}</span><div class="review-item-body"><span class="review-label">Risco de acidente?</span>${boolPill(state.risk, 'Há risco', 'Não há risco')}</div></div>
              </div>
            </div>
            <div class="alert info review-alert">${icon('info')}<span>${state.items.length > 1 ? `Serão registradas ${state.items.length} demandas, uma para cada tipo de problema — cada uma recebe um código único e sua própria foto.` : 'Depois de enviada, a demanda recebe um código único e você poderá acompanhar todo o andamento.'}</span></div>
            ${state.items.map((it, i) => `<section class="review-category-card">
              <div class="review-category-head"><span class="review-category-icon" style="background:var(--${CATEGORY_COLORS[it.category] || 'blue'}-soft);color:var(--${CATEGORY_COLORS[it.category] || 'blue'})">${icon(CATEGORY_ICONS[it.category] || 'clipboard')}</span><h4>${state.items.length > 1 ? `${i + 1}. ` : ''}${esc(it.category)}</h4></div>
              <div class="review-fields">
                <div class="review-item"><span class="review-item-icon">${icon('map')}</span><div class="review-item-body"><span class="review-label">Local</span><strong>${esc(it.location || 'Não informado')}</strong></div></div>
                <div class="review-item"><span class="review-item-icon">${icon('clipboard')}</span><div class="review-item-body"><span class="review-label">Descrição</span><strong>${esc(it.description)}</strong></div></div>
              </div>
              ${photoThumb(it.photo || state.photo)}
            </section>`).join('')}`;
          }
        };
        prev.addEventListener('click', () => { step--; updateStep(); });
        next.addEventListener('click', async () => {
          if (step === 1 && !state.categories.length) return;
          if (step === 2 && (!state.items.length || state.items.some(it => !it.description.trim()))) return;
          if (step < totalSteps) { step++; updateStep(); return; }
          const reach = state.customReach ? (Number($('[name=affected_people_custom]', form).value) || 0) : state.reach;
          const schoolId = ctx.user.perm.school_scoped ? ctx.user.school_id : form.elements.school_id.value;
          const created = [], failed = [];
          next.disabled = true; setNextLabel('Enviando...');
          for (const it of state.items) {
            const title = (it.title || '').trim() || [it.category, it.location].filter(Boolean).join(' — ') || it.category;
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
            try {
              const res = await api('/api/demands', { method: 'POST', body: payload });
              created.push({ ...res, category: it.category });
              const photoFile = it.photo || state.photo;
              if (photoFile) {
                const fd = new FormData();
                fd.append('file', photoFile);
                fd.append('category', it.category);
                try { await api(`/api/demands/${res.id}/attachments`, { method: 'POST', body: fd }); }
                catch (err) { toast('Demanda registrada, mas a foto não pôde ser enviada', `${res.code}: ${err.message}`, 'error'); }
              }
            } catch (err) { failed.push({ category: it.category, message: err.message }); }
          }
          if (created.length) {
            closeModal();
            if (created.length > 1) toast('Demandas registradas com sucesso!', `${created.length} códigos gerados: ${created.map(c => c.code).join(', ')}.`);
            else toast('Demanda registrada com sucesso!', `Código ${created[0].code} — acompanhe o andamento a qualquer momento.`);
            if (failed.length) toast('Algumas demandas não puderam ser enviadas', failed.map(f => `${f.category}: ${f.message}`).join(' · '), 'error');
            const isInfraManager = ctx.user && ctx.user.role === 'gestor';
            location.href = (created.length > 1 || isInfraManager) ? '/demandas' : `/demandas/${created[0].id}`;
          } else {
            toast('Não foi possível enviar', failed.map(f => f.message).join(' · ') || 'Tente novamente.', 'error');
            next.disabled = false; setNextLabel(state.items.length > 1 ? 'Enviar demandas' : 'Enviar demanda', 'Finalizar registro');
          }
        });
        updateStep();
      }
    });
  }

  function renderTimeline(items) {
    if (!items?.length) return empty('Ainda sem registros', 'As movimentações aparecerão aqui em ordem cronológica.');
    return `<div class="timeline">${items.map(x => `<div class="timeline-item"><div class="timeline-meta">${fmtDateTime(x.created_at)} · ${esc(x.author)}</div><strong>${esc(x.kind)}</strong><p>${esc(x.message)}</p></div>`).join('')}</div>`;
  }
  function renderFiles(files) {
    if (!files?.length) return `<div class="empty-state" style="padding:24px"><p>Nenhum anexo enviado.</p></div>`;
    return `<div class="file-list">${files.map(f => `<div class="file-row"><div class="file-icon">${icon('file')}</div><div><strong>${esc(f.filename)} ${f.category ? `<span class="badge P3" style="margin-left:6px">${esc(f.category)}</span>` : ''}</strong><small>${Math.max(1, Math.round(f.size / 1024))} KB · ${fmtDateTime(f.created_at)}</small></div><a href="/uploads/${f.id}" data-tooltip="Baixar anexo">Baixar</a></div>`).join('')}</div>`;
  }

  async function renderDashboard() {
    setLoading();
    const data = await api('/api/dashboard');
    const s = data.stats;
    const cards = [
      ['total', 'Total de demandas', s.total, 'Registro consolidado', 'primary', 'clipboard', 'Todos os registros', ''],
      ['P1', 'Urgentes (P1)', s.urgent, 'Ação imediata necessária', 'red', 'warning', 'Demandas com risco ou impacto crítico', 'priority=P1'],
      ['P2', 'Alta prioridade (P2)', s.high, 'Já incomoda a rotina, sem risco imediato', 'orange', 'bolt', 'Demandas de prioridade alta em aberto', 'priority=P2'],
      ['analysis', 'Em análise', s.analysis, 'Triagem e avaliação técnica', 'orange', 'search', 'Demandas aguardando decisão técnica', 'status=Em análise técnica'],
      ['progress', 'Em andamento', s.progress, 'Serviços programados ou em execução', 'teal', 'trend', 'Atendimentos atualmente mobilizados', 'status=Em execução'],
      ['contract', 'Aguardando contratação', s.contract, 'Dependência administrativa', 'violet', 'file', 'Aquisição, empresa ou licitação necessária', 'status=Aguardando contratação'],
      ['overdue', 'Prazo vencido', s.overdue, 'Requer atenção da gestão', 'red', 'clock', 'Demandas com prazo ultrapassado', 'overdue=1'],
      ['due_soon', 'Vence em 7 dias', s.due_soon, 'Ainda dá tempo de agir', 'orange', 'clock', 'Prazo dentro dos próximos 7 dias, ainda não vencido', 'due_soon=1'],
      ['completed', 'Concluídas', s.completed, 'Atendimentos finalizados', 'green', 'arrow', 'Demandas encerradas com registro de conclusão', 'status=Concluída'],
      ['future', 'Planejamento futuro', s.future, 'Exercícios seguintes', 'blue', 'calendar', 'Necessidades previstas para planejamento futuro', 'status=Planejamento futuro'],
      ['unassigned', 'Sem responsável', s.unassigned, 'Falta indicar quem vai cuidar disso', 'violet', 'user', 'Demandas em aberto sem responsável definido', 'unassigned=1'],
      ['open_cost', 'Custo em aberto', s.open_cost, 'Estimativa do que ainda não foi concluído', 'blue', 'money', 'Soma do custo estimado de tudo que está em aberto', '', 'money']
    ];
    const byKey = Object.fromEntries(cards.map(c => [c[0], c]));
    const statGroups = [
      ['VISÃO GERAL', ['total']],
      ['PRIORIDADES', ['P1', 'P2']],
      ['PRAZOS CRÍTICOS', ['overdue', 'due_soon']],
      ['ANDAMENTO DAS DEMANDAS', ['analysis', 'progress', 'contract']],
      ['PLANEJAMENTO', ['completed', 'future']],
      ['RESPONSABILIDADE', ['unassigned']],
      ['CUSTO EM ABERTO', ['open_cost']],
    ];
    const statTile = c => {
      const alertCls = (c[0] === 'unassigned' && c[2] > 0) ? ' stat-tile-alert' : '';
      return `<article class="stat-tile ${c[4]}${alertCls}" data-dashboard-filter="${esc(c[7])}" data-tooltip="${esc(c[6])}"><div class="stat-tile-icon">${icon(c[5])}</div><div class="stat-tile-body"><div class="stat-tile-value mono">${c[8] === 'money' ? money(c[2]) : num(c[2])}</div><div class="stat-tile-label">${esc(c[1])}</div><div class="stat-tile-note">${esc(c[3])}</div></div></article>`;
    };
    // Personalizar painel: cada usuário escolhe quais grupos de indicadores aparecem
    // no seu Painel. Preferência salva neste navegador (não é um dado do servidor).
    const HIDDEN_GROUPS_KEY = 'agenda-hidden-stat-groups';
    const getHiddenGroups = () => { try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_GROUPS_KEY) || '[]')); } catch { return new Set(); } };
    const saveHiddenGroups = set => localStorage.setItem(HIDDEN_GROUPS_KEY, JSON.stringify([...set]));
    const groupLabelSentence = label => label.charAt(0) + label.slice(1).toLowerCase();
    const hiddenGroups = getHiddenGroups();
    const statsGroupsHtml = `<div class="stats-groups-toolbar">
      <div class="stats-customize-wrap">
        <button type="button" class="stats-customize-btn" id="statsCustomizeBtn" aria-haspopup="true" aria-expanded="false" data-tooltip="Escolher quais grupos aparecem aqui">${icon('settings')}<span>Personalizar painel</span></button>
        <div class="popover stats-customize-panel" id="statsCustomizePanel" hidden>
          <div class="stats-customize-head"><strong>Personalizar painel</strong><small>Escolha quais grupos de indicadores aparecem aqui.</small></div>
          <div class="stats-customize-list">${statGroups.map(([label]) => `<label class="stats-customize-row"><span>${esc(groupLabelSentence(label))}</span><span class="switch"><input type="checkbox" data-group-toggle="${esc(label)}"${hiddenGroups.has(label) ? '' : ' checked'}><span class="switch-track"></span></span></label>`).join('')}</div>
          <div class="stats-customize-footer">
            <span class="stats-customize-saved" id="statsCustomizeSaved">${icon('check-circle')}<span>Preferência salva</span></span>
            <button type="button" class="btn btn-primary stats-customize-save" id="statsCustomizeSave">Salvar preferência</button>
          </div>
        </div>
      </div>
    </div>
    <div class="stats-groups" id="statsGroups">${statGroups.map(([label, keys]) => {
      const isCost = label === 'CUSTO EM ABERTO';
      const isHidden = hiddenGroups.has(label);
      const cardsHtml = `<div class="stat-group-label">${esc(label)}</div><div class="stat-group-cards">${keys.map(k => statTile(byKey[k])).join('')}</div>`;
      const attrs = `class="stat-group${isCost ? ' stat-group-cost' : ''}${isHidden ? ' is-hiding' : ''}" data-group="${esc(label)}"${isHidden ? ' hidden' : ''}`;
      if (!isCost) return `<div ${attrs}>${cardsHtml}</div>`;
      return `<div ${attrs}><div>${cardsHtml}</div><button class="btn-cost-detail" type="button" data-tooltip="Ver o detalhamento do custo em aberto por categoria">${icon('eye')}<span>Ver detalhes</span></button></div>`;
    }).join('')}</div>`;
    const maxCat = Math.max(1, ...data.categories.map(x => x.qty));
    const CAT_PALETTE = ['#005A9C', '#0f7b79', '#1a7c44', '#c67c00', '#6f42c1', '#b71c1c', '#0d3c75', '#4ade95'];
    const totalCat = data.categories.reduce((sum, x) => sum + x.qty, 0) || 1;
    let catAcc = 0;
    const catGradient = data.categories.map((x, i) => { const color = CAT_PALETTE[i % CAT_PALETTE.length]; const start = catAcc / totalCat * 360; catAcc += x.qty; const end = catAcc / totalCat * 360; return `${color} ${start}deg ${end}deg`; }).join(', ');
    const heroCopy = ctx.user.perm.school_scoped
      ? { eyebrow: 'PRECISOU DE ALGO?', title: 'Viu um problema na escola? Conte pra gente.', text: 'Leva menos de 2 minutos. Escolha o tipo de problema, descreva com suas palavras e, se quiser, envie uma foto.' }
      : { eyebrow: 'REGISTRO RÁPIDO', title: 'Uma escola reportou algo? Registre em segundos.', text: 'Use o assistente guiado para abrir uma demanda com categoria, urgência e impacto já organizados.' };
    content.innerHTML =
      `<section class="report-hero"><a class="report-hero-export" href="/api/export/demands.csv" data-tooltip="Baixar a lista completa em CSV">${icon('download')}<span>Exportar</span></a><div class="report-hero-copy"><span class="eyebrow">${heroCopy.eyebrow}</span><h2>${heroCopy.title}</h2><p>${heroCopy.text}</p></div><button class="btn-report" data-open-demand data-tooltip="Abrir o assistente de registro em 4 passos">${icon('plus')}Registrar Demanda/CI</button></section>` +
      statsGroupsHtml +
      `<div class="content-grid">
        <section class="panel"><div class="panel-header"><div><h2>Precisa de atenção</h2><p>Priorizado por criticidade e prazo.</p></div><a class="link-btn" href="/demandas">Ver todas</a></div>
          <div class="attention-list">${data.attention.length ? data.attention.map(d => { const due = dueInfo(d); return `<a class="attention-item" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.school_name)} · ${d.code}</small></div><span class="deadline ${due.cls}">${esc(due.text)}</span></a>` }).join('') : empty('Tudo em dia', 'Não há demandas críticas neste momento.')}</div>
        </section>
        <section class="panel"><div class="panel-header"><div><h2>Demandas por categoria</h2><p>Concentração atual da carteira. Clique para ver as demandas.</p></div></div><div class="panel-body">${data.categories.length ? `<div class="category-donut-wrap"><div class="category-donut" style="background:conic-gradient(${catGradient})"><div class="category-donut-hole"><strong>${num(totalCat)}</strong><span>Total</span></div></div><div class="category-legend mini-chart">${data.categories.map((x, i) => `<div class="bar-row" data-dashboard-filter="category=${encodeURIComponent(x.category)}" data-tooltip="Ver demandas de ${esc(x.category)}"><label title="${esc(x.category)}"><span class="legend-dot" style="background:${CAT_PALETTE[i % CAT_PALETTE.length]}"></span>${esc(x.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, x.qty / maxCat * 100)}%;background:${CAT_PALETTE[i % CAT_PALETTE.length]}"></div></div><b>${x.qty}</b></div>`).join('')}</div></div><a class="link-btn category-see-all" href="/demandas" data-tooltip="Ver todas as demandas por categoria">Ver todas as categorias ${icon('arrow')}</a>` : empty('Sem categorias', 'Ainda não há demandas categorizadas.')}</div></section>
      </div>
      <section class="panel"><div class="panel-header"><div><h2>Atividade recente</h2><p>Últimas demandas atualizadas.</p></div><a class="link-btn" href="/demandas">Abrir lista completa</a></div>${renderDemandTable(data.recent, true)}</section>
      <section class="panel mt-16"><div class="panel-header"><div><h2>Indicador de execução</h2><p>Percentual das demandas registradas que já foram concluídas.</p></div><strong class="text-teal mono">${s.execution}%</strong></div><div class="panel-body"><div class="bar-track" style="height:14px"><div class="bar-fill" style="width:${Math.min(100, s.execution)}%"></div></div></div></section>`;
    $$('[data-open-demand]', content).forEach(b => b.addEventListener('click', openDemandForm));
    $$('[data-dashboard-filter]').forEach(card => card.addEventListener('click', () => {
      const f = card.dataset.dashboardFilter;
      location.href = f ? `/demandas?${f}` : '/demandas';
    }));
    $('.btn-cost-detail', content)?.addEventListener('click', () => openCostDetail(data));

    // Personalizar painel: abrir/fechar o popover e mostrar/ocultar cada grupo, com
    // uma pequena animação de saída/entrada em vez de um corte seco no layout.
    const statsGroupsEl = $('#statsGroups', content);
    const customizeBtn = $('#statsCustomizeBtn', content);
    const customizePanel = $('#statsCustomizePanel', content);
    const customizeSaveBtn = $('#statsCustomizeSave', content);
    const customizeSavedNote = $('#statsCustomizeSaved', content);
    let customizeSavedTimer = null;
    const openCustomize = () => { if (!customizePanel) return; customizePanel.hidden = false; customizeBtn?.setAttribute('aria-expanded', 'true'); customizeSavedNote?.classList.remove('is-visible'); };
    const closeCustomize = () => { if (!customizePanel) return; customizePanel.hidden = true; customizeBtn?.setAttribute('aria-expanded', 'false'); };
    customizeBtn?.addEventListener('click', e => { e.stopPropagation(); customizePanel?.hidden ? openCustomize() : closeCustomize(); });
    document.addEventListener('click', e => { if (customizePanel && !customizePanel.hidden && !e.target.closest('.stats-customize-wrap')) closeCustomize(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && customizePanel && !customizePanel.hidden) { closeCustomize(); customizeBtn?.focus(); } });
    $$('[data-group-toggle]', content).forEach(input => {
      input.addEventListener('change', () => {
        const label = input.dataset.groupToggle;
        if (input.checked) hiddenGroups.delete(label); else hiddenGroups.add(label);
        const el = statsGroupsEl?.querySelector(`.stat-group[data-group="${CSS.escape(label)}"]`);
        if (el) {
          if (input.checked) {
            el.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-hiding')));
          } else {
            el.classList.add('is-hiding');
            setTimeout(() => { el.hidden = true; }, 180);
          }
        }
        customizeSavedNote?.classList.remove('is-visible');
      });
    });
    customizeSaveBtn?.addEventListener('click', () => {
      saveHiddenGroups(hiddenGroups);
      customizeSavedNote?.classList.add('is-visible');
      clearTimeout(customizeSavedTimer);
      customizeSavedTimer = setTimeout(closeCustomize, 900);
    });
  }

  function openCostDetail(data) {
    const s = data.stats;
    const breakdown = data.cost_breakdown || [];
    const top = data.cost_top || [];
    const maxB = Math.max(1, ...breakdown.map(x => x.cost || 0));
    const body = `
      <div class="metric-row" style="grid-template-columns:repeat(2,1fr)">
        <div class="metric"><span>Total em aberto</span><strong>${money(s.open_cost)}</strong></div>
        <div class="metric"><span>Categorias com custo pendente</span><strong>${num(breakdown.length)}</strong></div>
      </div>
      ${breakdown.length ? `<div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Por categoria</h3><div class="mini-chart">${breakdown.map(c => `<div class="bar-row" data-dashboard-filter="category=${encodeURIComponent(c.category)}" data-tooltip="Ver demandas de ${esc(c.category)}"><label title="${esc(c.category)}">${esc(c.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, (c.cost || 0) / maxB * 100)}%"></div></div><b>${money(c.cost || 0)}</b></div>`).join('')}</div></div>` : ''}
      ${top.length ? `<div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Maiores custos em aberto</h3><div class="side-stack">${top.map(d => `<a class="info-card" href="/demandas/${d.id}" style="display:block;text-decoration:none;color:inherit;margin-bottom:0;padding:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong style="font-size:13px">${esc(d.title)}</strong><span class="badge ${d.priority}">${d.priority}</span></div><p style="margin:4px 0 8px;color:var(--muted);font-size:11.5px">${esc(d.school_name)} · ${d.code}</p><strong class="mono">${money(d.cost_estimate || 0)}</strong></a>`).join('')}</div></div>` : ''}
      ${!breakdown.length && !top.length ? empty('Sem custos em aberto', 'Não há demandas em aberto com custo estimado no momento.') : ''}
    `;
    modal({ title: 'Custo em Aberto — Detalhamento', subtitle: 'Estimativa do que ainda não foi concluído', mode: 'drawer', body });
    $$('#modalRoot [data-dashboard-filter]').forEach(row => row.addEventListener('click', () => {
      location.href = `/demandas?${row.dataset.dashboardFilter}`;
    }));
  }

  function renderDemandTable(rows, compact = false, filterable = false, filters = null) {
    if (!rows?.length) return empty();
    const th = (label, field) => {
      if (!filterable || !field) return `<th>${label}</th>`;
      const active = filters && filters[field];
      return `<th class="th-filter${active ? ' active' : ''}" data-th-filter="${field}">${label}${icon('chevron')}</th>`;
    };
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>ID</th><th>Demanda</th>${compact ? '' : th('Categoria', 'category')}<th>Unidade Escolar</th>${th('Prioridade', 'priority')}${th('Status', 'status')}<th>Prazo</th><th>Ações</th></tr></thead><tbody>${rows.map(d => {
      const due = dueInfo(d); const canDelete = ctx.user.perm.can_manage_admin; return `<tr data-href="/demandas/${d.id}" class="${d.status === 'Concluída' ? 'row-done' : ''}"><td class="mono" data-label="ID"><strong>${esc(d.code)}</strong></td><td class="cell-title" data-label="Demanda"><strong>${esc(d.title)}</strong><small>Atualizado ${fmtDateTime(d.updated_at)}</small></td>${compact ? '' : `<td data-label="Categoria">${esc(d.category)}</td>`}<td data-label="Unidade Escolar">${esc(d.school_name || '—')}</td><td data-label="Prioridade"><span class="badge ${d.priority}">${d.priority} · ${priorityLabel(d.priority)}</span></td><td data-label="Status"><span class="status-badge ${statusClass(d.status)}">${esc(d.status)}</span></td><td data-label="Prazo"><span class="deadline ${due.cls}">${esc(due.text)}</span></td><td data-label="Ações"><a class="icon-btn" href="/demandas/${d.id}" aria-label="Ver detalhes" data-tooltip="Ver detalhes">${icon('eye')}</a><button type="button" class="icon-btn" data-edit-demand="${d.id}" aria-label="Editar demanda" data-tooltip="Editar demanda">${icon('edit')}</button>${canDelete ? `<button type="button" class="icon-btn" data-delete-demand="${d.id}" aria-label="Deletar demanda" data-tooltip="Deletar demanda" style="color:var(--red)">${icon('trash')}</button>` : ''}</td></tr>`
    }).join('')}</tbody></table></div>`;
  }

  async function renderDemands() {
    setLoading();
    const query = new URLSearchParams(location.search);
    const [schools, dash, catCounts] = await Promise.all([loadSchools(), api('/api/dashboard'), api('/api/demands/category-counts')]);
    const ds = dash.stats;
    const counts = catCounts.counts || {};
    const filters = { q: query.get('q') || '', status: query.get('status') || '', priority: query.get('priority') || '', category: query.get('category') || '', year: query.get('year') || '2026', overdue: query.get('overdue') === '1', due_soon: query.get('due_soon') === '1', unassigned: query.get('unassigned') === '1' };
    content.innerHTML = pageHeader('Demandas Escolares', 'Gerencie, filtre e acompanhe todas as solicitações de infraestrutura.', `<a class="btn btn-secondary" href="/api/export/demands.csv" data-tooltip="Baixar a lista filtrada em CSV">${icon('download')}Exportar CSV</a><a class="btn btn-secondary" href="/api/export/demands.pdf" data-tooltip="Baixar a lista em PDF">${icon('file')}Gerar um PDF</a><button class="btn btn-primary" data-open-demand data-tooltip="Abrir o assistente de registro">${icon('plus')}Registrar Demanda/CI</button>`) +
      `<section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" value="${esc(filters.q)}" placeholder="Código, demanda ou escola..."></div></div>
        <div class="field"><label>Ano</label><select class="select" id="fYear"><option value="">Todos</option>${[2026, 2025, 2024].map(y => `<option ${String(y) === filters.year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="select" id="fStatus"><option value="">Todos</option>${ctx.statuses.map(x => `<option ${x === filters.status ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x => `<option value="${x}" ${x === filters.priority ? 'selected' : ''}>${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x => `<option value="${esc(x)}" ${x === filters.category ? 'selected' : ''}>${esc(x)} (${num(counts[x] || 0)})</option>`).join('')}</select></div>
        <button class="btn btn-secondary" id="clearFilters">${icon('filter')}Limpar</button>
      </section>
      <div class="quick-filters">
        <div class="chip-group">${[
        filters.overdue ? ['overdueChip', 'Prazo vencido'] : null,
        filters.due_soon ? ['dueSoonChip', 'Vence em 7 dias'] : null,
        filters.unassigned ? ['unassignedChip', 'Sem responsável'] : null,
      ].filter(Boolean).map(([id, label]) => `<button class="chip active" id="${id}">${esc(label)} ×</button>`).join('')}<button class="chip-v2 chip-red" data-chip-priority="P1">${icon('warning')}<span>P1 Urgentes</span><b>${num(ds.urgent)}</b></button><button class="chip-v2 chip-orange" data-chip-priority="P2">${icon('warning')}<span>P2 · Alta</span><b>${num(ds.high)}</b></button><button class="chip-v2 chip-orange" data-chip-status="Aguardando contratação">${icon('clock')}<span>Aguardando contratação</span><b>${num(ds.contract)}</b></button><button class="chip-v2 chip-blue" data-chip-status="Em execução">${icon('trend')}<span>Em execução</span><b>${num(ds.progress)}</b></button><button class="chip-v2 chip-violet" data-chip-status="Planejamento futuro">${icon('calendar')}<span>Planejamento futuro</span><b>${num(ds.future)}</b></button><button class="chip-v2 chip-green" data-chip-status="Concluída" id="completedChip">${icon('check-circle')}<span>Concluídas</span><b>${num(ds.completed)}</b></button></div>
        <div class="quick-filters-divider"></div>
        <label class="toggle-field" data-tooltip="Mostra ou oculta demandas concluídas na tabela abaixo">
          <div class="toggle-field-copy">${icon('eye')}<div><strong>Exibir concluídas</strong><small>Mostra ou oculta demandas concluídas.</small></div></div>
          <span class="switch"><input type="checkbox" id="toggleCompleted" checked><span class="switch-track"></span></span>
        </label>
      </div>
      <section class="panel" id="demandsPanel"><div class="panel-header"><div><h2>Carteira de demandas</h2><p id="demandCount">Carregando...</p></div></div><div id="demandTable"></div></section>`;
    $('[data-open-demand]', content).addEventListener('click', openDemandForm);
    const load = async () => {
      const params = new URLSearchParams();
      const map = { q: $('#fQ').value, status: $('#fStatus').value, priority: $('#fPriority').value, category: $('#fCategory').value, year: $('#fYear').value };
      Object.entries(map).forEach(([k, v]) => { if (v) params.set(k, v) });
      if (filters.overdue) params.set('overdue', '1');
      if (filters.due_soon) params.set('due_soon', '1');
      if (filters.unassigned) params.set('unassigned', '1');
      $('#demandTable').innerHTML = `<div class="empty-state"><p>Atualizando lista...</p></div>`;
      const rows = await api('/api/demands?' + params.toString());
      // "Exibir concluídas" é um filtro só de exibição, aplicado sobre os dados já
      // carregados — não muda a consulta ao backend nem os outros filtros.
      const showCompleted = $('#toggleCompleted')?.checked !== false;
      const visibleRows = showCompleted ? rows : rows.filter(d => d.status !== 'Concluída');
      $('#demandCount').textContent = `${visibleRows.length} registro${visibleRows.length === 1 ? '' : 's'} encontrado${visibleRows.length === 1 ? '' : 's'}`;
      $('#demandTable').innerHTML = renderDemandTable(visibleRows, false, true, { category: $('#fCategory').value, priority: $('#fPriority').value, status: $('#fStatus').value });
    };
    const THFILTER_OPTIONS = {
      category: () => ctx.categories.map(x => ({ value: x, label: x })),
      priority: () => Object.keys(ctx.priorities).map(x => ({ value: x, label: `${x} · ${priorityLabel(x)}` })),
      status: () => ctx.statuses.map(x => ({ value: x, label: x }))
    };
    const FIELD_SELECT = { category: '#fCategory', priority: '#fPriority', status: '#fStatus' };
    const closeThMenu = () => { $('#thFilterMenu')?.remove(); };
    $('#demandsPanel').addEventListener('click', e => {
      const t = e.target.closest('[data-th-filter]');
      if (!t) return;
      e.stopPropagation();
      const field = t.dataset.thFilter;
      const existing = $('#thFilterMenu');
      const already = existing && existing.dataset.for === field;
      closeThMenu();
      if (already) return;
      const rect = t.getBoundingClientRect();
      const menu = document.createElement('div');
      menu.className = 'th-filter-menu'; menu.id = 'thFilterMenu'; menu.dataset.for = field;
      menu.style.top = (rect.bottom + 6) + 'px'; menu.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
      menu.innerHTML = `<button data-val="">Todas</button>` + THFILTER_OPTIONS[field]().map(o => `<button data-val="${esc(o.value)}">${esc(o.label)}</button>`).join('');
      document.body.appendChild(menu);
      menu.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        $(FIELD_SELECT[field]).value = b.dataset.val;
        closeThMenu(); load();
      });
    });
    document.addEventListener('click', e => { if (!e.target.closest('.th-filter-menu') && !e.target.closest('[data-th-filter]')) closeThMenu(); });
    let timer; $('#fQ').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250) });
    ['#fYear', '#fStatus', '#fPriority', '#fCategory'].forEach(id => $(id).addEventListener('change', load));
    $('#clearFilters').addEventListener('click', () => { filters.overdue = false; filters.due_soon = false; filters.unassigned = false;['#fQ', '#fStatus', '#fPriority', '#fCategory'].forEach(id => $(id).value = ''); $('#fYear').value = '2026'; $('#overdueChip')?.remove(); $('#dueSoonChip')?.remove(); $('#unassignedChip')?.remove(); load(); });
    $$('[data-chip-status]').forEach(b => b.addEventListener('click', () => {
      $('#fStatus').value = b.dataset.chipStatus;
      // Ao clicar em "Concluídas", garante que o toggle "Exibir concluídas" esteja
      // ligado — senão o filtro de exibição esconderia o próprio resultado pedido.
      if (b.dataset.chipStatus === 'Concluída' && $('#toggleCompleted')) $('#toggleCompleted').checked = true;
      load();
    }));
    $$('[data-chip-priority]').forEach(b => b.addEventListener('click', () => { $('#fPriority').value = b.dataset.chipPriority; load() }));
    $('#toggleCompleted')?.addEventListener('change', load);
    $('#overdueChip')?.addEventListener('click', () => { filters.overdue = false; $('#overdueChip').remove(); load() });
    $('#dueSoonChip')?.addEventListener('click', () => { filters.due_soon = false; $('#dueSoonChip').remove(); load() });
    $('#unassignedChip')?.addEventListener('click', () => { filters.unassigned = false; $('#unassignedChip').remove(); load() });
    await load();
  }

  // ---------------------------------------------------------------------------
  // TELA DA DEMANDA
  // A pagina responde a tres perguntas — em que ponto a demanda esta, de quem e
  // para quando ela e, e o que fazer agora — e nada alem disso. Toda escrita
  // passa pelo assistente "Registrar andamento" (openProgressWizard), em tres
  // etapas. Leituras profundas (historico, anexos, planejamento, analise
  // tecnica, devolutivas) abrem em gavetas, no lugar das antigas abas.
  // ---------------------------------------------------------------------------

  const DV_MILESTONES = [
    { label: 'Solicitação registrada', icon: 'clipboard' },
    { label: 'Providência definida', icon: 'send' },
    { label: 'Em execução', icon: 'bolt' },
    { label: 'Conclusão', icon: 'check-circle' }
  ];

  const demandStage = d => {
    if (statusClass(d.status) === 'completed') return 4;
    if (statusClass(d.status) === 'execution') return 3;
    if (d.prov_action_type || (d.prov_responsible || d.responsible || '').trim()) return 2;
    return 1;
  };

  const dvResponsible = d => (d.prov_responsible || d.responsible || '').trim();

  function dvGuidance(d, stage) {
    const resp = dvResponsible(d);
    // Demanda concluída não recebe andamento comum: o que resta é destiná-la a
    // um exercício futuro ou consultar o que já foi registrado.
    if (stage === 4) return {
      title: 'Demanda concluída',
      text: `Serviço encerrado em ${fmtDateTime(d.updated_at)}.`,
      notice: 'Com a demanda concluída, o andamento possível é destiná-la a um exercício futuro, em Planejamento, ou consultar o histórico completo.',
      actions: [
        { label: 'Destinar a um exercício futuro', act: 'planning', kind: 'primary', ic: 'calendar', needsEdit: true },
        { label: 'Ver histórico completo', act: 'history', kind: 'secondary', ic: 'clock', needsEdit: false }
      ]
    };
    if (stage === 3) return {
      title: 'O que fazer agora',
      text: 'O serviço está em execução. Registre o andamento para atualizar o prazo, sinalizar falta de material ou informar a conclusão.',
      cta: 'Registrar andamento'
    };
    if (stage === 2) return {
      title: 'O que fazer agora',
      text: `A providência está definida${resp ? ` com ${resp}` : ''}. Registre o andamento assim que a equipe começar o serviço no local.`,
      cta: 'Registrar andamento'
    };
    return {
      title: 'O que fazer agora',
      text: 'Esta demanda ainda não tem providência definida. Registre o andamento para informar o tipo de ação, quem responde e o prazo previsto.',
      cta: 'Registrar andamento'
    };
  }

  function dvMilestoneNote(d, i, stage) {
    if (i === 0) return fmtDateTime(d.created_at);
    if (i === 1) {
      if (stage < 2) return 'Aguardando definição';
      const t = PROV_ACTION_TYPES.find(x => x.key === d.prov_action_type);
      return t ? t.label : (dvResponsible(d) || 'Definida');
    }
    if (i === 2) return stage > 3 ? 'Serviço executado' : (stage === 3 ? 'Em andamento' : 'Não iniciado');
    return stage === 4 ? fmtDateTime(d.updated_at) : 'Aguardando';
  }

  function dvFact({ icon: ic, label, value, sub = '', action = '', actionLabel = '', actionType = '' }) {
    return `<article class="dv-fact">
      <div class="dv-fact-head">${icon(ic)}<span>${esc(label)}</span></div>
      <strong>${value}</strong>
      ${sub ? `<span class="dv-fact-sub">${sub}</span>` : ''}
      ${action ? `<button type="button" class="dv-fact-link" data-dv-action="${action}"${actionType ? ` data-dv-type="${actionType}"` : ''}>${esc(actionLabel)}${icon('chevron')}</button>` : ''}
    </article>`;
  }

  function demandViewHTML(payload) {
    const d = payload.demand;
    const stage = demandStage(d);
    const due = dueInfo(d);
    const guide = dvGuidance(d, stage);
    const canEdit = ctx.user.perm.can_edit_analysis;
    const resp = dvResponsible(d);
    const provType = PROV_ACTION_TYPES.find(t => t.key === d.prov_action_type);
    const catColor = CATEGORY_COLORS[d.category] || 'blue';
    const moves = (payload.updates || []).slice(0, 3);
    const nextSteps = [
      { label: 'Definir providência e responsável', at: 1 },
      { label: 'Registrar início do serviço', at: 2 },
      { label: 'Informar conclusão do serviço', at: 3 },
      { label: 'Encerrar e arquivar a demanda', at: 4 }
    ];
    const isDone = stage === 4;
    // Demanda concluida tranca os painies que registrariam andamento: sobram
    // o planejamento e a consulta ao historico, como diz o aviso do topo.
    const travado = isDone;
    const semAcao = 'Indisponível com a demanda concluída.';

    return `<div class="breadcrumb"><a href="/">Painel</a><span>›</span><a href="/demandas">Demandas</a><span>›</span><span>${esc(d.code)}</span></div>

    <header class="dv-head">
      <div>
        <h1 class="dv-title">${esc(d.title)}</h1>
        <div class="dv-badges">
          <span class="dv-code">${esc(d.code)}</span>
          <span class="badge ${d.priority}">${esc(d.priority)} · ${esc(priorityLabel(d.priority))}</span>
          <span class="status-badge ${statusClass(d.status)}">${esc(d.status)}</span>
          ${due.cls ? `<span class="deadline ${due.cls}">${esc(due.text)}</span>` : ''}
        </div>
      </div>
      <div class="dv-head-actions">
        <button class="btn btn-secondary" data-dv-action="devolutiva" data-tooltip="Escrever uma devolutiva para a escola">${icon('message')}Devolutiva</button>
        <button class="dv-menu-btn" id="dvMenuBtn" aria-haspopup="true" aria-expanded="false" aria-label="Mais ações" data-tooltip="Mais ações">${icon('dots')}</button>
        <div class="dv-menu-pop" id="dvMenuPop" role="menu" hidden>
          <button type="button" role="menuitem" data-dv-action="attachments">${icon('paperclip')}Anexos (${payload.attachments.length})</button>
          <button type="button" role="menuitem" data-dv-action="history">${icon('clock')}Histórico completo</button>
          <button type="button" role="menuitem" data-dv-action="technical">${icon('settings')}Análise técnica</button>
          <button type="button" role="menuitem" data-dv-action="planning">${icon('calendar')}Planejamento</button>
          <button type="button" role="menuitem" data-dv-action="school">${icon('school')}Dados da unidade escolar</button>
          ${canEdit ? `<hr>
          <button type="button" role="menuitem" data-dv-action="edit-demand">${icon('edit')}Editar dados da demanda</button>
          ${travado ? '' : `<button type="button" role="menuitem" data-dv-action="wizard" data-dv-type="executado">${icon('check-circle')}Informar conclusão</button>`}` : ''}
        </div>
      </div>
    </header>

    <section class="dv-now">
      <span class="dv-now-icon">${icon(isDone ? 'check-circle' : 'bolt')}</span>
      <div>
        <h2>${esc(guide.title)}</h2>
        <p>${esc(guide.text)}</p>
        ${guide.notice ? `<p class="dv-now-notice">${icon('info')}<span>${esc(guide.notice)}</span></p>` : ''}
        <div class="dv-now-actions">
        ${guide.actions
        ? guide.actions.filter(x => canEdit || !x.needsEdit).map(x => `<button class="btn btn-${x.kind}" data-dv-action="${x.act}">${icon(x.ic)}${esc(x.label)}</button>`).join('')
        : (canEdit
          ? `<button class="btn btn-primary" data-dv-action="wizard">${esc(guide.cta)}${icon('chevron')}</button>`
          : `<button class="btn btn-primary" data-dv-action="devolutiva">${icon('message')}Enviar devolutiva</button>`)}
        </div>
      </div>
    </section>

    <ol class="dv-rail">
      ${DV_MILESTONES.map((m, i) => {
      const n = i + 1;
      const cls = stage > n ? 'done' : (stage === n ? 'current' : 'todo');
      return `<li class="${cls}">
          <span class="dv-rail-marker">${icon(m.icon)}</span>
          <strong>${esc(m.label)}</strong>
          <small>${esc(dvMilestoneNote(d, i, stage))}</small>
        </li>`;
    }).join('')}
    </ol>

    <div class="dv-facts">
      ${dvFact({
      icon: 'school', label: 'Unidade Escolar', value: esc(d.school_name),
      sub: d.director ? `Direção: ${esc(d.director)}` : '',
      action: 'school', actionLabel: 'Ver detalhes'
    })}
      ${dvFact({
      icon: 'user', label: 'Responsável atual',
      value: resp ? esc(resp) : '<span class="dv-muted">Não definido</span>',
      sub: d.sector ? esc(d.sector) : (provType ? esc(provType.label) : ''),
      action: canEdit && !travado ? 'wizard' : '', actionType: 'responsavel', actionLabel: resp ? 'Alterar responsável' : 'Designar responsável'
    })}
      ${dvFact({
      icon: 'calendar', label: 'Prazo previsto',
      value: esc(fmtDate(d.prov_due_date || d.due_date)),
      sub: due.cls ? `<span class="deadline ${due.cls}">${esc(due.text)}</span>` : '',
      action: canEdit && !travado ? 'wizard' : '', actionType: 'prazo', actionLabel: 'Reprogramar prazo'
    })}
      ${dvFact({
      icon: CATEGORY_ICONS[d.category] || 'clipboard', label: 'Categoria',
      value: esc(d.category), sub: d.subcategory ? esc(d.subcategory) : ''
    })}
      ${dvFact({
      icon: 'cart', label: 'Material',
      value: d.needs_material ? '<span style="color:var(--orange)">Precisa comprar</span>' : 'Disponível no estoque',
      sub: d.needs_material && d.planned_quantity ? `${num(d.planned_quantity)} ${esc(d.planned_unit || '')}` : '',
      action: 'planning', actionLabel: d.needs_material ? 'Ver no planejamento' : 'Ver planejamento'
    })}
    </div>

    <div class="dv-panels">
      <section class="dv-panel">
        <h3>${icon('clipboard')}Resumo da solicitação</h3>
        <p>${esc(d.description)}</p>
        ${d.impact ? `<p class="dv-muted">${esc(d.impact)}</p>` : ''}
        <div class="dv-kv"><span>Local da ocorrência</span><strong>${esc(d.location || '—')}</strong></div>
        <div class="dv-kv"><span>Pessoas afetadas</span><strong>${num(d.affected_people)}</strong></div>
        <div class="dv-kv"><span>Custo estimado</span><strong>${money(d.cost_estimate)}</strong></div>
        ${d.risk ? `<div class="dv-kv"><span>Risco</span><strong style="color:var(--red)">Risco informado</strong></div>` : ''}
        ${d.blocks_activity ? `<div class="dv-kv"><span>Atividade escolar</span><strong style="color:var(--orange)">Impedida</strong></div>` : ''}
        <div class="dv-kv"><span>Solicitada em</span><strong>${esc(fmtDateTime(d.created_at))}</strong></div>
      </section>

      <section class="dv-panel">
        <h3>${icon('clock')}Últimas movimentações</h3>
        ${moves.length ? `<div class="dv-moves">${moves.map((m, i) => `<div class="dv-move ${i ? 'is-old' : ''}">
            <strong>${esc(m.kind)}</strong>
            <p>${esc(m.message)}</p>
            <small>${esc(fmtDateTime(m.created_at))} · ${esc(m.author)}</small>
          </div>`).join('')}</div>` : `<p class="dv-muted">Nenhuma movimentação registrada até agora.</p>`}
        <button type="button" class="dv-panel-foot" data-dv-action="history">Ver histórico completo${icon('chevron')}</button>
      </section>

      <section class="dv-panel">
        <h3>${icon('check-circle')}Próximos passos</h3>
        <ul class="dv-next">
          ${nextSteps.map(s => {
      const done = stage > s.at;
      const now = stage === s.at;
      return `<li class="${now ? 'is-now' : ''}">
              <span class="dv-next-dot${done ? ' is-done' : ''}">${done ? icon('check-circle') : ''}</span>
              <span>${esc(s.label)}</span>
            </li>`;
    }).join('')}
        </ul>
        ${travado ? `<p class="dv-panel-locked">${icon('info')}<span>${esc(semAcao)}</span></p>`
        : (canEdit ? `<button type="button" class="dv-panel-foot" data-dv-action="wizard">Registrar andamento${icon('chevron')}</button>` : '')}
      </section>
    </div>

    <div class="dv-panels">
      <section class="dv-panel">
        <h3>${icon('settings')}Análise técnica</h3>
        <p class="${d.technical_opinion ? '' : 'dv-muted'}">${esc(d.technical_opinion || 'Parecer técnico ainda não registrado.')}</p>
        <div class="dv-kv"><span>Ação definida</span><strong>${esc(d.action_defined || '—')}</strong></div>
        <div class="dv-kv"><span>Dependências</span><strong>${esc(d.dependencies || 'Nenhuma')}</strong></div>
        ${travado ? `<p class="dv-panel-locked">${icon('info')}<span>${esc(semAcao)}</span></p>`
        : (canEdit ? `<button type="button" class="dv-panel-foot" data-dv-action="technical">Atualizar análise técnica${icon('chevron')}</button>` : '')}
      </section>

      <section class="dv-panel">
        <h3>${icon('calendar')}Planejamento</h3>
        ${d.future_year
        ? `<p>Destinada ao exercício de <strong>${esc(String(d.future_year))}</strong> como ${esc(d.planning_kind || 'planejamento futuro')}.</p>
             <div class="dv-kv"><span>Quantidade</span><strong>${num(d.planned_quantity || 0)} ${esc(d.planned_unit || '')}</strong></div>
             <div class="dv-kv"><span>Estimativa</span><strong>${money(d.cost_estimate)}</strong></div>`
        : (d.needs_material
          ? `<p>A providência sinalizou que a SMEDU <strong>não tem o material</strong>. Destine a demanda a um exercício futuro para seguir com a compra.</p>`
          : `<p class="dv-muted">Esta demanda não está vinculada a um exercício futuro.</p>`)}
        ${payload.planning.length ? payload.planning.map(p => `<div class="dv-kv"><span>${esc(p.code)}</span><strong>${esc(p.title)}</strong></div>`).join('') : ''}
        ${canEdit ? `<button type="button" class="dv-panel-foot" data-dv-action="planning">${d.future_year ? 'Editar planejamento' : 'Destinar a um exercício futuro'}${icon('chevron')}</button>` : ''}
      </section>

      <section class="dv-panel">
        <h3>${icon('paperclip')}Anexos</h3>
        ${payload.attachments.length
        ? `<p>${num(payload.attachments.length)} arquivo${payload.attachments.length === 1 ? '' : 's'} anexado${payload.attachments.length === 1 ? '' : 's'} a esta demanda.</p>
             ${payload.attachments.slice(0, 3).map(f => `<div class="dv-kv"><span>${esc(f.filename)}</span><strong>${Math.max(1, Math.round(f.size / 1024))} KB</strong></div>`).join('')}`
        : `<p class="dv-muted">Nenhum arquivo anexado. Fotos do local e orçamentos ajudam a equipe a decidir mais rápido.</p>`}
        ${travado ? `<p class="dv-panel-locked">${icon('info')}<span>${esc(semAcao)}</span></p>`
        : `<button type="button" class="dv-panel-foot" data-dv-action="attachments">${payload.attachments.length ? 'Abrir anexos' : 'Anexar arquivo'}${icon('chevron')}</button>`}
      </section>
    </div>`;
  }

  function renderTimeline(items) {
    if (!items?.length) return empty('Ainda sem registros', 'As movimentações aparecerão aqui em ordem cronológica.');
    return `<div class="timeline">${items.map(x => `<div class="timeline-item"><div class="timeline-meta">${fmtDateTime(x.created_at)} · ${esc(x.author)}</div><strong>${esc(x.kind)}</strong><p>${esc(x.message)}</p></div>`).join('')}</div>`;
  }
  function renderFiles(files) {
    if (!files?.length) return `<div class="empty-state" style="padding:24px"><p>Nenhum anexo enviado.</p></div>`;
    return `<div class="file-list">${files.map(f => `<div class="file-row"><div class="file-icon">${icon('file')}</div><div><strong>${esc(f.filename)}</strong><small>${Math.max(1, Math.round(f.size / 1024))} KB · ${fmtDateTime(f.created_at)}</small></div><a href="/uploads/${f.id}" data-tooltip="Baixar anexo">Baixar</a></div>`).join('')}</div>`;
  }

  async function openEditTechnical(d, reload) {
    modal({
      title: 'Atualizar análise técnica', subtitle: `${d.code} · ${d.title}`, mode: 'drawer', body: `<form id="techForm"><div class="form-grid">
      <div class="field"><label>Prioridade</label><select class="select" name="priority">${Object.keys(ctx.priorities).map(p => `<option value="${p}" ${p === d.priority ? 'selected' : ''}>${p} · ${priorityLabel(p)}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select class="select" name="status">${ctx.statuses.map(s => `<option ${s === d.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="field"><label>Responsável</label><input class="input" name="responsible" value="${esc(d.responsible || '')}"></div>
      <div class="field"><label>Setor</label><input class="input" name="sector" value="${esc(d.sector || '')}"></div>
      <div class="field"><label>Prazo previsto</label><input class="input" type="date" name="due_date" value="${esc(d.due_date || '')}"></div>
      <div class="field"><label>Custo estimado (R$)</label><input class="input" type="number" step="0.01" min="0" name="cost_estimate" value="${esc(d.cost_estimate || 0)}"></div>
      <div class="field span-2"><label>Parecer técnico</label><textarea class="textarea" name="technical_opinion">${esc(d.technical_opinion || '')}</textarea></div>
      <div class="field span-2"><label>Ação definida</label><textarea class="textarea" name="action_defined">${esc(d.action_defined || '')}</textarea></div>
      <div class="field span-2"><label>Dependências / impedimentos</label><textarea class="textarea" name="dependencies">${esc(d.dependencies || '')}</textarea></div>
      <div class="field span-2"><label>Dependências operacionais</label><div class="check-grid"><label class="check"><input type="checkbox" name="needs_visit" ${d.needs_visit ? 'checked' : ''}> Visita técnica</label><label class="check"><input type="checkbox" name="needs_budget" ${d.needs_budget ? 'checked' : ''}> Orçamento</label><label class="check"><input type="checkbox" name="needs_material" ${d.needs_material ? 'checked' : ''}> Material</label><label class="check"><input type="checkbox" name="needs_contract" ${d.needs_contract ? 'checked' : ''}> Contratação</label></div></div>
      <div class="field"><label>Exercício futuro</label><input class="input" type="number" min="2026" max="2035" name="future_year" value="${esc(d.future_year || '')}" placeholder="Ex.: 2027"></div>
    </div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveTechnical">Salvar alterações</button>`, onOpen(root) {
        $('#saveTechnical').addEventListener('click', async () => { const f = $('#techForm'); const fd = new FormData(f); const payload = Object.fromEntries(fd.entries());['needs_visit', 'needs_budget', 'needs_material', 'needs_contract'].forEach(k => payload[k] = f.elements[k].checked); try { await api(`/api/demands/${d.id}`, { method: 'PUT', body: payload }); closeModal(); toast('Análise atualizada', 'O histórico da demanda foi registrado.'); await reload(); } catch (e) { toast('Não foi possível salvar', e.message, 'error') } });
      }
    });
  }

  // Aba "Planejamento" da demanda — usa os mesmos campos de planejamento futuro
  // (future_year, planning_kind, planned_quantity, planned_unit) já aceitos pelo
  // PUT /api/demands/{id} (mesma rota usada em "Editar análise"), só que num formulário
  // dedicado e acessível direto na aba, em vez de misturado com a análise técnica.
  const PLANNING_KINDS = ['Aquisição futura', 'Contratação futura', 'Obra futura', 'Projeto futuro', 'Serviço continuado'];
  async function openEditPlanning(d, reload, overrides = {}) {
    const pq = overrides.planned_quantity ?? d.planned_quantity;
    const pu = overrides.planned_unit ?? d.planned_unit;
    const pk = overrides.planning_kind ?? d.planning_kind;
    modal({
      title: 'Planejamento Futuro', subtitle: `${d.code} · ${d.title}`, mode: 'drawer', body: `<form id="planningLinkForm"><div class="form-grid">
      <div class="field"><label>Exercício futuro</label><input class="input" type="number" min="2026" max="2035" name="future_year" value="${esc(d.future_year || '')}" placeholder="Ex.: 2027"></div>
      <div class="field"><label>Tipo de necessidade</label><select class="select" name="planning_kind"><option value="">Não definido</option>${PLANNING_KINDS.map(k => `<option ${k === pk ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantidade</label><input class="input" type="number" min="0" step="0.01" name="planned_quantity" value="${esc(pq || '')}"></div>
      <div class="field"><label>Unidade de medida</label><select class="select" name="planned_unit" data-search data-search-placeholder="Buscar unidade...">${unitOptionsHTML(pu || '', (CATEGORIA_UNIDADES[d.category] || CATEGORIA_UNIDADES_DEFAULT).permitidas || [], `Sugeridas para ${d.category}`)}</select></div>
      <div class="field span-2"><label>Estimativa de custo (R$)</label><input class="input" type="number" min="0" step="0.01" name="cost_estimate" value="${esc(d.cost_estimate || 0)}"></div>
    </div><p class="wizard-hint mt-12">Deixe o exercício em branco para remover o vínculo desta demanda com o planejamento futuro.</p></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="savePlanningLink">Salvar planejamento</button>`, onOpen() {
        $('#savePlanningLink').addEventListener('click', async () => {
          const f = $('#planningLinkForm');
          const payload = Object.fromEntries(new FormData(f).entries());
          try {
            await api(`/api/demands/${d.id}`, { method: 'PUT', body: payload });
            closeModal();
            toast('Planejamento atualizado', payload.future_year ? `Demanda destinada ao exercício ${payload.future_year}.` : 'Vínculo com exercício futuro removido.');
            await reload();
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  // Editar demanda — os campos que a própria escola preencheu ao registrar (o que houve,
  // local, descrição e impacto). Mesma rota PUT /api/demands/{id} usada em "Editar análise",
  // só que só toca nos campos que qualquer usuário (não só quem tem can_edit_analysis) já
  // pode alterar no backend: title, description, category, subcategory, location, impact,
  // affected_people, risk, blocks_activity.
  async function openEditDemand(d, reload) {
    // A unidade escolar de uma demanda só pode ser trocada pelo Gestor da Infraestrutura
    // (perfil com can_manage_admin) — o PUT /api/demands/{id} aplica a mesma regra no backend.
    const canMoveSchool = !!ctx.user.perm.can_manage_admin;
    let schools = [];
    if (canMoveSchool) {
      try { schools = await api('/api/schools'); } catch { schools = []; }
    }
    modal({
      title: 'Editar demanda', subtitle: `${d.code} · ${d.school_name || ''}`, mode: 'drawer', body: `<form id="editDemandForm"><div class="form-grid">
      <div class="field span-2"><label>Nome curto</label><input class="input" name="title" maxlength="140" value="${esc(d.title || '')}" required></div>
      ${canMoveSchool ? `<div class="field span-2"><label>Unidade Escolar</label><select class="select" name="school_id" data-search data-search-placeholder="Buscar escola pelo nome...">${schools.map(x => `<option value="${x.id}" ${x.id === d.school_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Prioridade</label><select class="select" name="priority"><option value="P1 - Urgente" ${d.priority === 'P1 - Urgente' ? 'selected' : ''}>P1 - Urgente</option><option value="P2 - Alta" ${d.priority === 'P2 - Alta' ? 'selected' : ''}>P2 - Alta</option><option value="P3 - Programada" ${d.priority === 'P3 - Programada' ? 'selected' : ''}>P3 - Programada</option></select></div>
      <div class="field"><label>Status</label><select class="select" name="status"><option value="P1 Urgentes" ${d.status === 'P1 Urgentes' ? 'selected' : ''}>P1 Urgentes</option><option value="Aguardando contratação" ${d.status === 'Aguardando contratação' ? 'selected' : ''}>Aguardando contratação</option><option value="Em execução" ${d.status === 'Em execução' ? 'selected' : ''}>Em execução</option><option value="Planejamento futuro" ${d.status === 'Planejamento futuro' ? 'selected' : ''}>Planejamento futuro</option><option value="Concluída" ${d.status === 'Concluída' ? 'selected' : ''}>Concluída</option></select></div>
      <div class="field"><label>Tipo de problema</label><select class="select" name="category">${ctx.categories.map(c => `<option ${c === d.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Data de vencimento</label><input class="input" type="date" name="due_date" value="${d.due_date || ''}"></div>
      <div class="field"><label>Local</label><input class="input" name="location" placeholder="Ex.: Sala 3, banheiro do pátio, cozinha..." value="${esc(d.location || '')}"></div>
      <div class="field"><label>Responsável</label><input class="input" name="responsible" placeholder="Nome do responsável" value="${esc(d.responsible || '')}"></div>
      <div class="field span-2"><label>Descrição</label><textarea class="textarea" name="description" required>${esc(d.description || '')}</textarea></div>
      <div class="field span-2"><label>Parecer técnico</label><textarea class="textarea" name="technical_opinion" placeholder="Parecer ou análise técnica da demanda">${esc(d.technical_opinion || '')}</textarea></div>
      <div class="field"><label>Pessoas afetadas (aprox.)</label><input class="input" type="number" min="0" name="affected_people" value="${esc(d.affected_people || 0)}"></div>
      <div class="field"><label>Setor</label><input class="input" name="sector" placeholder="Setor responsável" value="${esc(d.sector || '')}"></div>
      <div class="field span-2"><label>Sinais de impacto</label><div class="check-grid"><label class="check"><input type="checkbox" name="blocks_activity" ${d.blocks_activity ? 'checked' : ''}> Impede atividade escolar</label><label class="check"><input type="checkbox" name="risk" ${d.risk ? 'checked' : ''}> Risco de acidente</label></div></div>
    </div></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-danger" id="deleteEditDemand" style="margin-left:auto;margin-right:auto">${icon('trash')}Deletar</button><button class="btn btn-primary" id="saveEditDemand">Salvar alterações</button>`, onOpen() {
        // Espelha no subtítulo do modal a escola escolhida, para quem está corrigindo
        // uma unidade selecionada por engano ver a troca antes de salvar.
        const schoolSelect = $('#editDemandForm [name="school_id"]');
        schoolSelect?.addEventListener('change', () => {
          const head = $('.modal-header p');
          if (head) head.textContent = `${d.code} · ${schoolSelect.selectedOptions[0]?.textContent || ''}`;
        });
        $('#saveEditDemand').addEventListener('click', async () => {
          const f = $('#editDemandForm');
          if (!f.reportValidity()) return;
          const fd = new FormData(f);
          const payload = Object.fromEntries(fd.entries());
          ['blocks_activity', 'risk'].forEach(k => payload[k] = f.elements[k].checked);
          try {
            await api(`/api/demands/${d.id}`, { method: 'PUT', body: payload });
            closeModal();
            toast('Demanda atualizada', `${d.code} foi salva com as novas informações.`);
            await reload();
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
        $('#deleteEditDemand')?.addEventListener('click', async () => {
          if (confirm(`Tem certeza que deseja deletar esta demanda (${d.code})? Esta ação não pode ser desfeita.`)) {
            try {
              await api(`/api/demands/${d.id}`, { method: 'DELETE' });
              closeModal();
              toast('Demanda deletada', `${d.code} foi removida do sistema.`);
              await reload();
            } catch (e) { toast('Erro ao deletar', e.message, 'error'); }
          }
        });
      }
    });
  }

  async function renderDemandDetail() {
    setLoading();
    const id = Number(document.body.dataset.entityId);
    let [payload, staff] = await Promise.all([api(`/api/demands/${id}`), loadStaff().catch(() => [])]);
    payload.staff = staff;

    const reload = async () => { payload = await api(`/api/demands/${id}`); payload.staff = staff; render(); };

    async function upload(file) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        toast('Enviando anexo', file.name);
        await api(`/api/demands/${id}/attachments`, { method: 'POST', body: fd });
        closeModal();
        await reload();
        toast('Anexo enviado', file.name);
      } catch (e) { toast('Falha no envio', e.message, 'error'); }
    }

    // -- gavetas de leitura (substituem as antigas abas) ----------------------
    function openHistoryDrawer() {
      modal({
        title: 'Histórico completo', subtitle: `${payload.demand.code} · ${payload.updates.length} registro${payload.updates.length === 1 ? '' : 's'}`,
        mode: 'drawer', body: renderTimeline(payload.updates),
        footer: `<button class="btn btn-secondary" data-close>Fechar</button>`
      });
    }

    function openResponsesDrawer() {
      modal({
        title: 'Devolutivas', subtitle: `${payload.demand.code} · ${esc(payload.demand.school_name)}`, mode: 'drawer',
        body: `<div class="composer"><textarea id="updateMessage" placeholder="Descreva o que foi analisado, qual é o próximo passo, quem está responsável e a previsão atualizada."></textarea></div>
          <section class="info-card mt-16"><h3>${icon('message')}Linha do tempo</h3>${renderTimeline(payload.updates.filter(x => ['Devolutiva', 'Status', 'Alteração'].includes(x.kind)))}</section>`,
        footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="sendUpdate">${icon('message')}Registrar devolutiva</button>`,
        onOpen(root) {
          setTimeout(() => $('#updateMessage', root)?.focus(), 30);
          $('#sendUpdate', root).addEventListener('click', async () => {
            const ta = $('#updateMessage', root);
            if (!ta.value.trim()) { toast('Escreva a devolutiva', 'O campo de mensagem está vazio.', 'error'); return; }
            try {
              await api(`/api/demands/${id}/updates`, { method: 'POST', body: { kind: 'Devolutiva', message: ta.value.trim() } });
              closeModal();
              toast('Devolutiva registrada', 'A escola verá a mensagem no histórico da demanda.');
              await reload();
            } catch (e) { toast('Não foi possível registrar', e.message, 'error'); }
          });
        }
      });
    }

    function openAttachmentsDrawer() {
      modal({
        title: 'Anexos', subtitle: `${payload.demand.code} · ${payload.attachments.length} arquivo${payload.attachments.length === 1 ? '' : 's'}`,
        mode: 'drawer',
        body: `<label class="upload-zone" id="uploadZone">${icon('paperclip')}<strong>Arraste um arquivo ou clique para selecionar</strong><small>PDF, DOCX, XLSX e imagens · até 12 MB</small><input type="file" id="attachmentInput" hidden></label>${renderFiles(payload.attachments)}`,
        footer: `<button class="btn btn-secondary" data-close>Fechar</button>`,
        onOpen(root) {
          const zone = $('#uploadZone', root), input = $('#attachmentInput', root);
          zone.addEventListener('click', () => input.click());
          input.addEventListener('change', () => input.files[0] && upload(input.files[0]));
          ['dragover', 'dragenter'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag'); }));
          ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('drag'); }));
          zone.addEventListener('drop', e => e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]));
        }
      });
    }

    function openSchoolDrawer() {
      const d = payload.demand;
      modal({
        title: esc(d.school_name), subtitle: 'Unidade escolar responsável pela solicitação', mode: 'drawer',
        body: `<section class="info-card"><h3>${icon('school')}Contato e endereço</h3><div class="key-value">
          <div class="kv"><span>Direção</span><strong>${esc(d.director || '—')}</strong></div>
          <div class="kv"><span>Endereço</span><strong>${esc(d.address || '—')}</strong></div>
          <div class="kv"><span>Telefone</span><strong>${esc(d.phone || '—')}</strong></div>
          <div class="kv"><span>E-mail</span><strong>${esc(d.school_email || '—')}</strong></div>
          <div class="kv"><span>Local da ocorrência</span><strong>${esc(d.location || '—')}</strong></div>
        </div></section>`,
        footer: `<button class="btn btn-secondary" data-close>Fechar</button>`
      });
    }

    // -- assistente "Registrar andamento" ------------------------------------
    // Uma escrita por vez: escolher o tipo (1), preencher só o que aquele tipo
    // exige (2) e conferir o que muda antes de salvar (3).
    function openProgressWizard(preType) {
      const d = payload.demand;
      const isDone = statusClass(d.status) === 'completed';
      const TYPES = [
        { key: 'atualizacao', icon: 'edit', label: 'Atualização', hint: 'Informar andamento geral da demanda.' },
        { key: 'iniciado', icon: 'bolt', label: 'Serviço iniciado', hint: 'A equipe começou o atendimento no local.' },
        { key: 'material', icon: 'cart', label: 'Aguardando material', hint: 'O serviço depende de material para continuar.' },
        { key: 'responsavel', icon: 'users', label: 'Alterar responsável', hint: 'Trocar quem responde pela demanda.' },
        { key: 'prazo', icon: 'calendar', label: 'Reprogramar prazo', hint: 'Ajustar a data de conclusão prevista.' },
        isDone
          ? { key: 'reabrir', icon: 'refresh', label: 'Reabrir demanda', hint: 'O local precisa de retorno da equipe.' }
          : { key: 'executado', icon: 'check-circle', label: 'Serviço executado', hint: 'Serviço concluído com sucesso.' }
      ];
      const KEY_FIELD = { atualizacao: 'note', iniciado: 'action', material: 'material', responsavel: 'responsible', prazo: 'due', executado: 'note', reabrir: 'note' };
      const REQUIRED = { responsavel: 'responsible', prazo: 'due', executado: 'note' };

      const st = {
        step: 1,
        type: TYPES.some(t => t.key === preType) ? preType : TYPES[0].key,
        status: d.status,
        responsible: dvResponsible(d),
        actionType: d.prov_action_type || '',
        due: d.prov_due_date || d.due_date || '',
        needsMaterial: !!d.needs_material,
        qty: d.planned_quantity || '',
        unit: d.planned_unit || '',
        note: '',
        notify: !!d.prov_notify_school
      };

      const typeLabel = k => PROV_ACTION_TYPES.find(t => t.key === k)?.label || '';
      const currentType = () => TYPES.find(t => t.key === st.type);

      const applyPreset = () => {
        if (st.type === 'iniciado') { st.status = 'Em execução'; if (!st.actionType) st.actionType = 'manutencao'; }
        else if (st.type === 'material') { st.status = 'Aguardando material'; st.needsMaterial = true; }
        else if (st.type === 'executado') { st.status = 'Concluída'; st.notify = true; }
        else if (st.type === 'reabrir') { st.status = 'Em triagem'; }
        else st.status = d.status;
        if (st.type === 'responsavel' && !st.responsible) st.responsible = ctx.user?.name || '';
      };

      // Sugestões de unidade: a categoria da demanda define o conjunto, e palavras
      // da descrição (lâmpada, fio/cabo, tinta...) afinam ainda mais. O catálogo
      // completo continua disponível logo abaixo, nos grupos.
      const unitSuggestions = () => {
        const meta = CATEGORIA_UNIDADES[d.category] || CATEGORIA_UNIDADES_DEFAULT;
        if (!meta.usar) return [];
        const desc = (d.description || '').toLowerCase();
        const matched = new Set();
        Object.entries(meta.porItem || {}).forEach(([kw, units]) => { if (desc.includes(kw)) units.forEach(u => matched.add(u)); });
        return matched.size ? [...matched] : (meta.permitidas || []);
      };

      const defaultMessage = () => ({
        atualizacao: 'Andamento registrado pela equipe de infraestrutura.',
        iniciado: `Execução iniciada no local${st.responsible ? ` por ${st.responsible}` : ''}.`,
        material: 'Serviço aguardando material. Necessidade sinalizada para o planejamento.',
        responsavel: `Responsabilidade atribuída a ${st.responsible || 'equipe de infraestrutura'}.`,
        prazo: `Prazo previsto reprogramado para ${fmtDate(st.due)}.`,
        executado: 'Serviço executado e demanda concluída.',
        reabrir: 'Demanda reaberta para novo atendimento no local.'
      })[st.type];

      const stepsHTML = () => `<ol class="pw-steps">${['Registrar andamento', 'Detalhes da atualização', 'Revisar e salvar'].map((label, i) => {
        const n = i + 1;
        return `<li class="${st.step > n ? 'done' : (st.step === n ? 'current' : '')}"><span class="pw-disc">${st.step > n ? icon('arrow') : n}</span><span>${esc(label)}</span></li>`;
      }).join('')}</ol>`;

      // Cada linha da prévia carrega a cor do assunto que ela representa, usando
      // os tokens de cor que o resto do sistema já emprega por categoria.
      const previewRow = (ic, label, value, empty = false, tone = 'blue') =>
        `<div class="pw-prow"><span class="pw-prow-ico" style="color:var(--${tone})">${icon(ic)}</span><span class="pw-prow-label">${esc(label)}</span><span class="pw-prow-value ${empty ? 'is-empty' : ''}">${esc(value)}</span></div>`;

      const stepOneHTML = () => {
        const t = currentType();
        const preview = { ...st };
        const savedStatus = st.status, savedMaterial = st.needsMaterial;
        applyPreset();
        const rows = previewRow('wrench', 'Tipo de ação', typeLabel(st.actionType) || 'A definir', !st.actionType, 'blue')
          + previewRow('cart', 'Disponibilidade de material', st.needsMaterial ? 'Precisa comprar' : 'Disponível no estoque', false, 'orange')
          + previewRow('grid', 'Status da demanda', st.status, false, 'violet')
          + previewRow('calendar', 'Prazo previsto', st.due ? fmtDate(st.due) : 'Selecionar data', !st.due, 'green')
          + previewRow('message', 'Observação / andamento', st.note || 'Descreva o que foi realizado, próximos passos ou pendências.', !st.note, 'teal');
        st.status = savedStatus; st.needsMaterial = savedMaterial; void preview;
        return `${stepsHTML()}
          <p class="pw-lead">Escolha primeiro o tipo de atualização. Os detalhes são preenchidos na próxima etapa.</p>
          <p class="pw-legend">1. Escolha o tipo de atualização</p>
          <div class="pw-type-grid">${TYPES.map(x => `<button type="button" class="pw-type" data-pw-type="${x.key}" aria-pressed="${x.key === st.type}">
            <span class="pw-check">${icon('arrow')}</span>
            <span class="pw-type-icon">${icon(x.icon)}</span>
            <b>${esc(x.label)}</b><small>${esc(x.hint)}</small>
          </button>`).join('')}</div>
          <div class="pw-preview">
            <div class="pw-preview-head">${icon('info')}<div><b>Próxima etapa: detalhes da atualização</b><small>Com "${esc(t.label)}", você confirma os campos abaixo.</small></div></div>
            <div class="pw-preview-rows">${rows}</div>
          </div>`;
      };

      const stepTwoHTML = () => {
        const key = KEY_FIELD[st.type];
        const k = f => f === key ? ' is-key' : '';
        return `${stepsHTML()}
          <p class="pw-lead">Atualização do tipo <strong>${esc(currentType().label)}</strong>. Preencha o que mudou — o restante permanece como está.</p>
          <div class="pw-card">

          <div class="pw-field${k('action')}">
            <span class="pw-field-label">Tipo de ação</span>
            <div class="prov-type-row" id="pwTypeRow">${PROV_ACTION_TYPES.map(t => `<button type="button" class="prov-type-chip ${st.actionType === t.key ? 'active' : ''}" data-pw-action="${t.key}" style="--chip-color:var(--${t.color});--chip-soft:var(--${t.color}-soft)"><span class="prov-type-icon">${icon(t.icon)}</span>${esc(t.label)}</button>`).join('')}</div>
          </div>

          <div class="pw-field${k('material')}">
            <span class="pw-field-label">Disponibilidade de material</span>
            <p class="pw-field-hint">Se precisar comprar, a demanda é sinalizada para o Planejamento 2027.</p>
            <div class="toggle-row">
              <button type="button" class="toggle-btn tg-ok ${!st.needsMaterial ? 'active' : ''}" data-pw-material="0">${icon('check-circle')}Sim, tem material</button>
              <button type="button" class="toggle-btn tg-buy ${st.needsMaterial ? 'active' : ''}" data-pw-material="1">${icon('cart')}Precisa comprar</button>
            </div>
            <div class="pw-grid-2 mt-12 ${st.needsMaterial ? '' : 'hidden'}" id="pwMaterialPanel">
              <div class="field"><label class="pw-lbl">Quantidade necessária <span class="pw-req">*</span></label><input class="input" type="number" min="0" step="0.01" id="pwQty" value="${esc(String(st.qty || ''))}" placeholder="1"></div>
              <div class="field"><label class="pw-lbl">Unidade de medida</label><select class="select" id="pwUnit" data-search data-search-placeholder="Buscar unidade...">${unitOptionsHTML(st.unit, unitSuggestions(), `Sugeridas para ${d.category}`)}</select></div>
            </div>
          </div>

          <div class="pw-grid-2">
            <div class="pw-field"><label for="pwStatus">Status da demanda</label><select class="select" id="pwStatus">${ctx.statuses.map(s => `<option ${s === st.status ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
            <div class="pw-field${k('responsible')}"><label for="pwResponsible">Responsável ${REQUIRED[st.type] === 'responsible' ? '<span class="pw-req">*</span>' : ''}</label><select class="select" id="pwResponsible"><option value="">Selecionar responsável...</option>${(payload.staff || []).map(s => `<option ${s.name === st.responsible ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
          </div>

          <div class="pw-field${k('due')}">
            <label>Prazo previsto ${REQUIRED[st.type] === 'due' ? '<span class="pw-req">*</span>' : ''}</label>
            <div class="datepicker" data-datepicker data-dp-target="pwDue"><input type="hidden" id="pwDue" value="${esc(st.due || '')}"><div class="datepicker-input-wrap"><input class="input datepicker-display" type="text" placeholder="dd/mm/aaaa" readonly autocomplete="off"><button type="button" class="datepicker-icon-btn" aria-label="Abrir calendário" data-tooltip="Escolher data">${icon('calendar')}</button></div></div>
          </div>

          <div class="pw-field${k('note')}">
            <label for="pwNote">Observação / andamento ${REQUIRED[st.type] === 'note' ? '<span class="pw-req">*</span>' : ''}</label>
            <p class="pw-field-hint">Este texto vira a devolutiva publicada no histórico da demanda.</p>
            <textarea class="textarea" id="pwNote" placeholder="${esc(defaultMessage())}">${esc(st.note)}</textarea>
          </div>

          <div class="prov-form-footer" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-top:14px;border-top:1px solid var(--line)">
            <button type="button" class="attach-btn" id="pwAttachBtn">${icon('paperclip')}Anexar documento</button>
            <input type="file" id="pwAttachInput" hidden>
            <label class="prov-notify-row" style="cursor:pointer;margin:0" data-tooltip="Envia a devolutiva para a unidade escolar">
              <span>Notificar escola</span>
              <span class="switch"><input type="checkbox" id="pwNotify" ${st.notify ? 'checked' : ''}><span class="switch-track"></span></span>
            </label>
          </div>
          </div>`;
      };

      const diffRows = () => {
        const rows = [];
        // Compara normalizado para nao listar como mudanca o que so difere em
        // caixa ou espaco (ex.: unidade "UN" vinda do banco vs "un" da lista).
        const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
        const push = (label, from, to) => { if (!same(from, to)) rows.push([label, from, to]); };
        push('Status', d.status, st.status);
        push('Responsável', dvResponsible(d) || '—', st.responsible || '—');
        push('Tipo de ação', typeLabel(d.prov_action_type) || '—', typeLabel(st.actionType) || '—');
        push('Prazo previsto', fmtDate(d.prov_due_date || d.due_date), fmtDate(st.due));
        push('Material', d.needs_material ? 'Precisa comprar' : 'Disponível no estoque', st.needsMaterial ? 'Precisa comprar' : 'Disponível no estoque');
        if (st.needsMaterial) push('Quantidade', `${num(d.planned_quantity || 0)} ${d.planned_unit || ''}`.trim(), `${num(st.qty || 0)} ${st.unit || ''}`.trim());
        return rows;
      };

      const stepThreeHTML = () => {
        const rows = diffRows();
        return `${stepsHTML()}
          <p class="pw-lead">Confira o que será alterado na demanda ${esc(d.code)} antes de salvar.</p>
          <div class="pw-card">
          <div class="pw-review">
            <div class="pw-review-row"><span class="pw-prow-label">Tipo de atualização</span><span class="pw-to">${esc(currentType().label)}</span></div>
            ${rows.length ? rows.map(([label, from, to]) => `<div class="pw-review-row"><span class="pw-prow-label">${esc(label)}</span><span><span class="pw-from">${esc(from)}</span> <span class="pw-arrow">→</span> <span class="pw-to">${esc(to)}</span></span></div>`).join('')
            : `<div class="pw-review-row"><span class="pw-prow-label">Dados da demanda</span><span class="pw-nochange" style="padding:0">Nada muda. Só a devolutiva abaixo é publicada no histórico.</span></div>`}
          </div>
          <p class="pw-legend" style="margin-top:18px">Devolutiva que será publicada</p>
          <div class="pw-note-preview">${esc(st.note.trim() || defaultMessage())}</div>
          <p class="pw-lead" style="margin:12px 0 0">${st.notify ? 'A unidade escolar será notificada deste registro.' : 'A unidade escolar não será notificada deste registro.'}</p>
          </div>`;
      };

      const footerHTML = () => {
        if (st.step === 1) return `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="pwNext">Continuar para detalhes${icon('chevron')}</button>`;
        if (st.step === 2) return `<button class="btn btn-secondary" id="pwBack">Voltar</button><button class="btn btn-primary" id="pwNext">Continuar para revisão${icon('chevron')}</button>`;
        return `<button class="btn btn-secondary" id="pwBack">Voltar</button><button class="btn btn-primary" id="pwSave">${icon('bookmark')}Salvar andamento</button>`;
      };

      const collectStepTwo = root => {
        st.actionType = $('#pwTypeRow .prov-type-chip.active', root)?.dataset.pwAction || '';
        st.status = $('#pwStatus', root)?.value || st.status;
        st.responsible = $('#pwResponsible', root)?.value || '';
        st.due = $('#pwDue', root)?.value || '';
        st.note = $('#pwNote', root)?.value || '';
        st.notify = !!$('#pwNotify', root)?.checked;
        st.needsMaterial = $('.toggle-btn[data-pw-material="1"]', root)?.classList.contains('active') || false;
        st.qty = $('#pwQty', root)?.value || '';
        st.unit = $('#pwUnit', root)?.value || st.unit;
      };

      const validateStepTwo = () => {
        const req = REQUIRED[st.type];
        if (req === 'due' && !st.due) return 'Escolha a nova data de conclusão prevista.';
        if (req === 'responsible' && !st.responsible) return 'Selecione quem passa a responder pela demanda.';
        if (req === 'note' && !st.note.trim()) return 'Descreva o que foi realizado — este texto vira a devolutiva.';
        // A quantidade so faz sentido quando o registro aponta compra: e ela que
        // alimenta o Planejamento. Com "Sim, tem material" o campo nem aparece,
        // entao exigi-lo deixaria a etapa sem saida.
        if (st.needsMaterial && !(Number(st.qty) > 0)) return 'Em "Disponibilidade de material", informe a quantidade que precisa ser comprada.';
        return '';
      };

      const save = async () => {
        const body = {
          prov_action_type: st.actionType,
          prov_responsible: st.responsible,
          responsible: st.responsible || d.responsible,
          status: st.status,
          prov_due_date: st.due || null,
          due_date: st.due || null,
          prov_note: st.note,
          prov_notify_school: st.notify ? 1 : 0,
          needs_material: st.needsMaterial ? 1 : 0
        };
        if (st.needsMaterial) {
          body.planned_quantity = Number(st.qty) || 1;
          body.planned_unit = st.unit || 'un';
          if (!d.planning_kind) body.planning_kind = 'Aquisição futura';
        }
        // Concluir registra o parecer tambem em "Acao definida", como fazia o
        // antigo modal de conclusao, para a analise tecnica nao ficar vazia.
        if (st.type === 'executado') body.action_defined = st.note.trim() || d.action_defined || 'Serviço concluído';
        try {
          await api(`/api/demands/${id}`, { method: 'PUT', body });
          await api(`/api/demands/${id}/updates`, {
            method: 'POST',
            body: { kind: st.type === 'atualizacao' ? 'Devolutiva' : 'Status', message: st.note.trim() || defaultMessage() }
          });
          closeModal();
          toast('Andamento registrado', `${currentType().label} · ${d.code}`);
          if (st.needsMaterial && !d.future_year) toast('Sinalizado para o Planejamento 2027', 'Abra o painel Planejamento para destinar a demanda a um exercício futuro.');
          await reload();
        } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
      };

      const wireStep = root => {
        enhanceSearchableSelects(root);
        $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal));
        $('.close-btn')?.addEventListener('click', closeModal);

        if (st.step === 1) {
          $$('[data-pw-type]', root).forEach(b => b.addEventListener('click', () => { st.type = b.dataset.pwType; paint(); }));
          $('#pwNext', root).addEventListener('click', () => { applyPreset(); st.step = 2; paint(); });
        }

        if (st.step === 2) {
          initDatePickers(root);
          $$('#pwTypeRow .prov-type-chip', root).forEach(chip => chip.addEventListener('click', () => {
            const on = chip.classList.contains('active');
            $$('#pwTypeRow .prov-type-chip', root).forEach(c => c.classList.remove('active'));
            if (!on) chip.classList.add('active');
          }));
          $$('[data-pw-material]', root).forEach(b => b.addEventListener('click', () => {
            $$('[data-pw-material]', root).forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            $('#pwMaterialPanel', root)?.classList.toggle('hidden', b.dataset.pwMaterial !== '1');
          }));
          const fileInput = $('#pwAttachInput', root);
          $('#pwAttachBtn', root)?.addEventListener('click', () => fileInput.click());
          fileInput?.addEventListener('change', () => fileInput.files[0] && upload(fileInput.files[0]));
          const focusKey = { note: '#pwNote', responsible: '#pwResponsible', due: '.datepicker-display', material: '#pwQty', action: '#pwTypeRow .prov-type-chip' }[KEY_FIELD[st.type]];
          setTimeout(() => $(focusKey, root)?.focus(), 40);
          $('#pwBack', root).addEventListener('click', () => { collectStepTwo(root); st.step = 1; paint(); });
          $('#pwNext', root).addEventListener('click', () => {
            collectStepTwo(root);
            const err = validateStepTwo();
            if (err) { toast('Falta um dado', err, 'error'); return; }
            st.step = 3; paint();
          });
        }

        if (st.step === 3) {
          $('#pwBack', root).addEventListener('click', () => { st.step = 2; paint(); });
          $('#pwSave', root).addEventListener('click', save);
        }
      };

      const paint = () => {
        const body = st.step === 1 ? stepOneHTML() : (st.step === 2 ? stepTwoHTML() : stepThreeHTML());
        const wrapped = `<div class="pw">${body}</div>`;
        const open = $('#modalRoot .pw');
        if (open) {
          const m = open.closest('.modal');
          $('.modal-body', m).innerHTML = wrapped;
          $('.modal-footer', m).innerHTML = footerHTML();
          wireStep(m);
        } else {
          modal({
            title: 'Registrar andamento', subtitle: `${d.code} · ${d.school_name}`, mode: 'drawer',
            body: wrapped, footer: footerHTML(), onOpen(root) { wireStep(root); }
          });
        }
      };

      paint();
    }

    // -- render ---------------------------------------------------------------
    const render = () => {
      const d = payload.demand;
      content.innerHTML = demandViewHTML(payload);

      const menuBtn = $('#dvMenuBtn', content), menuPop = $('#dvMenuPop', content);
      const closeMenu = () => { if (menuPop) { menuPop.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } };
      menuBtn?.addEventListener('click', e => {
        e.stopPropagation();
        const open = menuPop.hidden;
        menuPop.hidden = !open;
        menuBtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', closeMenu, { once: true });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); }, { once: true });

      $$('[data-dv-action]', content).forEach(btn => btn.addEventListener('click', () => {
        closeMenu();
        const what = btn.dataset.dvAction;
        if (what === 'wizard') openProgressWizard(btn.dataset.dvType);
        else if (what === 'devolutiva') openResponsesDrawer();
        else if (what === 'history') openHistoryDrawer();
        else if (what === 'attachments') openAttachmentsDrawer();
        else if (what === 'school') openSchoolDrawer();
        else if (what === 'technical') openEditTechnical(d, reload);
        else if (what === 'planning') openEditPlanning(d, reload);
        else if (what === 'edit-demand') openEditDemand(d, reload);
      }));
    };

    render();
  }


  async function openFutureDemandForm() {
    const schools = await loadSchools();
    const schoolOptions = ctx.user.perm.school_scoped ? `<option value="${ctx.user.school_id}">${esc(ctx.user.school_name || 'Minha unidade')}</option>` : schools.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    modal({
      title: 'Nova Demanda Futura', subtitle: 'Registre uma necessidade dos próximos exercícios para planejamento, aquisição, contratação ou licitação.', mode: 'drawer', body: `<form id="futureDemandForm"><div class="form-grid">
      <div class="field span-2"><label>Unidade Escolar *</label><select class="select" name="school_id" required data-search data-search-placeholder="Buscar escola pelo nome...">${schoolOptions}</select></div>
      <div class="field"><label>Exercício pretendido *</label><select class="select" name="future_year" required>${[2027, 2028, 2029, 2030, 2031].map(y => `<option>${y}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo de necessidade *</label><select class="select" name="planning_kind"><option>Aquisição futura</option><option>Contratação futura</option><option>Obra futura</option><option>Projeto futuro</option><option>Serviço continuado</option></select></div>
      <div class="field span-2"><label>Objeto necessário *</label><input class="input" name="title" required placeholder="Ex.: Aquisição de 8 aparelhos de ar-condicionado"></div>
      <div class="field"><label>Categoria *</label><select class="select" name="category">${ctx.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Quantidade</label><input class="input" type="number" min="0" step="0.01" name="planned_quantity"></div>
      <div class="field"><label>Unidade de medida</label><select class="select" name="planned_unit" data-search data-search-placeholder="Buscar unidade...">${unitOptionsHTML()}</select></div>
      <div class="field"><label>Estimativa inicial (R$)</label><input class="input" type="number" min="0" step="0.01" name="cost_estimate"></div>
      <div class="field span-2"><label>Descrição / especificação inicial *</label><textarea class="textarea" name="description" required placeholder="Descreva o que a unidade necessita e as características já conhecidas."></textarea></div>
      <div class="field span-2"><label>Justificativa</label><textarea class="textarea" name="impact" placeholder="Explique por que a necessidade deve entrar no planejamento do exercício escolhido."></textarea></div>
      <div class="field span-2"><label>Dependências previstas</label><div class="check-grid"><label class="check"><input type="checkbox" name="needs_budget" checked> Necessita orçamento</label><label class="check"><input type="checkbox" name="needs_contract" checked> Necessita contratação/licitação</label><label class="check"><input type="checkbox" name="needs_material"> Necessita aquisição de material</label><label class="check"><input type="checkbox" name="needs_visit"> Necessita visita/projeto técnico</label></div></div>
    </div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveFutureDemand">Registrar demanda futura</button>`, onOpen() {
        $('#saveFutureDemand').addEventListener('click', async () => { const f = $('#futureDemandForm'); if (!f.reportValidity()) return; const payload = Object.fromEntries(new FormData(f).entries()); payload.priority = 'P4'; payload.status = 'Planejamento futuro';['needs_budget', 'needs_contract', 'needs_material', 'needs_visit'].forEach(k => payload[k] = f.elements[k].checked); try { const res = await api('/api/demands', { method: 'POST', body: payload }); closeModal(); toast('Demanda futura registrada', `${res.code} · Exercício ${payload.future_year}`); location.href = `/demandas/${res.id}`; } catch (e) { toast('Erro ao registrar', e.message, 'error') } });
      }
    });
  }

  async function openPlanningForm() {
    const planning = await api('/api/planning');
    const years = [...new Set([2027, 2028, 2029, 2030, ...planning.year_stats.map(x => x.year)])].sort();
    modal({
      title: 'Novo item de Planejamento', subtitle: 'Registre uma necessidade para aquisição, contratação, obra ou projeto futuro.', mode: 'drawer', body: `<form id="planningForm"><div class="form-grid">
      <div class="field"><label>Exercício *</label><select class="select" name="year" required>${years.map(y => `<option>${y}</option>`).join('')}</select></div>
      <div class="field"><label>Tipo *</label><select class="select" name="kind"><option>Aquisição futura</option><option>Contratação futura</option><option>Obra futura</option><option>Projeto futuro</option><option>Serviço continuado</option></select></div>
      <div class="field span-2"><label>Objeto / título *</label><input class="input" name="title" required placeholder="Ex.: Aquisição de aparelhos de ar-condicionado"></div>
      <div class="field"><label>Categoria *</label><select class="select" name="category">${ctx.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select class="select" name="status"><option>Identificada</option><option>Em análise</option><option>Em levantamento</option><option>Consolidada</option><option>Aprovada para planejamento</option><option>Aguardando estimativa</option><option>Aguardando orçamento</option><option>Prevista no exercício</option></select></div>
      <div class="field"><label>Quantidade</label><input class="input" type="number" min="0" step="0.01" name="quantity"></div>
      <div class="field"><label>Unidade de medida</label><select class="select" name="unit" data-search data-search-placeholder="Buscar unidade...">${unitOptionsHTML()}</select></div>
      <div class="field"><label>Estimativa inicial (R$)</label><input class="input" type="number" min="0" step="0.01" name="estimated_cost"></div>
      <div class="field"><label>Escolas envolvidas</label><input class="input" type="number" min="1" name="schools_count" value="1"></div>
      <div class="field span-2"><label>Justificativa</label><textarea class="textarea" name="justification" placeholder="Justifique a necessidade e o benefício esperado."></textarea></div>
    </div></form>`, footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="savePlanning">Salvar planejamento</button>`, onOpen() {
        $('#savePlanning').addEventListener('click', async () => { const f = $('#planningForm'); if (!f.reportValidity()) return; try { const res = await api('/api/planning', { method: 'POST', body: Object.fromEntries(new FormData(f).entries()) }); closeModal(); toast('Planejamento registrado', res.code); renderPlanning() } catch (e) { toast('Erro ao salvar', e.message, 'error') } });
      }
    });
  }

  async function renderPlanning() {
    setLoading(); const data = await api('/api/planning'); const years = [...new Set(data.year_stats.map(x => x.year))].sort(); const selected = Number(new URLSearchParams(location.search).get('year') || years[0] || 2027);
    const stats = data.year_stats.find(x => x.year === selected) || { items: 0, total_cost: 0, schools: 0 };
    content.innerHTML = `<section class="planning-hero"><div><span class="eyebrow" style="color:#7fe2df">PLANEJAMENTO E CONTRATAÇÕES</span><h1>Planejamento Futuro</h1><p>Consolide necessidades da rede e transforme demandas em aquisições, contratações, obras e projetos.</p></div><div><label class="form-label" style="color:#d8e8f7">EXERCÍCIO</label><select id="planningYear" class="year-select">${years.map(y => `<option ${y === selected ? 'selected' : ''}>${y}</option>`).join('')}</select></div></section>
      <div class="stats-grid" id="planningStatsGrid">
        <article class="stat-card blue" data-planning-insight data-tooltip="Ver detalhamento do planejamento do exercício"><div class="stat-label">Orçamento estimado</div><div class="stat-value" style="font-size:28px">${money(stats.total_cost)}</div><div class="stat-note">${icon('money')}Visão consolidada do exercício</div></article>
        <article class="stat-card teal" data-planning-insight data-tooltip="Ver detalhamento do planejamento do exercício"><div class="stat-label">Itens consolidados</div><div class="stat-value">${num(stats.items)}</div><div class="stat-note">${icon('clipboard')}Objetos em planejamento</div></article>
        <article class="stat-card orange" data-planning-insight data-tooltip="Ver quais unidades escolares são impactadas"><div class="stat-label">Escolas impactadas</div><div class="stat-value">${num(stats.schools)}</div><div class="stat-note">${icon('school')}Soma das unidades vinculadas</div></article>
        <article class="stat-card violet" data-planning-insight data-tooltip="Ver detalhamento do planejamento do exercício"><div class="stat-label">Ciclo administrativo</div><div class="stat-value" style="font-size:21px;margin-top:13px">Planejar → Licitar</div><div class="stat-note">${icon('trend')}Rastreabilidade do início à execução</div></article>
      </div>
      ${pageHeader(`Planejamento ${selected}`, 'Itens previstos, consolidados e em preparação para contratação.', `<a class="btn btn-secondary" href="/api/export/planning.pdf?year=${selected}" data-tooltip="Baixar os itens deste exercício em PDF">${icon('file')}Gerar um PDF</a><button class="btn btn-secondary" id="planningHelp">${icon('info')}Como funciona</button><button class="btn btn-secondary" id="newFutureDemand">${icon('plus')}Nova Demanda Futura</button>${ctx.user.perm.can_edit_analysis ? `<button class="btn btn-primary" id="newPlanning">${icon('plus')}Consolidar Item</button>` : ''}`)}
      <section class="panel"><div class="panel-header"><div><h2>Demandas de aquisição e contratação</h2><p>Itens consolidados para o exercício selecionado.</p></div><div class="search-field" style="width:260px">${icon('search')}<input class="input" id="planningQ" placeholder="Pesquisar planejamento..."></div></div><div id="planningTable"></div></section>`;
    const load = async () => { const q = $('#planningQ')?.value || ''; const res = await api(`/api/planning?year=${selected}&q=${encodeURIComponent(q)}`); $('#planningTable').innerHTML = renderPlanningTable(res.items) };
    $('#planningYear').addEventListener('change', e => location.href = `/planejamento?year=${e.target.value}`); $('#newFutureDemand')?.addEventListener('click', openFutureDemandForm); $('#newPlanning')?.addEventListener('click', openPlanningForm); let t; $('#planningQ').addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 200) }); $('#planningHelp').addEventListener('click', () => modal({ title: 'Fluxo do Planejamento', mode: 'center', body: `<div class="info-card accent"><h3>${icon('trend')}Do registro à execução</h3><p><strong>Demanda da escola</strong> → Análise técnica → Planejamento futuro → Consolidação → Processo administrativo → Licitação/Contratação → Contrato → Execução.</p></div><div class="alert info">A consolidação permite agrupar necessidades semelhantes de várias unidades sem perder o vínculo com cada escola de origem.</div>` }));
    $$('[data-planning-insight]', $('#planningStatsGrid')).forEach(card => card.addEventListener('click', () => openPlanningInsights(selected)));
    await load();
  }

  async function openPlanningInsights(year) {
    modal({ title: 'Impacto por Unidade Escolar', subtitle: `Exercício ${year}`, mode: 'drawer', body: `<div class="empty-state">${icon('clock')}<p>Carregando...</p></div>` });
    let data;
    try { data = await api(`/api/planning/insights?year=${year}`); }
    catch (e) { $('#modalRoot .modal-body').innerHTML = `<div class="alert error">Não foi possível carregar os dados deste exercício.</div>`; return; }
    const s = data.summary;
    const catMax = Math.max(1, ...data.by_category.map(x => x.cost || 0));
    const body = `
      <div class="metric-row" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric"><span>Itens consolidados</span><strong>${num(s.items)}</strong></div>
        <div class="metric"><span>Orçamento estimado</span><strong>${money(s.total_cost)}</strong></div>
        <div class="metric"><span>Escolas (estimativa)</span><strong>${num(s.schools_estimate)}</strong></div>
      </div>
      <div class="alert info mt-16">${icon('school')} <strong>${num(s.schools_confirmed)} unidade${s.schools_confirmed === 1 ? '' : 's'}</strong> identificada${s.schools_confirmed === 1 ? '' : 's'} por vínculo direto com demandas cadastradas nos itens deste exercício${s.schools_confirmed !== s.schools_estimate ? ` — a soma estimada manualmente nos itens é de ${num(s.schools_estimate)}.` : '.'}</div>
      ${s.schools_confirmed_list.length ? `<div class="mt-16"><strong style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Unidades identificadas</strong><div class="filter-chips" style="margin-top:8px">${s.schools_confirmed_list.map(x => `<span class="chip" style="cursor:default">${icon('school')}${esc(x.name)}</span>`).join('')}</div></div>` : ''}
      ${data.by_category.length ? `<div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Orçamento por categoria</h3><div class="mini-chart">${data.by_category.map(c => `<div class="bar-row"><label title="${esc(c.category)}">${esc(c.category)}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, (c.cost || 0) / catMax * 100)}%"></div></div><b>${money(c.cost || 0)}</b></div>`).join('')}</div></div>` : ''}
      <div class="mt-16"><h3 style="font-size:14px;margin:0 0 10px">Detalhamento por item</h3><div class="side-stack">${data.items.length ? data.items.map(it => `<div class="info-card" style="margin-bottom:0;padding:14px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong style="font-size:13px">${esc(it.title)}</strong><span class="status-badge future" style="white-space:nowrap">${esc(it.status)}</span></div>
        <p style="margin:4px 0 8px;color:var(--muted);font-size:11.5px">${esc(it.category)} · ${esc(it.kind)} · ${money(it.estimated_cost)}</p>
        ${it.linked_schools.length ? `<div class="filter-chips">${it.linked_schools.map(x => `<span class="chip" style="cursor:default">${icon('school')}${esc(x.name)}</span>`).join('')}</div>` : `<small class="text-muted">${num(it.schools_count)} unidade${it.schools_count === 1 ? '' : 's'} — estimativa manual, sem vínculo com demandas específicas cadastradas</small>`}
      </div>`).join('') : empty('Nenhum item neste exercício', '')}</div></div>`;
    $('#modalRoot .modal-body').innerHTML = body;
  }
  function renderPlanningTable(items) {
    if (!items.length) return empty('Nenhum item neste exercício', 'Cadastre uma necessidade futura ou altere o exercício.');
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Objeto consolidado</th><th>Tipo</th><th>Escolas</th><th>Estimativa</th><th>Status</th><th>Ações</th></tr></thead><tbody>${items.map(p => `<tr><td class="mono" data-label="Código"><strong>${esc(p.code)}</strong></td><td class="cell-title" data-label="Objeto consolidado"><strong>${esc(p.title)}</strong><small>${esc(p.category)} · ${p.year}</small></td><td data-label="Tipo">${esc(p.kind)}</td><td data-label="Escolas">${num(p.schools_count)}</td><td data-label="Estimativa">${money(p.estimated_cost)}</td><td data-label="Status"><span class="status-badge future">${esc(p.status)}</span></td><td data-label="Ações"><button class="icon-btn" data-tooltip="Detalhes do planejamento" aria-label="Detalhes do planejamento">${icon('eye')}</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function renderSchools() {
    setLoading();
    const query = new URLSearchParams(location.search);
    const [schools, allDemands, dash, catCounts] = await Promise.all([loadSchools(), api('/api/demands'), api('/api/dashboard'), api('/api/demands/category-counts')]);
    const ds = dash.stats;
    const counts = catCounts.counts || {};
    const schoolsById = new Map(schools.map(s => [s.id, s]));
    const filters = { q: query.get('q') || '', year: query.get('year') || '2026', status: query.get('status') || '', priority: query.get('priority') || '', category: query.get('category') || '' };
    let showCompleted = true, critical = false;
    content.innerHTML = pageHeader('Unidades Escolares', 'Visão 360° do histórico de infraestrutura por Unidade Escolar.',
      `<div class="search-field" style="width:280px">${icon('search')}<input class="input" id="schoolQ" placeholder="Nome, direção ou código..."></div><button class="btn btn-secondary" id="schoolFilter">${icon('filter')}Ordenar por criticidade</button>`)
      + `<section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" value="${esc(filters.q)}" placeholder="Código, demanda ou escola..."></div></div>
        <div class="field"><label>Ano</label><select class="select" id="fYear"><option value="">Todos</option>${[2026, 2025, 2024].map(y => `<option ${String(y) === filters.year ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><select class="select" id="fStatus"><option value="">Todos</option>${ctx.statuses.map(x => `<option ${x === filters.status ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x => `<option value="${x}" ${x === filters.priority ? 'selected' : ''}>${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x => `<option value="${esc(x)}" ${x === filters.category ? 'selected' : ''}>${esc(x)} (${num(counts[x] || 0)})</option>`).join('')}</select></div>
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
    const yearOf = d => (d.created_at || '').slice(0, 4);
    const matchesFilters = d => {
      if (filters.year && yearOf(d) !== filters.year) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (filters.priority && d.priority !== filters.priority) return false;
      if (filters.category && d.category !== filters.category) return false;
      if (!showCompleted && d.status === 'Concluída') return false;
      if (filters.q) {
        const q = filters.q.trim().toLowerCase();
        const schoolName = (schoolsById.get(d.school_id)?.name || '').toLowerCase();
        if (!(d.code || '').toLowerCase().includes(q) && !(d.title || '').toLowerCase().includes(q) && !schoolName.includes(q)) return false;
      }
      return true;
    };
    const apply = () => {
      const narrowing = !!(filters.status || filters.priority || filters.category || filters.q);
      const headerQ = $('#schoolQ').value.trim().toLowerCase();
      const bySchool = new Map();
      allDemands.forEach(d => { if (matchesFilters(d)) { if (!bySchool.has(d.school_id)) bySchool.set(d.school_id, []); bySchool.get(d.school_id).push(d); } });
      let list = schools.filter(s => {
        if (headerQ && ![s.name, s.director, s.code].some(v => (v || '').toLowerCase().includes(headerQ))) return false;
        if (narrowing && !(bySchool.get(s.id) || []).length) return false;
        return true;
      });
      list = [...list].sort((a, b) => {
        if (!critical) return a.name.localeCompare(b.name);
        const ua = (bySchool.get(a.id) || []).filter(d => d.priority === 'P1').length, ub = (bySchool.get(b.id) || []).filter(d => d.priority === 'P1').length;
        return ub - ua || (bySchool.get(b.id) || []).length - (bySchool.get(a.id) || []).length;
      });
      $('#schoolGrid').innerHTML = list.length ? list.map(s => renderSchoolCard(s, bySchool.get(s.id) || [])).join('') : empty('Nenhuma unidade encontrada', 'Ajuste os filtros ou o termo de busca.');
      bindSchools();
    };
    function bindSchools() { $$('[data-school-id]').forEach(c => c.addEventListener('click', () => openSchool360(Number(c.dataset.schoolId)))) }
    $('#schoolFilter').addEventListener('click', () => { critical = !critical; $('#schoolFilter').classList.toggle('active', critical); apply(); });
    let t; $('#schoolQ').addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 200); });
    let t2; $('#fQ').addEventListener('input', () => { clearTimeout(t2); t2 = setTimeout(() => { filters.q = $('#fQ').value; apply(); }, 250); });
    ['#fYear', '#fStatus', '#fPriority', '#fCategory'].forEach(id => $(id).addEventListener('change', () => {
      filters.year = $('#fYear').value; filters.status = $('#fStatus').value; filters.priority = $('#fPriority').value; filters.category = $('#fCategory').value;
      apply();
    }));
    $('#clearFilters').addEventListener('click', () => {
      filters.q = ''; filters.status = ''; filters.priority = ''; filters.category = ''; filters.year = '2026';
      $('#fQ').value = ''; $('#fStatus').value = ''; $('#fPriority').value = ''; $('#fCategory').value = ''; $('#fYear').value = '2026';
      apply();
    });
    $$('[data-chip-status]').forEach(b => b.addEventListener('click', () => {
      filters.status = b.dataset.chipStatus; $('#fStatus').value = filters.status;
      if (b.dataset.chipStatus === 'Concluída') { showCompleted = true; $('#toggleCompleted').checked = true; }
      apply();
    }));
    $$('[data-chip-priority]').forEach(b => b.addEventListener('click', () => { filters.priority = b.dataset.chipPriority; $('#fPriority').value = filters.priority; apply(); }));
    $('#toggleCompleted').addEventListener('change', () => { showCompleted = $('#toggleCompleted').checked; apply(); });
    apply();
  }
  // Monta o texto do tooltip com a lista de demandas de uma unidade escolar, a partir
  // dos dados reais já carregados (sem chamada extra de API por cartão/hover).
  function schoolTooltipText(list) {
    if (!list || !list.length) return 'Nenhuma demanda registrada nesta unidade.';
    const MAX = 6;
    const lines = list.slice(0, MAX).map(d => `• ${fmtDate(d.created_at)} — ${d.title} — ${d.priority} · ${d.status}`);
    if (list.length > MAX) lines.push(`+ ${list.length - MAX} demanda${list.length - MAX === 1 ? '' : 's'}`);
    return lines.join('\n');
  }
  function renderSchoolCard(s, list) {
    list = list || [];
    const total = list.length;
    const completed = list.filter(d => d.status === 'Concluída').length;
    const urgent = list.filter(d => d.priority === 'P1').length;
    const exec = total ? Math.round(completed / total * 100) : 0;
    const accentCls = urgent ? 'school-card-urgent' : 'school-card-ok';
    return `<article class="school-card ${accentCls}" data-school-id="${s.id}" data-tooltip-list="${esc(schoolTooltipText(list))}"><div class="school-card-head"><div class="school-icon">${icon('school')}</div>${urgent ? `<span class="badge P1">${urgent} urgente${urgent === 1 ? '' : 's'}</span>` : `<span class="badge P4">Sem urgências</span>`}</div><h3>${esc(s.name)}</h3><p>${esc(s.director || 'Direção não informada')}</p><div class="school-stats"><div class="school-stat"><div class="school-stat-top">${icon('clipboard')}<span>Demandas</span></div><strong>${num(total)}</strong></div><div class="school-stat"><div class="school-stat-top">${icon('check-circle')}<span>Concluídas</span></div><strong>${num(completed)}</strong></div><div class="school-stat"><div class="school-stat-top">${icon('trend')}<span>Execução</span></div><strong>${exec}%</strong></div></div></article>`;
  }
  async function openSchool360(id) {
    const schoolId = parseInt(id, 10);
    if (isNaN(schoolId) || !schoolId) {
      toast('Aviso', 'Identificador de escola inválido.', 'warning');
      return;
    }
    const data = await api(`/api/schools/${schoolId}`), s = data.school, rows = data.demands;
    modal({
      title: 'Visão 360° da Unidade Escolar',
      subtitle: s.name,
      mode: 'drawer',
      body: `<section class="info-card accent">
        <h3>${icon('school')}${esc(s.name)}</h3>
        <div class="key-value">
          <div class="kv"><span>Código INEP</span><strong>${esc(s.inep || s.code || '—')}</strong></div>
          <div class="kv"><span>Direção</span><strong>${esc(s.director || '—')}</strong></div>
          <div class="kv"><span>Contato / Ramal</span><strong>${esc(s.phone || '—')}${s.ramal ? ` (Ramal ${s.ramal})` : ''}</strong></div>
          <div class="kv"><span>E-mail</span><strong>${esc(s.email || '—')}</strong></div>
          <div class="kv"><span>Bairro / Região</span><strong>${esc(s.neighborhood || '—')}</strong></div>
          <div class="kv"><span>Endereço Completo</span><strong>${esc(s.address || '—')}</strong></div>
          ${s.modality ? `<div class="kv"><span>Modalidade</span><strong>${esc(s.modality)}</strong></div>` : ''}
          ${s.maps_link ? `<div class="kv"><span>Localização</span><strong><a href="${esc(s.maps_link)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);text-decoration:underline;display:inline-flex;align-items:center;gap:4px">${icon('globe')} Ver no Google Maps ↗</a></strong></div>` : ''}
        </div>
      </section>
      <section class="info-card mt-16">
        <h3>${icon('clipboard')}Histórico de demandas (${rows.length})</h3>
        ${rows.length ? rows.map(d => `<a class="attention-item" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.code)} · ${esc(d.status)} · ${fmtDate(d.created_at)}</small></div><span class="badge ${d.priority}">${d.priority}</span></a>`).join('') : empty('Nenhuma demanda registrada', 'Esta unidade escolar não possui chamados abertos no momento.')}
      </section>`
    });
  }

  window.appOpenSchool360 = (id) => openSchool360(id);

  async function renderNetworkMap() {
    setLoading();
    let currentCrit = 'all';
    let currentStatus = 'all';
    let currentNeighborhood = 'all';
    let currentQ = '';
    let mapInstance = null;
    let networkData = null;
    let selectedCircuitSchoolIds = [];
    let circuitData = null;
    let circuitModeActive = false;
    let circuitMarkers = [];
    let neighborhoodCounts = null;

    const fetchAndRender = async () => {
      const url = `/api/map/network?q=${encodeURIComponent(currentQ)}&neighborhood=${encodeURIComponent(currentNeighborhood)}&criticality=${encodeURIComponent(currentCrit)}&status=${encodeURIComponent(currentStatus)}`;
      networkData = await api(url);
      // Cada bairro é uma propriedade fixa da escola (não muda com os filtros de
      // criticidade/status), então basta contar uma vez, a partir da primeira carga,
      // para exibir "Bairro (N)" no seletor mesmo depois de filtros serem aplicados.
      if (!neighborhoodCounts) {
        neighborhoodCounts = {};
        (networkData.schools || []).forEach(s => {
          const n = (s.neighborhood || '').trim();
          if (n) neighborhoodCounts[n] = (neighborhoodCounts[n] || 0) + 1;
        });
      }
      renderUI(networkData);
    };

    const renderUI = (data) => {
      const kpi = data.kpi_stats;
      const schools = data.schools;
      const priorityQueue = data.priority_queue;
      const op = data.operational_summary;
      const neighborhoods = data.neighborhoods || [];

      content.innerHTML = `
        <div class="map-page-wrapper">
          <div class="map-page-header">
            <div>
              <a class="page-back-link" href="/" data-tooltip="Voltar para a visão geral · tecla P"><svg><use href="#i-chevron"></use></svg><span>Voltar ao Painel</span></a>
              <h1 class="map-page-title">Mapa Operacional da Rede</h1>
              <p class="map-page-subtitle">Visão territorial e roteirizador logístico de vistorias</p>
            </div>
            <div class="map-header-controls">
              <div class="map-search-input-wrap">
                ${icon('search')}
                <input type="search" id="mapSearchInput" class="input map-search-input" placeholder="Buscar escola ou endereço..." value="${esc(currentQ)}">
              </div>
              <div class="map-filter-select-wrap">
                ${icon('building')}
                <select id="mapNeighborhoodSelect" class="select map-select">
                  <option value="all" ${currentNeighborhood === 'all' ? 'selected' : ''}>Bairro (Todos)</option>
                  ${neighborhoods.map(b => {
                    const bName = typeof b === 'string' ? b : b.name;
                    const bCount = typeof b === 'string' ? neighborhoodCounts?.[bName] : b.count;
                    return `<option value="${esc(bName)}" ${currentNeighborhood === bName ? 'selected' : ''}>📍 ${esc(bName)}${bCount != null ? ` (${bCount})` : ''}</option>`;
                  }).join('')}
                </select>
              </div>
              <div class="map-filter-select-wrap">
                ${icon('filter')}
                <select id="mapCritSelect" class="select map-select">
                  <option value="all" ${currentCrit === 'all' ? 'selected' : ''}>Criticidade (Todas)</option>
                  <option value="critical" ${currentCrit === 'critical' ? 'selected' : ''}>🔴 Situação Crítica</option>
                  <option value="warning" ${currentCrit === 'warning' ? 'selected' : ''}>🟠 Atenção / Alto Impacto</option>
                  <option value="in_progress" ${currentCrit === 'in_progress' ? 'selected' : ''}>🔵 Em Atendimento</option>
                  <option value="regular" ${currentCrit === 'regular' ? 'selected' : ''}>🟢 Situação Regular</option>
                </select>
              </div>
              <div class="map-filter-select-wrap">
                ${icon('layers')}
                <select id="mapStatusSelect" class="select map-select">
                  <option value="all" ${currentStatus === 'all' ? 'selected' : ''}>Status (Todos)</option>
                  <option value="critical" ${currentStatus === 'critical' ? 'selected' : ''}>Situação Crítica</option>
                  <option value="p1" ${currentStatus === 'p1' ? 'selected' : ''}>Prioridade P1</option>
                  <option value="p2" ${currentStatus === 'p2' ? 'selected' : ''}>Prioridade P2</option>
                  <option value="overdue" ${currentStatus === 'overdue' ? 'selected' : ''}>Prazos Vencidos</option>
                  <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>Em execução</option>
                  <option value="waiting_contract" ${currentStatus === 'waiting_contract' ? 'selected' : ''}>Aguardando contratação</option>
                </select>
              </div>

              ${(currentQ || currentNeighborhood !== 'all' || currentCrit !== 'all' || currentStatus !== 'all') ? `
              <button type="button" class="btn btn-secondary" id="mapClearFilters" data-tooltip="Remover busca, bairro, criticidade e status">${icon('filter')}Limpar</button>
              ` : ''}

              <div class="map-actions-group">
                <button type="button" id="btnToggleCircuitMode" class="btn-circuit-toggle ${circuitModeActive || selectedCircuitSchoolIds.length > 0 ? 'active' : ''}" title="Clique para escolher livremente até 10 unidades escolares para o circuito">
                  ${icon('school')} Escolher Unidades <span class="circuit-badge">${selectedCircuitSchoolIds.length}/10</span>
                </button>
                <button type="button" id="btnQuickTop5Circuit" class="btn-quick-top5" title="Adicionar automaticamente as 5 escolas mais críticas">
                  ${icon('bolt')} Sugestão Top 5
                </button>
                <a href="/api/export/demands.csv" class="btn primary map-export-btn" download>
                  ${icon('download')} Exportar
                </a>
                <button type="button" id="btnTogglePageFullscreen" class="btn-page-fullscreen" data-tooltip="Ver esta página em tela cheia">
                  ${icon('expand')}<span>Tela Cheia</span>
                </button>
              </div>
            </div>
          </div>

          <div class="map-kpi-grid">
            <div class="map-kpi-card">
              <div class="kpi-card-icon icon-blue">${icon('building')}</div>
              <div class="kpi-card-content">
                <span class="kpi-card-num">${kpi.total_schools}</span>
                <span class="kpi-card-label">Unidades Escolares</span>
              </div>
            </div>
            <div class="map-kpi-card ${kpi.critical_schools > 0 ? 'kpi-alert-red' : ''}">
              <div class="kpi-card-icon icon-red">${icon('warning')}</div>
              <div class="kpi-card-content">
                <span class="kpi-card-num text-red">${kpi.critical_schools}</span>
                <span class="kpi-card-label">Situação Crítica</span>
              </div>
            </div>
            <div class="map-kpi-card">
              <div class="kpi-card-icon icon-cyan">${icon('user')}</div>
              <div class="kpi-card-content">
                <span class="kpi-card-num text-blue">${kpi.in_progress_schools}</span>
                <span class="kpi-card-label">Em Atendimento</span>
              </div>
            </div>
            <div class="map-kpi-card ${kpi.overdue_schools > 0 ? 'kpi-alert-orange' : ''}">
              <div class="kpi-card-icon icon-orange">${icon('clock')}</div>
              <div class="kpi-card-content">
                <span class="kpi-card-num text-orange">${kpi.overdue_schools}</span>
                <span class="kpi-card-label">Prazos Vencidos</span>
              </div>
            </div>
          </div>

          <div class="map-body-layout mt-16">
            <div class="map-viewport-wrapper">
              <div id="networkMapContainer" class="map-container-box"></div>
              <div class="map-floating-legend">
                <div class="legend-row"><span class="legend-dot dot-critical"></span><span>Crítico</span></div>
                <div class="legend-row"><span class="legend-dot dot-warning"></span><span>Atenção</span></div>
                <div class="legend-row"><span class="legend-dot dot-progress"></span><span>Em acompanhamento</span></div>
                <div class="legend-row"><span class="legend-dot dot-regular"></span><span>Regular</span></div>
              </div>
            </div>

            <aside class="map-sidebar-stack">
              <section class="info-card map-priority-card">
                <div class="map-card-head">
                  <div class="head-title">${icon('bookmark')}<strong>Prioridade de Atendimento</strong></div>
                  <a href="/demandas" class="head-link">Ver todas</a>
                </div>
                <div class="priority-queue-list mt-12">
                  ${priorityQueue.length ? priorityQueue.map(s => {
                    let badgeLabel = 'Crítica';
                    let badgeClass = 'badge-crit-red';
                    let iconType = 'warning';
                    let subtext = `${s.urgent_p1_count} urgente${s.urgent_p1_count === 1 ? '' : 's'}`;
                    if (s.urgent_p1_count > 0) {
                      badgeLabel = 'Crítica';
                      badgeClass = 'badge-crit-red';
                      iconType = 'warning';
                      subtext = `${s.urgent_p1_count} urgente${s.urgent_p1_count === 1 ? '' : 's'}`;
                    } else if (s.overdue_count > 0) {
                      badgeLabel = 'Prazos vencidos';
                      badgeClass = 'badge-crit-orange';
                      iconType = 'clock';
                      subtext = `${s.overdue_count} vencida${s.overdue_count === 1 ? '' : 's'}`;
                    } else if (s.waiting_contract_count > 0) {
                      badgeLabel = 'Em atendimento';
                      badgeClass = 'badge-crit-blue';
                      iconType = 'user';
                      subtext = 'Aguardando contratação';
                    } else if (s.in_progress_count > 0) {
                      badgeLabel = 'Em execução';
                      badgeClass = 'badge-crit-green';
                      iconType = 'wrench';
                      subtext = 'Visita técnica / Execução';
                    } else {
                      badgeLabel = 'Atenção';
                      badgeClass = 'badge-crit-orange';
                      iconType = 'info';
                      subtext = `${s.open_demands_count} pendência${s.open_demands_count === 1 ? '' : 's'}`;
                    }
                    const isInCircuit = selectedCircuitSchoolIds.includes(s.id);
                    return `
                      <div class="priority-item" data-focus-school="${s.id}">
                        <div class="priority-item-icon ${badgeClass}">${icon(iconType)}</div>
                        <div class="priority-item-info">
                          <strong class="priority-item-name">${esc(s.name)}</strong>
                          <span class="priority-item-sub">${esc(subtext)}</span>
                        </div>
                        <button type="button" class="btn-add-circuit-pill ${isInCircuit ? 'in-circuit' : ''}" onclick="event.stopPropagation(); window.appToggleCircuitSchool(${s.id});" title="${isInCircuit ? 'Remover do circuito' : 'Adicionar ao circuito'}">
                          ${isInCircuit ? '✓ Rota' : '+ Rota'}
                        </button>
                        <span class="priority-badge ${badgeClass}">${badgeLabel}</span>
                        <div class="priority-chevron">${icon('chevron')}</div>
                      </div>
                    `;
                  }).join('') : `<div class="empty-state" style="padding:16px"><p>Nenhuma escola com pendência crítica.</p></div>`}
                </div>
              </section>

              <section class="info-card map-summary-card mt-16">
                <div class="map-card-head">
                  <div class="head-title">${icon('trend')}<strong>Resumo Operacional</strong></div>
                </div>
                <div class="op-summary-rows mt-12">
                  <div class="op-summary-row">
                    <span class="op-icon">${icon('building')}</span>
                    <div><strong>${op.structural_schools_count}</strong> escolas com demandas estruturais</div>
                  </div>
                  <div class="op-summary-row">
                    <span class="op-icon text-orange">${icon('bolt')}</span>
                    <div><strong>${op.electrical_schools_count}</strong> com prioridade elétrica</div>
                  </div>
                  <div class="op-summary-row">
                    <span class="op-icon text-muted">${icon('file')}</span>
                    <div><strong>${op.budget_schools_count}</strong> aguardando orçamento / contratação</div>
                  </div>
                  <div class="op-summary-row">
                    <span class="op-icon text-blue">${icon('clock')}</span>
                    <div>Tempo médio de atendimento: <strong>${op.avg_response_days} dias</strong></div>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <div id="circuitPlannerDockContainer"></div>

          <div class="map-quick-filters mt-16">
            <button type="button" class="quick-filter-chip ${currentStatus === 'all' && currentCrit === 'all' ? 'active' : ''}" data-quick-filter="all">
              ${icon('grid')} Todas
            </button>
            <button type="button" class="quick-filter-chip chip-crit ${currentCrit === 'critical' ? 'active' : ''}" data-quick-crit="critical">
              <span class="chip-dot dot-critical"></span> Críticas
            </button>
            <button type="button" class="quick-filter-chip ${currentStatus === 'p1' ? 'active' : ''}" data-quick-status="p1">
              ${icon('warning')} P1
            </button>
            <button type="button" class="quick-filter-chip ${currentStatus === 'p2' ? 'active' : ''}" data-quick-status="p2">
              ${icon('bolt')} P2
            </button>
            <button type="button" class="quick-filter-chip ${currentStatus === 'overdue' ? 'active' : ''}" data-quick-status="overdue">
              ${icon('clock')} Vencidas
            </button>
            <button type="button" class="quick-filter-chip ${currentStatus === 'in_progress' ? 'active' : ''}" data-quick-status="in_progress">
              ${icon('arrow')} Em execução
            </button>
            <button type="button" class="quick-filter-chip ${currentStatus === 'waiting_contract' ? 'active' : ''}" data-quick-status="waiting_contract">
              ${icon('user')} Aguardando contratação
            </button>
          </div>
        </div>
      `;

      initMap(schools);
      bindMapEvents();
      renderCircuitDock();
    };

    let currentMarkers = [];
    const SMEDU_LAT = -22.868666015828296;
    const SMEDU_LON = -43.7889040053576;
    const SMEDU_MAPS_LINK = 'https://maps.app.goo.gl/Js5S88kfqb2HrNnP7';

    const initMap = (schools) => {
      if (typeof maplibregl === 'undefined') {
        const container = document.getElementById('networkMapContainer');
        if (container) container.innerHTML = `<div class="alert info" style="margin:20px">Carregando OpenFreeMap...</div>`;
        setTimeout(() => initMap(schools), 300);
        return;
      }
      
      const mapDiv = document.getElementById('networkMapContainer');
      if (!mapDiv) return;

      mapInstance = new maplibregl.Map({
        container: 'networkMapContainer',
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [-43.788904, -22.868666],
        zoom: 12.5,
        attributionControl: false
      });
      window._currentMapInstance = mapInstance;

      mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
      mapInstance.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
      mapInstance.addControl(new maplibregl.FullscreenControl({ container: mapDiv.closest('.map-viewport-wrapper') || mapDiv }), 'top-right');

      mapInstance.on('load', () => {
        const smeduPinEl = document.createElement('div');
        smeduPinEl.className = 'smedu-route-pin';
        smeduPinEl.innerHTML = `🏛️ SMEDU · Sede`;
        smeduPinEl.style.cursor = 'pointer';

        const smeduPopup = new maplibregl.Popup({ offset: 12, maxWidth: '280px', className: 'custom-leaflet-popup' })
          .setHTML(`
            <div class="map-popup-card" style="padding:14px">
              <h4 style="margin:0 0 4px;font-size:13px;color:#005A9C;font-weight:800">🏛️ Secretaria Municipal de Educação</h4>
              <p style="margin:0 0 8px;font-size:11px;color:var(--muted)">Sede Administrativa Oficial de Itaguaí</p>
              <div style="font-size:11px;line-height:1.4;margin-bottom:8px">
                <div><strong>Coordenadas:</strong> -22.868666, -43.788904</div>
                <div><strong>Ponto Zero:</strong> Origem oficial de todas as rotas e vistorias</div>
              </div>
              <a href="${SMEDU_MAPS_LINK}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-primary" style="display:inline-flex;width:100%">${icon('globe')} Abrir Google Maps</a>
            </div>
          `);

        new maplibregl.Marker({ element: smeduPinEl })
          .setLngLat([SMEDU_LON, SMEDU_LAT])
          .setPopup(smeduPopup)
          .addTo(mapInstance);

        renderMarkers(schools);

        if (selectedCircuitSchoolIds.length > 0) {
          calculateAndRenderCircuit();
        }
      });
    };

    const renderMarkers = (schools) => {
      currentMarkers.forEach(m => m.remove());
      currentMarkers = [];

      schools.forEach(s => {
        if (!s.lat || !s.lon) return;

        const count = s.open_demands_count || 0;
        const crit = s.criticality || 'regular';
        
        let markerHtml = '';
        if (crit === 'critical') {
          markerHtml = `<div class="custom-map-pin pin-critical" data-tooltip="${esc(s.name)}"><span class="pin-inner">${count > 0 ? count : '⚠️'}</span><div class="pin-pulse"></div></div>`;
        } else if (crit === 'warning') {
          markerHtml = `<div class="custom-map-pin pin-warning" data-tooltip="${esc(s.name)}"><span class="pin-inner">${count > 0 ? count : '!'}</span></div>`;
        } else if (crit === 'in_progress') {
          markerHtml = `<div class="custom-map-pin pin-progress" data-tooltip="${esc(s.name)}"><span class="pin-inner">${count > 0 ? count : '▶'}</span></div>`;
        } else {
          markerHtml = `<div class="custom-map-pin pin-regular" data-tooltip="${esc(s.name)}"><span class="pin-inner">${count > 0 ? count : '✓'}</span></div>`;
        }

        const el = document.createElement('div');
        el.className = 'custom-leaflet-marker-wrap';
        el.innerHTML = markerHtml;

        const photoUrl = s.photo_url || `/api/school_photo/${s.id}?lat=${s.lat}&lon=${s.lon}`;
        const satFallback = `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export?bbox=${s.lon-0.0009},${s.lat-0.00055},${s.lon+0.0009},${s.lat+0.00055}&bboxSR=4326&imageSR=4326&size=450,200&format=png&f=image`;
        const dList = s.demands_summary || [];
        let demandsHtml = dList.length === 0 ? `<div class="popup-demand-empty">✨ <strong>Rede 100% Regularizada</strong></div>` : dList.map(d => {
            const prioClass = d.priority === 'P1' ? 'prio-p1' : (d.priority === 'P2' ? 'prio-p2' : 'prio-p3');
            const prioBadge = d.priority === 'P1' ? 'badge-crit-critical' : (d.priority === 'P2' ? 'badge-crit-warning' : 'badge-crit-regular');
            return `<div class="popup-demand-card ${prioClass}"><div class="pdc-top"><span class="pdc-cat">${esc(d.category)}</span><span class="pdc-badge ${prioBadge}">${d.priority}</span></div><div class="pdc-title">${esc(d.title)}</div></div>`;
        }).join('');

        const isInCircuit = selectedCircuitSchoolIds.includes(s.id);
        const fullAddress = s.address || 'Itaguaí - RJ';
        const shortAddress = fullAddress.split(' · ')[0] || fullAddress;
        const popupContent = `
          <div class="popup-photo-banner">
            <img src="${photoUrl}" alt="${esc(s.name)}" loading="lazy" onerror="this.onerror=null; this.src='${satFallback}';">
            ${s.maps_link ? `
              <a href="${esc(s.maps_link)}" target="_blank" rel="noopener noreferrer" class="popup-streetview-tag" title="Abrir no Google Street View">
                ${icon('camera')} Google Street View ↗
              </a>
            ` : ''}
          </div>
          <div class="map-popup-card">
            <div class="popup-head">
              <h4 class="popup-title">${esc(s.name)}</h4>
              <span class="popup-badge badge-crit-${crit}">${crit === 'critical' ? '🔴 Crítico' : (crit === 'warning' ? '🟠 Atenção' : (crit === 'in_progress' ? '🔵 Em atendimento' : '🟢 Regular'))}</span>
            </div>
            <p class="popup-address" title="${esc(fullAddress)}">${esc(shortAddress)}</p>

            <div class="popup-stats-grid">
              <div class="pstat"><span class="pstat-val">${s.open_demands_count}</span><span class="pstat-lbl">Demandas</span></div>
              <div class="pstat"><span class="pstat-val text-red">${s.urgent_p1_count}</span><span class="pstat-lbl">Urgentes P1</span></div>
              <div class="pstat"><span class="pstat-val text-orange">${s.overdue_count}</span><span class="pstat-lbl">Vencidas</span></div>
              <div class="pstat"><span class="pstat-val text-blue">${s.execution_percent}%</span><span class="pstat-lbl">Execução</span></div>
            </div>

            <!-- RESUMO OPERACIONAL DE DEMANDAS COM DATAS -->
            ${dList.length === 0 ? `
            <div class="popup-regularized-banner">✨ <strong>Rede 100% Regularizada</strong></div>
            ` : `
            <div class="popup-demands-container">
              <div class="popup-demands-head">
                <span class="popup-demands-head-title">${icon('clipboard')} Demandas em Aberto</span>
                <span class="popup-demands-count-tag">${s.open_demands_count} ativa(s)</span>
              </div>
              <div class="popup-demands-list">${demandsHtml}</div>
            </div>
            `}

            <!-- INFORMAÇÕES INSTITUCIONAIS -->
            <div class="popup-info-grid">
              <div class="pig-item"><span>Bairro</span><strong>${esc(s.neighborhood || 'Itaguaí')}</strong></div>
              <div class="pig-item"><span>Direção</span><strong>${esc(s.director || '—')}</strong></div>
              <div class="pig-item"><span>Contato</span><strong>${esc(s.phone || '—')}</strong></div>
              <div class="pig-item"><span>Custo Estimado</span><strong>${money(s.cost_estimate_open)}</strong></div>
            </div>

            <div class="popup-actions mt-8">
              <button type="button" class="popup-btn ${isInCircuit ? 'popup-btn-primary' : 'popup-btn-secondary'}" onclick="window.appToggleCircuitSchool(${s.id})" title="${isInCircuit ? 'Remover do Circuito' : 'Adicionar ao Circuito de Vistorias'}">
                ${isInCircuit ? '✓ Circuito' : '+ Circuito'}
              </button>
              <a href="/demandas?school_id=${s.id}" class="popup-btn popup-btn-primary">${icon('clipboard')} Demandas</a>
              <button type="button" class="popup-btn popup-btn-icon" onclick="window.appOpenSchool360(${s.id})" title="Visão 360° da unidade">${icon('school')}</button>
              <button type="button" class="popup-btn popup-btn-icon popup-btn-route" onclick="window.appRouteSchool(${s.lat}, ${s.lon})" title="Traçar rota 1:1">${icon('trend')}</button>
              ${s.maps_link ? `<a href="${esc(s.maps_link)}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-icon" title="Abrir no Google Maps">${icon('globe')}</a>` : ''}
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({
          offset: 14,
          closeButton: true,
          maxWidth: '340px',
          className: 'custom-leaflet-popup'
        }).setHTML(popupContent);

        popup.on('open', () => {
          if (mapInstance) {
            mapInstance.easeTo({
              center: [s.lon, s.lat],
              offset: [0, -100],
              duration: 350
            });
          }
        });

        el.addEventListener('click', () => {
          if (mapInstance) {
            mapInstance.easeTo({
              center: [s.lon, s.lat],
              offset: [0, -100],
              duration: 350
            });
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([s.lon, s.lat])
          .setPopup(popup)
          .addTo(mapInstance);
        
        currentMarkers.push(marker);
        s._marker = marker;
        s._popup = popup;
      });
    };

    window.appOpenCircuitSelectorModal = () => {
      const allSchools = (networkData?.schools || []).filter(s => s.lat && s.lon);
      if (!allSchools.length) {
        toast('Circuito', 'Nenhuma escola georreferenciada disponível.', 'warning');
        return;
      }

      const existing = document.getElementById('circuitPickerModalOverlay');
      if (existing) existing.remove();

      let tempSelectedIds = [...selectedCircuitSchoolIds];
      let filterText = '';
      let activeTab = 'all';

      const overlay = document.createElement('div');
      overlay.id = 'circuitPickerModalOverlay';
      overlay.className = 'circuit-modal-overlay';

      const renderModalContent = () => {
        let filtered = allSchools.filter(s => {
          const q = filterText.toLowerCase().trim();
          const matchQ = !q || s.name.toLowerCase().includes(q) || (s.neighborhood || '').toLowerCase().includes(q) || (s.director || '').toLowerCase().includes(q);
          if (!matchQ) return false;

          if (activeTab === 'p1') return s.urgent_p1_count > 0;
          if (activeTab === 'overdue') return s.overdue_count > 0;
          if (activeTab === 'open') return s.open_demands_count > 0;
          return true;
        });

        overlay.innerHTML = `
          <div class="circuit-modal-dialog" onclick="event.stopPropagation()">
            <div class="circuit-modal-header">
              <div>
                <h3 class="circuit-modal-title">
                  ${icon('school')} Escolher Unidades Escolares do Circuito
                </h3>
                <p class="circuit-modal-sub">Selecione livremente de 1 até 10 unidades escolares da rede para compor seu roteiro de vistorias.</p>
              </div>
              <button type="button" class="circuit-modal-close-btn" id="circuitModalCloseBtn" title="Fechar">✕</button>
            </div>

            <div class="circuit-modal-toolbar">
              <div class="circuit-modal-search-wrap">
                <span class="circuit-modal-search-icon">🔍</span>
                <input type="text" id="circuitModalSearchInput" placeholder="Buscar por nome da escola, bairro ou diretor..." value="${esc(filterText)}" autocomplete="off">
              </div>

              <div class="circuit-picker-counter-badge" id="circuitModalCountBadge">
                <strong>${tempSelectedIds.length}</strong> de 10 selecionadas
              </div>

              <div class="circuit-modal-chips-bar">
                <button type="button" class="circuit-modal-chip ${activeTab === 'all' ? 'active' : ''}" data-modal-tab="all">
                  Todas as Escolas (${allSchools.length})
                </button>
                <button type="button" class="circuit-modal-chip ${activeTab === 'p1' ? 'active' : ''}" data-modal-tab="p1">
                  🔴 Urgentes P1 (${allSchools.filter(s => s.urgent_p1_count > 0).length})
                </button>
                <button type="button" class="circuit-modal-chip ${activeTab === 'overdue' ? 'active' : ''}" data-modal-tab="overdue">
                  ⚠️ Prazos Vencidos (${allSchools.filter(s => s.overdue_count > 0).length})
                </button>
                <button type="button" class="circuit-modal-chip ${activeTab === 'open' ? 'active' : ''}" data-modal-tab="open">
                  📋 Com Demandas (${allSchools.filter(s => s.open_demands_count > 0).length})
                </button>
              </div>
            </div>

            <div class="circuit-schools-picker-list" id="circuitSchoolsPickerList">
              ${filtered.length ? filtered.map(s => {
                const isSelected = tempSelectedIds.includes(s.id);
                const isMax = tempSelectedIds.length >= 10 && !isSelected;
                return `
                  <div class="circuit-school-pick-row ${isSelected ? 'selected' : ''} ${isMax ? 'disabled-max' : ''}" data-pick-id="${s.id}">
                    <div class="circuit-pick-checkbox">${isSelected ? '✓' : ''}</div>
                    <div class="circuit-pick-details">
                      <div class="circuit-pick-name" title="${esc(s.name)}">${esc(s.name)}</div>
                      <div class="circuit-pick-sub">${esc(s.neighborhood || 'Itaguaí')} · ${esc(s.director || 'S/ Diretor')}</div>
                    </div>
                    <div class="circuit-pick-tags">
                      ${s.urgent_p1_count > 0 ? `<span class="circuit-pick-badge" style="background:#fee2e2;color:#b91c1c">🔴 ${s.urgent_p1_count} P1</span>` : ''}
                      ${s.open_demands_count > 0 ? `<span class="circuit-pick-badge" style="background:#e0f2fe;color:#0369a1">📋 ${s.open_demands_count}</span>` : `<span class="circuit-pick-badge" style="background:#dcfce7;color:#15803d">🟢 Ok</span>`}
                    </div>
                  </div>
                `;
              }).join('') : `<div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--muted)">Nenhuma unidade encontrada para os filtros aplicados.</div>`}
            </div>

            <div class="circuit-modal-footer">
              <div class="circuit-modal-footer-left">
                <button type="button" class="btn secondary" id="circuitModalClearBtn" style="padding:6px 12px;font-size:12px">
                  ✕ Limpar Seleção
                </button>
                <button type="button" class="btn secondary" id="circuitModalQuickTop5" style="padding:6px 12px;font-size:12px">
                  ⚡ Sugestão Top 5
                </button>
              </div>
              <div class="circuit-modal-footer-right">
                <button type="button" class="btn secondary" id="circuitModalCancelBtn">
                  Cancelar
                </button>
                <button type="button" class="btn primary" id="circuitModalApplyBtn" style="background:var(--primary);color:#fff">
                  🚀 Traçar Circuito (${tempSelectedIds.length} ${tempSelectedIds.length === 1 ? 'escola' : 'escolas'})
                </button>
              </div>
            </div>
          </div>
        `;

        overlay.querySelector('#circuitModalCloseBtn')?.addEventListener('click', () => overlay.remove());
        overlay.querySelector('#circuitModalCancelBtn')?.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        const searchInp = overlay.querySelector('#circuitModalSearchInput');
        searchInp?.addEventListener('input', (e) => {
          filterText = e.target.value;
          renderSchoolItemsOnly();
        });

        overlay.querySelectorAll('[data-modal-tab]').forEach(tabBtn => {
          tabBtn.addEventListener('click', () => {
            activeTab = tabBtn.dataset.modalTab;
            overlay.querySelectorAll('[data-modal-tab]').forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            renderSchoolItemsOnly();
          });
        });

        overlay.querySelector('#circuitModalClearBtn')?.addEventListener('click', () => {
          tempSelectedIds = [];
          updateSelectionState();
        });

        overlay.querySelector('#circuitModalQuickTop5')?.addEventListener('click', () => {
          const top = (networkData?.priority_queue || []).filter(s => s.lat && s.lon).slice(0, 5).map(s => s.id);
          tempSelectedIds = top;
          updateSelectionState();
        });

        overlay.querySelector('#circuitModalApplyBtn')?.addEventListener('click', () => {
          if (!tempSelectedIds.length) {
            toast('Circuito', 'Selecione pelo menos 1 unidade escolar.', 'warning');
            return;
          }
          selectedCircuitSchoolIds = [...tempSelectedIds];
          circuitModeActive = true;
          overlay.remove();
          updateCircuitUI();
          calculateAndRenderCircuit(true);
          toast('Circuito de Vistorias', `Traçando roteiro otimizado para ${selectedCircuitSchoolIds.length} unidades!`, 'success');
        });

        bindRowClicks();
      };

      const bindRowClicks = () => {
        overlay.querySelectorAll('[data-pick-id]').forEach(row => {
          row.addEventListener('click', () => {
            const id = Number(row.dataset.pickId);
            const idx = tempSelectedIds.indexOf(id);
            if (idx >= 0) {
              tempSelectedIds.splice(idx, 1);
            } else {
              if (tempSelectedIds.length >= 10) {
                toast('Limite Atingido', 'Você já selecionou o limite máximo de 10 unidades.', 'warning');
                return;
              }
              tempSelectedIds.push(id);
            }
            updateSelectionState();
          });
        });
      };

      const updateSelectionState = () => {
        const badge = overlay.querySelector('#circuitModalCountBadge');
        if (badge) badge.innerHTML = `<strong>${tempSelectedIds.length}</strong> de 10 selecionadas`;

        const applyBtn = overlay.querySelector('#circuitModalApplyBtn');
        if (applyBtn) applyBtn.innerHTML = `🚀 Traçar Circuito (${tempSelectedIds.length} ${tempSelectedIds.length === 1 ? 'escola' : 'escolas'})`;

        renderSchoolItemsOnly();
      };

      const renderSchoolItemsOnly = () => {
        const list = overlay.querySelector('#circuitSchoolsPickerList');
        if (!list) return;

        let filtered = allSchools.filter(s => {
          const q = filterText.toLowerCase().trim();
          const matchQ = !q || s.name.toLowerCase().includes(q) || (s.neighborhood || '').toLowerCase().includes(q) || (s.director || '').toLowerCase().includes(q);
          if (!matchQ) return false;

          if (activeTab === 'p1') return s.urgent_p1_count > 0;
          if (activeTab === 'overdue') return s.overdue_count > 0;
          if (activeTab === 'open') return s.open_demands_count > 0;
          return true;
        });

        list.innerHTML = filtered.length ? filtered.map(s => {
          const isSelected = tempSelectedIds.includes(s.id);
          const isMax = tempSelectedIds.length >= 10 && !isSelected;
          return `
            <div class="circuit-school-pick-row ${isSelected ? 'selected' : ''} ${isMax ? 'disabled-max' : ''}" data-pick-id="${s.id}">
              <div class="circuit-pick-checkbox">${isSelected ? '✓' : ''}</div>
              <div class="circuit-pick-details">
                <div class="circuit-pick-name" title="${esc(s.name)}">${esc(s.name)}</div>
                <div class="circuit-pick-sub">${esc(s.neighborhood || 'Itaguaí')} · ${esc(s.director || 'S/ Diretor')}</div>
              </div>
              <div class="circuit-pick-tags">
                ${s.urgent_p1_count > 0 ? `<span class="circuit-pick-badge" style="background:#fee2e2;color:#b91c1c">🔴 ${s.urgent_p1_count} P1</span>` : ''}
                ${s.open_demands_count > 0 ? `<span class="circuit-pick-badge" style="background:#e0f2fe;color:#0369a1">📋 ${s.open_demands_count}</span>` : `<span class="circuit-pick-badge" style="background:#dcfce7;color:#15803d">🟢 Ok</span>`}
              </div>
            </div>
          `;
        }).join('') : `<div style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--muted)">Nenhuma unidade encontrada para os filtros aplicados.</div>`;

        bindRowClicks();
      };

      document.body.appendChild(overlay);
      renderModalContent();
    };

    window.appToggleCircuitSchool = (schoolId) => {
      const idx = selectedCircuitSchoolIds.indexOf(schoolId);
      if (idx >= 0) {
        selectedCircuitSchoolIds.splice(idx, 1);
        toast('Circuito de Vistorias', 'Unidade removida do circuito.');
      } else {
        if (selectedCircuitSchoolIds.length >= 10) {
          toast('Limite Atingido', 'Você já selecionou o limite máximo de 10 unidades para este circuito.', 'warning');
          return;
        }
        selectedCircuitSchoolIds.push(schoolId);
        toast('Circuito de Vistorias', `Unidade adicionada! (${selectedCircuitSchoolIds.length}/10 selecionadas)`, 'success');
      }
      circuitModeActive = selectedCircuitSchoolIds.length > 0;
      updateCircuitUI();
      if (selectedCircuitSchoolIds.length > 0) calculateAndRenderCircuit(); else clearCircuitMapLayers();
    };

    window.appQuickTopCircuit = (count = 5) => {
      const topSchools = (networkData?.priority_queue || []).filter(s => s.lat && s.lon).slice(0, count).map(s => s.id);
      if (!topSchools.length) { toast('Circuito', 'Nenhuma unidade crítica com coordenadas encontrada.', 'warning'); return; }
      selectedCircuitSchoolIds = topSchools;
      circuitModeActive = true;
      toast('Circuito Otimizado', `Adicionadas as ${selectedCircuitSchoolIds.length} unidades mais críticas ao circuito!`, 'success');
      updateCircuitUI();
      calculateAndRenderCircuit();
    };

    window.appClearCircuit = () => {
      selectedCircuitSchoolIds = [];
      circuitData = null;
      circuitModeActive = false;
      clearCircuitMapLayers();
      updateCircuitUI();
      toast('Circuito Resetado', 'O circuito de vistorias foi limpo.');
    };

    window.appOptimizeCircuitOrder = () => calculateAndRenderCircuit(true);

    window.appOpenGoogleMapsCircuit = () => {
      if (circuitData?.google_maps_url) window.open(circuitData.google_maps_url, '_blank');
      else toast('Google Maps', 'Calcule o circuito primeiro para gerar o link de navegação.', 'warning');
    };

    const clearCircuitMapLayers = () => {
      const map = window._currentMapInstance || mapInstance;
      if (map) {
        if (map.getLayer('circuit-route-layer-glow')) map.removeLayer('circuit-route-layer-glow');
        if (map.getLayer('circuit-route-layer')) map.removeLayer('circuit-route-layer');
        if (map.getSource('circuit-route-source')) map.removeSource('circuit-route-source');
      }
      circuitMarkers.forEach(m => m.remove());
      circuitMarkers = [];
      if (networkData?.schools) renderMarkers(networkData.schools);
    };

    const updateCircuitUI = () => {
      const badge = document.querySelector('#btnToggleCircuitMode .circuit-badge');
      if (badge) badge.textContent = `${selectedCircuitSchoolIds.length}/10`;

      const btn = document.getElementById('btnToggleCircuitMode');
      if (btn) {
        if (selectedCircuitSchoolIds.length > 0) btn.classList.add('active');
        else btn.classList.remove('active');
      }

      document.querySelectorAll('.btn-add-circuit-pill').forEach(el => {
        const pItem = el.closest('[data-focus-school]');
        if (pItem) {
          const sid = Number(pItem.dataset.focusSchool);
          if (selectedCircuitSchoolIds.includes(sid)) { el.classList.add('in-circuit'); el.innerHTML = '✓ Rota'; }
          else { el.classList.remove('in-circuit'); el.innerHTML = '+ Rota'; }
        }
      });
      renderCircuitDock();
    };

    const calculateAndRenderCircuit = async (optimize = true) => {
      if (!selectedCircuitSchoolIds.length) return;
      toast('Otimizando Circuito', `Calculando trajeto para ${selectedCircuitSchoolIds.length} paradas a partir da SMEDU...`);
      try {
        const res = await api(`/api/route/circuit?school_ids=${selectedCircuitSchoolIds.join(',')}&optimize=${optimize}`);
        circuitData = res;
        renderCircuitDock();
        renderCircuitOnMap(res);
        toast('Circuito Calculado', `Distância total: ${res.total_distance_km} km · Tempo: ${res.total_duration_min} min (${res.stops.length - 1} escolas)`, 'success');
      } catch (err) { toast('Erro no circuito', err.message, 'error'); }
    };

    const renderCircuitOnMap = (res) => {
      const map = window._currentMapInstance || mapInstance;
      if (!map) return;
      document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());

      if (map.getSource('circuit-route-source')) map.getSource('circuit-route-source').setData(res.geometry);
      else {
        map.addSource('circuit-route-source', { type: 'geojson', data: res.geometry });
        map.addLayer({
          id: 'circuit-route-layer-glow',
          type: 'line',
          source: 'circuit-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#0288D1', 'line-width': 8, 'line-opacity': 0.4 }
        });
        map.addLayer({
          id: 'circuit-route-layer',
          type: 'line',
          source: 'circuit-route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#005A9C', 'line-width': 5 }
        });
      }

      circuitMarkers.forEach(m => m.remove());
      circuitMarkers = [];

      res.stops.forEach((stop, idx) => {
        const pin = document.createElement('div');
        pin.className = 'circuit-pin-marker';
        if (stop.is_origin) {
          pin.style.background = '#005A9C';
          pin.innerHTML = `<span class="circuit-pin-inner" data-tooltip="${esc(stop.name)}">🏛️</span>`;
        } else {
          pin.innerHTML = `<span class="circuit-pin-inner" data-tooltip="${esc(stop.name)}">${stop.order}</span>`;
          if (stop.p1_count > 0) pin.style.background = '#e53935';
          else if (stop.p2_count > 0) pin.style.background = '#fb8c00';
          else pin.style.background = '#005A9C';
        }

        const stopPopup = new maplibregl.Popup({ offset: 16, maxWidth: '280px', className: 'custom-leaflet-popup' })
          .setHTML(`
            <div class="map-popup-card" style="padding:12px">
              <div style="font-size:10px;font-weight:800;color:var(--primary);text-transform:uppercase;margin-bottom:2px">
                ${stop.is_origin ? 'Ponto de Partida Oficial' : `Parada #${stop.order} do Circuito`}
              </div>
              <h4 style="margin:0 0 4px;font-size:13px;color:var(--ink);font-weight:800">${esc(stop.name)}</h4>
              <p style="margin:0 0 6px;font-size:11px;color:var(--muted)">${esc(stop.address)}</p>
              ${!stop.is_origin ? `
                <div style="display:flex;gap:4px;margin-bottom:8px">
                  ${stop.p1_count > 0 ? `<span class="cstop-tag-p1">🔴 ${stop.p1_count} P1 Urgente</span>` : ''}
                  <span class="cstop-tag-demands">📋 ${stop.total_open_demands} demanda(s)</span>
                </div>
                <div style="font-size:10.5px;color:var(--muted);margin-bottom:8px">
                  <div><strong>Direção:</strong> ${esc(stop.director)}</div>
                  <div><strong>Contato:</strong> ${esc(stop.phone)}</div>
                </div>
              ` : ''}
              <div style="display:flex;gap:6px">
                <a href="${stop.maps_link}" target="_blank" rel="noopener noreferrer" class="popup-btn popup-btn-primary">${icon('globe')} Google Maps</a>
                ${!stop.is_origin ? `<button type="button" class="popup-btn popup-btn-secondary" onclick="window.appToggleCircuitSchool(${stop.school_id})">Remover</button>` : ''}
              </div>
            </div>
          `);

        const m = new maplibregl.Marker({ element: pin })
          .setLngLat([stop.lon, stop.lat])
          .setPopup(stopPopup)
          .addTo(map);

        circuitMarkers.push(m);
      });

      const coords = res.geometry.coordinates;
      if (coords?.length) {
        map.fitBounds(coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0])), { padding: 60, maxZoom: 14.5 });
      }
    };

    const renderCircuitDock = () => {
      const container = document.getElementById('circuitPlannerDockContainer');
      if (!container) return;

      if (!selectedCircuitSchoolIds.length) {
        container.innerHTML = '';
        return;
      }

      const stops = circuitData?.stops || [];
      const dist = circuitData?.total_distance_km || 0;
      const dur = circuitData?.total_duration_min || 0;

      container.innerHTML = `
        <div class="circuit-planner-dock">
          <div class="circuit-dock-header">
            <div class="circuit-dock-title">
              ${icon('trend')} Circuito de Vistorias em Campo
              <span class="circuit-badge" style="background:var(--primary);color:#fff;padding:2px 8px;border-radius:10px">${selectedCircuitSchoolIds.length}/10 unidades</span>
              <button type="button" class="btn secondary" onclick="window.appOpenCircuitSelectorModal()" style="margin-left:8px;padding:3px 8px;font-size:11.5px" title="Adicionar ou trocar escolas do circuito">
                ${icon('school')} Escolher / Alterar
              </button>
            </div>

            <div class="circuit-kpis-bar">
              <div class="ckpi-item">
                <span class="ckpi-lbl">Distância Total</span>
                <span class="ckpi-val">${dist} km</span>
              </div>
              <div class="ckpi-item">
                <span class="ckpi-lbl">Tempo em Trânsito</span>
                <span class="ckpi-val">${dur} min</span>
              </div>
              <div class="ckpi-item">
                <span class="ckpi-lbl">Vistorias</span>
                <span class="ckpi-val">${selectedCircuitSchoolIds.length} paradas</span>
              </div>
            </div>
          </div>

          <!-- LINHA DO TEMPO DE PARADAS -->
          <div class="circuit-timeline-list">
            <!-- ORIGEM SMEDU -->
            <div class="circuit-stop-card is-smedu">
              <div class="circuit-stop-num">🏛️</div>
              <div class="circuit-stop-info">
                <strong class="circuit-stop-name">Secretaria Municipal de Educação (SMEDU)</strong>
                <span class="circuit-stop-sub">Ponto de Partida Oficial · Centro</span>
              </div>
            </div>

            <!-- PARADAS DAS ESCOLAS -->
            ${stops.filter(s => !s.is_origin).map(s => `
              <div class="circuit-stop-card">
                <div class="circuit-stop-num" style="${s.p1_count > 0 ? 'background:#e53935' : (s.p2_count > 0 ? 'background:#fb8c00' : '')}">${s.order}</div>
                <div class="circuit-stop-info">
                  <strong class="circuit-stop-name">${esc(s.name)}</strong>
                  <span class="circuit-stop-sub">${esc(s.neighborhood)} · ${esc(s.director)}</span>
                  <div class="circuit-stop-tags">
                    ${s.p1_count > 0 ? `<span class="cstop-tag-p1">🔴 ${s.p1_count} P1</span>` : ''}
                    <span class="cstop-tag-demands">📋 ${s.total_open_demands} pendência(s)</span>
                  </div>
                </div>
                <button type="button" class="circuit-stop-remove" onclick="window.appToggleCircuitSchool(${s.school_id})" title="Remover do circuito">✕</button>
              </div>
            `).join('')}
          </div>

          <div class="circuit-dock-footer">
            <div class="btn-group">
              <button type="button" class="btn primary" onclick="window.appOptimizeCircuitOrder()">
                ${icon('refresh')} Otimizar Trajeto Mais Rápido
              </button>
              <button type="button" class="btn success" onclick="window.appOpenGoogleMapsCircuit()" style="background:#2e7d32;color:#fff">
                ${icon('globe')} 📱 Abrir no Google Maps GPS ↗
              </button>
            </div>
            <div class="btn-group">
              <button type="button" class="btn secondary" onclick="window.print()" title="Imprimir roteiro de vistorias">
                ${icon('download')} Imprimir Guia
              </button>
              <button type="button" class="btn secondary" onclick="window.appClearCircuit()">
                ✕ Limpar Circuito
              </button>
            </div>
          </div>
        </div>
      `;
    };

    window.appRouteSchool = async (toLat, toLon) => {
      currentMarkers.forEach(m => { if (m.getPopup?.()?.isOpen()) m.getPopup().remove(); });
      try {
        const res = await api(`/api/route?from_lat=${SMEDU_LAT}&from_lon=${SMEDU_LON}&to_lat=${toLat}&to_lon=${toLon}`);
        const map = window._currentMapInstance || mapInstance;
        if (map) {
          if (map.getSource('route-source')) map.getSource('route-source').setData(res.geometry);
          else {
            map.addSource('route-source', { type: 'geojson', data: res.geometry });
            map.addLayer({ id: 'route-layer', type: 'line', source: 'route-source', paint: { 'line-color': '#005A9C', 'line-width': 5, 'line-dasharray': [2, 2] } });
          }
          const coords = res.geometry.coordinates;
          map.fitBounds(coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0])), { padding: 60 });
        }
      } catch (err) { toast('Erro na rota', err.message, 'error'); }
    };

    const bindMapEvents = () => {
      let searchTimeout;
      $('#mapSearchInput')?.addEventListener('input', (e) => { clearTimeout(searchTimeout); currentQ = e.target.value; searchTimeout = setTimeout(fetchAndRender, 250); });
      $('#mapNeighborhoodSelect')?.addEventListener('change', (e) => { currentNeighborhood = e.target.value; fetchAndRender(); });
      $('#mapCritSelect')?.addEventListener('change', (e) => { currentCrit = e.target.value; fetchAndRender(); });
      $('#mapStatusSelect')?.addEventListener('change', (e) => { currentStatus = e.target.value; fetchAndRender(); });
      $('#mapClearFilters')?.addEventListener('click', () => {
        currentQ = ''; currentNeighborhood = 'all'; currentCrit = 'all'; currentStatus = 'all';
        fetchAndRender();
      });
      $('#btnToggleCircuitMode')?.addEventListener('click', () => window.appOpenCircuitSelectorModal());
      $('#btnQuickTop5Circuit')?.addEventListener('click', () => window.appQuickTopCircuit(5));
      $$('[data-quick-filter]').forEach(b => b.addEventListener('click', () => { currentStatus = 'all'; currentCrit = 'all'; fetchAndRender(); }));
      $$('[data-quick-crit]').forEach(b => b.addEventListener('click', () => { currentCrit = b.dataset.quickCrit; fetchAndRender(); }));
      $$('[data-quick-status]').forEach(b => b.addEventListener('click', () => { currentStatus = b.dataset.quickStatus; fetchAndRender(); }));
      $('#btnTogglePageFullscreen')?.addEventListener('click', () => {
        const wrap = document.querySelector('.map-page-wrapper');
        if (!wrap) return;
        if (document.fullscreenElement === wrap) {
          document.exitFullscreen?.();
        } else {
          (wrap.requestFullscreen || wrap.webkitRequestFullscreen)?.call(wrap);
        }
      });
      $$('[data-focus-school]').forEach(el => {
        el.addEventListener('click', () => {
          const sid = Number(el.dataset.focusSchool);
          const school = networkData?.schools?.find(s => s.id === sid);
          if (school && mapInstance) {
            mapInstance.flyTo({
              center: [school.lon, school.lat],
              zoom: 15.5,
              essential: true
            });
            if (school._popup) {
              school._popup.addTo(mapInstance);
            }
          }
        });
      });
    };

    // Registrado uma única vez (bindMapEvents roda a cada troca de filtro, então o
    // botão em si é religado ali; aqui só sincronizamos ícone/rótulo quando o estado
    // de tela cheia muda, buscando o botão atual no DOM em vez de guardar referência).
    document.addEventListener('fullscreenchange', () => {
      const btn = document.getElementById('btnTogglePageFullscreen');
      if (!btn) return;
      const isFs = document.fullscreenElement === document.querySelector('.map-page-wrapper');
      btn.classList.toggle('active', isFs);
      btn.setAttribute('data-tooltip', isFs ? 'Sair da tela cheia' : 'Ver esta página em tela cheia');
      btn.innerHTML = isFs ? `${icon('compress')}<span>Sair da Tela Cheia</span>` : `${icon('expand')}<span>Tela Cheia</span>`;
    });

    await fetchAndRender();
  }

  async function renderReports() {
    setLoading(); const dash = await api('/api/dashboard');
    content.innerHTML = pageHeader('Relatórios', 'Extraia dados gerenciais e acompanhe os indicadores da Agenda Integrada.', `<a class="btn btn-primary" href="/api/export/demands.csv">${icon('download')}Exportar carteira completa</a>`) + `<div class="report-grid">
      ${[
        ['Carteira de Demandas', 'Todas as demandas com prioridade, status, prazo, responsável e estimativa.', 'clipboard', '/api/export/demands.csv'],
        ['Demandas Urgentes', 'Recorte das solicitações P1 que exigem atenção imediata.', 'warning', '/api/export/demands.csv?priority=P1'],
        ['Demandas Concluídas', 'Atendimentos encerrados para prestação de contas e acompanhamento.', 'arrow', '/api/export/demands.csv?status=Concluída'],
        ['Aguardando Contratação', 'Necessidades dependentes de contratação, empresa ou processo licitatório.', 'file', '/api/export/demands.csv?status=Aguardando contratação'],
        ['Planejamento Futuro', 'Itens programados para exercícios posteriores e consolidação de aquisições.', 'calendar', '/planejamento'],
        ['Visão por Unidade Escolar', 'Acompanhe criticidade, volume e execução por escola.', 'school', '/escolas']
      ].map(r => `<article class="report-card"><div class="report-icon">${icon(r[2])}</div><h3>${r[0]}</h3><p>${r[1]}</p><a class="btn btn-secondary" href="${r[3]}">${icon(r[3].includes('export') ? 'download' : 'eye')}${r[3].includes('export') ? 'Exportar CSV' : 'Abrir visão'}</a></article>`).join('')}</div>
      <section class="panel mt-16"><div class="panel-header"><div><h2>Resumo executivo</h2><p>Indicadores atuais para reuniões e pactuações.</p></div></div><div class="panel-body"><div class="metric-row"><div class="metric"><span>Total de demandas</span><strong>${num(dash.stats.total)}</strong></div><div class="metric"><span>Urgentes</span><strong class="text-red">${num(dash.stats.urgent)}</strong></div><div class="metric"><span>Percentual de execução</span><strong class="text-teal">${dash.stats.execution}%</strong></div></div></div></section>`;
  }

  const ADMIN_ICON_SET = ['bolt', 'drop', 'roof', 'paint', 'wind', 'wrench', 'brick', 'wheelchair', 'chair', 'monitor', 'shield', 'drain', 'column', 'tree', 'bulb', 'door', 'hammer', 'crane', 'cart', 'dots', 'clipboard', 'building', 'file', 'warning', 'money', 'report', 'camera', 'settings', 'school', 'calendar', 'grid', 'paperclip', 'message', 'trend'];
  const ADMIN_COLOR_SET = [['red', 'Vermelho'], ['orange', 'Laranja'], ['teal', 'Verde-água'], ['violet', 'Violeta'], ['green', 'Verde'], ['blue', 'Azul']];
  const statePill = (active, onLabel = 'Ativo', offLabel = 'Inativo') => `<span class="badge" style="background:var(--${active ? 'green' : 'red'}-soft);color:var(--${active ? 'green' : 'red'})">${active ? onLabel : offLabel}</span>`;
  function confirmAction(title, message, { confirmLabel = 'Confirmar', danger = true } = {}) {
    return new Promise(resolve => {
      let settled = false;
      const root = $('#modalRoot');
      const mo = new MutationObserver(() => { if (!root.innerHTML && !settled) { settled = true; mo.disconnect(); resolve(false); } });
      mo.observe(root, { childList: true });
      modal({
        title, mode: 'center', body: `<div class="alert ${danger ? 'error' : 'info'}">${esc(message)}</div>`,
        footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${esc(confirmLabel)}</button>`,
        onOpen() { $('#confirmOk').addEventListener('click', () => { settled = true; mo.disconnect(); closeModal(); resolve(true); }); }
      });
    });
  }

  async function renderAdmin() {
    if (!ctx.user.perm.can_manage_admin) { location.href = '/'; return; }
    const TABS = [['geral', 'Visão Geral', 'grid'], ['categorias', 'Categorias', 'clipboard'], ['prioridades', 'Prioridades', 'warning'], ['kanban', 'Colunas do Kanban', 'kanban'], ['escolas', 'Unidades Escolares', 'school'], ['perfis', 'Perfis de Acesso', 'user'], ['usuarios', 'Usuários', 'user'], ['logs', 'Logs do Sistema', 'history']];
    let active = new URLSearchParams(location.search).get('tab') || 'geral';
    if (!TABS.some(t => t[0] === active)) active = 'geral';
    async function paint() {
      content.innerHTML = pageHeader('Administração', 'Configurações, cadastros-base e integridade do ambiente.', `<button class="btn btn-secondary" id="adminInfo">${icon('info')}Sobre esta versão</button>`)
        + `<nav class="tabs" aria-label="Seções de administração">${TABS.map(t => `<button class="tab ${active === t[0] ? 'active' : ''}" data-atab="${t[0]}">${icon(t[2])}${t[1]}</button>`).join('')}</nav>
        <div id="adminTabBody"><div class="page-skeleton"><div class="skeleton sk-title"></div><div class="skeleton sk-subtitle"></div></div></div>`;
      $('#adminInfo').addEventListener('click', () => modal({ title: 'Sobre esta versão', mode: 'center', body: `<div class="info-card accent"><h3>${icon('info')}Versão funcional demonstrativa</h3><p>Esta implementação possui backend FastAPI, banco SQLite, autenticação por sessão, perfis, CRUD de demandas, histórico, devolutivas, anexos, planejamento futuro, filtros, exportação CSV e interface responsiva.</p></div><div class="alert info">Antes de produção, altere a chave de sessão e as senhas demonstrativas e configure infraestrutura de hospedagem, backup, HTTPS e banco corporativo.</div>` }));
      $$('[data-atab]').forEach(b => b.addEventListener('click', () => { if (active === b.dataset.atab) return; active = b.dataset.atab; history.replaceState(null, '', `/administracao?tab=${active}`); paint(); }));
      const body = $('#adminTabBody');
      try {
        if (active === 'geral') await renderAdminGeral(body);
        else if (active === 'categorias') await renderAdminCategorias(body);
        else if (active === 'prioridades') await renderAdminPrioridades(body);
        else if (active === 'kanban') await renderAdminKanban(body);
        else if (active === 'escolas') await renderAdminEscolas(body);
        else if (active === 'perfis') await renderAdminPerfis(body);
        else if (active === 'usuarios') await renderAdminUsuarios(body);
        else if (active === 'logs') await renderAdminLogs(body);
      } catch (e) { body.innerHTML = `<div class="alert error">${esc(e.message)}</div>`; }
    }
    await paint();
  }

  async function renderAdminGeral(body) {
    const a = await api('/api/admin/summary');
    body.innerHTML = `<div class="admin-grid">
      <div class="admin-card"><div class="admin-value">${num(a.schools)}</div><div class="admin-label">Unidades Escolares</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.users)}</div><div class="admin-label">Usuários</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.demands)}</div><div class="admin-label">Demandas</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.planning)}</div><div class="admin-label">Itens de planejamento</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.attachments)}</div><div class="admin-label">Anexos</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.categories)}</div><div class="admin-label">Categorias ativas</div></div>
      <div class="admin-card"><div class="admin-value">${num(a.profiles)}</div><div class="admin-label">Perfis de acesso</div></div>
      <div class="admin-card"><div class="admin-value">${Math.max(1, Math.round(a.db_size / 1024))} KB</div><div class="admin-label">Base local</div></div>
    </div>
    <section class="panel mt-16"><div class="panel-header"><div><h2>Cadastros e parâmetros</h2><p>Use as abas acima para editar categorias, prioridades, colunas do Kanban, unidades escolares, perfis de acesso e usuários.</p></div></div><div class="panel-body"><div class="config-list">
      <div class="config-item">${icon('clipboard')}<div><strong>Categorias</strong><small>Ícone, cor e texto de apoio de cada categoria de demanda.</small></div><button class="btn btn-secondary" data-goto="categorias">Abrir</button></div>
      <div class="config-item">${icon('warning')}<div><strong>Prioridades</strong><small>Rótulo e orientação de P1 a P4.</small></div><button class="btn btn-secondary" data-goto="prioridades">Abrir</button></div>
      <div class="config-item">${icon('kanban')}<div><strong>Colunas do Kanban</strong><small>Títulos, cores e status de cada coluna do quadro.</small></div><button class="btn btn-secondary" data-goto="kanban">Abrir</button></div>
      <div class="config-item">${icon('school')}<div><strong>Unidades Escolares</strong><small>Cadastro, ativação e exclusão de unidades.</small></div><button class="btn btn-secondary" data-goto="escolas">Abrir</button></div>
      <div class="config-item">${icon('user')}<div><strong>Perfis de acesso</strong><small>Crie perfis personalizados com permissões próprias.</small></div><button class="btn btn-secondary" data-goto="perfis">Abrir</button></div>
      <div class="config-item">${icon('user')}<div><strong>Usuários</strong><small>Cadastro, perfil e situação de cada usuário.</small></div><button class="btn btn-secondary" data-goto="usuarios">Abrir</button></div>
    </div></div></section>`;
    $$('[data-goto]', body).forEach(b => b.addEventListener('click', () => { $(`[data-atab="${b.dataset.goto}"]`)?.click(); }));
  }

  async function renderAdminCategorias(body) {
    const rows = await api('/api/admin/categories');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Categorias</h2><p>Ícone, cor e texto de apoio exibidos ao registrar uma demanda.</p></div><button class="btn btn-primary" id="newCategory">${icon('plus')}Nova categoria</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Categoria</th><th>Ícone</th><th>Cor</th><th>Texto de apoio</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.length ? rows.map(c => `<tr class="${c.active ? '' : 'row-inactive'}"><td><strong>${esc(c.name)}</strong></td><td>${icon(c.icon)}</td><td><span class="color-dot" style="background:var(--${c.color})"></span>${esc(c.color)}</td><td>${esc(c.hint || '—')}</td><td>${statePill(!!c.active, 'Ativa', 'Inativa')}</td><td class="row-actions"><button class="icon-btn" data-edit="${c.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-del="${c.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button></td></tr>`).join('') : `<tr><td colspan="6">${empty('Nenhuma categoria cadastrada')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newCategory').addEventListener('click', () => openCategoryForm(null, body));
    $$('[data-edit]', body).forEach(b => b.addEventListener('click', () => openCategoryForm(rows.find(r => r.id === Number(b.dataset.edit)), body)));
    $$('[data-del]', body).forEach(b => b.addEventListener('click', async () => {
      const c = rows.find(r => r.id === Number(b.dataset.del));
      const ok = await confirmAction('Excluir categoria', `Tem certeza de que deseja excluir "${c.name}"? Esta ação não pode ser desfeita.`, { confirmLabel: 'Excluir' });
      if (!ok) return;
      try { await api(`/api/admin/categories/${c.id}`, { method: 'DELETE' }); toast('Categoria excluída'); renderAdminCategorias(body); }
      catch (e) { toast('Não foi possível excluir', e.message, 'error'); }
    }));
  }

  function openCategoryForm(cat, body) {
    const editing = !!cat;
    let selIcon = cat?.icon || 'wrench';
    let selColor = cat?.color || 'blue';
    modal({
      title: editing ? 'Editar categoria' : 'Nova categoria', mode: 'drawer', body: `<form id="categoryForm"><div class="form-grid">
      <div class="field span-2"><label>Nome *</label><input class="input" name="name" required maxlength="60" value="${esc(cat?.name || '')}"></div>
      <div class="field span-2"><label>Texto de apoio</label><input class="input" name="hint" maxlength="140" value="${esc(cat?.hint || '')}" placeholder="Ex.: Fiação, tomada, quadro de força..."></div>
      <div class="field span-2"><label>Ícone</label><div class="icon-picker" id="iconPicker">${ADMIN_ICON_SET.map(i => `<button type="button" class="icon-pick ${i === selIcon ? 'active' : ''}" data-icon="${i}" data-tooltip="${i}" aria-label="${i}">${icon(i)}</button>`).join('')}</div></div>
      <div class="field span-2"><label>Cor</label><div class="color-picker" id="colorPicker">${ADMIN_COLOR_SET.map(([v, l]) => `<button type="button" class="color-pick ${v === selColor ? 'active' : ''}" data-color="${v}" data-tooltip="${l}" style="background:var(--${v})" aria-label="${l}"></button>`).join('')}</div></div>
      ${editing ? `<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${cat.active ? 'checked' : ''}> Categoria ativa</label></div>` : ''}
    </div></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveCategory">${editing ? 'Salvar' : 'Criar categoria'}</button>`,
      onOpen() {
        $$('#iconPicker [data-icon]').forEach(b => b.addEventListener('click', () => { selIcon = b.dataset.icon; $$('#iconPicker [data-icon]').forEach(x => x.classList.toggle('active', x === b)); }));
        $$('#colorPicker [data-color]').forEach(b => b.addEventListener('click', () => { selColor = b.dataset.color; $$('#colorPicker [data-color]').forEach(x => x.classList.toggle('active', x === b)); }));
        $('#saveCategory').addEventListener('click', async () => {
          const f = $('#categoryForm'); if (!f.reportValidity()) return;
          const payload = Object.fromEntries(new FormData(f).entries());
          payload.icon = selIcon; payload.color = selColor;
          if (editing) payload.active = f.elements['active'] ? f.elements['active'].checked : true;
          try {
            if (editing) await api(`/api/admin/categories/${cat.id}`, { method: 'PUT', body: payload });
            else await api('/api/admin/categories', { method: 'POST', body: payload });
            closeModal(); toast(editing ? 'Categoria atualizada' : 'Categoria criada'); renderAdminCategorias(body);
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  async function renderAdminPrioridades(body) {
    const rows = await api('/api/admin/priorities');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Prioridades</h2><p>Rótulo e orientação exibidos para cada nível de prioridade. Os códigos P1–P4 são fixos.</p></div></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Rótulo</th><th>Orientação</th><th>Ações</th></tr></thead><tbody>
      ${rows.map(p => `<tr><td><span class="badge ${p.code}">${p.code}</span></td><td><strong>${esc(p.label)}</strong></td><td>${esc(p.hint || '—')}</td><td class="row-actions"><button class="icon-btn" data-edit="${p.code}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button></td></tr>`).join('')}
      </tbody></table></div>
    </div></section>`;
    $$('[data-edit]', body).forEach(b => b.addEventListener('click', () => openPriorityForm(rows.find(r => r.code === b.dataset.edit), body)));
  }

  function openPriorityForm(p, body) {
    modal({
      title: `Editar prioridade ${p.code}`, mode: 'center', body: `<form id="priorityForm"><div class="form-grid">
      <div class="field span-2"><label>Rótulo *</label><input class="input" name="label" required maxlength="60" value="${esc(p.label)}"></div>
      <div class="field span-2"><label>Orientação</label><textarea class="textarea" name="hint" maxlength="200">${esc(p.hint || '')}</textarea></div>
    </div></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="savePriority">Salvar</button>`,
      onOpen() {
        $('#savePriority').addEventListener('click', async () => {
          const f = $('#priorityForm'); if (!f.reportValidity()) return;
          const payload = Object.fromEntries(new FormData(f).entries());
          try { await api(`/api/admin/priorities/${p.code}`, { method: 'PUT', body: payload }); closeModal(); toast('Prioridade atualizada'); renderAdminPrioridades(body); }
          catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  async function renderAdminKanban(body) {
    const rows = await api('/api/admin/kanban-stages');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Colunas do Kanban</h2><p>Título, cor e status agrupados em cada coluna do quadro.</p></div><button class="btn btn-primary" id="newStage">${icon('plus')}Nova coluna</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Coluna</th><th>Cor</th><th>Status incluídos</th><th>Status padrão</th><th>Ações</th></tr></thead><tbody>
      ${rows.length ? rows.map(s => `<tr><td><strong>${esc(s.label)}</strong>${s.hint ? `<small>${esc(s.hint)}</small>` : ''}</td><td><span class="color-dot" style="background:var(--${s.accent})"></span>${esc(s.accent)}</td><td>${s.statuses.map(x => `<span class="badge P4">${esc(x)}</span>`).join(' ')}</td><td>${esc(s.target_status)}</td><td class="row-actions"><button class="icon-btn" data-edit="${s.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-del="${s.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button></td></tr>`).join('') : `<tr><td colspan="5">${empty('Nenhuma coluna cadastrada')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newStage').addEventListener('click', () => openStageForm(null, body, rows));
    $$('[data-edit]', body).forEach(b => b.addEventListener('click', () => openStageForm(rows.find(r => r.id === Number(b.dataset.edit)), body, rows)));
    $$('[data-del]', body).forEach(b => b.addEventListener('click', async () => {
      const s = rows.find(r => r.id === Number(b.dataset.del));
      const ok = await confirmAction('Excluir coluna', `Excluir a coluna "${s.label}"? Só é possível quando ela não tiver nenhum status vinculado.`, { confirmLabel: 'Excluir' });
      if (!ok) return;
      try { await api(`/api/admin/kanban-stages/${s.id}`, { method: 'DELETE' }); toast('Coluna excluída'); renderAdminKanban(body); }
      catch (e) { toast('Não foi possível excluir', e.message, 'error'); }
    }));
  }

  function openStageForm(stage, body, allStages) {
    const editing = !!stage;
    let selColor = stage?.accent || 'blue';
    let selStatuses = new Set(stage?.statuses || []);
    const usedElsewhere = new Set();
    allStages.filter(s => !editing || s.id !== stage.id).forEach(s => s.statuses.forEach(x => usedElsewhere.add(x)));
    modal({
      title: editing ? 'Editar coluna' : 'Nova coluna', mode: 'drawer', body: `<form id="stageForm"><div class="form-grid">
      <div class="field span-2"><label>Título *</label><input class="input" name="label" required maxlength="60" value="${esc(stage?.label || '')}"></div>
      <div class="field span-2"><label>Descrição curta</label><input class="input" name="hint" maxlength="140" value="${esc(stage?.hint || '')}"></div>
      <div class="field span-2"><label>Cor</label><div class="color-picker" id="stageColorPicker">${ADMIN_COLOR_SET.map(([v, l]) => `<button type="button" class="color-pick ${v === selColor ? 'active' : ''}" data-color="${v}" data-tooltip="${l}" style="background:var(--${v})" aria-label="${l}"></button>`).join('')}</div></div>
      <div class="field span-2"><label>Status incluídos nesta coluna *</label><div class="check-grid" id="statusPicker">${ctx.statuses.map(st => `<label class="check ${usedElsewhere.has(st) ? 'check-disabled' : ''}"><input type="checkbox" value="${esc(st)}" ${selStatuses.has(st) ? 'checked' : ''} ${usedElsewhere.has(st) ? 'disabled' : ''}> ${esc(st)}${usedElsewhere.has(st) ? ' (em outra coluna)' : ''}</label>`).join('')}</div></div>
      <div class="field span-2"><label>Status padrão ao mover um cartão para cá</label><select class="select" id="targetStatus"></select></div>
    </div></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveStage">${editing ? 'Salvar' : 'Criar coluna'}</button>`,
      onOpen() {
        $$('#stageColorPicker [data-color]').forEach(b => b.addEventListener('click', () => { selColor = b.dataset.color; $$('#stageColorPicker [data-color]').forEach(x => x.classList.toggle('active', x === b)); }));
        const refreshTarget = () => { const sel = $('#targetStatus'); sel.innerHTML = [...selStatuses].map(s => `<option ${stage && s === stage.target_status ? 'selected' : ''}>${esc(s)}</option>`).join('') || '<option value="">Selecione ao menos um status</option>'; };
        refreshTarget();
        $$('#statusPicker input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => { if (cb.checked) selStatuses.add(cb.value); else selStatuses.delete(cb.value); refreshTarget(); }));
        $('#saveStage').addEventListener('click', async () => {
          const f = $('#stageForm'); if (!f.reportValidity()) return;
          if (!selStatuses.size) { toast('Selecione ao menos um status', '', 'error'); return; }
          const payload = { label: f.elements.label.value, hint: f.elements.hint.value, accent: selColor, statuses: [...selStatuses], target_status: $('#targetStatus').value || [...selStatuses][0] };
          try {
            if (editing) await api(`/api/admin/kanban-stages/${stage.id}`, { method: 'PUT', body: payload });
            else await api('/api/admin/kanban-stages', { method: 'POST', body: payload });
            closeModal(); toast(editing ? 'Coluna atualizada' : 'Coluna criada'); renderAdminKanban(body);
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  async function renderAdminEscolas(body) {
    const rows = await api('/api/schools?include_inactive=1');
    let q = '';

    function getFiltered() {
      return rows.filter(s => {
        if (!q) return true;
        const low = q.toLowerCase();
        return (
          (s.name || '').toLowerCase().includes(low) ||
          (s.inep || s.code || '').toLowerCase().includes(low) ||
          (s.neighborhood || '').toLowerCase().includes(low) ||
          (s.director || '').toLowerCase().includes(low) ||
          (s.address || '').toLowerCase().includes(low)
        );
      });
    }

    function renderRows(filtered) {
      return filtered.length ? filtered.map(s => `
        <tr class="${s.active ? '' : 'row-inactive'}">
          <td>
            <strong>${esc(s.name)}</strong>
            <div style="display:flex;gap:6px;margin-top:3px">
              <span class="badge P4" style="font-family:var(--font-mono)">INEP: ${esc(s.inep || s.code || '—')}</span>
              ${s.maps_link ? `<a href="${esc(s.maps_link)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);display:inline-flex;align-items:center;gap:2px;font-size:11px" title="Ver no Google Maps">${icon('globe')} Mapa ↗</a>` : ''}
            </div>
          </td>
          <td>
            <span class="badge" style="background:var(--blue-soft);color:var(--blue)">${esc(s.school_type || 'Escola')}</span>
            <small style="display:block;margin-top:3px;color:var(--muted)">${esc(s.modality || 'Regular')}</small>
          </td>
          <td>
            <strong>${esc(s.neighborhood || 'Itaguaí')}</strong>
            <small style="display:block;margin-top:2px;color:var(--muted);max-width:260px" title="${esc(s.address || '')}">${esc(s.address || '—')}</small>
          </td>
          <td>
            <strong>${esc(s.director || '—')}</strong>
            <small style="display:block;margin-top:2px;color:var(--muted)">${esc(s.phone || '—')}${s.ramal ? ` (R. ${s.ramal})` : ''}</small>
            ${s.email ? `<small style="display:block;color:var(--primary)">${esc(s.email)}</small>` : ''}
          </td>
          <td>${statePill(!!s.active)}</td>
          <td class="row-actions">
            <button class="icon-btn" data-edit="${s.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button>
            <button class="icon-btn" data-toggle="${s.id}" data-tooltip="${s.active ? 'Desativar' : 'Ativar'}" aria-label="${s.active ? 'Desativar' : 'Ativar'}">${icon(s.active ? 'x' : 'check-circle')}</button>
            <button class="icon-btn" data-del="${s.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button>
          </td>
        </tr>
      `).join('') : `<tr><td colspan="6">${empty('Nenhuma unidade encontrada')}</td></tr>`;
    }

    function bindRowEvents() {
      $$('[data-edit]', body).forEach(b => b.addEventListener('click', () => openSchoolForm(rows.find(r => r.id === Number(b.dataset.edit)), body)));
      $$('[data-toggle]', body).forEach(b => b.addEventListener('click', async () => {
        const s = rows.find(r => r.id === Number(b.dataset.toggle));
        try {
          const res = await api(`/api/admin/schools/${s.id}/toggle-active`, { method: 'POST' });
          toast(res.active ? 'Unidade ativada' : 'Unidade desativada');
          schoolsCache = null;
          renderAdminEscolas(body);
        } catch (e) { toast('Não foi possível atualizar', e.message, 'error'); }
      }));
      $$('[data-del]', body).forEach(b => b.addEventListener('click', async () => {
        const s = rows.find(r => r.id === Number(b.dataset.del));
        const ok = await confirmAction('Excluir unidade', `Excluir "${s.name}"? Só é possível quando não houver demandas ou usuários vinculados a ela.`, { confirmLabel: 'Excluir' });
        if (!ok) return;
        try {
          await api(`/api/admin/schools/${s.id}`, { method: 'DELETE' });
          toast('Unidade excluída');
          schoolsCache = null;
          renderAdminEscolas(body);
        } catch (e) { toast('Não foi possível excluir', e.message, 'error'); }
      }));
    }

    // O cabeçalho (com o campo de busca) é montado uma única vez; só o <tbody> é
    // re-renderizado a cada tecla digitada, para o input nunca perder o foco
    // (recriar o próprio campo de busca a cada tecla fazia os atalhos de teclado
    // globais capturarem a tecla seguinte e navegarem para outra tela).
    body.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Unidades Escolares (${rows.length})</h2>
            <p>Cadastro oficial, georreferenciamento, contatos institucionais e gestão de unidades.</p>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <input type="search" id="adminSchoolSearch" class="input" placeholder="Buscar por nome, INEP ou bairro..." value="${esc(q)}" style="min-width:240px;height:38px">
            <button class="btn btn-primary" id="newSchool">${icon('plus')}Nova unidade</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Unidade Escolar / INEP</th>
                  <th>Tipo & Modalidade</th>
                  <th>Bairro & Endereço</th>
                  <th>Direção & Contato</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="adminSchoolsBody">${renderRows(getFiltered())}</tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    bindRowEvents();

    $('#adminSchoolSearch')?.addEventListener('input', (e) => {
      q = e.target.value;
      const tbody = $('#adminSchoolsBody');
      if (tbody) tbody.innerHTML = renderRows(getFiltered());
      bindRowEvents();
    });

    $('#newSchool')?.addEventListener('click', () => openSchoolForm(null, body));
  }

  function openSchoolForm(school, body) {
    const editing = !!school;
    modal({
      title: editing ? 'Editar Unidade Escolar' : 'Nova Unidade Escolar',
      subtitle: editing ? school.name : 'Cadastro completo da rede municipal de Itaguaí',
      mode: 'drawer',
      body: `<form id="schoolForm">
        <div class="form-grid">
          <!-- SEÇÃO 1: IDENTIFICAÇÃO -->
          <div class="field span-2"><strong style="color:var(--ink);font-size:14px;display:flex;align-items:center;gap:6px">${icon('school')} Identificação Básica</strong></div>
          <div class="field span-2"><label>Nome da Unidade Escolar *</label><input class="input" name="name" required maxlength="160" placeholder="Ex: E. M. Prefeito Otoni Rocha" value="${esc(school?.name || '')}"></div>
          <div class="field"><label>Código INEP</label><input class="input" name="inep" maxlength="30" placeholder="Ex: 33158711" value="${esc(school?.inep || school?.code || '')}"></div>
          <div class="field"><label>Tipo de Unidade</label>
            <select class="select" name="school_type">
              <option value="Escola" ${school?.school_type === 'Escola' ? 'selected' : ''}>Escola</option>
              <option value="Creche" ${school?.school_type === 'Creche' ? 'selected' : ''}>Creche</option>
              <option value="CIEP" ${school?.school_type === 'CIEP' ? 'selected' : ''}>CIEP</option>
              <option value="CEMAEE" ${school?.school_type === 'CEMAEE' ? 'selected' : ''}>CEMAEE</option>
              <option value="Outro" ${school?.school_type === 'Outro' ? 'selected' : ''}>Outro</option>
            </select>
          </div>
          <div class="field span-2"><label>Modalidade de Ensino</label><input class="input" name="modality" maxlength="120" placeholder="Ex: Pré ao 9º Ano, Berçário NI e NII, etc." value="${esc(school?.modality || '')}"></div>

          <!-- SEÇÃO 2: GESTÃO & CONTATOS -->
          <div class="field span-2 mt-12"><strong style="color:var(--ink);font-size:14px;display:flex;align-items:center;gap:6px">${icon('user')} Gestão e Contatos</strong></div>
          <div class="field span-2"><label>Nome do(a) Diretor(a)</label><input class="input" name="director" maxlength="140" placeholder="Ex: Tania Maria da Silva Medeiros" value="${esc(school?.director || '')}"></div>
          <div class="field"><label>E-mail Institucional</label><input class="input" type="email" name="email" maxlength="140" placeholder="escola@edu.itaguai.rj.gov.br" value="${esc(school?.email || '')}"></div>
          <div class="field"><label>Telefone</label><input class="input" name="phone" maxlength="50" placeholder="(21) 3782-9000" value="${esc(school?.phone || '')}"></div>
          <div class="field"><label>Ramal Interno</label><input class="input" name="ramal" maxlength="20" placeholder="Ex: 3070" value="${esc(school?.ramal || '')}"></div>
          <div class="field"><label>Link Google Maps</label><input class="input" type="url" name="maps_link" maxlength="255" placeholder="https://maps.app.goo.gl/..." value="${esc(school?.maps_link || '')}"></div>

          <!-- SEÇÃO 3: ENDEREÇO & GEORREFERENCIAMENTO -->
          <div class="field span-2 mt-12"><strong style="color:var(--ink);font-size:14px;display:flex;align-items:center;gap:6px">${icon('building')} Endereço e Localização</strong></div>
          <div class="field span-2"><label>Logradouro / Rua</label><input class="input" name="street" maxlength="160" placeholder="Ex: Rua José Bonifácio" value="${esc(school?.street || '')}"></div>
          <div class="field"><label>Número</label><input class="input" name="number" maxlength="30" placeholder="s/n ou nº" value="${esc(school?.number || 's/n')}"></div>
          <div class="field"><label>Complemento</label><input class="input" name="complement" maxlength="80" placeholder="Ex: Qd. 39, Lote 12" value="${esc(school?.complement || '')}"></div>
          <div class="field"><label>Bairro / Região</label><input class="input" name="neighborhood" maxlength="80" placeholder="Ex: Centro, Brisamar, etc." value="${esc(school?.neighborhood || '')}"></div>
          <div class="field"><label>CEP</label><input class="input" name="cep" maxlength="20" placeholder="23815-650" value="${esc(school?.cep || '')}"></div>
          <div class="field"><label>Município</label><input class="input" name="city" maxlength="60" value="${esc(school?.city || 'Itaguaí')}"></div>
          <div class="field"><label>Estado (UF)</label><input class="input" name="state" maxlength="10" value="${esc(school?.state || 'RJ')}"></div>
          
          <div class="field"><label>Latitude Decimal</label><input class="input" name="latitude" maxlength="30" placeholder="-22.868685" value="${esc(school?.lat ?? school?.latitude ?? '')}"></div>
          <div class="field"><label>Longitude Decimal</label><input class="input" name="longitude" maxlength="30" placeholder="-43.788898" value="${esc(school?.lon ?? school?.longitude ?? '')}"></div>
          
          <div class="field span-2"><label>Endereço Completo Formatado</label><input class="input" name="full_address" maxlength="240" placeholder="Deixe em branco para gerar automaticamente" value="${esc(school?.address || school?.full_address || '')}"></div>
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveSchool">${editing ? 'Salvar Alterações' : 'Cadastrar Unidade'}</button>`,
      onOpen() {
        $('#saveSchool').addEventListener('click', async () => {
          const f = $('#schoolForm'); if (!f.reportValidity()) return;
          const payload = Object.fromEntries(new FormData(f).entries());
          payload.code = payload.inep;
          payload.lat = payload.latitude ? parseFloat(payload.latitude) : null;
          payload.lon = payload.longitude ? parseFloat(payload.longitude) : null;
          try {
            if (editing) await api(`/api/admin/schools/${school.id}`, { method: 'PUT', body: payload });
            else await api('/api/admin/schools', { method: 'POST', body: payload });
            closeModal(); 
            toast(editing ? 'Unidade atualizada com sucesso' : 'Unidade cadastrada com sucesso'); 
            schoolsCache = null; 
            renderAdminEscolas(body);
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  async function renderAdminPerfis(body) {
    const rows = await api('/api/admin/profiles');
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Perfis de Acesso</h2><p>Crie perfis personalizados combinando as permissões abaixo, ou ajuste os perfis padrão do sistema.</p></div><button class="btn btn-primary" id="newProfile">${icon('plus')}Novo perfil</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Perfil</th><th>Escopo</th><th>Permissões</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.map(p => `<tr class="${p.active ? '' : 'row-inactive'}"><td><strong>${esc(p.label)}</strong><small>${esc(p.slug)}${p.is_system ? ' · perfil do sistema' : ''}</small></td><td>${p.school_scoped ? 'Restrito à própria escola' : 'Visão da rede'}</td><td>${[p.can_edit_analysis ? 'Análise técnica' : null, p.can_manage_admin ? 'Administração' : null, p.can_view_reports ? 'Relatórios' : null, p.can_view_planning ? 'Planejamento' : null].filter(Boolean).map(x => `<span class="badge P4">${x}</span>`).join(' ') || '—'}</td><td>${statePill(!!p.active)}</td><td class="row-actions"><button class="icon-btn" data-edit="${p.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button>${p.is_system ? '' : `<button class="icon-btn" data-del="${p.id}" data-tooltip="Excluir" aria-label="Excluir">${icon('x')}</button>`}</td></tr>`).join('')}
      </tbody></table></div>
    </div></section>`;
    $('#newProfile').addEventListener('click', () => openProfileForm(null, body));
    $$('[data-edit]', body).forEach(b => b.addEventListener('click', () => openProfileForm(rows.find(r => r.id === Number(b.dataset.edit)), body)));
    $$('[data-del]', body).forEach(b => b.addEventListener('click', async () => {
      const p = rows.find(r => r.id === Number(b.dataset.del));
      const ok = await confirmAction('Excluir perfil', `Excluir o perfil "${p.label}"? Só é possível quando nenhum usuário estiver com esse perfil.`, { confirmLabel: 'Excluir' });
      if (!ok) return;
      try { await api(`/api/admin/profiles/${p.id}`, { method: 'DELETE' }); toast('Perfil excluído'); renderAdminPerfis(body); }
      catch (e) { toast('Não foi possível excluir', e.message, 'error'); }
    }));
  }

  function openProfileForm(profile, body) {
    const editing = !!profile;
    modal({
      title: editing ? `Editar perfil${profile.is_system ? ' do sistema' : ''}` : 'Novo perfil de acesso', mode: 'drawer', body: `<form id="profileForm"><div class="form-grid">
      <div class="field span-2"><label>Nome do perfil *</label><input class="input" name="label" required maxlength="60" value="${esc(profile?.label || '')}"></div>
      <div class="field span-2"><label>Descrição</label><input class="input" name="description" maxlength="200" value="${esc(profile?.description || '')}"></div>
      <div class="field span-2"><label>Permissões</label><div class="check-grid">
        <label class="check"><input type="checkbox" name="school_scoped" ${profile?.school_scoped ? 'checked' : ''}> Restrito à própria unidade escolar</label>
        <label class="check"><input type="checkbox" name="can_edit_analysis" ${profile?.can_edit_analysis ?? true ? 'checked' : ''}> Pode editar a análise técnica</label>
        <label class="check"><input type="checkbox" name="can_manage_admin" ${profile?.can_manage_admin ? 'checked' : ''}> Acesso à Administração</label>
        <label class="check"><input type="checkbox" name="can_view_reports" ${profile?.can_view_reports ?? true ? 'checked' : ''}> Acesso a Relatórios</label>
        <label class="check"><input type="checkbox" name="can_view_planning" ${profile?.can_view_planning ?? true ? 'checked' : ''}> Acesso ao Planejamento Futuro</label>
      </div></div>
      ${editing ? `<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${profile.active ? 'checked' : ''}> Perfil ativo</label></div>` : ''}
    </div></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveProfile">${editing ? 'Salvar' : 'Criar perfil'}</button>`,
      onOpen() {
        $('#saveProfile').addEventListener('click', async () => {
          const f = $('#profileForm'); if (!f.reportValidity()) return;
          const payload = Object.fromEntries(new FormData(f).entries());
          ['school_scoped', 'can_edit_analysis', 'can_manage_admin', 'can_view_reports', 'can_view_planning'].forEach(k => payload[k] = f.elements[k].checked);
          if (editing) payload.active = f.elements.active.checked;
          try {
            if (editing) await api(`/api/admin/profiles/${profile.id}`, { method: 'PUT', body: payload });
            else await api('/api/admin/profiles', { method: 'POST', body: payload });
            closeModal(); toast(editing ? 'Perfil atualizado' : 'Perfil criado'); renderAdminPerfis(body);
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  async function renderAdminUsuarios(body) {
    const [rows, profiles] = await Promise.all([api('/api/admin/users'), api('/api/admin/profiles')]);
    const schools = await loadSchools();
    body.innerHTML = `<section class="panel"><div class="panel-header"><div><h2>Usuários</h2><p>Cadastro, perfil de acesso e situação de cada usuário do sistema.</p></div><button class="btn btn-primary" id="newUser">${icon('plus')}Novo usuário</button></div><div class="panel-body">
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Unidade Escolar</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${rows.length ? rows.map(u => `<tr class="${u.active ? '' : 'row-inactive'}"><td><strong>${esc(u.name)}</strong>${u.id === ctx.user.id ? ' <small>(você)</small>' : ''}</td><td>${esc(u.email)}</td><td>${esc(u.profile_label || u.role)}</td><td>${esc(u.school_name || '—')}</td><td>${statePill(!!u.active)}</td><td class="row-actions"><button class="icon-btn" data-edit="${u.id}" data-tooltip="Editar" aria-label="Editar">${icon('edit')}</button></td></tr>`).join('') : `<tr><td colspan="6">${empty('Nenhum usuário cadastrado')}</td></tr>`}
      </tbody></table></div>
    </div></section>`;
    $('#newUser').addEventListener('click', () => openUserForm(null, body, profiles, schools));
    $$('[data-edit]', body).forEach(b => b.addEventListener('click', () => openUserForm(rows.find(r => r.id === Number(b.dataset.edit)), body, profiles, schools)));
  }

  function openUserForm(user, body, profiles, schools) {
    const editing = !!user;
    const isSelf = editing && user.id === ctx.user.id;
    modal({
      title: editing ? 'Editar usuário' : 'Novo usuário', mode: 'drawer', body: `<form id="userForm"><div class="form-grid">
      <div class="field span-2"><label>Nome *</label><input class="input" name="name" required maxlength="140" value="${esc(user?.name || '')}"></div>
      <div class="field span-2"><label>E-mail *</label><input class="input" type="email" name="email" required maxlength="140" value="${esc(user?.email || '')}"></div>
      <div class="field span-2"><label>${editing ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}</label><input class="input" type="password" name="password" ${editing ? '' : 'required'} minlength="4" autocomplete="new-password"></div>
      <div class="field span-2"><label>Perfil de acesso *</label><select class="select" name="role" id="userRoleField" required>${profiles.filter(p => p.active || p.slug === user?.role).map(p => `<option value="${p.slug}" ${p.slug === user?.role ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>
      <div class="field span-2" id="userSchoolWrap"></div>
      ${editing ? `<div class="field span-2"><label class="check"><input type="checkbox" name="active" ${user.active ? 'checked' : ''} ${isSelf ? 'disabled' : ''}> Usuário ativo</label>${isSelf ? '<small>Você não pode desativar seu próprio usuário.</small>' : ''}</div>` : ''}
    </div></form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="saveUser">${editing ? 'Salvar' : 'Criar usuário'}</button>`,
      onOpen() {
        const updateSchoolField = () => {
          const p = profiles.find(x => x.slug === $('#userRoleField').value);
          const wrap = $('#userSchoolWrap');
          if (p?.school_scoped) {
            wrap.innerHTML = `<label>Unidade Escolar *</label><select class="select" name="school_id" required data-search data-search-placeholder="Buscar escola pelo nome..."><option value="">Selecione...</option>${schools.map(s => `<option value="${s.id}" ${Number(user?.school_id) === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
          } else {
            wrap.innerHTML = '';
          }
        };
        updateSchoolField();
        $('#userRoleField').addEventListener('change', updateSchoolField);
        $('#saveUser').addEventListener('click', async () => {
          const f = $('#userForm'); if (!f.reportValidity()) return;
          const payload = Object.fromEntries(new FormData(f).entries());
          if (!payload.password) delete payload.password;
          if (!payload.school_id) delete payload.school_id; else payload.school_id = Number(payload.school_id);
          if (editing) payload.active = isSelf ? true : f.elements.active.checked;
          try {
            if (editing) await api(`/api/admin/users/${user.id}`, { method: 'PUT', body: payload });
            else await api('/api/admin/users', { method: 'POST', body: payload });
            closeModal(); toast(editing ? 'Usuário atualizado' : 'Usuário criado'); renderAdminUsuarios(body);
          } catch (e) { toast('Não foi possível salvar', e.message, 'error'); }
        });
      }
    });
  }

  async function renderAdminLogs(body) {
    let logs = [];
    let total = 0;
    let offset = 0;
    const limit = 50;

    async function loadLogs() {
      const result = await api(`/api/admin/logs?limit=${limit}&offset=${offset}`);
      logs = result.logs || [];
      total = result.total || 0;
      render();
    }

    function render() {
      body.innerHTML = `
        <div style="margin-bottom:20px">
          <h3>Logs do Sistema</h3>
          <p>Histórico de ações realizadas no sistema</p>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th data-label="Data/Hora">Data/Hora</th>
                <th data-label="Usuário">Usuário</th>
                <th data-label="Ação">Ação</th>
                <th data-label="Tipo">Tipo</th>
                <th data-label="ID">ID da Entidade</th>
                <th data-label="Detalhes">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length ? logs.map(l => `
                <tr>
                  <td data-label="Data/Hora" style="font-size:12px">${new Date(l.created_at).toLocaleString('pt-BR')}</td>
                  <td data-label="Usuário"><strong>${esc(l.user_name || 'Sistema')}</strong></td>
                  <td data-label="Ação"><span class="badge">${esc(l.action)}</span></td>
                  <td data-label="Tipo">${l.entity_type ? esc(l.entity_type) : '-'}</td>
                  <td data-label="ID" class="mono">${l.entity_id ? esc(l.entity_id) : '-'}</td>
                  <td data-label="Detalhes" style="font-size:12px;max-width:300px;overflow:hidden;text-overflow:ellipsis">${l.details ? esc(l.details) : '-'}</td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align:center;padding:20px">Nenhum log encontrado</td></tr>`}
            </tbody>
          </table>
        </div>
        ${total > limit ? `
          <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;align-items:center">
            <button class="btn btn-secondary" id="prevLogs" ${offset === 0 ? 'disabled' : ''}>${icon('arrow')}Anterior</button>
            <span>Página ${Math.floor(offset / limit) + 1} de ${Math.ceil(total / limit)} (${total} total)</span>
            <button class="btn btn-secondary" id="nextLogs" ${offset + limit >= total ? 'disabled' : ''}>Próxima${icon('arrow')}</button>
          </div>
        ` : ''}
      `;

      $('#prevLogs')?.addEventListener('click', () => {
        offset = Math.max(0, offset - limit);
        loadLogs();
      });

      $('#nextLogs')?.addEventListener('click', () => {
        offset += limit;
        loadLogs();
      });
    }

    await loadLogs();
  }

  async function renderAbout() {
    setLoading();
    const a = await api('/api/about');
    const roleIcons = { gestor: 'settings', escola: 'school', planejamento: 'calendar' };
    const roleLabel = { gestor: 'Gestor', escola: 'Unidade Escolar', planejamento: 'Planejamento' };
    content.innerHTML = `${pageHeader('Sobre o Sistema', 'Versão, tecnologia, perfis de acesso e roteiro de evolução da Agenda Integrada.',
      `<span class="badge P4" data-tooltip="Versão da aplicação">v${esc(a.version)}</span><span class="badge P3" data-tooltip="Identidade visual em uso">${esc(a.visual_version)}</span>`)}
      <div class="content-grid">
        <div>
          <section class="info-card accent">
            <h3 data-tooltip="Para que este sistema existe">${icon('info')}O que é a Agenda Integrada</h3>
            <p>A Agenda Integrada centraliza as demandas de infraestrutura das Unidades Escolares da ${esc(a.organization)}, do registro pela escola até a devolutiva técnica, execução e planejamento de exercícios futuros. O objetivo é dar clareza sobre prioridades, rastreabilidade sobre decisões e visibilidade sobre prazos e custos.</p>
          </section>
          <section class="panel mt-16">
            <div class="panel-header"><div><h2 data-tooltip="Quem acessa o sistema e o que cada perfil pode fazer">Perfis de acesso</h2><p>Cada perfil enxerga e movimenta o fluxo de um jeito diferente.</p></div></div>
            <div class="panel-body"><div class="config-list">${a.roles.map(r => `<div class="config-item" data-tooltip="${esc(r.description)}">${icon(roleIcons[r.role] || 'user')}<div><strong>${esc(roleLabel[r.role] || r.role)}</strong><small>${esc(r.description)}</small></div></div>`).join('')}</div></div>
          </section>
          <section class="panel mt-16">
            <div class="panel-header"><div><h2>Roteiro para produção</h2><p>Antes do uso institucional em larga escala, recomenda-se:</p></div></div>
            <div class="panel-body"><div class="check-grid">${[
        ['Banco corporativo', 'Substituir SQLite por PostgreSQL ou banco corporativo.'],
        ['Segurança de sessão', 'Alterar a chave AGENDA_SECRET e as credenciais demonstrativas.'],
        ['HTTPS', 'Configurar certificado e tráfego criptografado.'],
        ['Backup', 'Definir política de backup do banco e dos anexos.'],
        ['Autenticação institucional', 'Integrar login único (Gov.br ou SSO), se houver.'],
        ['Permissões (RBAC)', 'Revisar perfis conforme a estrutura real da Secretaria.'],
        ['Armazenamento de anexos', 'Configurar armazenamento persistente e seguro.'],
        ['Auditoria', 'Registrar IP e trilha de auditoria conforme normas do ambiente.'],
      ].map(x => `<div class="check" data-tooltip="${esc(x[1])}" style="cursor:default">${icon('arrow')}<span>${esc(x[0])}</span></div>`).join('')}</div></div>
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
    $('#aboutHelp')?.addEventListener('click', openShortcutsHelp);
  }

  // ============================================================
  // QUADRO KANBAN — visão por etapa ou por prioridade, com
  // arrastar-e-soltar para mudar o andamento das demandas.
  // ============================================================
  const STAGE_GROUPS = (ctx.kanbanStages || []).map(s => ({ key: s.stage_key, label: s.label, hint: s.hint || '', accent: s.accent || 'blue', statuses: s.statuses || [], target: s.target_status }));
  const STATUS_TO_STAGE = {};
  STAGE_GROUPS.forEach(g => g.statuses.forEach(s => STATUS_TO_STAGE[s] = g.key));
  const stageKeyForStatus = s => STATUS_TO_STAGE[s] || (STAGE_GROUPS[0] && STAGE_GROUPS[0].key) || 'aguardando';
  const PRIORITY_GROUPS = ['P1', 'P2', 'P3', 'P4'].map(p => ({ key: p, label: `${p} · ${priorityLabel(p)}`, hint: URGENCY_CHOICES.find(u => u.value === p)?.hint || '', accent: { P1: 'red', P2: 'orange', P3: 'blue', P4: 'green' }[p], target: p }));

  function kanbanCard(d) {
    const due = dueInfo(d);
    const canEdit = ctx.user.perm.can_edit_analysis;
    return `<article class="kanban-card" ${canEdit ? 'draggable="true"' : ''} tabindex="0" role="button" data-id="${d.id}" aria-label="Abrir demanda ${esc(d.code)} — ${esc(d.title)}">
      <div class="kc-top">
        <span class="badge ${d.priority}">${d.priority}</span>
        ${due.cls ? `<span class="deadline ${due.cls}" data-tooltip="Prazo">${esc(due.text)}</span>` : ''}
        ${canEdit ? `<button type="button" class="kc-edit" data-edit data-tooltip="Editar análise técnica" aria-label="Editar análise técnica">${icon('edit')}</button>` : ''}
      </div>
      <h4 class="kc-title">${esc(d.title)}</h4>
      <div class="kc-meta">${icon(CATEGORY_ICONS[d.category] || 'clipboard')}<span>${esc(d.category)}</span></div>
      <div class="kc-foot">
        <span class="kc-school" data-tooltip="${esc(d.school_name || '')}">${icon('school')}${esc(d.school_name || '—')}</span>
        ${d.cost_estimate ? `<span class="kc-cost">${money(d.cost_estimate)}</span>` : ''}
      </div>
      ${d.responsible ? `<div class="kc-owner" data-tooltip="Responsável: ${esc(d.responsible)}"><span class="avatar sm">${esc((d.responsible || '?')[0])}</span><small>${esc(d.responsible)}</small></div>` : ''}
      <div class="kc-code mono">${esc(d.code)}</div>
    </article>`;
  }

  async function renderKanban() {
    setLoading();
    const [schools, catCounts] = await Promise.all([loadSchools(), api('/api/demands/category-counts')]);
    const counts = catCounts.counts || {};
    const state = {
      q: '', category: '', priority: '', groupBy: 'stage', hideDone: false,
      school_id: ctx.user.perm.school_scoped ? String(ctx.user.school_id) : '',
    };
    const schoolField = ctx.user.perm.school_scoped
      ? `<div class="field"><label>Unidade Escolar</label><select class="select" id="fSchool" disabled><option>${esc(ctx.user.school_name || 'Minha unidade')}</option></select></div>`
      : `<div class="field"><label>Unidade Escolar</label><select class="select" id="fSchool"><option value="">Todas</option>${schools.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>`;

    content.innerHTML = pageHeader('Quadro Kanban', 'Visualize e movimente as demandas por etapa do fluxo ou por prioridade, com arrastar e soltar.',
      `<a class="btn btn-secondary" href="/api/export/demands.csv" data-tooltip="Baixar a lista completa em CSV">${icon('download')}Exportar</a><button class="btn btn-primary" data-open-demand data-tooltip="Abrir o assistente de registro">${icon('plus')}Registrar Demanda/CI</button>`) +
      `<div class="kanban-metrics" id="kanbanMetrics"></div>
      <section class="filters-card">
        <div class="field"><label>Buscar</label><div class="search-field">${icon('search')}<input class="input" id="fQ" placeholder="Código, demanda ou escola..."></div></div>
        ${schoolField}
        <div class="field"><label>Categoria</label><select class="select" id="fCategory"><option value="">Todas</option>${ctx.categories.map(x => `<option value="${esc(x)}">${esc(x)} (${num(counts[x] || 0)})</option>`).join('')}</select></div>
        <div class="field"><label>Prioridade</label><select class="select" id="fPriority"><option value="">Todas</option>${Object.keys(ctx.priorities).map(x => `<option value="${x}">${x} · ${priorityLabel(x)}</option>`).join('')}</select></div>
        <div class="field"><label>Agrupar por</label><select class="select" id="fGroupBy"><option value="stage">Etapa do fluxo</option><option value="priority">Prioridade</option></select></div>
        <button class="btn btn-secondary" id="clearKanbanFilters">${icon('filter')}Limpar</button>
      </section>
      <div class="kanban-toolbar">
        <label class="chip" id="hideDoneChip" role="button">${icon('check-circle')}Ocultar concluídas e canceladas</label>
        <span class="hint" id="kanbanHint"></span>
      </div>
      <div class="kanban-board" id="kanbanBoard" aria-live="polite"></div>`;

    $('[data-open-demand]', content).addEventListener('click', openDemandForm);

    const load = async () => {
      const params = new URLSearchParams();
      if (state.q) params.set('q', state.q);
      if (state.category) params.set('category', state.category);
      if (state.priority) params.set('priority', state.priority);
      let rows = await api('/api/demands?' + params.toString());
      if (state.school_id) rows = rows.filter(d => String(d.school_id) === String(state.school_id));
      if (state.hideDone) rows = rows.filter(d => d.status !== 'Concluída' && d.status !== 'Cancelada');
      renderBoard(rows);
    };

    const renderBoard = rows => {
      const total = rows.length;
      const urgent = rows.filter(d => d.priority === 'P1' && d.status !== 'Concluída' && d.status !== 'Cancelada').length;
      const overdue = rows.filter(d => dueInfo(d).cls === 'overdue').length;
      const openCost = rows.filter(d => d.status !== 'Concluída' && d.status !== 'Cancelada').reduce((a, d) => a + (d.cost_estimate || 0), 0);
      $('#kanbanMetrics').innerHTML = `
        <div class="km"><span>${num(total)}</span><small>Demandas no quadro</small></div>
        <div class="km km-red"><span>${num(urgent)}</span><small>Urgentes (P1) em aberto</small></div>
        <div class="km km-orange"><span>${num(overdue)}</span><small>Com prazo vencido</small></div>
        <div class="km km-blue"><span>${money(openCost)}</span><small>Custo estimado em aberto</small></div>`;
      $('#kanbanHint').textContent = !ctx.user.perm.can_edit_analysis
        ? 'Toque em uma demanda para ver os detalhes.'
        : 'Arraste um cartão para outra coluna para mudar o andamento, ou use o lápis para editar.';

      const groups = state.groupBy === 'priority' ? PRIORITY_GROUPS : STAGE_GROUPS;
      const byGroup = new Map(groups.map(g => [g.key, []]));
      rows.forEach(d => {
        const key = state.groupBy === 'priority' ? d.priority : stageKeyForStatus(d.status);
        (byGroup.get(key) || byGroup.get(groups[0].key)).push(d);
      });

      $('#kanbanBoard').innerHTML = groups.map(g => {
        const items = byGroup.get(g.key) || [];
        const cost = items.filter(d => d.status !== 'Concluída' && d.status !== 'Cancelada').reduce((a, d) => a + (d.cost_estimate || 0), 0);
        return `<section class="kanban-column" data-accent="${g.accent}">
          <header class="kanban-col-head"><div><h3>${esc(g.label)}</h3><p>${esc(g.hint)}</p></div><span class="kanban-count">${items.length}</span></header>
          ${cost ? `<div class="kanban-col-cost">${money(cost)} em aberto</div>` : ''}
          <div class="kanban-col-body" data-drop="${g.key}">${items.length ? items.map(kanbanCard).join('') : `<div class="kanban-empty">Nenhuma demanda aqui</div>`}</div>
        </section>`;
      }).join('');

      const rowsById = new Map(rows.map(d => [d.id, d]));
      $$('.kanban-card', content).forEach(card => {
        const goToDemand = () => location.href = `/demandas/${card.dataset.id}`;
        card.addEventListener('click', e => { if (e.target.closest('[data-edit]')) return; goToDemand(); });
        card.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goToDemand(); } });
        card.querySelector('[data-edit]')?.addEventListener('click', e => {
          e.stopPropagation();
          const d = rowsById.get(Number(card.dataset.id));
          if (d) openEditTechnical(d, load);
        });
        if (ctx.user.perm.can_edit_analysis) {
          card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.id); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
          card.addEventListener('dragend', () => { card.classList.remove('dragging'); $$('.kanban-col-body', content).forEach(b => b.classList.remove('drag-over')); });
        }
      });

      if (ctx.user.perm.can_edit_analysis) {
        $$('.kanban-col-body', content).forEach(body => {
          body.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; body.classList.add('drag-over'); });
          body.addEventListener('dragleave', e => { if (!body.contains(e.relatedTarget)) body.classList.remove('drag-over'); });
          body.addEventListener('drop', async e => {
            e.preventDefault(); body.classList.remove('drag-over');
            const id = Number(e.dataTransfer.getData('text/plain'));
            const d = rowsById.get(id);
            if (!d) return;
            const targetKey = body.dataset.drop;
            const currentKey = state.groupBy === 'priority' ? d.priority : stageKeyForStatus(d.status);
            if (currentKey === targetKey) return;
            const targetGroup = groups.find(g => g.key === targetKey);
            const field = state.groupBy === 'priority' ? 'priority' : 'status';
            const value = targetGroup.target;
            try {
              await api(`/api/demands/${id}`, { method: 'PUT', body: { [field]: value } });
              toast('Demanda movida', `${d.code} → ${targetGroup.label}`);
              await load();
            } catch (err) { toast('Não foi possível mover', err.message, 'error'); }
          });
        });
      }
    };

    let t;
    $('#fQ').addEventListener('input', () => { state.q = $('#fQ').value; clearTimeout(t); t = setTimeout(load, 250); });
    $('#fCategory').addEventListener('change', () => { state.category = $('#fCategory').value; load(); });
    $('#fPriority').addEventListener('change', () => { state.priority = $('#fPriority').value; load(); });
    $('#fGroupBy').addEventListener('change', () => { state.groupBy = $('#fGroupBy').value; load(); });
    if (!ctx.user.perm.school_scoped) $('#fSchool').addEventListener('change', () => { state.school_id = $('#fSchool').value; load(); });
    $('#hideDoneChip').addEventListener('click', () => { state.hideDone = !state.hideDone; $('#hideDoneChip').classList.toggle('active', state.hideDone); load(); });
    $('#clearKanbanFilters').addEventListener('click', () => {
      state.q = ''; state.category = ''; state.priority = ''; state.hideDone = false;
      $('#fQ').value = ''; $('#fCategory').value = ''; $('#fPriority').value = ''; $('#hideDoneChip').classList.remove('active');
      if (!ctx.user.perm.school_scoped) { state.school_id = ''; $('#fSchool').value = ''; }
      load();
    });
    await load();
  }

  // Global interactions
  $$('[data-open-demand]').forEach(b => b.addEventListener('click', openDemandForm));
  $('#menuButton')?.addEventListener('click', () => { $('#sidebar').classList.add('open'); showBackdrop(true) });
  $('#sideClose')?.addEventListener('click', () => { $('#sidebar').classList.remove('open'); showBackdrop(false) });
  $('#backdrop')?.addEventListener('click', () => $('#sidebar').classList.remove('open'));

  // Menu lateral recolhível no desktop (modo compacto, somente ícones), com preferência salva por navegador.
  const sidebarCollapseToggle = $('#sidebarCollapseToggle');
  const setSidebarCollapsed = collapsed => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    localStorage.setItem('agenda-sidebar-collapsed', collapsed ? '1' : '0');
    if (sidebarCollapseToggle) {
      sidebarCollapseToggle.setAttribute('aria-expanded', String(!collapsed));
      sidebarCollapseToggle.setAttribute('aria-label', collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
      sidebarCollapseToggle.setAttribute('data-tooltip', (collapsed ? 'Expandir menu' : 'Recolher menu') + ' \u00b7 tecla [');
    }
  };
  const toggleSidebarCollapse = () => setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
  setSidebarCollapsed(localStorage.getItem('agenda-sidebar-collapsed') === '1');
  sidebarCollapseToggle?.addEventListener('click', toggleSidebarCollapse);
  $$('.side-menu .nav-item').forEach(a => a.addEventListener('click', () => {
    $('#sidebar')?.classList.remove('open');
  }));
  $('#navBack')?.addEventListener('click', () => history.back());

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
  $('#darkModeToggle')?.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark-mode')));

  const applyLargeText = large => {
    document.body.classList.toggle('text-large', large);
    localStorage.setItem('agenda-large-text', large ? '1' : '0');
  };
  applyLargeText(localStorage.getItem('agenda-large-text') === '1');
  $('#accessibilityToggle')?.addEventListener('click', () => {
    const large = !document.body.classList.contains('text-large');
    applyLargeText(large);
    toast(large ? 'Texto ampliado' : 'Tamanho padrão', large ? 'A interface foi ampliada para facilitar a leitura.' : 'A interface voltou ao tamanho padrão.', 'success');
  });
  $('#userMenuButton')?.addEventListener('click', () => { const m = $('#userMenu'); m.hidden = !m.hidden; $('#notificationPanel').hidden = true });
  $('#notificationButton')?.addEventListener('click', async () => { const p = $('#notificationPanel'); p.hidden = !p.hidden; $('#userMenu').hidden = true; if (!p.hidden) { const d = await api('/api/dashboard'); const n = []; if (d.stats.urgent) n.push([`${d.stats.urgent} demanda(s) urgente(s)`, `Prioridade P1 requer acompanhamento imediato.`]); if (d.stats.overdue) n.push([`${d.stats.overdue} prazo(s) vencido(s)`, `Revise prazos e registre reprogramações quando necessário.`]); if (d.stats.contract) n.push([`${d.stats.contract} aguardando contratação`, `Itens dependem de encaminhamento administrativo.`]); if (!n.length) n.push(['Nenhuma pendência crítica', 'Os principais indicadores estão sob controle.']); p.innerHTML = `<div class="notification-head"><strong>Notificações</strong><small class="text-muted">Agora</small></div>${n.map(x => `<div class="notification-item"><span class="n-dot"></span><div><strong>${esc(x[0])}</strong><small>${esc(x[1])}</small></div></div>`).join('')}`; $('#notificationDot').hidden = true; } });
  const SHORTCUTS = [
    { key: 'N', label: 'Registrar Demanda/CI', action: () => openDemandForm() },
    { key: 'P', label: 'Ir para o Painel', href: '/' },
    { key: 'D', label: 'Ir para Demandas', href: '/demandas' },
    { key: 'E', label: 'Ir para Unidades Escolares', href: '/escolas' },
    { key: 'M', label: 'Ir para o Mapa da Rede', href: '/mapa' },
    ...(ctx.user.perm.can_view_planning ? [{ key: 'F', label: 'Ir para Planejamento Futuro', href: '/planejamento' }] : []),
    ...(ctx.user.perm.can_view_reports ? [{ key: 'R', label: 'Ir para Relatórios', href: '/relatorios' }] : []),
    ...(ctx.user.perm.can_manage_admin ? [{ key: 'A', label: 'Ir para Administração', href: '/administracao' }] : []),
    { key: 'S', label: 'Ir para Sobre o Sistema', href: '/sobre' },
    { key: 'B', label: 'Voltar para a página anterior', action: () => history.back() },
    { key: '[', label: 'Recolher/expandir o menu lateral', action: () => toggleSidebarCollapse() },
    { key: 'Esc', label: 'Fechar uma janela aberta', action: () => closeModal() },
    { key: '?', label: 'Abrir esta lista de atalhos', action: () => openShortcutsHelp() },
  ];
  function openShortcutsHelp() {
    modal({
      title: 'Central de Ajuda', mode: 'center', body: `<div class="info-card accent"><h3>${icon('help')}Como usar a Agenda Integrada</h3><p><strong>1.</strong> Registre a demanda com clareza e impacto.<br><strong>2.</strong> A Infraestrutura classifica prioridade, ação, responsável e prazo.<br><strong>3.</strong> Toda devolutiva fica registrada na linha do tempo.<br><strong>4.</strong> Necessidades que dependem de projeto, aquisição ou contratação podem seguir para Planejamento Futuro.</p></div>
      <section class="info-card mt-16"><h3>${icon('grid')}Atalhos de teclado</h3><div class="shortcut-list">${SHORTCUTS.map(s => `<div class="shortcut-row"><kbd class="key-hint">${esc(s.key)}</kbd><span>${esc(s.label)}</span></div>`).join('')}</div><p class="wizard-hint mt-12">Os atalhos não funcionam enquanto você estiver digitando em um campo.</p></section>`
    });
  }
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (!$('#backdrop').hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '?') { e.preventDefault(); openShortcutsHelp(); return; }
    const match = SHORTCUTS.find(s => s.key.toLowerCase() === e.key.toLowerCase() && s.key !== '?' && s.key !== 'Esc');
    if (!match) return;
    e.preventDefault();
    if (match.action) match.action(); else if (match.href) location.href = match.href;
  });
  $('#shortcutsHelp')?.addEventListener('click', openShortcutsHelp);

  // Global search
  const gs = $('#globalSearch'), gr = $('#globalSearchResults'); let gst;
  gs?.addEventListener('input', () => { clearTimeout(gst); const q = gs.value.trim(); if (q.length < 2) { gr.hidden = true; return } gst = setTimeout(async () => { try { const rows = await api(`/api/demands?q=${encodeURIComponent(q)}`); gr.innerHTML = rows.slice(0, 6).map(d => `<a class="search-result" href="/demandas/${d.id}"><span class="priority-dot ${d.priority}"></span><div><strong>${esc(d.title)}</strong><small>${esc(d.code)} · ${esc(d.school_name)}</small></div></a>`).join('') || `<div class="search-result"><div><strong>Nenhum resultado</strong><small>Tente outro termo.</small></div></div>`; gr.hidden = false; } catch { } }, 250) });
  document.addEventListener('click', e => { if (!e.target.closest('.global-search-wrap')) gr.hidden = true; if (!e.target.closest('#userMenuButton') && !e.target.closest('#userMenu')) $('#userMenu').hidden = true; if (!e.target.closest('#notificationButton') && !e.target.closest('#notificationPanel')) $('#notificationPanel').hidden = true; });

  content.addEventListener('click', async e => {
    const editBtn = e.target.closest('[data-edit-demand]');
    if (!editBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = Number(editBtn.dataset.editDemand);
    try {
      const detail = await api(`/api/demands/${id}`);
      await openEditDemand(detail.demand, () => location.reload());
    } catch (err) { toast('Não foi possível carregar a demanda', err.message, 'error'); }
  });

  content.addEventListener('click', async e => {
    const deleteBtn = e.target.closest('[data-delete-demand]');
    if (!deleteBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = Number(deleteBtn.dataset.deleteDemand);
    if (!confirm('Tem certeza que deseja deletar esta demanda? Esta ação não pode ser desfeita.')) return;
    try {
      await api(`/api/demands/${id}`, { method: 'DELETE' });
      toast('Demanda deletada com sucesso');
      location.reload();
    } catch (err) { toast('Não foi possível deletar a demanda', err.message, 'error'); }
  });

  content.addEventListener('click', e => {
    if (e.target.closest('a,button')) return;
    const tr = e.target.closest('tr[data-href]');
    if (tr) location.href = tr.dataset.href;
  });

  async function init() {
    try {
      if (page === 'dashboard') await renderDashboard();
      else if (page === 'demands') await renderDemands();
      else if (page === 'demand-detail') await renderDemandDetail();
      else if (page === 'map' || page === 'kanban') await renderNetworkMap();
      else if (page === 'planning') await renderPlanning();
      else if (page === 'schools') await renderSchools();
      else if (page === 'reports') await renderReports();
      else if (page === 'admin') await renderAdmin();
      else if (page === 'about') await renderAbout();
    } catch (e) { content.innerHTML = `${pageHeader('Não foi possível carregar esta tela', 'O sistema encontrou um erro ao buscar os dados.')}<div class="alert error">${esc(e.message)}</div>`; console.error(e) }
  }
  init();
})();
