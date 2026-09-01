# IMPORTANTE — VERSÃO GOV.BR V3

Esta pasta é a versão visual revisada. Execute **`INICIAR_GOVBR.bat`** (ou `INICIAR_SISTEMA.bat`).
Ela abre em **http://127.0.0.1:8017** para não confundir com versões antigas ainda abertas na porta 8000.

A interface desta versão usa **cabeçalho institucional em duas faixas, menu lateral recolhido/off-canvas e stat-cards no padrão da TELA BASE da Prefeitura**.

---

# Agenda Integrada — Infraestrutura e Gestão Escolar em Ação

Versão funcional desenvolvida a partir do protótipo visual anexado, com foco em UX/UI, rastreabilidade e planejamento de demandas futuras.

## O que já funciona

- Login por perfil: Gestor, Unidade Escolar e Planejamento.
- Dashboard com stat-cards clicáveis, indicadores, alertas de prazo e atividade recente.
- Cadastro de nova demanda em fluxo por etapas.
- Lista de demandas com busca, filtros, chips rápidos e exportação CSV.
- Tela detalhada da demanda com abas: Resumo, Análise Técnica, Devolutivas, Anexos, Histórico e Planejamento.
- Atualização técnica de prioridade, status, responsável, setor, prazo, custo, dependências e exercício futuro.
- Linha do tempo de alterações e devolutivas.
- Upload e download de anexos de até 12 MB.
- Planejamento Futuro por exercício, com itens de aquisição, contratação, obra, projeto e serviço continuado.
- Visão 360° por Unidade Escolar.
- Relatórios operacionais e exportação CSV.
- Área administrativa com resumo do ambiente e parâmetros principais.
- Layout responsivo para desktop, tablet e celular.
- Hovers, tooltips, modais, drawer lateral, toasts, skeleton loading, badges e estados vazios.
- Página **Sobre o Sistema** (`/sobre`), com versão, tecnologia, perfis de acesso e roteiro para produção.

## Documentação do produto

O arquivo [`PRD.md`](./PRD.md) descreve, em detalhe, contexto, objetivos, personas, requisitos funcionais e não funcionais, modelo de dados, riscos e roadmap desta versão. A página **Sobre o Sistema**, disponível no menu lateral após o login, resume essas informações dentro da própria aplicação.


## Padrão visual institucional — Cidades / Gov.br

Esta versão foi reestilizada usando a tela-base fornecida pela Prefeitura como referência visual, sem remover as funcionalidades já desenvolvidas.

- Paleta principal: azul `#005A9C`, azul escuro `#071d41`, cinza claro `#f2f2f2`, superfícies brancas e bordas `#e0e0e0`.
- Cabeçalho institucional em duas faixas, com navegação, pesquisa, notificações, acessibilidade e usuário.
- Menu lateral off-canvas aberto pelo ícone de menu, com cabeçalho azul, ícones azuis, hover em cinza claro e item ativo destacado.
- Stat-cards com fundo branco, sombra suave, hover, tooltip e cores semânticas para urgência, andamento e conclusão.
- Modo noturno e ampliação de texto persistidos no navegador.
- Conteúdo principal limitado a 1200 px, alinhado ao padrão de página institucional fornecido.

A implementação utiliza apenas a identidade visual como referência. As regras de negócio, perfis, APIs, banco, formulários, histórico, devolutivas, anexos, planejamento futuro e relatórios continuam sendo os da Agenda Integrada.

## Tecnologia

- Backend: FastAPI
- Banco: SQLite
- Frontend: HTML + CSS + JavaScript puro
- Templates: Jinja2
- Sessão: Starlette SessionMiddleware

A aplicação foi mantida simples para rodar localmente sem Node.js, sem build de frontend e sem serviços externos obrigatórios.

## Como iniciar no Windows

1. Extraia o ZIP.
2. Dê dois cliques em `INICIAR_SISTEMA.bat`.
3. O script instalará as dependências Python caso estejam ausentes.
4. Abra `http://127.0.0.1:8000` no navegador.

Também é possível iniciar manualmente:

```bash
python -m pip install -r requirements.txt
python app.py
```

## Acessos demonstrativos

### Gestor da Infraestrutura
- E-mail: `gestor@agenda.local`
- Senha: `Gestor@2026`

### Unidade Escolar
- E-mail: `escola@agenda.local`
- Senha: `Escola@2026`

### Planejamento
- E-mail: `planejamento@agenda.local`
- Senha: `Planeja@2026`

## Banco de dados

O arquivo `agenda_integrada.db` é criado automaticamente na primeira execução e recebe dados demonstrativos.

Para voltar ao estado inicial da demonstração:

```bash
python RESETAR_DEMO.py
```

Na próxima inicialização, a base será recriada.

## Antes de colocar em produção

Esta entrega é uma implementação funcional de referência. Antes do uso institucional em produção, recomenda-se:

- substituir SQLite por PostgreSQL ou banco corporativo;
- alterar a chave `AGENDA_SECRET` e as credenciais demonstrativas;
- configurar HTTPS;
- definir política de backup;
- integrar autenticação institucional, se houver;
- revisar permissões RBAC conforme a estrutura real da Secretaria;
- configurar armazenamento persistente/seguro para anexos;
- integrar processos/licitações/contratos com os sistemas oficiais quando aplicável;
- acrescentar trilha de auditoria com IP e requisitos normativos do ambiente de produção;
- executar testes de segurança, carga e homologação com usuários reais.

## Estrutura principal

```text
agenda_integrada_sistema/
├── app.py
├── requirements.txt
├── INICIAR_SISTEMA.bat
├── RESETAR_DEMO.py
├── PRD.md
├── templates/
│   ├── index.html
│   └── login.html
├── static/
│   ├── app.js
│   └── styles.css
└── uploads/
```

