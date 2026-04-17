import http from 'http';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import { createApp } from './app';
import { WsManager } from './lib/ws-manager';
// Note: AuditLog is in lib/enterprise/ at the repo root — this is a cross-package import.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuditLog } = require(path.resolve(__dirname, '../../lib/enterprise/audit-log'));

const PORT = parseInt(process.env.GYWD_API_PORT || '3945', 10);

/**
 * Resolve or generate the HMAC secret for the audit log.
 * - In production, GYWD_AUDIT_SECRET must be set to a >=32-char value.
 * - In development, we persist a locally-generated secret at ~/.gywd/audit-secret
 *   so restarts don't invalidate the existing chain.
 */
function resolveAuditSecret(): string {
  const envSecret = process.env.GYWD_AUDIT_SECRET;
  if (envSecret && envSecret.length >= 32) return envSecret;

  if (process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('GYWD_AUDIT_SECRET must be set (>=32 chars) in production');
    process.exit(1);
  }

  const secretPath = path.join(os.homedir(), '.gywd', 'audit-secret');
  if (fs.existsSync(secretPath)) {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) return existing;
  }
  const dir = path.dirname(secretPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const generated = crypto.randomBytes(48).toString('base64');
  fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  return generated;
}

const app = createApp();
const server = http.createServer(app);
const wsManager = new WsManager();

// Provision AuditLog with persistent file + HMAC secret
const auditLogPath = process.env.GYWD_AUDIT_LOG_PATH
  || path.join(os.homedir(), '.gywd', 'audit.jsonl');
const auditLog = new AuditLog({
  secret: resolveAuditSecret(),
  filePath: auditLogPath,
  maxEntries: 10000,
});

// Inject shared resources so routes + middleware can access them
app.locals.wsManager = wsManager;
app.locals.auditLog = auditLog;

wsManager.attach(server);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`GYWD API Gateway running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  // eslint-disable-next-line no-console
  console.log(`API docs at http://localhost:${PORT}/api/v1/docs`);
  // eslint-disable-next-line no-console
  console.log(`Audit log: ${auditLogPath}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down...');
  wsManager.close();
  server.close();
});

export { server, wsManager, auditLog };
