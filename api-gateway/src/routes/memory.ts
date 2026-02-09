import { Router } from 'express';
import { z } from 'zod';
import { getPatterns, getExpertise, getPreferences, getProjects } from '../lib/gywd-data';
import { validateQuery } from '../middleware/validate';

const router = Router();

const querySchema = z.object({
  section: z.enum(['all', 'patterns', 'expertise', 'preferences', 'projects']).optional().default('all'),
}).passthrough();

/** GET /api/v1/memory - Memory data */
router.get('/', validateQuery(querySchema), (req, res) => {
  const section = (req.query.section as string) || 'all';
  const data: Record<string, unknown> = {};

  if (section === 'all' || section === 'patterns') data.patterns = getPatterns();
  if (section === 'all' || section === 'expertise') data.expertise = getExpertise();
  if (section === 'all' || section === 'preferences') data.preferences = getPreferences();
  if (section === 'all' || section === 'projects') data.projects = getProjects();

  res.json({ success: true, data });
});

export default router;
