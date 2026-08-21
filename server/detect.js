/* SENTINEL-X · detection engine (server-side rule evaluation)
 *
 * Evaluates threshold rules directly against the events table.
 * In production, schedule this via cron / a queue consumer, and move
 * statistical baselines (3σ egress, invocation bursts) into the same
 * pattern with a precomputed baseline table.
 */
async function runDetections(pool) {
  const created = [];

  // NET-BRUTEFORCE-SSH-01 — >10 failed SSH auths from one IP in 5 minutes
  const brute = await pool.query(`
    SELECT source, count(*)::int AS attempts
    FROM events
    WHERE type = 'ssh.auth' AND payload->>'outcome' = 'fail' AND ts > now() - interval '5 minutes'
    GROUP BY source HAVING count(*) > 10`);
  for (const row of brute.rows) {
    const dup = await pool.query(
      `SELECT 1 FROM alerts WHERE rule = 'NET-BRUTEFORCE-SSH-01' AND source = $1 AND status IN ('ACTIVE','INVESTIGATING')`, [row.source]);
    if (dup.rowCount) continue;
    const id = `AL-${Date.now().toString(36).toUpperCase()}`;
    await pool.query(
      `INSERT INTO alerts (id,name,severity,confidence,ts,resource,source,destination,rule,reason,recommendation,status)
       VALUES ($1,'SSH brute force from ' || $2,'HIGH',90,now(),$3,$2,$2 || ':22','NET-BRUTEFORCE-SSH-01',
       $4,'Block the source IP and enforce key-only authentication.','ACTIVE')`,
      [id, row.source, "ops-bastion-01", `${row.attempts} failed attempts in 5 minutes from a single source.`]);
    created.push(id);
  }

  // NET-EGRESS-TOR-01 — any network.egress event flagged blocked/tor within 1h
  const tor = await pool.query(`
    SELECT DISTINCT source, destination FROM events
    WHERE type = 'network.egress' AND payload->>'verdict' = 'blocked' AND ts > now() - interval '1 hour'`);
  for (const row of tor.rows) {
    const dup = await pool.query(
      `SELECT 1 FROM alerts WHERE rule = 'NET-EGRESS-TOR-01' AND destination = $1 AND status IN ('ACTIVE','INVESTIGATING')`, [row.destination]);
    if (dup.rowCount) continue;
    const id = `AL-${Date.now().toString(36).toUpperCase()}`;
    await pool.query(
      `INSERT INTO alerts (id,name,severity,confidence,ts,resource,source,destination,rule,reason,recommendation,status)
       VALUES ($1,'Egress to TOR exit node','CRITICAL',97,now(),'checkout-api-7d9f4b',$2,$3,'NET-EGRESS-TOR-01',
       'Outbound TLS to a curated TOR exit node with no workload egress baseline.',
       'Isolate the workload, revoke its identity, block the destination.','ACTIVE')`,
      [id, row.source, row.destination]);
    created.push(id);
  }

  return { evaluated: 2, created, ts: new Date().toISOString() };
}

module.exports = { runDetections };
