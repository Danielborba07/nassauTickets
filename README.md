# nassauTickets

Sistema Web de Controle de Atendimento para um Laboratório de Análises Clínicas.

## Objetivo
Controlar emissão, fila, chamada, atendimento, abandono e relatórios de senhas de atendimento.

## Tecnologias
- Frontend: React 19 + Vite
- Backend: Node.js + Express
- Banco: PostgreSQL
- API: REST/JSON

## Membros

| Nome | Matrícula | Papel |
|---|---|---|
| Daniel Rodrigues Borba Fraga | 01938613 | Desenvolvedor / Documentador |



## Arquitetura

```text
Cliente/Totem ─┐
Atendente ─────┼──> React ──HTTP/JSON──> Express ──> PostgreSQL
Painel ─────────┘
```

## Estrutura

```text
nassauTickets/
├── backend/
├── docs/
│   ├── branding/
│   ├── mer/
│   ├── mockups/
│   ├── models/uml/
│   └── requirements/
├── frontend/
├── .gitignore
├── LICENSE
└── README.md
```

## Instalação

### Banco
1. Instale e inicie o PostgreSQL.
2. Crie o banco: `createdb -U postgres nassautickets`.
3. Execute `psql -U postgres -d nassautickets -f backend/database.sql`.
4. Copie `backend/.env.example` para `backend/.env` e preencha a senha do PostgreSQL.

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## Funcionalidades implementadas
- Emissão de SP, SE e SG.
- Numeração `YYMMDD-PPSQ`.
- Fila com regra de prioridade.
- Chamada de senha.
- Chamar novamente.
- Início e finalização de atendimento.
- Abandono após duas chamadas.
- Painel com 5 últimas chamadas.
- Relatórios diário e mensal, detalhados e de auditoria.
- Auditoria.
- Login de atendente com senha armazenada em hash bcrypt.

Conta de demonstração criada pelo esquema: login `atendente`, senha `demo`. Troque essa senha antes de qualquer uso fora do ambiente local.

## Branches
- `main`: versão integrada.
- `dev`: desenvolvimento.

Fluxo sugerido:
```bash
git checkout -b dev
git add .
git commit -m "chore: cria estrutura inicial do projeto"
git push origin dev
```

Depois, faça o merge de `dev` para `main`.

## Regras de negócio
A sequência de prioridade é:
`SP -> SE/SG -> SP -> SE/SG`.

Qualquer guichê pode atender qualquer tipo de senha. Uma senha que não comparecer após duas chamadas é considerada abandonada. O expediente é das 07h às 17h.

## Segurança e LGPD
O cliente não informa dados pessoais no totem. O sistema deve restringir o acesso do atendente por login e manter auditoria das operações. Dados administrativos devem ter acesso controlado.

## Acessibilidade
O painel deve possuir contraste adequado, textos legíveis, botões identificáveis e comunicação por áudio nas chamadas.
