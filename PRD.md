# PRD — Agenda Integrada: Infraestrutura e Gestão Escolar em Ação

**Versão do documento:** 1.0
**Versão do sistema:** 1.1.0 (GOV.BR V3)
**Data:** 28/08/2026
**Organização:** Secretaria Municipal de Educação — Prefeitura Municipal de Itaguaí (RJ)
**Status:** Em uso demonstrativo — pendente de homologação para produção

---

## 1. Contexto e problema

As Unidades Escolares da rede municipal identificam problemas de infraestrutura (elétrica, hidráulica, cobertura, acessibilidade, mobiliário, segurança etc.) no dia a dia, mas não existe um canal único, rastreável e priorizável entre a escola e a equipe de Infraestrutura da Secretaria. Isso gera:

- Solicitações informais (telefone, WhatsApp, e-mail avulso) sem histórico central.
- Falta de visibilidade sobre prioridade real, prazo e responsável.
- Dificuldade de planejar aquisições e contratações de exercícios futuros a partir de demandas recorrentes.
- Ausência de dados consolidados para prestação de contas e tomada de decisão.

A **Agenda Integrada** resolve isso oferecendo um fluxo único: **Demanda → Análise → Ação → Resultado**, com registro estruturado, devolutivas, anexos, histórico e planejamento plurianual.

---

## 2. Objetivos

### 2.1 Objetivo geral
Fornecer uma ferramenta central para registro, triagem, execução e planejamento das demandas de infraestrutura escolar, com rastreabilidade completa e visão gerencial.

### 2.2 Objetivos específicos
1. Permitir que Unidades Escolares registrem demandas de forma padronizada e objetiva.
2. Dar à equipe de Infraestrutura um fluxo de triagem, priorização e execução com histórico auditável.
3. Consolidar demandas recorrentes ou de maior porte em **Planejamento Futuro** por exercício.
4. Oferecer indicadores gerenciais (urgência, execução, prazos vencidos, distribuição por categoria/status).
5. Exportar dados operacionais para uso externo (CSV) e apoio a relatórios institucionais.
6. Manter uma identidade visual institucional alinhada ao padrão Cidades/Gov.br adotado pela Prefeitura.

### 2.3 Não objetivos (fora de escopo desta versão)
- Integração direta com sistemas de licitação, contratos ou empenho da Prefeitura.
- Autenticação via Gov.br / SSO institucional (login é local, por e-mail e senha).
- Aplicativo mobile nativo (a interface web é responsiva, mas não há app dedicado).
- Assinatura eletrônica de documentos ou pareceres.
- Notificações por e-mail/SMS/push (há apenas notificações internas na interface).

---

## 3. Personas e perfis de acesso

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| **Gestor da Infraestrutura** | Equipe técnica da Secretaria responsável por triagem e execução | Acesso total: todas as demandas, análise técnica, priorização, status, relatórios, exportações e administração |
| **Unidade Escolar** | Direção/equipe gestora de uma escola | Cadastra e acompanha apenas as demandas da própria unidade; envia devolutivas e anexos; não altera prioridade/status técnico |
| **Planejamento** | Equipe responsável por consolidar necessidades futuras | Acesso amplo (equivalente a Gestor, exceto ações exclusivas de execução), com foco em consolidar itens no Planejamento Futuro |

O controle de acesso é aplicado tanto nas rotas de página quanto na API (ex.: uma Unidade Escolar só recebe dados da própria escola via `school_id` na sessão).

---

## 4. Requisitos funcionais

### 4.1 Autenticação e sessão
- RF01 — Login por e-mail institucional e senha (hash PBKDF2-SHA256, com salt individual).
- RF02 — Sessão via cookie assinado (Starlette `SessionMiddleware`).
- RF03 — Logout limpa a sessão e redireciona ao login.
- RF04 — Usuário não autenticado é redirecionado para `/login` em qualquer página protegida.

### 4.2 Dashboard (Painel)
- RF05 — Stat-cards clicáveis com total de demandas, urgentes, em análise, em execução, aguardando contratação, prazos vencidos, concluídas e planejamento futuro.
- RF06 — Lista de "Atenção necessária" ordenada por prioridade e prazo.
- RF07 — Atividade recente (últimas demandas atualizadas).
- RF08 — Distribuição por categoria e por status (mini-gráficos de barra).
- RF09 — Todos os indicadores respeitam o escopo do perfil (Unidade Escolar vê apenas os próprios dados).

### 4.3 Demandas
- RF10 — Cadastro de nova demanda em fluxo por etapas (dados básicos, impacto, escola).
- RF11 — Listagem com busca textual (título, código, escola), filtros (status, prioridade, categoria, ano) e chips rápidos.
- RF12 — Exportação da lista filtrada em CSV (`;` como separador, BOM UTF-8, compatível com Excel).
- RF13 — Tela de detalhe com abas: Resumo, Análise Técnica, Devolutivas, Anexos, Histórico e Planejamento.
- RF14 — Atualização técnica (somente perfis não-escola): prioridade, status, responsável, setor, prazo, custo estimado, parecer técnico, ação definida, dependências, flags operacionais (visita, orçamento, material, contratação) e exercício futuro.
- RF15 — Toda alteração técnica gera um registro automático na linha do tempo (`demand_updates`), com o resumo de "antes → depois".
- RF16 — Qualquer perfil pode registrar uma devolutiva/mensagem (pública) associada à demanda.
- RF17 — Upload de anexos (até 12 MB, extensões permitidas: pdf, doc(x), xls(x), png, jpg/jpeg, webp, txt, csv) e download individual.
- RF18 — Código único gerado automaticamente no padrão `INF-{ano}-{sequencial}`.

### 4.4 Planejamento Futuro
- RF19 — Cadastro de itens de planejamento por exercício (ano), categoria, tipo (aquisição, contratação, obra, projeto, serviço continuado), custo estimado, quantidade/unidade e justificativa.
- RF20 — Vínculo de demandas existentes a um item de planejamento, atualizando automaticamente o status da demanda para "Planejamento futuro" e preenchendo o `future_year`.
- RF21 — Consolidação por ano com total de itens, custo total e quantidade de escolas envolvidas.
- RF22 — Código único gerado no padrão `PLAN-{ano}-{sequencial}`.

### 4.5 Unidades Escolares
- RF23 — Listagem de escolas com indicadores (total de demandas, concluídas, urgências, % de execução).
- RF24 — Visão 360° por escola: dados institucionais e todas as demandas associadas.

### 4.6 Relatórios
- RF25 — Cartões de exportação rápida (carteira completa, urgentes, concluídas, aguardando contratação).
- RF26 — Atalhos para Planejamento Futuro e Visão por Unidade Escolar.
- RF27 — Resumo executivo com indicadores agregados.

### 4.7 Administração
- RF28 — Resumo do ambiente: total de escolas, usuários, demandas, itens de planejamento, anexos e tamanho do banco.
- RF29 — Acesso rápido a cadastros-base (escolas, planejamento) e visão dos parâmetros já estruturados (perfis, status, prioridades).

### 4.8 Sobre o Sistema *(novo nesta versão)*
- RF30 — Página `/sobre` acessível a qualquer usuário autenticado, exibindo versão do sistema, stack tecnológica, perfis de acesso e roteiro de itens pendentes para produção.
- RF31 — Endpoint `GET /api/about` retorna esses mesmos dados em JSON para consumo pelo frontend.

### 4.9 Interface e usabilidade
- RF32 — Cabeçalho institucional em duas faixas, menu lateral off-canvas, stat-cards no padrão visual Cidades/Gov.br.
- RF33 — Pesquisa global com resultados incrementais (debounce) por título, código ou escola.
- RF34 — Notificações internas com resumo de pendências críticas (urgentes, prazos vencidos, aguardando contratação).
- RF35 — Modo noturno e ampliação de texto, ambos persistidos em `localStorage`.
- RF36 — Tooltips (`data-tooltip`) em todos os controles interativos relevantes: navegação, ícones de ação, cartões, itens de configuração e botões de fechar/baixar, para reforçar a função de cada elemento sem poluir a tela.
- RF37 — Estados vazios, skeleton loading, toasts de sucesso/erro e modais (central e drawer) padronizados.

---

## 5. Requisitos não funcionais

| Categoria | Requisito |
|---|---|
| **Desempenho** | Páginas devem carregar em menos de 1s em rede local com o volume de dados demonstrativo (dezenas a poucas centenas de registros) |
| **Segurança** | Senhas com hash PBKDF2-SHA256 + salt; sessão assinada; validação de extensão e tamanho de anexos; escopo de dados aplicado em toda API |
| **Portabilidade** | Deve rodar localmente no Windows sem Node.js, sem build de frontend e sem serviços externos obrigatórios |
| **Confiabilidade** | Banco SQLite com inicialização idempotente (`init_db`) e script de reset de demonstração |
| **Acessibilidade** | Uso de `aria-label`, `aria-live`, alto contraste no padrão institucional e opção de ampliação de texto |
| **Responsividade** | Layout adaptado para desktop, tablet e celular |
| **Observabilidade** | Endpoint `/health` para verificação de disponibilidade |
| **Idioma** | Interface e mensagens em Português (Brasil) |

---

## 6. Modelo de dados (visão resumida)

- **schools** — unidades escolares (nome, direção, endereço, contato).
- **users** — usuários do sistema (nome, e-mail, hash de senha, perfil, escola associada quando aplicável).
- **demands** — núcleo do sistema: dados de identificação, categoria, impacto, prioridade (P1–P4), status (19 estados possíveis), prazo, responsável, custo, campos técnicos e de planejamento futuro.
- **demand_updates** — linha do tempo de cada demanda (criação, alteração técnica, devolutiva, anexo).
- **attachments** — arquivos anexados a uma demanda.
- **planning_items** — itens consolidados de planejamento futuro, por exercício.
- **planning_links** — associação N:N entre demandas e itens de planejamento.

Prioridades: `P1` Urgente · `P2` Alta · `P3` Programada · `P4` Planejamento/Projeto.

---

## 7. Fluxo principal (jornada da demanda)

1. **Unidade Escolar** registra a demanda (título, descrição, categoria, impacto, pessoas afetadas, se bloqueia atividade).
2. Demanda entra como **Nova** e passa por triagem da equipe de Infraestrutura.
3. **Gestor/Planejamento** define prioridade, status, responsável, prazo, custo estimado e parecer técnico.
4. Cada mudança técnica ou devolutiva fica registrada na **linha do tempo** da demanda, visível à escola.
5. Anexos (fotos, orçamentos, laudos) podem ser incluídos por qualquer perfil autorizado.
6. Se a demanda depende de projeto, licitação ou orçamento de exercício futuro, ela é vinculada a um **item de Planejamento Futuro**.
7. A demanda é concluída, cancelada ou reprogramada, sempre com registro do motivo na linha do tempo.

---

## 8. Métricas de sucesso

- Redução do tempo médio entre abertura e primeira triagem de uma demanda.
- Percentual de demandas com prazo definido e cumprido.
- Percentual de execução (concluídas / total) por período e por escola.
- Quantidade de demandas consolidadas com sucesso em Planejamento Futuro (evitando compras/contratações fragmentadas).
- Redução de solicitações informais fora do sistema (indicador qualitativo, via feedback das escolas).

---

## 9. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Uso de SQLite e credenciais demonstrativas em produção | Alto | Checklist de pré-produção documentado em `/sobre` e neste PRD (seção 10) |
| Perda de anexos por ausência de backup | Alto | Definir política de backup antes da virada para produção |
| Sobrecarga de uma única "Infraestrutura" central | Médio | Futuro: papéis intermediários por setor/especialidade |
| Falta de notificação proativa (e-mail/push) | Médio | Backlog: RF de notificações externas (seção 11) |
| Divergência entre status livre em texto e regras de negócio | Baixo | Mantido como lista fechada (`STATUSES`) validada no backend |

---

## 10. Checklist de pré-produção (não incluído nesta versão)

- [ ] Substituir SQLite por PostgreSQL ou banco corporativo.
- [ ] Alterar a chave `AGENDA_SECRET` e todas as credenciais demonstrativas.
- [ ] Configurar HTTPS.
- [ ] Definir política de backup do banco e dos anexos.
- [ ] Integrar autenticação institucional (Gov.br/SSO), se aplicável.
- [ ] Revisar RBAC conforme a estrutura real da Secretaria.
- [ ] Configurar armazenamento persistente/seguro para anexos (fora do disco local da aplicação).
- [ ] Integrar processos/licitações/contratos com sistemas oficiais, quando aplicável.
- [ ] Adicionar trilha de auditoria com IP e demais requisitos normativos do ambiente.
- [ ] Executar testes de segurança, carga e homologação com usuários reais.

---

## 11. Roadmap / backlog futuro

**Curto prazo**
- Notificações por e-mail em mudanças de status ou devolutivas.
- Filtro de demandas por responsável/setor no painel de Infraestrutura.
- Página "Sobre" (RF30/RF31) — **entregue nesta versão**.

**Médio prazo**
- Papéis adicionais (ex.: setores especializados: elétrica, obras).
- Dashboard comparativo entre escolas (ranking de execução, tempo médio de atendimento).
- Anexos por devolutiva (não apenas por demanda).
- Assinatura eletrônica de pareceres técnicos.

**Longo prazo**
- Integração com sistemas de licitação/contratos da Prefeitura.
- Aplicativo mobile dedicado para registro rápido de demandas com foto.
- Módulo de indicadores plurianuais (comparação entre exercícios).

---

## 12. Fora de escopo permanente

- Gestão financeira/orçamentária completa (empenho, liquidação, pagamento).
- Gestão de pessoal ou folha de pagamento.
- Qualquer funcionalidade que substitua sistemas legados de compras/licitação — a Agenda Integrada **alimenta** esses processos, não os substitui.

---

## 13. Referências internas

- `README.md` — instruções de instalação, execução e credenciais demonstrativas.
- `VERSAO_VISUAL.txt` — identificação da versão visual ativa.
- `/sobre` (rota da aplicação) — versão, tecnologia e perfis, consumível também via `GET /api/about`.
