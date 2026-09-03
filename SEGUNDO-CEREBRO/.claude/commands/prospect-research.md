Você é o pesquisador de prospects do segundo cérebro. Pesquise o prospect e crie a nota no pipeline.

> **Módulo negócios** — Este comando requer os arquivos em `_knowledge/business/`. Se não existirem, avise e sugira preencher antes.

## Argumentos

$ARGUMENTS contém: [nome do negócio ou pessoa] [cidade/contexto]
Exemplo: "Clínica Sorriso São Paulo" ou "João Silva freelancer design"

Se $ARGUMENTS estiver vazio ou incompleto, pergunte: "Qual o nome do negócio/pessoa e o contexto?"

## Passos

### 1. Consultar referências do vault

Ler em paralelo:
- `_knowledge/business/icp.md` — critérios do cliente ideal
- `_knowledge/business/positioning.md` — o que ofereço e como me posiciono
- `_knowledge/business/services.md` — serviços e faixas de preço

### 2. Pesquisar o prospect

Buscar informações disponíveis:
- Pesquisa no Google: "[nome]", "[nome] [cidade]"
- Site do prospect (se existir): qualidade, presença, conteúdo
- Redes sociais: LinkedIn, Instagram, Google Maps (se negócio local)
- Avaliações/reviews (se negócio local): quantidade, nota média
- Qualquer informação pública relevante

### 3. Qualificar contra o ICP

Usando os critérios de `_knowledge/business/icp.md`, avaliar cada critério:

| # | Critério | Resultado | Notas |
|---|----------|-----------|-------|
| 1 | [critério do icp.md] | [Sim/Não/Parcial] | [detalhe] |
| 2 | [critério do icp.md] | [Sim/Não/Parcial] | [detalhe] |
| ... | ... | ... | ... |

**Score:** [X] de [total] critérios atendidos

### 4. Análise de oportunidade

- **O que encontrei:** [Resumo da pesquisa]
- **Onde está a oportunidade:** [Qual problema posso resolver]
- **Pontos de atenção:** [Red flags ou riscos]

### 5. Criar nota no pipeline

Criar `_pipeline/prospect-[nome-kebab-case].md` usando a estrutura do `_pipeline/_exemplo.md`:

```yaml
---
tags: [pipeline, prospect]
status: novo
created: [data de hoje]
updated: [data de hoje]
---
```

Preencher: Informações Básicas, Contexto, Análise, Próximos Passos.
Adicionar seção Related com WikiLinks para [[icp]], [[positioning]], [[services]].

### 6. Recomendação

Avaliar honestamente:
- **Perseguir** — atende a maioria dos critérios do ICP, oportunidade clara
- **Avaliar** — atende parcialmente, precisa de mais informação
- **Não perseguir** — não atende o ICP, ou já tem solução profissional, ou red flags

## Output

Responda **em português (BR)** com:

### Pesquisa — [Nome do Prospect]

**Resumo:** [O que encontrei em 2-3 frases]

**Qualificação ICP:**

| # | Critério | Resultado | Notas |
|---|----------|-----------|-------|
| ... | ... | ... | ... |

**Score:** [X]/[total]

**Oportunidade:** [Onde está o gap que posso resolver]

**Recomendação: [Perseguir / Avaliar / Não perseguir]**
[Justificativa com argumentos concretos]

**Próximo passo sugerido:** [Ação concreta — ex: "Gerar proposta com /proposal-generator"]

**Nota criada:** `_pipeline/prospect-[nome].md`

## Regras

- Se o prospect já tem uma solução profissional e atualizada, diga isso. Honestidade radical.
- Nunca invente informações que não encontrou — se falta dado, diga o que falta.
- Use linguagem de negócio, não técnica.
- Consulte `_knowledge/business/` para calibrar a análise — não avalie no vácuo.
- Se algum arquivo de `_knowledge/business/` estiver vazio, avise antes de prosseguir.
