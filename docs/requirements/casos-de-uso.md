# Casos de Uso

## UC01 — Emitir senha
**Ator:** Cliente  
**Pré-condição:** Totem disponível e dentro do expediente.  
**Fluxo:** cliente escolhe SP, SE ou SG → sistema gera senha → sistema apresenta senha.  
**Pós-condição:** senha fica AGUARDANDO.

## UC02 — Chamar próxima senha
**Ator:** Atendente  
**Fluxo:** atendente solicita próxima → sistema verifica fila → aplica prioridade → registra chamada → envia senha ao painel.

## UC03 — Chamar novamente
**Ator:** Atendente  
**Fluxo:** atendente solicita repetição → sistema registra segunda chamada → painel/áudio repetem a senha.

## UC04 — Iniciar atendimento
**Ator:** Atendente  
**Fluxo:** cliente chega ao guichê → atendente inicia → sistema registra horário.

## UC05 — Finalizar atendimento
**Ator:** Atendente  
**Fluxo:** atendimento termina → atendente finaliza → sistema registra horário e estado ATENDIDA.

## UC06 — Marcar não comparecimento
**Ator:** Atendente/Sistema  
**Fluxo:** duas chamadas sem comparecimento → senha recebe estado NÃO_COMPARECEU.

## UC07 — Consultar painel
**Ator:** Cliente  
**Fluxo:** sistema consulta chamadas recentes → painel apresenta as cinco últimas.

## UC08 — Gerar relatório
**Ator:** Gestor  
**Fluxo:** gestor seleciona período → sistema consolida emissão, atendimento, prioridade, tempos e auditoria.
