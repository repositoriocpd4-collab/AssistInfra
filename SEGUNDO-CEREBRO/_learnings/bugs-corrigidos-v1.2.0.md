---
tags: [learning]
status: active
created: 2026-09-02
updated: 2026-09-02
---

# Padrões de bug encontrados e corrigidos na v1.2.0

**Contexto:** Lista de defeitos corrigidos na versão 1.2.0 do Agenda Integrada (ver `PRD.md`, seção 14). Vale manter como referência de classes de erro recorrentes neste projeto.

**Os aprendizados:**

1. **Ícone ausente no sprite SVG derruba silenciosamente um botão.** Os ícones `trash`, `layers` e `refresh` faltavam no sprite — o botão de excluir demanda existia no DOM mas renderizava vazio, ficando invisível na coluna Ações sem nenhum erro visível. *Como aplicar:* ao adicionar uma ação nova na UI, confirmar que o ícone referenciado existe de fato no sprite antes de dar como concluído.

2. **`z-index` de popover vs. modal precisa de ordem explícita.** O calendário abria atrás do drawer por conflito de `z-index` entre popover e modal. *Como aplicar:* manter uma escala de camadas documentada (ou pelo menos consistente) para popover/modal/drawer neste projeto, já que não há um sistema de camadas centralizado em `static/styles.css`.

3. **Cor de estado teimosa por herdar de um componente genérico.** O toggle de material pintava de vermelho o estado "Sim, tem material" (deveria ser positivo). Corrigido para verde = disponível, laranja = precisa comprar, alinhado ao cartão Material. *Como aplicar:* ao reusar um componente de toggle/estado, checar explicitamente a semântica de cor no contexto novo, não herdar a do componente original.

4. **Campo obrigatório que não existe na etapa atual trava o formulário.** A quantidade de material era exigida mesmo quando o campo não estava em tela (etapa condicional do assistente), deixando o usuário sem saída. *Como aplicar:* validação de campo obrigatório precisa ser condicionada à etapa/tipo de atualização ativo, não global.

5. **Dois campos de prazo, só um lido pela listagem.** O prazo reprogramado gravava apenas `prov_due_date`; a listagem lia `due_date`. A funcionalidade "funcionava" (gravava sem erro) mas o efeito não aparecia em lugar nenhum. *Como aplicar:* quando o modelo de dados tem dois campos parecidos para o mesmo conceito (ex.: prazo provisório vs. prazo efetivo), documentar explicitamente qual é a fonte de verdade lida por cada tela.

6. **`max-width` fixo em pixel curto quebra título real.** Título longo de demanda quebrava em coluna estreita por causa de um `max-width: 26 caracteres`-equivalente hardcoded. *Como aplicar:* evitar truncamento por contagem de caractere fixa em campos de texto livre vindos do usuário; preferir `text-overflow: ellipsis` com `max-width` em unidade responsiva, ou testar com título real longo antes de fechar a tela.

**Pendência ainda aberta (não corrigida):** o modal "Editar demanda" grava prioridade/status fora do padrão do resto do sistema (`"P2 - Alta"` em vez de `"P2"`), fazendo a demanda sumir de chips, filtro de prioridade e estatísticas — mesma classe de problema do item 5 (duas fontes de verdade divergentes para o mesmo campo).

## Related

- `[[projects]]`
- `[[2026-09-01-assistente-substitui-formulario-de-andamento]]`
