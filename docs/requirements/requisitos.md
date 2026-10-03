# Requisitos do nassauTickets

## Requisitos Funcionais

| ID | Requisito |
|---|---|
| RF01 | Emitir senha SP, SE ou SG pelo totem. |
| RF02 | Gerar numeração diária no padrão YYMMDD-PPSQ. |
| RF03 | Manter fila de senhas aguardando atendimento. |
| RF04 | Selecionar a próxima senha conforme a regra de prioridade. |
| RF05 | Permitir ao atendente chamar uma senha. |
| RF06 | Permitir chamar novamente uma senha. |
| RF07 | Iniciar atendimento. |
| RF08 | Finalizar atendimento. |
| RF09 | Marcar senha como NÃO_COMPARECEU após duas chamadas. |
| RF10 | Exibir as cinco últimas senhas chamadas no painel. |
| RF11 | Informar guichê durante a chamada. |
| RF12 | Emitir áudio da chamada. |
| RF13 | Permitir login do atendente. |
| RF14 | Gerar relatório diário e mensal. |
| RF15 | Registrar auditoria das operações. |
| RF16 | Apresentar dados detalhados das senhas. |

## Requisitos Não Funcionais

| ID | Requisito |
|---|---|
| RNF01 | Frontend deve utilizar React. |
| RNF02 | Banco de dados deve utilizar MySQL 8.0. |
| RNF03 | API deve trabalhar com JSON/REST. |
| RNF04 | O sistema deve controlar concorrência na retirada da próxima senha. |
| RNF05 | O acesso administrativo deve exigir autenticação. |
| RNF06 | O sistema deve manter registro de auditoria. |
| RNF07 | A interface deve considerar acessibilidade. |
| RNF08 | O sistema deve apresentar comportamento definido em falhas do backend/banco. |
| RNF09 | O painel deve atualizar as chamadas sem exibir a próxima senha. |
| RNF10 | O sistema deve funcionar dentro do expediente definido. |

## Regras de Negócio

1. Existem três tipos: SP, SE e SG.
2. A prioridade segue SP → SE/SG → SP → SE/SG.
3. SP possui maior prioridade.
4. SG possui menor prioridade.
5. SE possui prioridade operacional especial e é chamada após SP quando disponível.
6. Qualquer guichê pode atender qualquer tipo.
7. Uma senha não atendida após duas chamadas é abandonada.
8. O expediente é das 07h às 17h.
9. Senhas restantes ao final do expediente são descartadas.
10. O painel exibe as cinco últimas chamadas.
11. A numeração reinicia a sequência diariamente por tipo.
