import { Router, Request } from 'express';
import { z } from 'zod';
import { generateKey, revokeKey, deleteKey, getKey, listKeys, ApiKeyScope } from '../lib/api-keys';
import { validateBody } from '../middleware/validate';

const router = Router();

const SCOPES: ApiKeyScope[] = ['admin', 'write', 'read'];

const generateSchema = z.object({
  name: z.string().min(1).max(100),
  scope: z.enum(['admin', 'write', 'read']).optional(),
  expiresAt: z.string().datetime().optional(),
}).strict();

const revokeSchema = z.object({
  id: z.string().length(16).regex(/^[a-f0-9]{16}$/),
}).strict();

interface AuthedRequest extends Request {
  authContext?: {
    userId: string;
    scope: ApiKeyScope;
    keyId: string;
  };
}

/**
 * All key-management endpoints require admin scope on the calling key.
 * This prevents a leaked read-only key from minting or revoking other keys.
 */
function requireAdminScope(req: AuthedRequest): string | null {
  const ctx = req.authContext;
  if (!ctx) return 'No authentication context';
  if (ctx.scope !== 'admin') return `Forbidden: key management requires admin scope (got ${ctx.scope})`;
  return null;
}

/** GET /api/v1/keys - List all API keys (metadata only — never plaintext) */
router.get('/', (req: AuthedRequest, res) => {
  const err = requireAdminScope(req);
  if (err) return res.status(403).json({ success: false, error: err });
  return res.json({ success: true, data: listKeys() });
});

/** GET /api/v1/keys/:id - Get a single key's metadata */
router.get('/:id', (req: AuthedRequest, res) => {
  const err = requireAdminScope(req);
  if (err) return res.status(403).json({ success: false, error: err });

  if (!/^[a-f0-9]{16}$/.test(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid key id' });
  }
  const info = getKey(req.params.id);
  if (!info) return res.status(404).json({ success: false, error: 'Key not found' });
  return res.json({ success: true, data: info });
});

/** POST /api/v1/keys - Generate a new API key (plaintext returned ONCE) */
router.post('/', validateBody(generateSchema), (req: AuthedRequest, res) => {
  const err = requireAdminScope(req);
  if (err) return res.status(403).json({ success: false, error: err });

  const { name, scope, expiresAt } = req.body;
  const generated = generateKey({
    name,
    scope: scope || 'read',
    expiresAt: expiresAt || null,
    createdBy: req.authContext?.keyId || null,
  });

  // IMPORTANT: The plaintextKey is returned ONLY here; it cannot be retrieved later.
  return res.status(201).json({
    success: true,
    data: {
      plaintextKey: generated.plaintextKey,
      warning: 'Store this key now. It cannot be retrieved again.',
      info: generated.info,
    },
  });
});

/** DELETE /api/v1/keys - Revoke (soft-delete) a key by id */
router.delete('/', validateBody(revokeSchema), (req: AuthedRequest, res) => {
  const err = requireAdminScope(req);
  if (err) return res.status(403).json({ success: false, error: err });

  const { id } = req.body;
  // Prevent self-revocation (you'd lock yourself out)
  if (req.authContext?.keyId === id) {
    return res.status(400).json({ success: false, error: 'Cannot revoke your own active key' });
  }

  const revoked = revokeKey(id);
  if (revoked) return res.json({ success: true, message: 'Key revoked' });
  return res.status(404).json({ success: false, error: 'Key not found' });
});

/** DELETE /api/v1/keys/:id - Hard-delete a key (admin scope) */
router.delete('/:id', (req: AuthedRequest, res) => {
  const err = requireAdminScope(req);
  if (err) return res.status(403).json({ success: false, error: err });

  if (!/^[a-f0-9]{16}$/.test(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid key id' });
  }
  if (req.authContext?.keyId === req.params.id) {
    return res.status(400).json({ success: false, error: 'Cannot delete your own active key' });
  }
  const ok = deleteKey(req.params.id);
  if (ok) return res.json({ success: true, message: 'Key deleted' });
  return res.status(404).json({ success: false, error: 'Key not found' });
});

export default router;
export { SCOPES };
