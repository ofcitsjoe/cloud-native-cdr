/* SENTINEL-X · AWS CloudTrail ingest worker (example)
 *
 * This is the production data path:
 *
 *   CloudTrail → S3 → EventBridge/SQS → this worker → normalized events table
 *                                                    → detection engine
 *
 * The worker never holds long-lived admin credentials: give it a scoped
 * IAM role (sqs:ReceiveMessage, sqs:DeleteMessage, rds connect) and keep
 * all secrets in the environment / secrets manager — never in the repo.
 */
const { Pool } = require("pg");

const TYPE_MAP = {
  ConsoleLogin: "identity.signin",
  AttachUserPolicy: "iam.policy",
  CreateAccessKey: "iam.policy",
  AssumeRole: "iam.assume",
  GetObject: "storage.read",
  RunInstances: "compute.create",
};

function normalize(rec) {
  const failed = rec.errorCode || rec.errorCode === null && rec.responseElements?.ConsoleLogin === "Failure";
  return {
    id: rec.eventID,
    ts: rec.eventTime,
    type: TYPE_MAP[rec.eventName] || "cloud.api",
    severity: failed ? "HIGH" : "INFO",
    source: rec.sourceIPAddress,
    destination: rec.eventSource,
    resource: rec.requestParameters?.userName || rec.requestParameters?.bucketName || rec.eventSource,
    actor: rec.userIdentity?.arn || rec.userIdentity?.type || "unknown",
    message: `${rec.eventName} ${failed ? "failed" : "succeeded"} (${rec.awsRegion})`,
    payload: {
      eventName: rec.eventName,
      errorCode: rec.errorCode || null,
      outcome: failed ? "fail" : "ok",
      region: rec.awsRegion,
      mfa: rec.additionalEventData?.MFAUsed || null,
    },
  };
}

async function ingest(pool, rec) {
  const e = normalize(rec);
  await pool.query(
    `INSERT INTO events (id,ts,type,severity,source,destination,resource,actor,message,payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO NOTHING`,
    [e.id, e.ts, e.type, e.severity, e.source, e.destination, e.resource, e.actor, e.message, JSON.stringify(e.payload)]
  );
}

/* SQS consumer wiring (sketch):
 *
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   setInterval(async () => {
 *     const msgs = await sqs.receiveMessage({ QueueUrl: process.env.QUEUE_URL, MaxNumberOfMessages: 10 });
 *     for (const m of msgs.Messages) {
 *       await ingest(pool, JSON.parse(m.Body));
 *       await sqs.deleteMessage({ QueueUrl: process.env.QUEUE_URL, ReceiptHandle: m.ReceiptHandle });
 *     }
 *   }, 5000);
 */
module.exports = { ingest, normalize };
