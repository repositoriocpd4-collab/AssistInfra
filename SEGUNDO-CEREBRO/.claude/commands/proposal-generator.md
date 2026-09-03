Você é o gerador de propostas do segundo cérebro. Produza uma proposta personalizada baseada no vault.

> **Módulo negócios** — Este comando requer `_knowledge/business/` preenchido e uma nota do prospect em `_pipeline/`.

## Argumentos

$ARGUMENTS contém: [nome do prospect]
Exemplo: "clinica-sorriso" ou "Clínica Sorriso"

Se $ARGUMENTS estiver vazio, pergunte: "Qual o nome do prospect? (deve ter nota em `_pipeline/`)"

## Passos

### 1. Carregar dados do prospect

Buscar a nota em `_pipeline/` — pode ser `prospect-[nome].md` ou nome similar.
Se não encontrar, listar os arquivos em `_pipeline/` e sugerir o mais próximo.

Extrair:
- Nome, tipo de negócio, contexto
- Análise feita (oportunidade identificada)
- Problemas/necessidades detectados
- Qualquer informação relevante da pesquisa

### 2. Consultar referências

Ler em paralelo:
- `_knowledge/business/positioning.md` — como me posiciono
- `_knowledge/business/services.md` — o que ofereço e por quanto
- `_knowledge/business/pricing.md` — estratégia de preços
- `_knowledge/business/tone-of-voice.md` — tom de comunicação
- `_knowledge/business/icp.md` — se o prospect é ICP (calibra o investimento de tempo)

### 3. Definir abordagem

Com base nos dados:
- **Qual serviço/pacote recomendar?** (baseado na necessidade do prospect e em `[[services]]`)
- **Qual faixa de preço?** (baseado em `[[pricing]]` e no perfil do prospect)
- **Qual tom usar?** (baseado em `[[tone-of-voice]]` e no contexto do prospect)
- **Qual ângulo de abertura?** (observação específica sobre o prospect — nunca genérico)

### 4. Gerar proposta

Escrever a proposta com:
1. **Abertura com observação específica** sobre o prospect (dados reais da pesquisa — nunca genérico)
2. **Identificação do problema** — o que encontrei que pode estar impactando o prospect
3. **Proposta de valor** — como posso ajudar (linguagem de resultado, não de features)
4. **Próximo passo** — CTA claro e de baixo comprometimento (reunião, diagnóstico gratuito, etc.)

**Máximo: 5-7 frases.** Cada palavra deve ter propósito.

### 5. Salvar na nota do prospect

Adicionar seção `## Proposta` na nota do prospect em `_pipeline/`:

```markdown
## Proposta

| Campo | Valor |
|-------|-------|
| **Gerada em** | [data de hoje] |
| **Pacote sugerido** | [nome do pacote] |
| **Faixa de preço** | [faixa] |
| **Tom** | [descrição do tom] |
| **Status** | Pronta para enviar |

### Texto da proposta

[texto completo da proposta]

### Notas internas

[observações sobre o que enfatizar se o prospect responder]
```

Atualizar o status do prospect para "proposta-pronta" e registrar no Histórico.

## Output

Responda **em português (BR)** com:

### Proposta para [Nome do Prospect]

**Pacote sugerido:** [nome] | **Faixa de preço:** [valor] | **Tom:** [descrição]

**Proposta:**
```
[texto pronto para enviar — copiar e colar]
```

**Dados usados da pesquisa:**
- [lista dos dados específicos do prospect usados na proposta]

**Notas internas:**
- [observações sobre o que enfatizar se responder]
- [riscos ou pontos de atenção]

**Próximo passo:** [O que fazer depois de enviar — quando fazer follow-up, etc.]

## Regras

- A proposta deve ser baseada em dados REAIS do prospect — se não tem pesquisa, sugira rodar `/prospect-research` antes.
- NUNCA use linguagem genérica ("Posso criar um site lindo para você!").
- Sempre abra com observação sobre O PROSPECT, não sobre você.
- Linguagem de resultado e consequência, nunca de features técnicas.
- Se o prospect não é ICP, ajuste a proposta (menos investimento de personalização, mais direta).
- Siga o tom definido em `[[tone-of-voice]]`.
- A proposta NUNCA deve existir apenas no output da conversa — sempre persistir no vault.
