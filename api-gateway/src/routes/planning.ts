import { Router } from 'express';
import { z } from 'zod';
import { getState, getRoadmap, parseState } from '../lib/gywd-data';
import { validateQuery } from '../middleware/validate';

const router = Router();

const querySchema = z.object({
  file: z.enum(['state', 'roadmap', 'parsed']).optional().default('parsed'),
}).passthrough();

/** GET /api/v1/planning - Planning data */
router.get('/', validateQuery(querySchema), (req, res) => {
  const file = (req.query.file as string) || 'parsed';

  if (file === 'state') {
    res.json({ success: true, data: { content: getState() } });
    return;
  }

  if (file === 'roadmap') {
    res.json({ success: true, data: { content: getRoadmap() } });
    return;
  }

  // Default: parsed state
  res.json({ success: true, data: { state: parseState() } });
});

export default router;
