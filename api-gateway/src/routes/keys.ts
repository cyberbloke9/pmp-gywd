import { Router } from 'express';
import { z } from 'zod';
import { generateKey, revokeKey, listKeys } from '../lib/api-keys';
import { validateBody } from '../middleware/validate';

const router = Router();

const generateSchema = z.object({
  name: z.string().min(1).max(100),
});

const revokeSchema = z.object({
  key: z.string().min(1),
});

/** GET /api/v1/keys - List all API keys (masked) */
router.get('/', (_req, res) => {
  res.json({ success: true, data: listKeys() });
});

/** POST /api/v1/keys - Generate a new API key */
router.post('/', validateBody(generateSchema), (req, res) => {
  const { name } = req.body;
  const entry = generateKey(name);
  res.status(201).json({ success: true, data: entry });
});

/** DELETE /api/v1/keys - Revoke an API key */
router.delete('/', validateBody(revokeSchema), (req, res) => {
  const { key } = req.body;
  const revoked = revokeKey(key);
  if (revoked) {
    res.json({ success: true, message: 'Key revoked' });
  } else {
    res.status(404).json({ success: false, error: 'Key not found' });
  }
});

export default router;
