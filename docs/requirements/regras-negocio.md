# Regras de Negócio

## RN01 — Prioridade
A sequência de atendimento deve seguir:
`[SP] → [SE|SG] → [SP] → [SE|SG]`.

## RN02 — Expediente
O expediente ocorre das 07:00 às 17:00.

## RN03 — Abandono
Após duas chamadas sem comparecimento, a senha é considerada não atendida.

## RN04 — Guichê
Qualquer guichê pode atender qualquer tipo de senha.

## RN05 — Painel
Somente as cinco últimas chamadas são apresentadas. A próxima senha não deve ser exibida antecipadamente.

## RN06 — Numeração
Formato:
`YYMMDD-PPSQ`

Exemplo:
`261002-SP001`

## RN07 — Máquina de estados
```text
EMITIDA
   ↓
AGUARDANDO
   ↓
CHAMADA
   ↓
CHAMADA_NOVAMENTE
   ↓
EM_ATENDIMENTO
   ↓
ATENDIDA

CHAMADA_NOVAMENTE → NÃO_COMPARECEU
```

## RN08 — Relatórios
Devem existir relatórios diário e mensal com totais, prioridades, detalhes, tempo médio e auditoria.
