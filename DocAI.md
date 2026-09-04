# 📘 DocAI — Documentação Oficial do Sistema
# Agenda Integrada · Infraestrutura e Gestão Escolar (AssistInfra)

**Secretaria Municipal de Educação (SMEDU) · Prefeitura Municipal de Itaguaí - RJ**  
**Versão da Aplicação:** `1.2.0` | **Padrão Visual:** `GOV.BR V3` | **Ambiente:** Híbrido (Local / Nuvem)

---

## 📑 Sumário Executivo
1. [Visão Geral e Propósito](#1-visão-geral-e-propósito)
2. [Arquitetura Técnica do Sistema](#2-arquitetura-técnica-do-sistema)
3. [Estrutura do Repositório](#3-estrutura-do-repositório)
4. [Camada de Dados e Modelagem (PostgreSQL / Supabase)](#4-camada-de-dados-e-modelagem)
5. [Segurança, Autenticação e Perfis de Acesso (RBAC)](#5-segurança-autenticação-e-perfis-de-acesso)
6. [Módulos Funcionais do Sistema](#6-módulos-funcionais-do-sistema)
   - 6.1. Painel de Controle (Dashboard Executivo)
   - 6.2. Carteira de Demandas (Gestão Completa)
   - 6.3. Detalhamento e Linha do Tempo (Visão 360° da Demanda)
   - 6.4. Geração de Documentos Oficiais (PDF Institucional)
   - 6.5. Unidades Escolares (Visão 360° da Rede)
   - 6.6. Quadro Kanban Operacional
   - 6.7. Mapa Geográfico e Rotas da Rede Escolar
   - 6.8. Planejamento Futuro Plurianual
   - 6.9. Relatórios, Métricas e Exportações
   - 6.10. Administração e Parâmetros
7. [Experiência do Usuário, Design System e Acessibilidade (UX/UI)](#7-experiência-do-usuário-design-system-e-acessibilidade)
8. [Ciclo de Vida Operacional de uma Demanda](#8-ciclo-de-vida-operacional-de-uma-demanda)
9. [Instalação, Execução Local e Deploy em Produção](#9-instalação-execução-local-e-deploy-em-produção)

---

## 1. Visão Geral e Propósito

O **Agenda Integrada (AssistInfra)** é um sistema governamental de gestão operacional, tática e estratégica, concebido para centralizar todas as demandas de infraestrutura, manutenção predial, intervenções emergenciais e suporte tecnológico (CPD/TI) das unidades escolares da rede municipal de ensino de **Itaguaí - RJ**.

### Principais Objetivos:
- **Agilidade e Transparência:** Eliminar pedidos dispersos em memorandos físicos ou mensagens informais, canalizando todas as solicitações em protocolos auditáveis (`INF-YYYY-XXXXX`).
- **Priorização Inteligente:** Classificar atendimentos conforme a criticidade real (P1 - Urgente, P2 - Alta, P3 - Programada, P4 - Planejamento/Projeto).
- **Controle Orçamentário e Custos:** Acompanhar custos estimados versus custos reais executados em cada reparo ou obra.
- **Memória Institucional:** Manter histórico fotográfico, registro de materiais, cronograma de execução e diário de obras de cada unidade de ensino.
- **Governança Pública:** Fornecer aos gestores relatórios executivos em PDF com cabeçalho oficial da Prefeitura e Brasão de Itaguaí.

---

## 2. Arquitetura Técnica do Sistema

A solução foi projetada sob uma arquitetura resiliente, de alta performance e compatível com as diretrizes do **Padrão Digital de Governo (Gov.br / Cidades)**.

```
       [ Usuário / Navegador Web ]
                  │  (HTTPS)
                  ▼
   ┌──────────────────────────────┐
   │    FastAPI + Uvicorn (Py3.11)│ ◄── Servidor Web Contínuo Assíncrono
   │  (Sessões, Rotas, Templates) │
   └──────────────┬───────────────┘
                  │  (Pool de Conexões TCP / SSL)
                  ▼
   ┌──────────────────────────────┐
   │     PostgreSQL (Supabase)    │ ◄── Banco Relacional na Nuvem
   │ (Schemas, Triggers, Índices) │
   └──────────────────────────────┘
```

### 2.1. Backend
- **Linguagem & Framework:** Python 3.11 com **FastAPI** e servidor ASGI **Uvicorn**.
- **Motor de Templates:** **Jinja2** com renderização segura de layout base.
- **Gerenciador de Conexões:** `psycopg2.pool.ThreadedConnectionPool`, garantindo reaproveitamento de conexões e tolerância a falhas transitórias de rede com o Supabase.
- **Geração de PDFs:** **ReportLab**, gerando documentos PDF vetoriais em alta fidelidade institucional com metadados e assinaturas.
- **Geocodificação e Rotas:** Integração via HTTPX com **Nominatim (OpenStreetMap)** e **OSRM** para cálculo de distâncias e trajetos viários entre as escolas.

### 2.2. Frontend
- **Modelo:** Single Page Application (SPA) progressivo com Vanilla JavaScript modular (`static/app.js`) acoplado ao CSS do Gov.br (`static/styles.css`).
- **Design System:** Baseado no padrão Gov.br / Cidades, com tokens semânticos, paleta oficial da Prefeitura de Itaguaí, modo claro e modo escuro nativo (*Dark Mode*).
- **PWA (Progressive Web App):** Service Worker nativo (`/sw.js`) com estratégia de cache para arquivos estáticos versionados (`?v=asset_mtime`), garantindo carregamento instantâneo.
- **Zero Framework Bloat:** Não requer dependências pesadas de compilação em tempo de execução no cliente, proporcionando tempo de resposta sub-100ms.

---

## 3. Estrutura do Repositório

```
AssistInfra/
├── app.py                      # Núcleo da aplicação FastAPI (rotas, lógica de negócio, auth, PDF)
├── DocAI.md                    # Documentação técnica oficial completa do sistema
├── INICIAR_SISTEMA.bat         # Script automatizado para execução local em Windows (porta 8017)
├── requirements.txt            # Dependências Python (FastAPI, uvicorn, psycopg2-binary, reportlab...)
├── render.yaml                 # Manifesto de infraestrutura como código para deploy no Render.com
├── Procfile                    # Comando de inicialização do processo web para PaaS
├── .env                        # Variáveis de ambiente locais (não versionado por segurança)
├── static/
│   ├── app.js                  # Lógica reativa de interface do usuário, tabelas, kanban e modais
│   ├── styles.css              # Design System Gov.br V3 (tokens, componentes, dark mode, responsividade)
│   ├── pwa.js                  # Registro e gerenciamento do Service Worker
│   ├── manifest.json           # Manifesto PWA para instalação no celular/desktop
│   └── brasao_itaguai.png      # Brasão oficial de Itaguaí em alta resolução
├── templates/
│   ├── index.html              # Shell visual principal (Sidebar, Header Gov.br, ViewRoot)
│   ├── login.html              # Tela de autenticação institucional segura
│   └── about.html              # Informações de versão, perfis e arquitetura
└── uploads/                    # Diretório local para fotos de vistorias e laudos anexos
```

---

## 4. Camada de Dados e Modelagem (PostgreSQL / Supabase)

O banco de dados relacional é estruturado em tabelas normalizadas com integridade referencial:

### 4.1. Tabelas Centrais
1. **`users`**: Cadastro de servidores e gestores (nome, e-mail, senha hash, perfil, unidade escolar vinculada, status ativo/inativo).
2. **`access_profiles`**: Definição de perfis de permissão (Admin, Gestão Central, Técnico/Fiscal, Gestor Escolar, Consulta).
3. **`schools`**: Unidades escolares municipais (nome, código INEP, bairro, endereço, telefone, diretor, localização geográfica lat/lng).
4. **`demands`**: Demandas de infraestrutura e serviços:
   - `code`: Protocolo único sequencial (`INF-2026-XXXXX`).
   - `title`, `description`, `category`, `priority` (P1 a P4), `status`.
   - `school_id`: Vinculação à escola demandante.
   - `cost_estimate`, `cost_actual`: Acompanhamento financeiro.
   - `due_date`: Prazo de conclusão previsto.
   - `responsible`: Técnico ou setor responsável.
   - `archived_at`: Timestamp de arquivamento.
5. **`demand_events`**: Histórico auditável de cada alteração ocorrida na demanda (linha do tempo imutável com usuário, data, status anterior, status novo e despacho).
6. **`demand_items`**: Lista quantitativa de materiais ou serviços necessários para o atendimento.
7. **`planning_items`**: Itens do planejamento plurianual e grandes reformas orçadas.
8. **`system_notifications`**: Alertas emitidos automaticamente para os usuários sobre prazos, vistorias e atualizações de demandas.

---

## 5. Segurança, Autenticação e Perfis de Acesso (RBAC)

O sistema implementa rigorosos padrões de segurança da informação em conformidade com as boas práticas governamentais:

- **Criptografia de Senhas:** Hash criptográfico `PBKDF2-HMAC-SHA256` com sal aleatório exclusivo (*salt*) e 120.000 iterações, impossibilitando ataques de dicionário ou *rainbow tables*.
- **Sessões HTTP-Only:** Cookies de sessão assinados com chave secreta forte, marcados como `HttpOnly` e política `SameSite=Lax` contra ataques de CSRF e XSS.
- **Controle de Acesso Granular (RBAC):**
  - **Administrador:** Acesso irrestrito, parametrização de tabelas, exclusão de registros e gestão de usuários.
  - **Equipe de Infraestrutura:** Triagem, edição técnica, orçamentos, alteração de status e arquivamento.
  - **Gestor da Escola:** Visualização restrita às demandas da sua própria unidade e registro de novas solicitações.
  - **Consulta / Órgãos de Controle:** Leitura analítica e emissão de relatórios sem permissão de alteração.

---

## 6. Módulos Funcionais do Sistema

### 6.1. Painel de Controle (Dashboard Executivo)
A tela inicial fornece uma radiografia completa da infraestrutura escolar em tempo real:
- **Métricas Chave:** Total de demandas consolidadas, demandas urgentes (P1), demandas de alta prioridade (P2), demandas vencidas, itens em análise e concluídos.
- **Painel de Custo em Aberto:** Total orçado pendente de conclusão com gráfico de barras por categoria e lista das intervenções de maior vulto.
- **Lista de Atenção Imediata:** Alertas visuais com indicador de proximidade do vencimento do prazo.

### 6.2. Carteira de Demandas
Mecanismo central de operação diária:
- **Tabela Dinâmica:** Linhas estilizadas com cantos arredondados, destaque suave para demandas concluídas (`#bce7d2`), indicadores de criticidade (*badges* com bullets) e datas formatadas.
- **Filtros Multicritério:** Filtragem instantânea por Status, Prioridade, Unidade Escolar, Categoria e busca textual por termo.
- **Ações Rápidas:** Botões independentes para Visualização 360°, Edição Cadastral, Arquivamento e Exclusão Segura.

### 6.3. Detalhamento e Linha do Tempo (Visão 360° da Demanda)
- **Ficha Cadastral:** Descrição completa do problema relatado pela direção escolar, parecer técnico, local exato e contatos.
- **Linha do Tempo (Timeline):** Registro cronológico passo a passo de todas as tramitações, vistorias agendadas, fotos anexadas e despachos da equipe de engenharia.
- **Gestão de Custos e Materiais:** Relação de peças, equipamentos e materiais necessários com unidades de medida oficiais.

### 6.4. Geração de Documentos Oficiais (PDF Institucional)
Disponível em demandas concluídas ou em fase de análise:
- **Cabeçalho Oficial:** Identificação da Prefeitura de Itaguaí, Secretaria de Educação e Subsecretaria de Infraestrutura com o Brasão Municipal.
- **Quadro de Metadados:** Protocolo, unidade demandante, datas de abertura e conclusão, categoria e custo final.
- **Histórico Integral de Ocorrências:** Transcrição de todos os despachos da linha do tempo.
- **Campo de Homologação e Assinaturas:** Espaço reservado para validação do Fiscal do Contrato, Direção Escolar e Subsecretário.

### 6.5. Unidades Escolares (Escolas 360°)
- Catálogo completo de todas as creches, escolas municipais e unidades administrativas.
- Visão individualizada por escola exibindo todas as demandas ativas, histórico de reparos passados e custos totais investidos naquela unidade.

### 6.6. Quadro Kanban Operacional
- Visualização ágil em colunas: **Novas ➔ Em Análise ➔ Aguardando Contratação/Material ➔ Em Execução ➔ Concluídas**.
- Cartões com visualização direta da escola, categoria, prazo e prioridade.

### 6.7. Mapa Geográfico e Rotas da Rede Escolar
- Mapa interativo baseado em OpenStreetMap com marcadores georreferenciados de cada escola.
- Código de cores nos marcadores de acordo com a criticidade da demanda mais urgente da unidade.
- Traçado inteligente de rotas para equipes de manutenção de campo utilizando OSRM.

### 6.8. Planejamento Futuro Plurianual
- Gestão de grandes projetos, quadras poliesportivas, reformas de grande porte e licitações previstas para os exercícios orçamentários seguintes.

### 6.9. Relatórios, Métricas e Exportações
- Geração de relatórios operacionais consolidados e exportação de dados em planilhas para prestação de contas aos órgãos de controle (TCE/RJ, FNDE e Câmara Municipal).

### 6.10. Administração e Parâmetros
- Painel para gestão de usuários da rede, redefinição de senhas, criação de categorias personalizadas (incluindo suporte a TI/CPD) e auditoria geral do sistema.

---

## 7. Experiência do Usuário, Design System e Acessibilidade

O AssistInfra foi projetado priorizando o conforto e a produtividade do servidor público:
- **Padrão Cidades / Gov.br V3:** Tipografia moderna (Rawline / Inter), espaçamentos matematicamente proporcionais e contrastes conforme diretrizes da WCAG 2.1 AA.
- **Modo Noturno (*Dark Mode*):** Alternância instantânea com um clique (`Ctrl + Alt + N` ou botão no cabeçalho), reduzindo o cansaço visual em plantões noturnos.
- **Acessibilidade Tipográfica:** Botão de ampliação de textos para servidores com baixa visão.
- **Atalhos Rápidos de Teclado:**
  - `N` ➔ Nova Demanda / Comunicação Interna (CI)
  - `P` ➔ Ir para o Painel (Dashboard)
  - `D` ➔ Ir para a Carteira de Demandas
  - `E` ➔ Ver Unidades Escolares
  - `M` ➔ Abrir Mapa da Rede
  - `F` ➔ Planejamento Futuro
  - `R` ➔ Relatórios
  - `A` ➔ Administração
  - `S` ➔ Sobre o Sistema
  - `?` ➔ Central de Atalhos e Ajuda
  - `[` ➔ Recolher / Expandir Menu Lateral
- **Busca Global Instantânea:** Campo superior inteligente que pesquisa simultaneamente por código de protocolo, nome de escola ou tipo de serviço.

---

## 8. Ciclo de Vida Operacional de uma Demanda

```
   [Direção Escolar]
  Registra Demanda (CI)
           │
           ▼
     Status: "Nova"
           │
           ▼
 [Triagem da Infraestrutura] ────► Status: "Em análise técnica"
           │                                 │
           ▼                                 ▼
 Agenda Vistoria / Laudo ────────► Status: "Visita agendada"
           │                                 │
           ▼                                 ▼
 Necessidade de Compras ─────────► Status: "Aguardando contratação/material"
           │                                 │
           ▼                                 ▼
 Equipe em Campo / Contrato ─────► Status: "Em execução"
           │
           ▼
 Conclusão da Obra / Reparo ─────► Status: "Concluída" (Linha Verde Suave)
           │
           ▼
 Emissão do PDF Oficial ─────────► Arquivamento Histórico
```

---

## 9. Instalação, Execução Local e Deploy em Produção

### 9.1. Execução Local (Ambiente de Desenvolvimento)
1. **Pré-requisitos:** Python 3.11 instalado e repositório clonado.
2. **Configuração do `.env`:** Criar o arquivo `.env` na raiz com os parâmetros de conexão:
   ```env
   AGENDA_SECRET=sua_chave_secreta_super_segura
   SUPABASE_DB_HOST=aws-0-sa-east-1.pooler.supabase.com
   SUPABASE_DB_PORT=5432
   SUPABASE_DB_NAME=postgres
   SUPABASE_DB_USER=postgres.xxxx
   SUPABASE_DB_PASSWORD=sua_senha
   ```
3. **Inicialização:** Basta executar o script de inicialização rápida:
   ```cmd
   .\INICIAR_SISTEMA.bat
   ```
   O sistema será iniciado no endereço local: **`http://127.0.0.1:8017`**.

### 9.2. Deploy em Nuvem Contínua (Render.com)
Como o sistema é uma aplicação Python contínua com banco Supabase, o deploy em produção é gerenciado via **Render.com**:
1. Conecte o repositório GitHub ao Render.
2. Crie um novo **Web Service** apontando para a branch `DevAssist`.
3. O arquivo `render.yaml` existente configurará automaticamente:
   - **Ambiente:** `Python 3`
   - **Comando de Build:** `pip install -r requirements.txt`
   - **Comando de Inicialização:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Cadastre as variáveis de ambiente do Supabase no painel do Render.
5. O sistema entrará em operação com certificado SSL automático e alta disponibilidade.

---

*Documento gerado e homologado para a equipe de Engenharia, CPD/TI e Infraestrutura da Secretaria Municipal de Educação de Itaguaí - RJ.*
