# Plano de Implementação: Módulo "Mapa da Rede" (Mapa Operacional das Unidades Escolares)

Este documento descreve a substituição do *Quadro Kanban* pelo novo módulo **🗺️ Mapa da Rede**, transformando o sistema em uma ferramenta estratégica de inteligência territorial para a equipe de Infraestrutura e Gestão Escolar.

---

## 🎯 Objetivo e Proposta de Valor

Substituir o item "Quadro Kanban" no menu lateral por **"Mapa da Rede"** (`/mapa`), respondendo de forma visual e operacional à pergunta:
> *"Onde estão concentrados os problemas da rede e onde a equipe precisa atuar prioritariamente?"*

A tela será construída exatamente de acordo com o design fornecido no mockup, integrando dados reais do banco de dados SQLite, mapas interativos (Leaflet), geocodificação e cálculo de rotas para visitas técnicas.

---

## 🏗️ Arquitetura e Componentes

### 1. Menu Lateral e Navegação (`templates/index.html`)
- Substituir o link do Kanban por:
  - **Ícone:** `i-map` (Mapa dobrado com traçado)
  - **Texto:** `Mapa da Rede`
  - **Link:** `/mapa`
  - **Atalho de teclado:** Tecla `M`
  - **Tooltip:** *"Visualize as unidades, criticidade das demandas e localização dos atendimentos · tecla M"*

### 2. Backend FastAPI (`app.py`)
- **Nova Rota Web:**
  - `@app.get("/mapa")` renderizando `page="map"` com título *"Mapa Operacional da Rede"*.
  - Redirecionamento da rota antiga `@app.get("/kanban")` para `/mapa` com código `301/303`.
- **Novo Endpoint de Dados Agregados (`/api/map/network`):**
  - Retorna todas as 65 unidades escolares com:
    - Identificação (`id`, `name`, `code`, `director`, `address`, `lat`, `lon`).
    - Métricas em aberto (`open_demands_count`, `urgent_p1`, `high_p2`, `overdue_count`, `in_progress_count`, `waiting_contract_count`, `completed_count`, `total_demands`).
    - Custo total estimado em aberto (`cost_estimate_open`).
    - Categoria predominante de ocorrências (`predominant_category`).
    - Taxa de resolução / percentual de execução (`execution_percent`).
    - Nível de Criticidade calculado:
      - 🔴 **Crítico:** Possui P1 (urgente) ou demandas com prazo vencido.
      - 🟠 **Atenção:** Possui P2 (alta) ou 3+ demandas em aberto.
      - 🔵 **Em atendimento:** Possui serviços em andamento/execução.
      - 🟢 **Regular:** Sem pendências críticas.
  - **KPIs Superiores da Rede:**
    - Total de Unidades Escolares (65)
    - Unidades em Situação Crítica (🔴)
    - Unidades em Atendimento (🔵)
    - Unidades com Prazos Vencidos (🟠)
  - **Fila de Prioridade de Atendimento:** Lista ordenada das escolas mais críticas para o painel lateral direito.
  - **Resumo Operacional:** Agrupamento de escolas por demandas estruturais, prioridade elétrica, aguardando orçamento e tempo médio de resposta.
- **Geocodificação Inicial das Escolas:** Script leve de inicialização para garantir coordenadas lat/lon de Itaguaí/RJ para todas as 65 unidades sem depender de chamadas externas lentas.

### 3. Front-end Interativo (`static/app.js` & `templates/index.html`)
- Carregamento assíncrono e leve da biblioteca **Leaflet 1.9.4** com tiles nítidos e rápidos (CartoDB Voyager / OpenStreetMap).
- **Interface Completa com base no Mockup:**
  1. **Header:** Título *"Mapa Operacional da Rede"*, Subtítulo *"Visão territorial das demandas da rede"*, campo de busca rápida por escola/bairro, filtros dropdown de criticidade e status, e botão *Exportar Relatório*.
  2. **Top 4 KPI Cards:** Indicadores destacados com ícones, cores e números da rede.
  3. **Mapa Interativo (Área Central):**
     - Marcadores circulares com contagem de ocorrências e cores por criticidade (🔴, 🟠, 🔵, 🟢).
     - Legenda flutuante no canto do mapa.
     - Controles de zoom e centralização no município.
     - **Popup Interativo:** Ao clicar em uma escola, exibe o cartão completo com estatísticas da unidade e botões:
       - `[ Ver demandas ]` (filtra a lista de demandas pela escola)
       - `[ Visão 360° ]` (abre a página da escola `/escolas?q=...`)
       - `[ Traçar rota ]` (traça a rota no mapa da sede da secretaria até a escola via `/api/route`).
  4. **Filtros Rápidos Inferiores (Chips):**
     - `Todas`, `🔴 Críticas`, `🚩 P1`, `🚩 P2`, `⏱️ Vencidas`, `▶️ Em execução`, `👤 Aguardando contratação`.
  5. **Painel Lateral Direito:**
     - **Prioridade de Atendimento:** Lista clicável que foca imediatamente a escola no mapa e abre seu popup.
     - **Resumo Operacional:** Métricas consolidadas por tipo de ocorrência.

### 4. Estilos (`static/styles.css`)
- Layout responsivo em grid com altura adequada, cards modernos, animações suaves nos marcadores e popups com visual limpo padrão Gov.br.

---

## 📋 Arquivos a Modificar

#### [MODIFY] [templates/index.html](file:///h:/2026%20TALMA/Assistencia/templates/index.html)
- Incluir folha de estilo e script Leaflet.
- Substituir o item "Quadro Kanban" por "Mapa da Rede" no menu lateral.

#### [MODIFY] [app.py](file:///h:/2026%20TALMA/Assistencia/app.py)
- Criar rota `/mapa` e redirecionar `/kanban`.
- Implementar endpoint `/api/map/network` com todos os cálculos de criticidade, KPIs e resumo.
- Inicializar coordenadas das unidades escolares.

#### [MODIFY] [static/app.js](file:///h:/2026%20TALMA/Assistencia/static/app.js)
- Implementar função `renderNetworkMap()` com mapa interativo Leaflet, marcadores personalizados, filtros e traçado de rotas.

#### [MODIFY] [static/styles.css](file:///h:/2026%20TALMA/Assistencia/static/styles.css)
- Adicionar estilos para o container do mapa, popups customizados, chips de criticidade e cards da barra lateral.

---

## 🧪 Plano de Verificação

1. **Navegação e Atalhos:**
   - Clicar em "Mapa da Rede" no menu lateral ou pressionar a tecla `M` e verificar se a rota `/mapa` carrega.
2. **Carregamento do Mapa e Indicadores:**
   - Conferir se os 4 KPIs no topo exibem as contagens corretas.
   - Conferir se os marcadores aparecem espalhados pela cidade com as cores correspondentes (🔴, 🟠, 🔵, 🟢).
3. **Filtros Interativos:**
   - Clicar no chip "🔴 Críticas" e verificar se o mapa e a lista filtram apenas escolas em situação crítica.
   - Testar o campo de busca de escola/bairro.
4. **Interação com Unidades Escolares:**
   - Clicar em um marcador no mapa e verificar o popup com nome, demandas abertas, custo, principal problema e taxa de execução.
   - Testar o botão "Traçar rota" para verificar o traçado viário desenhado no mapa.
   - Clicar em uma escola na lista de "Prioridade de Atendimento" e conferir se o mapa centraliza na escola.
