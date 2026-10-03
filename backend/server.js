import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const databasePassword = process.env.DB_PASSWORD ?? process.env.PGPASSWORD;
if (!process.env.DATABASE_URL && databasePassword === undefined) {
  throw new Error("Configure DB_PASSWORD ou PGPASSWORD no arquivo backend/.env.");
}

const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || process.env.PGHOST || "localhost",
        port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
        user: process.env.DB_USER || process.env.PGUSER || "postgres",
        password: databasePassword,
        database: process.env.DB_NAME || process.env.PGDATABASE || "nassautickets"
      }),
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

const TIPOS = ["SP", "SE", "SG"];
const asyncRoute = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireId(value, field) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, `${field} inválido.`);
  }
  return id;
}

function optionalId(value, field) {
  return value == null || value === "" ? null : requireId(value, field);
}

function reportPeriod(value) {
  if (value == null || value === "diario") return "day";
  if (value === "mensal") return "month";
  throw new HttpError(400, "Período inválido. Use diario ou mensal.");
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function audit(client, { senhaId, usuarioId, guicheId, evento }) {
  await client.query(
    `INSERT INTO auditoria (senha_id, usuario_id, guiche_id, evento)
     VALUES ($1, $2, $3, $4)`,
    [senhaId, usuarioId, guicheId, evento]
  );
}

function getAtendimentoIds(body) {
  return {
    usuarioId: optionalId(body.usuarioId, "usuarioId"),
    guicheId: optionalId(body.guicheId, "guicheId")
  };
}

app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

app.post("/api/login", asyncRoute(async (req, res) => {
  const { login, senha } = req.body || {};
  if (typeof login !== "string" || typeof senha !== "string" || !login || !senha) {
    throw new HttpError(400, "Informe login e senha.");
  }

  const { rows } = await pool.query(
    `SELECT id, nome, login, perfil, senha_hash
     FROM usuarios WHERE login = $1 AND ativo = TRUE`,
    [login]
  );
  const usuario = rows[0];
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
    throw new HttpError(401, "Login inválido.");
  }

  const { senha_hash: _senhaHash, ...dadosUsuario } = usuario;
  res.json(dadosUsuario);
}));

app.post("/api/senhas", asyncRoute(async (req, res) => {
  const { tipo } = req.body || {};
  if (!TIPOS.includes(tipo)) throw new HttpError(400, "Tipo inválido.");

  const hora = new Date().getHours();
  if (hora < 7 || hora >= 17) {
    throw new HttpError(400, "Totem fora do expediente (07h às 17h).");
  }

  const senha = await transaction(async client => {
    const { rows: [contador] } = await client.query(
      `INSERT INTO sequencias_senhas (dia, tipo, sequencia)
       VALUES (CURRENT_DATE, $1, 1)
       ON CONFLICT (dia, tipo) DO UPDATE
         SET sequencia = sequencias_senhas.sequencia + 1
       RETURNING sequencia, TO_CHAR(dia, 'YYMMDD') AS data_numero`,
      [tipo]
    );
    const numero = `${contador.data_numero}-${tipo}${String(contador.sequencia).padStart(3, "0")}`;
    const { rows: [criada] } = await client.query(
      `INSERT INTO senhas (numero, tipo, sequencia, estado)
       VALUES ($1, $2, $3, 'AGUARDANDO')
       RETURNING id, numero, tipo, estado, emitida_em`,
      [numero, tipo, contador.sequencia]
    );
    return criada;
  });

  res.status(201).json(senha);
}));

app.post("/api/atendimento/chamar", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const { usuarioId, guicheId } = getAtendimentoIds(body);
  const senha = await transaction(async client => {
    await client.query(
      `INSERT INTO fila_controle (id, ultimo_tipo)
       VALUES (1, NULL) ON CONFLICT (id) DO NOTHING`
    );
    const { rows: [controle] } = await client.query(
      "SELECT ultimo_tipo FROM fila_controle WHERE id = 1 FOR UPDATE"
    );

    const preferidos = controle.ultimo_tipo === "SP" ? ["SE", "SG"] : ["SP"];
    let { rows } = await client.query(
      `SELECT * FROM senhas
       WHERE estado IN ('AGUARDANDO', 'EMITIDA') AND tipo = ANY($1::varchar[])
       ORDER BY emitida_em, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
      [preferidos]
    );
    if (!rows.length) {
      const fallback = preferidos.length === 1 ? ["SE", "SG"] : ["SP"];
      ({ rows } = await client.query(
        `SELECT * FROM senhas
         WHERE estado IN ('AGUARDANDO', 'EMITIDA') AND tipo = ANY($1::varchar[])
         ORDER BY emitida_em, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
        [fallback]
      ));
    }
    if (!rows.length) throw new HttpError(404, "Não há senhas aguardando.");

    const escolhida = rows[0];
    const { rows: [chamada] } = await client.query(
      `UPDATE senhas
       SET estado = 'CHAMADA', primeira_chamada_em = COALESCE(primeira_chamada_em, NOW()),
           usuario_id = $1, guiche_id = $2
       WHERE id = $3 AND estado IN ('AGUARDANDO', 'EMITIDA')
       RETURNING *`,
      [usuarioId, guicheId, escolhida.id]
    );
    if (!chamada) throw new HttpError(409, "A senha já foi chamada por outro atendente.");

    await audit(client, { senhaId: chamada.id, usuarioId, guicheId, evento: "CHAMADA" });
    await client.query("UPDATE fila_controle SET ultimo_tipo = $1 WHERE id = 1", [chamada.tipo]);
    return chamada;
  });

  res.json(senha);
}));

app.post("/api/atendimento/chamar-novamente", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const senhaId = requireId(body.senhaId, "senhaId");
  const { usuarioId, guicheId } = getAtendimentoIds(body);
  const senha = await transaction(async client => {
    const { rows: [chamada] } = await client.query(
      `UPDATE senhas
       SET estado = 'CHAMADA_NOVAMENTE', segunda_chamada_em = NOW(),
           usuario_id = $1, guiche_id = $2
       WHERE id = $3 AND estado = 'CHAMADA'
         AND primeira_chamada_em IS NOT NULL AND segunda_chamada_em IS NULL
       RETURNING *`,
      [usuarioId, guicheId, senhaId]
    );
    if (!chamada) throw new HttpError(409, "A senha não pode receber outra chamada neste estado.");
    await audit(client, { senhaId, usuarioId, guicheId, evento: "CHAMADA_NOVAMENTE" });
    return chamada;
  });
  res.json(senha);
}));

app.post("/api/atendimento/iniciar", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const senhaId = requireId(body.senhaId, "senhaId");
  const { usuarioId, guicheId } = getAtendimentoIds(body);
  const senha = await transaction(async client => {
    const { rows: [atendimento] } = await client.query(
      `UPDATE senhas
       SET estado = 'EM_ATENDIMENTO', inicio_atendimento_em = NOW(),
           usuario_id = $1, guiche_id = $2
       WHERE id = $3 AND estado IN ('CHAMADA', 'CHAMADA_NOVAMENTE')
       RETURNING *`,
      [usuarioId, guicheId, senhaId]
    );
    if (!atendimento) throw new HttpError(409, "A senha não está aguardando atendimento.");
    await audit(client, { senhaId, usuarioId, guicheId, evento: "INICIO_ATENDIMENTO" });
    return atendimento;
  });
  res.json(senha);
}));

app.post("/api/atendimento/finalizar", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const senhaId = requireId(body.senhaId, "senhaId");
  const { usuarioId, guicheId } = getAtendimentoIds(body);
  const senha = await transaction(async client => {
    const { rows: [finalizada] } = await client.query(
      `UPDATE senhas
       SET estado = 'ATENDIDA', fim_atendimento_em = NOW(),
           usuario_id = $1, guiche_id = $2
       WHERE id = $3 AND estado = 'EM_ATENDIMENTO'
       RETURNING *`,
      [usuarioId, guicheId, senhaId]
    );
    if (!finalizada) throw new HttpError(409, "A senha não está em atendimento.");
    await audit(client, { senhaId, usuarioId, guicheId, evento: "FINALIZACAO" });
    return finalizada;
  });
  res.json(senha);
}));

app.post("/api/atendimento/nao-compareceu", asyncRoute(async (req, res) => {
  const body = req.body || {};
  const senhaId = requireId(body.senhaId, "senhaId");
  const { usuarioId, guicheId } = getAtendimentoIds(body);
  await transaction(async client => {
    const { rowCount } = await client.query(
      `UPDATE senhas SET estado = 'NAO_COMPARECEU', usuario_id = $1, guiche_id = $2
       WHERE id = $3 AND estado = 'CHAMADA_NOVAMENTE'
         AND primeira_chamada_em IS NOT NULL AND segunda_chamada_em IS NOT NULL`,
      [usuarioId, guicheId, senhaId]
    );
    if (!rowCount) throw new HttpError(409, "A senha precisa ter sido chamada duas vezes.");
    await audit(client, { senhaId, usuarioId, guicheId, evento: "NAO_COMPARECEU" });
  });
  res.json({ ok: true });
}));

app.get("/api/painel", asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.numero, s.tipo, s.guiche_id, g.numero AS guiche,
            COALESCE(s.segunda_chamada_em, s.primeira_chamada_em) AS chamada_em
     FROM senhas s
     LEFT JOIN guiches g ON g.id = s.guiche_id
     WHERE s.estado IN ('CHAMADA', 'CHAMADA_NOVAMENTE', 'EM_ATENDIMENTO', 'ATENDIDA')
     ORDER BY COALESCE(s.segunda_chamada_em, s.primeira_chamada_em) DESC, s.id DESC
     LIMIT 5`
  );
  res.json(rows);
}));

app.get("/api/relatorios/resumo", asyncRoute(async (req, res) => {
  const periodo = reportPeriod(req.query.periodo);
  const { rows: [resumo] } = await pool.query(
    `SELECT COUNT(*)::int AS total_emitidas,
            COUNT(*) FILTER (WHERE estado = 'ATENDIDA')::int AS total_atendidas,
            COUNT(*) FILTER (WHERE tipo = 'SP')::int AS emitidas_sp,
            COUNT(*) FILTER (WHERE tipo = 'SE')::int AS emitidas_se,
            COUNT(*) FILTER (WHERE tipo = 'SG')::int AS emitidas_sg,
            COUNT(*) FILTER (WHERE estado = 'ATENDIDA' AND tipo = 'SP')::int AS atendidas_sp,
            COUNT(*) FILTER (WHERE estado = 'ATENDIDA' AND tipo = 'SE')::int AS atendidas_se,
            COUNT(*) FILTER (WHERE estado = 'ATENDIDA' AND tipo = 'SG')::int AS atendidas_sg,
            ROUND(AVG(EXTRACT(EPOCH FROM (fim_atendimento_em - inicio_atendimento_em)) / 60)::numeric, 2)
              AS tempo_medio_minutos
     FROM senhas
     WHERE date_trunc($1::text, emitida_em) = date_trunc($1::text, NOW())`,
    [periodo]
  );
  res.json(resumo);
}));

app.get("/api/relatorios/detalhado", asyncRoute(async (req, res) => {
  const periodo = reportPeriod(req.query.periodo);
  const { rows } = await pool.query(
    `SELECT s.numero, s.tipo, s.estado, s.emitida_em, s.inicio_atendimento_em,
            s.fim_atendimento_em, g.numero AS guiche
     FROM senhas s
     LEFT JOIN guiches g ON g.id = s.guiche_id
     WHERE date_trunc($1::text, s.emitida_em) = date_trunc($1::text, NOW())
     ORDER BY s.emitida_em DESC, s.id DESC`,
    [periodo]
  );
  res.json(rows);
}));

app.get("/api/relatorios/auditoria", asyncRoute(async (req, res) => {
  const periodo = reportPeriod(req.query.periodo);
  const { rows } = await pool.query(
    `SELECT a.id, a.evento, a.realizado_em, a.detalhes, s.numero,
            u.nome AS atendente, g.numero AS guiche
     FROM auditoria a
     JOIN senhas s ON s.id = a.senha_id
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     LEFT JOIN guiches g ON g.id = a.guiche_id
     WHERE date_trunc($1::text, a.realizado_em) = date_trunc($1::text, NOW())
     ORDER BY a.realizado_em DESC, a.id DESC`,
    [periodo]
  );
  res.json(rows);
}));

app.get("/api/senhas", asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT s.*, g.numero AS guiche
     FROM senhas s
     LEFT JOIN guiches g ON g.id = s.guiche_id
     ORDER BY s.id DESC LIMIT 100`
  );
  res.json(rows);
}));

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === "23503") {
    return res.status(400).json({ erro: "Referência de usuário ou guichê inválida." });
  }
  if (error.code === "23505") {
    return res.status(409).json({ erro: "O registro já existe." });
  }
  if (error.status) return res.status(error.status).json({ erro: error.message });

  const reason = error.message || error.code || error.errors?.map(item => item.code).join(", ") || "erro desconhecido";
  console.error("Erro na API:", reason);
  res.status(503).json({ erro: "Serviço temporariamente indisponível." });
});

pool.on("error", error => console.error("Erro inesperado no pool PostgreSQL:", error.message));

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`nassauTickets backend na porta ${port}`));