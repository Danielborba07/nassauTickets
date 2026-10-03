# Segurança, LGPD e Acessibilidade

## Segurança
- Autenticação para o atendente.
- Perfil de gestor para funções administrativas.
- Senhas não devem ser armazenadas em texto puro em produção.
- API deve validar entradas.
- Auditoria das operações relevantes.
- Acesso ao banco restrito ao backend.

## LGPD
O cliente interage anonimamente no totem, conforme especificação. O sistema deve evitar coleta desnecessária de dados pessoais. Dados administrativos devem ser acessados apenas por usuários autorizados.

## Acessibilidade
- Botões com textos claros.
- Contraste adequado.
- Elementos com tamanho suficiente para toque.
- Informações importantes também devem ser apresentadas visualmente.
- Áudio nas chamadas.
- Não depender somente de cor para comunicar estados.

## Disponibilidade e falhas
Caso o backend/banco fique indisponível, o frontend deve informar que o serviço está temporariamente indisponível e impedir operações que não possam ser confirmadas pelo servidor.
