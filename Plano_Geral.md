# 📋 PLANO GERAL: SISTEMA AGENDA INTEGRADA (AssistInfra)
## Prompt Técnico Completo para Reconstrução com Stack Moderno

**Status:** Pronto para Desenvolvimento  
**Versão do Plano:** 1.0.0  
**Data:** 2026-09-04  
**Stack:** React 18+ | Vite | TypeScript | Tailwind CSS | Supabase | PWA

---

## 🎯 VISÃO EXECUTIVA

O **Agenda Integrada (AssistInfra)** é um sistema de gestão de demandas de infraestrutura escolar para a Prefeitura Municipal de Itaguaí - RJ. Centraliza solicitações de manutenção, reparos, obras e suporte de TI das unidades educacionais municipais, fornecendo rastreabilidade completa, análise de custos, planejamento operacional e geração de documentos oficiais em PDF.

### Objetivos Principais:
✅ Eliminar dispersão de pedidos em memorandos e mensagens informais  
✅ Criar protocolo único auditável (`INF-YYYY-XXXXX`) para todas as solicitações  
✅ Priorização inteligente por criticidade (P1-P4)  
✅ Acompanhamento orçamentário (estimado vs. realizado)  
✅ Memória institucional com histórico fotográfico e cronograma  
✅ Governança pública com relatórios PDF com cabeçalho oficial  
✅ Acessibilidade total (WCAG 2.1 AA) com modo escuro nativo  

---

## 🏗️ ARQUITETURA TÉCNICA

### Fluxo de Dados Geral

```
┌─────────────────────────────────────────────────────────────┐
│                  NAVEGADOR DO USUÁRIO                        │
│  (React SPA + TypeScript + Tailwind CSS + PWA Service Worker)│
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            SUPABASE REALTIME + POSTGREST API                 │
│  ├─ Autenticação (JWT via session UUID)                      │
│  ├─ Rotas RESTful (/rest/v1/...)                             │
│  └─ WebSockets (Realtime para notificações & eventos)        │
└────────────────────┬────────────────────────────────────────┘
                     │ TCP/SSL
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         PostgreSQL 15+ (Banco Relacional)                    │
│  ├─ Schemas: public, auth                                    │
│  ├─ Tabelas normalizadas (9 tables principais)               │
│  ├─ Triggers para auditoria & eventos                        │
│  └─ Row Level Security (RLS) para multi-tenancy              │
└─────────────────────────────────────────────────────────────┘
```

### Tecnologias por Camada

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| **Frontend** | React 18.2+ | Framework UI reativo |
| **Compilação** | Vite 5+ | Build tool ultra-rápido com HMR |
| **Tipagem** | TypeScript 5.3+ | Type safety em todo o código |
| **Estilo** | Tailwind CSS 3.4+ | Utility-first CSS |
| **Ícones** | Font Awesome 6 + Alexandria | Componentes visuais |
| **Mapas** | MapLibre GL + OpenFreeMap | Visualização geográfica |
| **Roteirização** | OSRM | Cálculo de rotas |
| **Backend** | Supabase (PostgreSQL) | Database + Auth + Realtime |
| **PWA** | Service Worker + Manifest | Instalável e offline-ready |

---

## 📦 ESTRUTURA DO PROJETO

```
agenda-integrada-react/
│
├── src/
│   ├── main.tsx                      # Ponto de entrada React
│   ├── App.tsx                       # Componente raiz
│   ├── App.css                       # Estilos globais
│   │
│   ├── types/                        # Definições TypeScript
│   │   ├── index.ts                  # Tipos compartilhados
│   │   ├── demand.ts                 # Tipos de demanda
│   │   ├── school.ts                 # Tipos de escola
│   │   ├── user.ts                   # Tipos de usuário
│   │   └── common.ts                 # Tipos genéricos
│   │
│   ├── services/
│   │   ├── supabase.ts               # Cliente Supabase + queries
│   │   ├── auth.ts                   # Autenticação e perfis
│   │   ├── demands.ts                # CRUD de demandas
│   │   ├── schools.ts                # CRUD de escolas
│   │   ├── reports.ts                # Geração de PDF
│   │   ├── notifications.ts          # Sistema de alertas
│   │   ├── maps.ts                   # Integração OSRM + MapLibre
│   │   └── export.ts                 # Exportação de dados
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                # Hook de autenticação
│   │   ├── useDemands.ts             # Hook de demandas
│   │   ├── useNotifications.ts       # Hook de notificações
│   │   ├── useMap.ts                 # Hook para mapas
│   │   └── useTheme.ts               # Hook de tema (light/dark)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx         # Formulário de login
│   │   │   └── ProtectedRoute.tsx    # Wrapper de rotas protegidas
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx           # Menu lateral
│   │   │   ├── Header.tsx            # Cabeçalho Gov.br
│   │   │   ├── MainLayout.tsx        # Layout principal
│   │   │   └── Footer.tsx            # Rodapé
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx     # Painel executivo
│   │   │   ├── MetricsCard.tsx       # Cards de KPI
│   │   │   ├── CostChart.tsx         # Gráfico de custos
│   │   │   └── AlertsList.tsx        # Lista de alertas
│   │   │
│   │   ├── demands/
│   │   │   ├── DemandTable.tsx       # Tabela principal
│   │   │   ├── DemandFilters.tsx     # Filtros dinâmicos
│   │   │   ├── DemandDetail.tsx      # Visão 360°
│   │   │   ├── DemandTimeline.tsx    # Linha do tempo
│   │   │   ├── DemandForm.tsx        # Formulário de criação
│   │   │   ├── MaterialList.tsx      # Gestão de materiais
│   │   │   └── CostTracker.tsx       # Acompanhamento financeiro
│   │   │
│   │   ├── schools/
│   │   │   ├── SchoolsPage.tsx       # Catálogo de escolas
│   │   │   ├── SchoolCard.tsx        # Card da escola
│   │   │   ├── School360.tsx         # Visão 360° da escola
│   │   │   └── SchoolForm.tsx        # Formulário de escola
│   │   │
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx       # Quadro Kanban
│   │   │   ├── KanbanColumn.tsx      # Coluna do Kanban
│   │   │   └── KanbanCard.tsx        # Card do Kanban (com drag-drop)
│   │   │
│   │   ├── maps/
│   │   │   ├── MapPage.tsx           # Página do mapa
│   │   │   ├── MapContainer.tsx      # Wrapper MapLibre
│   │   │   ├── SchoolMarker.tsx      # Marcador de escola
│   │   │   ├── RouteOverlay.tsx      # Overlay de rota OSRM
│   │   │   └── MapLegend.tsx         # Legenda do mapa
│   │   │
│   │   ├── planning/
│   │   │   ├── PlanningPage.tsx      # Planejamento plurianual
│   │   │   ├── PlanningForm.tsx      # Formulário de planejamento
│   │   │   └── PlanningTimeline.tsx  # Timeline de projetos
│   │   │
│   │   ├── reports/
│   │   │   ├── ReportsPage.tsx       # Página de relatórios
│   │   │   ├── ReportBuilder.tsx     # Construtor de relatórios
│   │   │   ├── PDFGenerator.tsx      # Gerador de PDF
│   │   │   └── ExportOptions.tsx     # Opções de exportação
│   │   │
│   │   ├── admin/
│   │   │   ├── AdminPanel.tsx        # Painel de administração
│   │   │   ├── UserManagement.tsx    # Gestão de usuários
│   │   │   ├── SystemSettings.tsx    # Configurações globais
│   │   │   ├── AuditLog.tsx          # Log de auditoria
│   │   │   └── CategoryManager.tsx   # Gerenciador de categorias
│   │   │
│   │   ├── common/
│   │   │   ├── Modal.tsx             # Modal reutilizável
│   │   │   ├── Button.tsx            # Botão com variações
│   │   │   ├── Input.tsx             # Input field
│   │   │   ├── Select.tsx            # Dropdown
│   │   │   ├── Textarea.tsx          # Textarea
│   │   │   ├── Badge.tsx             # Badge de status
│   │   │   ├── LoadingSpinner.tsx    # Indicador de carregamento
│   │   │   ├── ErrorBoundary.tsx     # Tratamento de erros
│   │   │   ├── ConfirmDialog.tsx     # Diálogo de confirmação
│   │   │   ├── NotificationToast.tsx # Toast de notificações
│   │   │   └── Breadcrumb.tsx        # Navegação breadcrumb
│   │   │
│   │   └── utils/
│   │       ├── DateFormatter.tsx     # Formatação de datas
│   │       ├── CurrencyFormatter.tsx # Formatação de moeda
│   │       └── StatusBadge.tsx       # Badge de status com cores
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Demands.tsx
│   │   ├── Schools.tsx
│   │   ├── Kanban.tsx
│   │   ├── Map.tsx
│   │   ├── Planning.tsx
│   │   ├── Reports.tsx
│   │   ├── Admin.tsx
│   │   ├── About.tsx
│   │   └── NotFound.tsx
│   │
│   ├── constants/
│   │   ├── api.ts                    # URLs e endpoints
│   │   ├── colors.ts                 # Paleta de cores Gov.br
│   │   ├── priorities.ts             # Definições de prioridades
│   │   ├── statuses.ts               # Definições de status
│   │   ├── categories.ts             # Categorias de demandas
│   │   └── roles.ts                  # Definições de perfis
│   │
│   ├── utils/
│   │   ├── validators.ts             # Validação de dados
│   │   ├── formatters.ts             # Formatadores (data, moeda, etc)
│   │   ├── storage.ts                # LocalStorage com TypeScript
│   │   ├── keyboard.ts               # Atalhos de teclado
│   │   └── debounce.ts               # Utilitários de performance
│   │
│   ├── styles/
│   │   ├── globals.css               # Reset e variáveis CSS
│   │   ├── typography.css            # Tipografia Gov.br
│   │   ├── animations.css            # Animações
│   │   ├── dark-mode.css             # Tema escuro
│   │   └── responsive.css            # Media queries
│   │
│   └── config/
│       ├── routes.ts                 # Definição de rotas
│       └── theme.ts                  # Configuração de tema
│
├── public/
│   ├── manifest.json                 # Manifesto PWA
│   ├── service-worker.ts             # Service Worker
│   ├── sw.js                         # Service Worker compilado
│   ├── favicon.ico
│   ├── brasao_itaguai.png            # Brasão da Prefeitura
│   ├── logo-prefeitura.png           # Logo da Prefeitura
│   └── icons/                        # Ícones PWA (192x192, 512x512)
│
├── index.html                        # HTML entry point
├── vite.config.ts                    # Configuração Vite
├── tsconfig.json                     # Configuração TypeScript
├── tailwind.config.js                # Configuração Tailwind
├── postcss.config.js                 # Configuração PostCSS
├── package.json                      # Dependências NPM
├── .env.example                      # Variáveis de ambiente (exemplo)
├── .env.local                        # Variáveis de ambiente locais
├── .gitignore
└── README.md                         # Documentação do projeto

```

---

## 🎨 DESIGN SYSTEM & UI/UX

### Paleta de Cores (Gov.br V3 + Itaguaí)

**Cores Primárias:**
```css
--primary-blue: #0B5FBF        /* Azul Governo Federal */
--primary-dark: #003D82        /* Azul escuro para hover */
--primary-light: #E8F4FE       /* Fundo claro azul */

--accent-green: #06B84E        /* Verde de sucesso */
--accent-red: #E9181C          /* Vermelho de erro/urgência */
--accent-yellow: #F7B500       /* Amarelo de atenção */

--text-dark: #1A1A1A           /* Texto padrão */
--text-light: #666666          /* Texto secundário */
--text-disabled: #BDBDBD       /* Texto desabilitado */

--bg-white: #FFFFFF            /* Fundo claro */
--bg-gray: #F5F5F5             /* Fundo cinza suave */
--bg-dark: #121212             /* Fundo modo escuro */
--border: #E0E0E0              /* Bordas */

--success: #06B84E
--warning: #F7B500
--error: #E9181C
--info: #0B5FBF
```

### Tipografia (Inter + Rawline)

```css
/* Heading 1 */
font-size: 32px;
font-weight: 700;
line-height: 40px;

/* Heading 2 */
font-size: 24px;
font-weight: 600;
line-height: 32px;

/* Heading 3 */
font-size: 20px;
font-weight: 600;
line-height: 28px;

/* Body Large */
font-size: 16px;
font-weight: 400;
line-height: 24px;

/* Body Regular */
font-size: 14px;
font-weight: 400;
line-height: 20px;

/* Small */
font-size: 12px;
font-weight: 400;
line-height: 16px;
```

### Componentes Base

#### Button (Tailwind + Variações)
```tsx
<Button 
  variant="primary"      // primary | secondary | ghost | danger
  size="md"              // sm | md | lg
  disabled={false}
  icon={<IconName />}
  onClick={handler}
>
  Texto do Botão
</Button>
```

#### Badge Status
```tsx
<Badge status="new" />        // Azul - Nova
<Badge status="analyzing" />  // Amarelo - Em Análise
<Badge status="executing" />  // Laranja - Em Execução
<Badge status="completed" />  // Verde - Concluída
<Badge status="archived" />   // Cinza - Arquivada
```

#### Modal
```tsx
<Modal 
  isOpen={true}
  title="Título do Modal"
  onClose={handler}
>
  Conteúdo do modal
  <Button variant="primary">Confirmar</Button>
</Modal>
```

#### Form Components
- Input (texto, email, número, data, hora)
- Select (dropdown com busca)
- Textarea (área de texto)
- Checkbox e Radio
- DatePicker (calendário)
- FileUpload (área de arraste)

---

## 📊 MODELAGEM DE DADOS (PostgreSQL/Supabase)

### Tabela: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- PBKDF2-HMAC-SHA256
  full_name VARCHAR(255) NOT NULL,
  profile_id UUID NOT NULL REFERENCES access_profiles(id),
  school_id UUID REFERENCES schools(id),  -- Null para perfis centralizados
  status VARCHAR(50) DEFAULT 'active',    -- active | inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  is_admin BOOLEAN DEFAULT FALSE
);
```

### Tabela: `access_profiles`
```sql
CREATE TABLE access_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,      -- Admin | Infraestrutura | Técnico | Gestor Escolar | Consulta
  description TEXT,
  permissions JSONB DEFAULT '[]',          -- Array de permissões granulares
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `schools`
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_inep VARCHAR(20) UNIQUE,            -- Código INEP oficial
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  director_name VARCHAR(255),
  director_email VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_students INT,
  total_classrooms INT,
  total_invested DECIMAL(15, 2) DEFAULT 0,
  active_demands_count INT DEFAULT 0,
  completed_demands_count INT DEFAULT 0,
  priority_indicator VARCHAR(20),         -- green | yellow | red
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `demands`
```sql
CREATE TABLE demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,       -- INF-2026-XXXXX (auto-gerado)
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES demand_categories(id),
  priority VARCHAR(2) NOT NULL,           -- P1 | P2 | P3 | P4
  status VARCHAR(50) DEFAULT 'new',       -- new | analyzing | scheduled | contracted | executing | completed | archived
  school_id UUID NOT NULL REFERENCES schools(id),
  responsible_user_id UUID REFERENCES users(id),
  responsible_sector VARCHAR(255),
  cost_estimate DECIMAL(15, 2),
  cost_actual DECIMAL(15, 2),
  due_date DATE,
  scheduled_date DATE,
  started_date DATE,
  completed_date DATE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP,
  notes TEXT,
  location_description TEXT,              -- Descrição do local na escola
  urgency_reason VARCHAR(500),            -- Por que é urgente?
  attachments JSONB DEFAULT '[]'          -- Array com URLs de fotos/documentos
);
```

### Tabela: `demand_events` (Auditoria & Timeline)
```sql
CREATE TABLE demand_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id),
  event_type VARCHAR(100) NOT NULL,       -- status_changed | photo_added | comment | cost_updated | assignment
  previous_value VARCHAR(500),
  new_value VARCHAR(500),
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id),
  attachment_url VARCHAR(500),            -- URL da foto ou documento
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_demand_events FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE
);
```

### Tabela: `demand_items` (Materiais & Serviços)
```sql
CREATE TABLE demand_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES demands(id),
  item_description VARCHAR(500) NOT NULL,
  unit_of_measure VARCHAR(50),            -- metro, peça, litro, hora, serviço, etc.
  quantity DECIMAL(10, 2),
  unit_cost DECIMAL(15, 2),
  subtotal DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'pending',   -- pending | purchased | received | used | archived
  supplier VARCHAR(255),
  purchase_order VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_demand_items FOREIGN KEY (demand_id) REFERENCES demands(id) ON DELETE CASCADE
);
```

### Tabela: `demand_categories`
```sql
CREATE TABLE demand_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),                       -- Font Awesome icon name
  color VARCHAR(10),                      -- Hex color
  order_index INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);
```

### Tabela: `planning_items` (Planejamento Plurianual)
```sql
CREATE TABLE planning_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  school_id UUID REFERENCES schools(id),
  category_id UUID REFERENCES demand_categories(id),
  estimated_budget DECIMAL(15, 2),
  fiscal_year INT,                        -- 2026, 2027, 2028, etc.
  status VARCHAR(50) DEFAULT 'planned',   -- planned | approved | contracted | executing | completed
  priority VARCHAR(2),                    -- P1 | P2 | P3 | P4
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(100),                      -- deadline_approaching | demand_updated | new_assignment | etc.
  title VARCHAR(255),
  message TEXT,
  demand_id UUID REFERENCES demands(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);
```

### Row Level Security (RLS) - Exemplo

```sql
-- Usuários só veem demandas de suas próprias escolas (exceto admin)
CREATE POLICY demands_school_isolation
  ON demands
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR school_id = (SELECT school_id FROM users WHERE id = auth.uid())
  );
```

---

## 🔐 SEGURANÇA & AUTENTICAÇÃO

### Fluxo de Login

1. Usuário submete email + senha
2. Backend valida credenciais contra hash PBKDF2
3. Se válido, cria sessão JWT com:
   - `sub`: User UUID
   - `email`: Email do usuário
   - `role`: Perfil de acesso
   - `school_id`: Escola vinculada (se houver)
   - `exp`: Expiração em 24h
4. JWT armazenado em localStorage (com fallback para sessionStorage)
5. Cada requisição inclui Bearer token no header `Authorization`
6. Supabase valida token via RLS e retorna dados filtrados

### Controle de Acesso por Perfil

| Perfil | Dashboard | Demandas | Escolas | Kanban | Mapa | Planejamento | Relatórios | Admin |
|--------|-----------|----------|---------|--------|------|--------------|-----------|-------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Infraestrutura** | ✅ | ✅ (edit) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Técnico** | ✅ | ✅ (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Gestor Escolar** | ✅ | ✅ (own school) | ✅ (view) | ✅ (view) | ✅ | ❌ | ✅ (view) | ❌ |
| **Consulta** | ✅ | ✅ (view) | ✅ (view) | ✅ (view) | ✅ | ❌ | ✅ (view) | ❌ |

### Práticas de Segurança

- ✅ **HTTPS/TLS:** Todas as comunicações encriptadas
- ✅ **CORS:** Whitelist de origens permitidas
- ✅ **CSRF:** Token CSRF em formulários sensíveis
- ✅ **XSS:** Sanitização de inputs e encoding de outputs
- ✅ **SQL Injection:** Prepared statements via Supabase ORM
- ✅ **Password Hash:** PBKDF2-HMAC-SHA256 com 120k iterações
- ✅ **Session Security:** HttpOnly, SameSite=Lax, Secure flags
- ✅ **Audit Log:** Todos os eventos gravados em `demand_events`

---

## 🎯 MÓDULOS FUNCIONAIS

### 1️⃣ Dashboard (Painel Executivo)

**Localização:** `src/pages/Dashboard.tsx`

**Componentes:**
- `DashboardPage.tsx` - Contenedor principal
- `MetricsCard.tsx` - Cards KPI (2 colunas, 4 cards)
- `CostChart.tsx` - Gráfico de barras (custos por categoria)
- `AlertsList.tsx` - Lista de demandas críticas

**Funcionalidades:**
- **Métricas em Tempo Real:**
  - Total de demandas consolidadas
  - Demandas urgentes (P1)
  - Demandas vencidas
  - Custos pendentes (estimado - realizado)
  
- **Gráfico de Custos:** Barras agrupadas por categoria com hover interativo
- **Alertas Visuais:** Cards com indicador de proximidade de vencimento (verde/amarelo/vermelho)
- **Drill-down:** Clique em métrica vai para a carteira filtrada

**Design:**
```
┌─────────────────────────────────────┐
│         Dashboard Executivo         │
├─────────────────────────────────────┤
│ [ Total ] [ Urgentes ] [ Vencidas ] │
│ [ Custos Pendentes ]                │
├─────────────────────────────────────┤
│  Custos por Categoria (Gráfico)     │
├─────────────────────────────────────┤
│  Atenção Imediata (Alertas)         │
│  ├─ [ESCOLA] [CÓDIGO] [PRAZO]       │
│  └─ ...                              │
└─────────────────────────────────────┘
```

---

### 2️⃣ Carteira de Demandas (Gerenciamento Principal)

**Localização:** `src/pages/Demands.tsx`

**Componentes:**
- `DemandTable.tsx` - Tabela dinâmica com paginação
- `DemandFilters.tsx` - Filtros multicritério (Status, Prioridade, Escola, Categoria)
- `DemandForm.tsx` - Modal para criar/editar demanda
- `DemandDetail.tsx` - Drawer com visão 360°

**Funcionalidades:**
- **Tabela Dinâmica:**
  - Linhas com altura fixa (52px) e padding consistente
  - Cantos levemente arredondados (4px)
  - Célula de status com badge colorido
  - Indicadores de prioridade (bullets)
  - Data formatada legível (DD/MM/YYYY)
  - Botões de ação (Visualizar, Editar, Arquivar, Deletar)
  
- **Filtros em Tempo Real:**
  - Status (New, Analyzing, Scheduled, Executing, Completed, Archived)
  - Prioridade (P1, P2, P3, P4)
  - Escola (dropdown com busca)
  - Categoria (multi-select)
  - Busca textual (título, código, descrição)
  
- **Paginação:** 25 itens por página com navegação
- **Ações Rápidas:** Editar, Visualizar 360°, Arquivar, Deletar (com confirmação)
- **Bulk Actions:** Seleção múltipla com ações em lote (arquivar, atribuir, alterar status)

**Design:**
```
┌────────────────────────────────────┐
│ [Novo] [Filtros] [Busca...]        │
├────────────────────────────────────┤
│ Status▼ Prioridade▼ Escola▼ ...    │
├────────────────────────────────────┤
│ Código │ Título │ Escola │ Status  │
├────────────────────────────────────┤
│ INF... │ ...    │ ...    │ [Novo] │ [...]
│ ...    │ ...    │ ...    │ [...]  │ [...]
├────────────────────────────────────┤
│ < Página 1 de 10 >                 │
└────────────────────────────────────┘
```

---

### 3️⃣ Visão 360° da Demanda (Detalhamento)

**Localização:** `src/components/demands/DemandDetail.tsx`

**Conteúdo (Drawer/Modal):**

**Seção 1 - Informações Gerais**
- Código do protocolo (INF-2026-XXXXX)
- Status com badge
- Prioridade com indicador visual
- Título e Descrição
- Escola demandante
- Data de abertura e vencimento

**Seção 2 - Dados Técnicos**
- Categoria da demanda
- Local específico dentro da escola
- Motivo da urgência (se P1 ou P2)
- Responsável técnico
- Setor responsável

**Seção 3 - Linha do Tempo (Timeline)**
```
2026-09-01 14:30 [Nova]         Direção da Escola registrou a demanda
2026-09-02 09:15 [Em Análise]   Eng. Silva agendou vistoria
2026-09-02 15:45 [📸 Foto]      Adicionada foto da avaria
2026-09-03 10:00 [Análise]      Laudo: "Necessário reforço estrutural"
2026-09-04 08:30 [Custo]        Orçamento: R$ 15.000,00
```

**Seção 4 - Gestão de Materiais & Custos**
```
Item                    | Medida | Qtd | Unit | Subtotal | Status
Concreto usinado 3m³   | m³     | 3   | 500 | 1.500    | [Comprado]
Aço CA-50 ø 12        | kg     | 150 | 8   | 1.200    | [Recebido]
Serviço de bombeamento | hora   | 4   | 250 | 1.000    | [Pendente]
```

**Seção 5 - Galeria de Fotos/Documentos**
- Área de arraste para upload de imagens
- Miniaturas com opção de deletar
- Links para documentos anexados

**Seção 6 - Botões de Ação**
- Editar
- Alterar Status
- Atribuir Responsável
- Gerar PDF Oficial
- Arquivar
- Deletar

---

### 4️⃣ Geração de Documentos PDF

**Localização:** `src/services/reports.ts`

**Funcionalidade:**
- Gera PDF oficial com cabeçalho da Prefeitura
- Inclui: Protocolo, Escola, Datas, Timeline, Custos, Assinaturas

**Estrutura do PDF:**
```
┌─────────────────────────────────────────┐
│  [Brasão] Prefeitura Municipal          │
│  Secretaria Municipal de Educação       │
│  Subsecretaria de Infraestrutura        │
├─────────────────────────────────────────┤
│  RELATÓRIO DE DEMANDA DE INFRAESTRUTURA │
├─────────────────────────────────────────┤
│ Protocolo: INF-2026-00042              │
│ Unidade: EMEI Pequeno Príncipe          │
│ Data de Abertura: 01/09/2026            │
│ Data de Conclusão: 04/09/2026           │
│ Status: Concluída                       │
├─────────────────────────────────────────┤
│ HISTÓRICO DE TRAMITAÇÃO:                │
│ 2026-09-01 14:30 - Novas...             │
│ ...                                     │
├─────────────────────────────────────────┤
│ CUSTOS:                                 │
│ Estimado: R$ 15.000,00                  │
│ Realizado: R$ 14.850,00                 │
├─────────────────────────────────────────┤
│ Assinado por: ________________ (Fiscal) │
│ Data: __/__/____                        │
└─────────────────────────────────────────┘
```

---

### 5️⃣ Unidades Escolares (Escolas 360°)

**Localização:** `src/pages/Schools.tsx`

**Componentes:**
- `SchoolsPage.tsx` - Catálogo com filtros
- `SchoolCard.tsx` - Card individual da escola
- `School360.tsx` - Visão detalhada

**Funcionalidades:**
- **Catálogo de Escolas:**
  - Cards em grid responsivo (2-4 colunas)
  - Card exibe: Logo, Nome, Endereço, Total de alunos, Diretor
  - Indicador de prioridade (verde/amarelo/vermelho) baseado em demandas urgentes
  - Badge com contagem de demandas ativas
  
- **Visão 360° da Escola:**
  - Informações gerais (INEP, endereço, contatos)
  - Coordenadas geográficas e mapa embutido
  - Resumo de demandas (Total | Ativas | Concluídas | Custos)
  - Lista de últimas demandas
  - Histórico de investimentos (gráfico de barras)

**Design:**
```
┌─────────────────────────┐
│  [Buscar Escola...]     │
├─────────────────────────┤
│ ┌──────┐  ┌──────┐      │
│ │ EMEI │  │ EMEI │      │
│ │ Logo │  │ Logo │      │
│ └──────┘  └──────┘      │
│ Escola 1   Escola 2     │
│ Endereço   Endereço     │
│ [1.200 alunos]          │
└─────────────────────────┘
```

---

### 6️⃣ Quadro Kanban Operacional

**Localização:** `src/pages/Kanban.tsx`

**Colunas:**
1. **Novas** - Demandas recém-registradas
2. **Em Análise** - Triagem técnica em andamento
3. **Aguardando** - Esperando contratação ou material
4. **Em Execução** - Obra/serviço em progresso
5. **Concluídas** - Finalizadas com sucesso

**Funcionalidades:**
- **Drag & Drop:** Mover cards entre colunas (apenas perfis com permissão)
- **Cards:** Mostram escola, código, prioridade (cor), prazo
- **Indicadores Visuais:**
  - Borda esquerda com cor de prioridade (P1=vermelho, P2=laranja, P3=amarelo, P4=verde)
  - Badge de vencimento (vermelho se passado do prazo)
  - Ícone de foto se tem anexos
  
- **Hover:** Exibe tooltip com título completo

**Design:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│   Novas  │ Análise  │Aguardando│ Execução │Concluídas│
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │ ┌──────┐ │
│ │▮ P1  │ │ │▮ P2  │ │ │▮ P3  │ │ │▮ P4  │ │ │✓ ✓   │ │
│ │EMEI X│ │ │EMEI Y│ │ │EMEI Z│ │ │EMEI W│ │ │      │ │
│ │05/09 │ │ │04/09 │ │ │VENC. │ │ │08/09 │ │ │      │ │
│ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │ └──────┘ │
│          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

### 7️⃣ Mapa Geográfico & Rotas

**Localização:** `src/pages/Map.tsx`

**Tecnologias:**
- MapLibre GL (rendering)
- OpenFreeMap (tileset)
- OSRM (roteirização)

**Funcionalidades:**
- **Mapa Interativo:**
  - Marcadores em todas as escolas
  - Zoom, Pan, Fullscreen
  - Layer de escolas com busca

- **Código de Cores nos Marcadores:**
  - 🟢 Verde - Nenhuma demanda urgente
  - 🟡 Amarelo - Demanda P2 ou P3
  - 🔴 Vermelho - Demanda P1

- **Clique no Marcador:**
  - Popup exibe escola + contagem de demandas
  - Botão para ir à Visão 360°

- **Cálculo de Rotas:**
  - Seleção de ponto de partida (base/secretaria)
  - Seleção de destino (escola)
  - Exibe rota no mapa
  - Distância e tempo estimado

- **Legenda:** Explicação das cores

**Design:**
```
┌────────────────────────────────┐
│ [Origem▼] → [Destino▼] [Rota] │
├────────────────────────────────┤
│                                │
│    🗺️ MapLibre                 │
│    🔴 Escola A (3 demandas P1) │
│    🟡 Escola B (1 demanda P2)  │
│    🟢 Escola C (nenhuma)       │
│                                │
├────────────────────────────────┤
│ Distância: 12.5 km             │
│ Tempo: 18 minutos              │
└────────────────────────────────┘
```

---

### 8️⃣ Planejamento Plurianual

**Localização:** `src/pages/Planning.tsx`

**Funcionalidades:**
- **Tabela de Itens:**
  - Descrição do projeto
  - Escola relacionada
  - Orçamento estimado
  - Ano fiscal (2026, 2027, 2028...)
  - Status (Planejado, Aprovado, Contratado, Executando, Concluído)
  - Prioridade

- **Timeline Visual:** Mostra distribuição de projetos por ano fiscal
- **Formulário de Criação:** Modal com campos de projeto

---

### 9️⃣ Relatórios & Exportações

**Localização:** `src/pages/Reports.tsx`

**Tipos de Relatório:**
1. **Relatório Executivo:** KPIs, gráficos e sumário
2. **Relatório Detalhado:** Todas as demandas com histórico
3. **Relatório Financeiro:** Custos estimados vs. realizados por categoria
4. **Relatório por Escola:** Análise individual de cada unidade
5. **Relatório de Conformidade:** Análise de prazos vencidos e atrasos

**Formatos de Exportação:**
- PDF (com cabeçalho oficial)
- XLSX (Excel)
- CSV (para análise em outras ferramentas)

---

### 🔟 Administração & Parâmetros

**Localização:** `src/pages/Admin.tsx`

**Funcionalidades:**
- **Gestão de Usuários:**
  - Listagem com filtros
  - Criar novo usuário
  - Editar perfil e permissões
  - Redefinir senha
  - Desativar/ativar usuário
  - Audit log de logins

- **Parâmetros Globais:**
  - Criar/editar categorias de demanda
  - Configurar unidades de medida
  - Configurar SLA por prioridade
  - Configurar coordenadas da base/secretaria (para cálculo de rotas)

- **Auditoria:**
  - Log completo de todas as ações do sistema
  - Filtro por usuário, tipo de ação, data
  - Exportação de audit log

---

## 🎮 FLUXOS DE INTERAÇÃO PRINCIPAIS

### Fluxo 1: Criar Nova Demanda (Gestor Escolar)

```
1. Clica em "Nova Demanda" (ou pressiona N)
2. Abre modal com formulário:
   - Título (obrigatório)
   - Descrição detalhada
   - Categoria (dropdown)
   - Prioridade (P1-P4)
   - Local específico na escola
   - Motivo da urgência (se P1/P2)
3. Submete formulário
4. Sistema gera código único (INF-2026-XXXXX)
5. Demanda criada com status "Nova"
6. Notificação enviada à equipe de infraestrutura
7. Usuário recebe confirmação com número de protocolo
```

### Fluxo 2: Atender uma Demanda (Técnico/Infraestrutura)

```
1. Acessa Carteira de Demandas
2. Filtra por Status = "Nova"
3. Clica em demanda → Visão 360°
4. Revisa descrição e fotos
5. Clica "Editar" → Altera status para "Em Análise"
6. Agrega dados técnicos:
   - Agende vistoria
   - Adicione laudo técnico
   - Adicione fotos da avaria
7. Define lista de materiais necessários com custos
8. Altera status para "Aguardando Contratação/Material"
9. Sistema notifica compras/patrimônio
10. Quando material chegar, altera para "Em Execução"
11. Ao finalizar, altera para "Concluída"
12. Sistema oferece opção de gerar PDF oficial
```

### Fluxo 3: Consultar Demanda (Direção/Controle Externo)

```
1. Acessa Dashboard → vê métricas gerais
2. Clica em demanda urgente do alerta
3. Visualiza Visão 360° (view-only)
4. Vê toda linha do tempo e história
5. Pode exportar PDF oficial
```

---

## 📱 PWA & OFFLINE SUPPORT

### Manifesto PWA (`public/manifest.json`)
```json
{
  "name": "Agenda Integrada - AssistInfra",
  "short_name": "AssistInfra",
  "description": "Sistema de Gestão de Demandas de Infraestrutura Escolar",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-or-landscape",
  "background_color": "#FFFFFF",
  "theme_color": "#0B5FBF",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity"]
}
```

### Service Worker (`public/service-worker.ts`)

**Estratégias de Cache:**
- **App Shell:** Cache-first para HTML/CSS/JS (app.js, styles.css)
- **Assets Versionados:** Cache-first com versão (`?v=12345`)
- **API Calls:** Network-first com fallback para cache (dados)
- **Imagens:** Cache-first com expiração

**Funcionalidades:**
- ✅ Instalação offline
- ✅ Sincronização em background (Background Sync API)
- ✅ Notificações push (quando voltar online)
- ✅ Atualização automática quando nova versão disponível

---

## ⌨️ ATALHOS DE TECLADO

```
N    → Nova Demanda
P    → Painel (Dashboard)
D    → Carteira de Demandas
E    → Escolas
M    → Mapa
F    → Planejamento Futuro
R    → Relatórios
A    → Administração
S    → Sobre
?    → Ajuda (mostra todos os atalhos)
[    → Expandir/recolher sidebar
Ctrl+Alt+N → Dark Mode toggle
Escape → Fechar modal/drawer
Tab    → Navegar entre campos
Enter  → Confirmar
```

---

## 🌙 MODO ESCURO

**Implementação:**
- LocalStorage salva preferência do usuário
- CSS variables para cores que mudam por tema
- Toggle button no header

**Cores Modo Escuro:**
```css
:root.dark {
  --bg-white: #1E1E1E;
  --bg-gray: #2A2A2A;
  --text-dark: #E0E0E0;
  --text-light: #BDBDBD;
  --border: #404040;
}
```

---

## 📦 DEPENDÊNCIAS PRINCIPAIS

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.3",
    "@supabase/supabase-js": "^2.38.4",
    "tailwindcss": "^3.4.1",
    "@tailwindcss/forms": "^0.5.7",
    "maplibre-gl": "^4.0.0",
    "axios": "^1.6.2",
    "date-fns": "^2.30.0",
    "@fortawesome/fontawesome-svg-core": "^6.5.1",
    "@fortawesome/free-solid-svg-icons": "^6.5.1",
    "@fortawesome/react-fontawesome": "^0.2.0",
    "classnames": "^2.3.2",
    "zustand": "^4.4.1",
    "react-hot-toast": "^2.4.1",
    "react-beautiful-dnd": "^13.1.1"
  },
  "devDependencies": {
    "vite": "^5.0.8",
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16"
  }
}
```

---

## 🚀 SETUP INICIAL & EXECUÇÃO

### 1. Clonar Repositório
```bash
git clone https://github.com/seu-repo/agenda-integrada-react.git
cd agenda-integrada-react
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar `.env.local`
```env
VITE_SUPABASE_URL=https://seu-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OSRM_API_URL=https://router.project-osrm.org
VITE_MAP_TILE_URL=https://tile.openstreetmap.org
```

### 4. Executar Servidor de Desenvolvimento
```bash
npm run dev
```

Acessa em: `http://localhost:5173`

### 5. Build para Produção
```bash
npm run build
```

Saída em: `dist/`

### 6. Deploy (Vercel/Netlify)
```bash
# Vercel
vercel

# Netlify
netlify deploy --prod --dir=dist
```

---

## 📚 ESTRUTURA DE TIPOS TYPESCRIPT

```typescript
// types/index.ts

export interface User {
  id: string;
  email: string;
  fullName: string;
  profileId: string;
  schoolId?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessProfile {
  id: string;
  name: string;
  permissions: string[];
}

export interface School {
  id: string;
  codeINEP: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  directorName: string;
  directorEmail: string;
  totalStudents: number;
  activeDemandsCount: number;
  completedDemandsCount: number;
  totalInvested: number;
  priorityIndicator: 'green' | 'yellow' | 'red';
}

export interface Demand {
  id: string;
  code: string;
  title: string;
  description: string;
  categoryId: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  status: DemandStatus;
  schoolId: string;
  responsibleUserId?: string;
  costEstimate?: number;
  costActual?: number;
  dueDate?: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  attachments: Attachment[];
}

export type DemandStatus = 
  | 'new' 
  | 'analyzing' 
  | 'scheduled' 
  | 'contracted' 
  | 'executing' 
  | 'completed' 
  | 'archived';

export interface DemandEvent {
  id: string;
  demandId: string;
  eventType: string;
  description: string;
  userId: string;
  attachmentUrl?: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'pdf';
  uploadedAt: Date;
}
```

---

## 🧪 TESTES & QUALIDADE

### Estrutura de Testes

```
src/__tests__/
├── components/
├── hooks/
├── services/
└── utils/
```

### Comandos
```bash
# Rodar testes
npm run test

# Testes com cobertura
npm run test:coverage

# Lint
npm run lint

# Type check
npm run type-check
```

---

## 📊 PERFORMANCE & OPTIMIZAÇÕES

- ✅ **Code Splitting:** Rotas lazy-loaded com React.lazy()
- ✅ **Image Optimization:** Compressão com Vite + Sharp
- ✅ **Bundle Analysis:** vite-plugin-visualizer
- ✅ **CSS Purging:** Tailwind remove CSS não-utilizado
- ✅ **Lazy Loading:** Imagens e componentes carregados sob demanda
- ✅ **Caching:** Service Worker + Headers HTTP

---

## 🔗 REFERÊNCIAS & LINKS ÚTEIS

- **Gov.br:** https://www.gov.br/govbr
- **Padrão Cidades:** https://www.gov.br/cidadania/pt-br
- **MapLibre:** https://maplibre.org
- **OSRM:** http://project-osrm.org
- **Supabase:** https://supabase.com
- **Tailwind CSS:** https://tailwindcss.com
- **React Documentation:** https://react.dev
- **TypeScript Handbook:** https://www.typescriptlang.org/docs

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Clonar template inicial Vite + React + TypeScript
2. ✅ Configurar Tailwind CSS + design tokens
3. ✅ Implementar autenticação Supabase
4. ✅ Criar componentes base (Button, Input, Modal, etc)
5. ✅ Implementar layout principal (Sidebar, Header)
6. ✅ Integrar com tabelas PostgreSQL
7. ✅ Criar módulo Dashboard
8. ✅ Criar módulo Demandas (CRUD completo)
9. ✅ Criar módulo Escolas
10. ✅ Integrar MapLibre + OSRM
11. ✅ Implementar Kanban com drag-drop
12. ✅ Implementar gerador de PDF
13. ✅ Implementar PWA + Service Worker
14. ✅ Testes e otimizações
15. ✅ Deploy em produção

---

**Documento preparado para desenvolvimento imediato. Todos os requisitos técnicos, funcionais e de design foram especificados. Pronto para começar o desenvolvimento!**

*Gerado em: 2026-09-04*
