/* SENTINEL-X · REST API (Express + PostgreSQL)
 *
 * Start:
 *   DATABASE_URL=postgres://postgres:sentinel@localhost:5432/sentinelx \
 *   JWT_SECRET=change-me-in-prod \
 *   node server/index.js
 *
 * Security posture implemented here:
 *  - helmet (secure headers), strict JSON body limit, CORS allow-list
 *  - rate limiting (global + tightened on auth)
 *  - bcrypt password verification, short-lived signed JWTs
 *  - zod input validation on every write endpoint
 *  - parameterized queries only (no string-built SQL)
 *  - dangerous response actions require explicit confirmation + reason,
 *    are executed transactionally and written to an append-only audit log
 */
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");
const { runDetections } = require("./detect");

const PORT = process.env.PORT || 8080;
if (!process.env.DATABASE_URL) {
  console.error("✗ DATABASE_URL is required. Example:\n  DATABASE_URL=postgres://postgres:sentinel@localhost:5432/sentinelx node server/index.js");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) console.warn("⚠ JWT_SECRET not set — using an ephemeral secret (sessions won't survive restarts). Set it in production.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: false }));
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true }));

/* ------------------------------- auth ---------------------------------- */

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: "Too many attempts — try again later" } });

app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
    const { email, password } = schema.parse(req.body);
    const { rows } = await pool.query(`SELECT id, email, pass_hash, role FROM analysts WHERE email = $1`, [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.pass_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    await pool.query(`INSERT INTO audit_log (actor, action, target) VALUES ($1,'auth.login','console')`, [user.email]);
    res.json({ token, role: user.role });
  } catch (e) { next(e); }
});

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* ----------------------------- bootstrap -------------------------------- */

const camelAlert = (r) => ({ ...r, resourceId: r.resource_id, resource_id: undefined });

app.get("/api/bootstrap", requireAuth, async (req, res, next) => {
  try {
    const [a, i, ir, ru, re] = await Promise.all([
      pool.query(`SELECT * FROM alerts ORDER BY ts DESC`),
      pool.query(`SELECT * FROM incidents ORDER BY ts DESC`),
      pool.query(`SELECT incident_id, resource_id FROM incident_resources`),
      pool.query(`SELECT * FROM rules ORDER BY id`),
      pool.query(`SELECT * FROM resources`),
    ]);
    const byIncident = {};
    for (const row of ir.rows) (byIncident[row.incident_id] ||= []).push(row.resource_id);
    const incidents = i.rows.map((r) => ({
      id: r.id, title: r.title, severity: r.severity, confidence: r.confidence, status: r.status,
      ts: new Date(r.ts).getTime(), summary: r.summary, resourceIds: byIncident[r.id] || [], ...r.payload,
    }));
    const resources = re.rows.map((r) => ({ ...r, openPorts: r.open_ports, open_ports: undefined }));
    res.json({ alerts: a.rows.map(camelAlert), incidents, rules: ru.rows, resources });
  } catch (e) { next(e); }
});

/* ------------------------------- events --------------------------------- */

app.get("/api/events", requireAuth, async (req, res, next) => {
  try {
    const { sev, type, resource, q, from, to, sort, page = "1", limit = "40" } = req.query;
    const where = []; const params = [];
    const push = (clause, value) => { params.push(value); where.push(clause.replace("?", `$${params.length}`)); };
    if (sev) push(`severity = ?`, sev);
    if (type) push(`type = ?`, type);
    if (resource) push(`resource ILIKE ?`, `%${resource}%`);
    if (q) { push(`message ILIKE ?`, `%${q}%`); }
    if (from) push(`ts >= ?`, from);
    if (to) push(`ts <= ?`, to);
    const dir = sort === "asc" ? "ASC" : "DESC";                 // whitelist, never interpolated user input
    const lim = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);
    const off = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;
    const sql = `SELECT * FROM events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ts ${dir} LIMIT ${lim} OFFSET ${off}`;
    const countSql = `SELECT count(*)::int AS n FROM events ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
    const [rows, total] = await Promise.all([pool.query(sql, params), pool.query(countSql, params)]);
    res.json({ events: rows.rows, total: total.rows[0].n, page: Math.floor(off / lim) + 1, limit: lim });
  } catch (e) { next(e); }
});

/* -------------------------------- rules --------------------------------- */

const ruleSchema = z.object({
  id: z.string().min(3).max(40), name: z.string().min(3).max(80),
  description: z.string().max(400), severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  enabled: z.boolean(), logic: z.string().min(5).max(300), window: z.string().max(20),
  threshold: z.number().int().min(1).max(100000),
});

app.get("/api/rules", requireAuth, async (_req, res, next) => {
  try { res.json((await pool.query(`SELECT * FROM rules ORDER BY id`)).rows); } catch (e) { next(e); }
});

app.post("/api/rules", requireAuth, async (req, res, next) => {
  try {
    const r = ruleSchema.parse(req.body);
    await pool.query(
      `INSERT INTO rules (id,name,description,severity,enabled,logic,window,threshold,triggers,false_positives) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0)`,
      [r.id, r.name, r.description, r.severity, r.enabled, r.logic, r.window, r.threshold]
    );
    await pool.query(`INSERT INTO audit_log (actor,action,target) VALUES ($1,'rule.create',$2)`, [req.user.email, r.id]);
    res.status(201).json({ ok: true });
  } catch (e) { e instanceof z.ZodError ? res.status(400).json({ error: e.errors[0].message }) : next(e); }
});

app.patch("/api/rules/:id", requireAuth, async (req, res, next) => {
  try {
    const patch = z.object({ enabled: z.boolean().optional(), name: z.string().min(3).optional(), severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]).optional() }).parse(req.body);
    const sets = []; const params = [];
    for (const [k, v] of Object.entries(patch)) { params.push(v); sets.push(`${k} = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    params.push(req.params.id);
    await pool.query(`UPDATE rules SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
    await pool.query(`INSERT INTO audit_log (actor,action,target) VALUES ($1,'rule.update',$2)`, [req.user.email, req.params.id]);
    res.json({ ok: true });
  } catch (e) { e instanceof z.ZodError ? res.status(400).json({ error: e.errors[0].message }) : next(e); }
});

/* ------------------------- response actions ------------------------------ */

const actionSchema = z.object({
  actionId: z.string().min(1), label: z.string().min(3).max(80), target: z.string().min(3).max(120),
  risk: z.enum(["safe", "caution", "dangerous"]), incidentId: z.string().optional(),
  confirmed: z.boolean(), reason: z.string().default(""),
});

app.post("/api/actions/execute", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const a = actionSchema.parse(req.body);
    if (a.risk === "dangerous" && (!a.confirmed || a.reason.trim().length < 10)) {
      return res.status(412).json({ error: "Dangerous actions require explicit confirmation and a reason (≥10 chars)." });
    }
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO audit_log (actor, action, target, risk, incident_id, reason) VALUES ($1,$2,$3,$4,$5,$6)`,
      [req.user.email, a.label, a.target, a.risk, a.incidentId || null, a.reason || null]
    );
    if (a.incidentId) {
      await client.query(`UPDATE incidents SET status = 'CONTAINED' WHERE id = $1`, [a.incidentId]);
      await client.query(
        `UPDATE alerts SET status = 'CONTAINED' WHERE status IN ('ACTIVE','INVESTIGATING')
         AND resource_id IN (SELECT resource_id FROM incident_resources WHERE incident_id = $1)`,
        [a.incidentId]
      );
    }
    await client.query("COMMIT");
    /* Production: this is where the provider SDK call happens AFTER the audit
     * write succeeds — e.g. AWS SDK iam.updateUser({UserName, Status:'Inactive'}),
     * ec2.revokeSecurityGroupIngress, k8s NetworkPolicy apply. Run each provider
     * call through a least-privilege automation role, never analyst credentials. */
    res.json({ ok: true, executed: a.actionId });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    e instanceof z.ZodError ? res.status(400).json({ error: e.errors[0].message }) : next(e);
  } finally { client.release(); }
});

app.get("/api/audit", requireAuth, async (_req, res, next) => {
  try { res.json((await pool.query(`SELECT * FROM audit_log ORDER BY ts DESC LIMIT 200`)).rows); } catch (e) { next(e); }
});

/* --------------------------- detection engine --------------------------- */

app.post("/api/detect/run", requireAuth, async (_req, res, next) => {
  try { res.json(await runDetections(pool)); } catch (e) { next(e); }
});

/* ------------------------------ housekeeping ----------------------------- */

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error("✗", err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Internal error" }); // no stack leakage
});

app.listen(PORT, () => console.log(`● SENTINEL-X API listening on http://localhost:${PORT}`));
